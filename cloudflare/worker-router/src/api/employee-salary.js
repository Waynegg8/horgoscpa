import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 处理员工薪资设定相关请求
 */
export async function handleEmployeeSalary(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);

	// 检查管理员权限
	if (!me || !me.is_admin) {
		return jsonResponse(403, {
			ok: false,
			code: "FORBIDDEN",
			message: "此功能仅限管理员使用",
			meta: { requestId }
		}, corsHeaders);
	}

	const method = request.method;

	try {
		// GET /admin/users - 获取所有员工列表
		if (method === "GET" && path === "/internal/api/v1/admin/users") {
			return await getAllUsers(env, requestId, corsHeaders);
		}

		// GET /admin/users/:id/salary - 获取某个员工的薪资设定
		if (method === "GET" && path.match(/^\/internal\/api\/v1\/admin\/users\/\d+\/salary$/)) {
			const userId = parseInt(path.split("/")[6]);
			return await getUserSalary(env, requestId, corsHeaders, userId);
		}

		// PUT /admin/users/:id/salary - 更新员工薪资设定（底薪 + 薪资项目）
		if (method === "PUT" && path.match(/^\/internal\/api\/v1\/admin\/users\/\d+\/salary$/)) {
			const userId = parseInt(path.split("/")[6]);
			return await updateUserSalary(request, env, me, requestId, corsHeaders, userId);
		}

		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "API 端点不存在",
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handleEmployeeSalary] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 获取所有员工列表
 */
async function getAllUsers(env, requestId, corsHeaders) {
	const users = await env.DATABASE.prepare(`
		SELECT 
			user_id,
			username,
			name,
			email,
			base_salary,
			is_admin,
			created_at
		FROM Users
		WHERE is_deleted = 0
		ORDER BY user_id
	`).all();

	const results = (users.results || []).map(u => ({
		userId: u.user_id,
		username: u.username,
		name: u.name,
		email: u.email,
		baseSalary: u.base_salary || 0,
		isAdmin: !!u.is_admin,
		createdAt: u.created_at
	}));

	return jsonResponse(200, {
		ok: true,
		data: {
			users: results,
			total: results.length
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 获取某个员工的薪资设定
 */
async function getUserSalary(env, requestId, corsHeaders, userId) {
	// 读取员工基本信息
	const user = await env.DATABASE.prepare(`
		SELECT 
			user_id,
			username,
			name,
			base_salary,
			salary_notes
		FROM Users
		WHERE user_id = ? AND is_deleted = 0
	`).bind(userId).first();

	if (!user) {
		return jsonResponse(404, {
			ok: false,
			code: "USER_NOT_FOUND",
			message: "员工不存在",
			meta: { requestId }
		}, corsHeaders);
	}

	// 读取员工的薪资项目
	const salaryItems = await env.DATABASE.prepare(`
		SELECT 
			esi.employee_item_id,
			esi.item_type_id,
			esi.amount_cents,
			esi.effective_date,
			esi.expiry_date,
			esi.notes,
			esi.is_active,
			esi.recurring_type,
			esi.recurring_months,
			sit.item_code,
			sit.item_name,
			sit.category
		FROM EmployeeSalaryItems esi
		JOIN SalaryItemTypes sit ON sit.item_type_id = esi.item_type_id
		WHERE esi.user_id = ?
		ORDER BY sit.display_order, esi.employee_item_id
	`).bind(userId).all();

	const items = (salaryItems.results || []).map(item => ({
		employeeItemId: item.employee_item_id,
		itemTypeId: item.item_type_id,
		itemCode: item.item_code,
		itemName: item.item_name,
		category: item.category,
		amountCents: item.amount_cents || 0,
		effectiveDate: item.effective_date,
		expiryDate: item.expiry_date,
		notes: item.notes || "",
		isActive: !!item.is_active,
		recurringType: item.recurring_type || 'monthly',
		recurringMonths: item.recurring_months || null
	}));

	return jsonResponse(200, {
		ok: true,
		data: {
			userId: user.user_id,
			username: user.username,
			name: user.name,
			baseSalary: user.base_salary || 0,
			salaryNotes: user.salary_notes || "",
			salaryItems: items
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 更新员工薪资设定
 */
async function updateUserSalary(request, env, me, requestId, corsHeaders, userId) {
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

	const { baseSalary, salaryNotes, salaryItems } = body;

	// 验证数据
	if (baseSalary !== undefined && (typeof baseSalary !== 'number' || baseSalary < 0)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_BASE_SALARY",
			message: "底薪必须为非负数",
			meta: { requestId }
		}, corsHeaders);
	}

	try {
		// 更新底薪和备注
		if (baseSalary !== undefined || salaryNotes !== undefined) {
			const updates = [];
			const params = [];

			if (baseSalary !== undefined) {
				updates.push("base_salary = ?");
				params.push(baseSalary);
			}
			if (salaryNotes !== undefined) {
				updates.push("salary_notes = ?");
				params.push(salaryNotes);
			}

			params.push(userId);

			await env.DATABASE.prepare(
				`UPDATE Users SET ${updates.join(", ")} WHERE user_id = ?`
			).bind(...params).run();
		}

		// 更新薪资项目（如果提供）
		if (Array.isArray(salaryItems)) {
			console.log(`[updateUserSalary] 收到 ${salaryItems.length} 个薪资项目`);
			
			// 先删除所有现有项目（彻底删除，而不是停用）
			await env.DATABASE.prepare(
				`DELETE FROM EmployeeSalaryItems WHERE user_id = ?`
			).bind(userId).run();
			
			console.log(`[updateUserSalary] 已删除员工 ${userId} 的旧薪资项目`);

			// 添加新的项目
			for (const item of salaryItems) {
				if (!item.itemTypeId || item.amountCents === undefined || item.amountCents === null) {
					console.warn(`[updateUserSalary] 跳过无效项目:`, item);
					continue;
				}

				console.log(`[updateUserSalary] 插入项目: itemTypeId=${item.itemTypeId}, amountCents=${item.amountCents}`);

				await env.DATABASE.prepare(`
					INSERT INTO EmployeeSalaryItems 
					(user_id, item_type_id, amount_cents, effective_date, expiry_date, notes, created_by, is_active, recurring_type, recurring_months)
					VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
				`).bind(
					userId,
					item.itemTypeId,
					item.amountCents,
					item.effectiveDate || new Date().toISOString().split('T')[0],
					item.expiryDate || null,
					item.notes || null,
					me.user_id,
					item.recurringType || 'monthly',
					item.recurringMonths || null
				).run();
			}
			
			console.log(`[updateUserSalary] ✓ 已保存 ${salaryItems.length} 个薪资项目`);
		}

		// 返回更新后的数据
		return await getUserSalary(env, requestId, corsHeaders, userId);

	} catch (error) {
		console.error("[updateUserSalary] Database error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "更新失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

