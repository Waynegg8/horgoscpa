import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 处理薪资项目类型相关请求
 */
export async function handleSalaryItemTypes(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);

	// 检查管理员权限
	if (!me || !me.isAdmin) {
		return jsonResponse(403, {
			ok: false,
			code: "FORBIDDEN",
			message: "此功能仅限管理员使用",
			meta: { requestId }
		}, corsHeaders);
	}

	const method = request.method;

	try {
		// GET /admin/salary-item-types - 获取所有薪资项目类型
		if (method === "GET" && path === "/admin/salary-item-types") {
			return await getSalaryItemTypes(env, requestId, corsHeaders, url);
		}

		// POST /admin/salary-item-types - 新增薪资项目类型
		if (method === "POST" && path === "/admin/salary-item-types") {
			return await createSalaryItemType(request, env, me, requestId, corsHeaders);
		}

		// PUT /admin/salary-item-types/:id - 更新薪资项目类型
		if (method === "PUT" && path.match(/^\/admin\/salary-item-types\/\d+$/)) {
			const itemTypeId = parseInt(path.split("/").pop());
			return await updateSalaryItemType(request, env, me, requestId, corsHeaders, itemTypeId);
		}

		// DELETE /admin/salary-item-types/:id - 删除（停用）薪资项目类型
		if (method === "DELETE" && path.match(/^\/admin\/salary-item-types\/\d+$/)) {
			const itemTypeId = parseInt(path.split("/").pop());
			return await deleteSalaryItemType(env, me, requestId, corsHeaders, itemTypeId);
		}

		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "API 端点不存在",
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handleSalaryItemTypes] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 获取所有薪资项目类型（支持筛选）
 */
async function getSalaryItemTypes(env, requestId, corsHeaders, url) {
	const searchParams = url.searchParams;
	const category = searchParams.get("category"); // allowance/bonus/deduction
	const isActive = searchParams.get("is_active"); // 1/0
	const keyword = searchParams.get("keyword"); // 搜索关键词

	let query = `
		SELECT 
			item_type_id,
			item_code,
			item_name,
			category,
			is_regular_payment,
			is_fixed,
			description,
			is_active,
			display_order,
			created_at,
			updated_at
		FROM SalaryItemTypes
		WHERE 1=1
	`;
	const params = [];

	if (category) {
		query += ` AND category = ?`;
		params.push(category);
	}

	if (isActive !== null && isActive !== undefined) {
		query += ` AND is_active = ?`;
		params.push(parseInt(isActive));
	}

	if (keyword) {
		query += ` AND (item_code LIKE ? OR item_name LIKE ?)`;
		const kw = `%${keyword}%`;
		params.push(kw, kw);
	}

	query += ` ORDER BY display_order ASC, item_type_id ASC`;

	const { results } = await env.DATABASE.prepare(query).bind(...params).all();

	// 转换为前端格式
	const items = results.map(row => ({
		itemTypeId: row.item_type_id,
		itemCode: row.item_code,
		itemName: row.item_name,
		category: row.category,
		isRegularPayment: !!row.is_regular_payment,
		isFixed: !!row.is_fixed,
		description: row.description || "",
		isActive: !!row.is_active,
		displayOrder: row.display_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	}));

	return jsonResponse(200, {
		ok: true,
		data: { items, total: items.length },
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 新增薪资项目类型
 */
async function createSalaryItemType(request, env, me, requestId, corsHeaders) {
	let body;
	try {
		body = await request.json();
	} catch (err) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_JSON",
			message: "请求数据格式错误",
			meta: { requestId }
		}, corsHeaders);
	}

	const { itemCode, itemName, category, isRegularPayment, isFixed, description, displayOrder } = body;

	// 验证必填字段
	if (!itemCode || !itemName || !category) {
		return jsonResponse(400, {
			ok: false,
			code: "VALIDATION_ERROR",
			message: "项目代码、项目名称和类别为必填",
			meta: { requestId }
		}, corsHeaders);
	}

	// 验证项目代码格式
	if (!/^[A-Z0-9_]{1,20}$/.test(itemCode)) {
		return jsonResponse(400, {
			ok: false,
			code: "VALIDATION_ERROR",
			message: "项目代码格式错误（仅支持大写字母、数字和下划线，最长20字符）",
			meta: { requestId }
		}, corsHeaders);
	}

	// 验证类别
	if (!["allowance", "bonus", "deduction"].includes(category)) {
		return jsonResponse(400, {
			ok: false,
			code: "VALIDATION_ERROR",
			message: "类别必须为 allowance、bonus 或 deduction",
			meta: { requestId }
		}, corsHeaders);
	}

	// 验证名称长度
	if (itemName.length > 50) {
		return jsonResponse(400, {
			ok: false,
			code: "VALIDATION_ERROR",
			message: "项目名称不得超过50字符",
			meta: { requestId }
		}, corsHeaders);
	}

	try {
		// 检查代码是否已存在
		const existing = await env.DATABASE.prepare(
			`SELECT item_type_id FROM SalaryItemTypes WHERE item_code = ?`
		).bind(itemCode).first();

		if (existing) {
			return jsonResponse(409, {
				ok: false,
				code: "DUPLICATE_CODE",
				message: "项目代码已存在",
				meta: { requestId }
			}, corsHeaders);
		}

		// 插入新项目
		const result = await env.DATABASE.prepare(`
			INSERT INTO SalaryItemTypes 
			(item_code, item_name, category, is_regular_payment, is_fixed, description, display_order, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
		`).bind(
			itemCode,
			itemName,
			category,
			isRegularPayment ? 1 : 0,
			isFixed ? 1 : 0,
			description || null,
			displayOrder || 0
		).run();

		if (!result.success) {
			throw new Error("插入失败");
		}

		// 获取新创建的项目
		const newItem = await env.DATABASE.prepare(
			`SELECT * FROM SalaryItemTypes WHERE item_type_id = ?`
		).bind(result.meta.last_row_id).first();

		return jsonResponse(201, {
			ok: true,
			data: {
				itemTypeId: newItem.item_type_id,
				itemCode: newItem.item_code,
				itemName: newItem.item_name,
				category: newItem.category,
				isRegularPayment: !!newItem.is_regular_payment,
				isFixed: !!newItem.is_fixed,
				description: newItem.description || "",
				isActive: !!newItem.is_active,
				displayOrder: newItem.display_order,
				createdAt: newItem.created_at,
				updatedAt: newItem.updated_at
			},
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[createSalaryItemType] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "创建失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 更新薪资项目类型
 */
async function updateSalaryItemType(request, env, me, requestId, corsHeaders, itemTypeId) {
	let body;
	try {
		body = await request.json();
	} catch (err) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_JSON",
			message: "请求数据格式错误",
			meta: { requestId }
		}, corsHeaders);
	}

	// 检查项目是否存在
	const existing = await env.DATABASE.prepare(
		`SELECT * FROM SalaryItemTypes WHERE item_type_id = ?`
	).bind(itemTypeId).first();

	if (!existing) {
		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "薪资项目不存在",
			meta: { requestId }
		}, corsHeaders);
	}

	const { itemCode, itemName, category, isRegularPayment, isFixed, description, displayOrder, isActive } = body;

	// 验证项目代码格式（如果有更新）
	if (itemCode && !/^[A-Z0-9_]{1,20}$/.test(itemCode)) {
		return jsonResponse(400, {
			ok: false,
			code: "VALIDATION_ERROR",
			message: "项目代码格式错误",
			meta: { requestId }
		}, corsHeaders);
	}

	// 验证类别（如果有更新）
	if (category && !["allowance", "bonus", "deduction"].includes(category)) {
		return jsonResponse(400, {
			ok: false,
			code: "VALIDATION_ERROR",
			message: "类别必须为 allowance、bonus 或 deduction",
			meta: { requestId }
		}, corsHeaders);
	}

	// 验证名称长度（如果有更新）
	if (itemName && itemName.length > 50) {
		return jsonResponse(400, {
			ok: false,
			code: "VALIDATION_ERROR",
			message: "项目名称不得超过50字符",
			meta: { requestId }
		}, corsHeaders);
	}

	try {
		// 如果更新代码，检查是否重复
		if (itemCode && itemCode !== existing.item_code) {
			const duplicate = await env.DATABASE.prepare(
				`SELECT item_type_id FROM SalaryItemTypes WHERE item_code = ? AND item_type_id != ?`
			).bind(itemCode, itemTypeId).first();

			if (duplicate) {
				return jsonResponse(409, {
					ok: false,
					code: "DUPLICATE_CODE",
					message: "项目代码已存在",
					meta: { requestId }
				}, corsHeaders);
			}
		}

		// 构建更新语句
		const updates = [];
		const params = [];

		if (itemCode !== undefined) {
			updates.push("item_code = ?");
			params.push(itemCode);
		}
		if (itemName !== undefined) {
			updates.push("item_name = ?");
			params.push(itemName);
		}
		if (category !== undefined) {
			updates.push("category = ?");
			params.push(category);
		}
		if (isRegularPayment !== undefined) {
			updates.push("is_regular_payment = ?");
			params.push(isRegularPayment ? 1 : 0);
		}
		if (isFixed !== undefined) {
			updates.push("is_fixed = ?");
			params.push(isFixed ? 1 : 0);
		}
		if (description !== undefined) {
			updates.push("description = ?");
			params.push(description);
		}
		if (displayOrder !== undefined) {
			updates.push("display_order = ?");
			params.push(displayOrder);
		}
		if (isActive !== undefined) {
			updates.push("is_active = ?");
			params.push(isActive ? 1 : 0);
		}

		if (updates.length === 0) {
			return jsonResponse(400, {
				ok: false,
				code: "NO_CHANGES",
				message: "没有需要更新的字段",
				meta: { requestId }
			}, corsHeaders);
		}

		updates.push("updated_at = datetime('now')");
		params.push(itemTypeId);

		const query = `UPDATE SalaryItemTypes SET ${updates.join(", ")} WHERE item_type_id = ?`;
		await env.DATABASE.prepare(query).bind(...params).run();

		// 获取更新后的数据
		const updated = await env.DATABASE.prepare(
			`SELECT * FROM SalaryItemTypes WHERE item_type_id = ?`
		).bind(itemTypeId).first();

		return jsonResponse(200, {
			ok: true,
			data: {
				itemTypeId: updated.item_type_id,
				itemCode: updated.item_code,
				itemName: updated.item_name,
				category: updated.category,
				isRegularPayment: !!updated.is_regular_payment,
				isFixed: !!updated.is_fixed,
				description: updated.description || "",
				isActive: !!updated.is_active,
				displayOrder: updated.display_order,
				createdAt: updated.created_at,
				updatedAt: updated.updated_at
			},
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[updateSalaryItemType] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "更新失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 删除（停用）薪资项目类型
 */
async function deleteSalaryItemType(env, me, requestId, corsHeaders, itemTypeId) {
	// 检查项目是否存在
	const existing = await env.DATABASE.prepare(
		`SELECT * FROM SalaryItemTypes WHERE item_type_id = ?`
	).bind(itemTypeId).first();

	if (!existing) {
		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "薪资项目不存在",
			meta: { requestId }
		}, corsHeaders);
	}

	try {
		// 检查是否有员工使用此项目
		const usage = await env.DATABASE.prepare(
			`SELECT COUNT(*) as count FROM EmployeeSalaryItems WHERE item_type_id = ? AND is_active = 1`
		).bind(itemTypeId).first();

		if (usage && usage.count > 0) {
			// 如果有员工使用，只能停用而不能删除
			await env.DATABASE.prepare(
				`UPDATE SalaryItemTypes SET is_active = 0, updated_at = datetime('now') WHERE item_type_id = ?`
			).bind(itemTypeId).run();

			return jsonResponse(200, {
				ok: true,
				data: { message: "该项目已被停用（因有员工使用，无法完全删除）" },
				meta: { requestId }
			}, corsHeaders);
		}

		// 如果没有员工使用，可以直接删除
		await env.DATABASE.prepare(
			`DELETE FROM SalaryItemTypes WHERE item_type_id = ?`
		).bind(itemTypeId).run();

		return jsonResponse(200, {
			ok: true,
			data: { message: "删除成功" },
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[deleteSalaryItemType] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "删除失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

