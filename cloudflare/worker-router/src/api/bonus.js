import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 处理月度绩效奖金调整相关请求
 */
export async function handleBonus(request, env, me, requestId, url, path) {
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
		// GET /admin/bonus/month/:month - 获取某月的绩效调整
		if (method === "GET" && path.match(/^\/internal\/api\/v1\/admin\/bonus\/month\/[\d-]+$/)) {
			const month = path.split("/")[7];
			return await getMonthlyBonus(env, requestId, corsHeaders, month);
		}

		// PUT /admin/bonus/month/:month - 保存某月的绩效调整
		if (method === "PUT" && path.match(/^\/internal\/api\/v1\/admin\/bonus\/month\/[\d-]+$/)) {
			const month = path.split("/")[7];
			return await saveMonthlyBonus(request, env, me, requestId, corsHeaders, month);
		}

		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "API 端点不存在",
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handleBonus] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 获取某月的绩效奖金调整
 */
async function getMonthlyBonus(env, requestId, corsHeaders, month) {
	// 获取所有员工
	const users = await env.DATABASE.prepare(`
		SELECT 
			user_id,
			username,
			name,
			base_salary
		FROM Users
		WHERE is_deleted = 0
		ORDER BY user_id
	`).all();

	// 获取该月的绩效调整记录
	const bonuses = await env.DATABASE.prepare(`
		SELECT 
			user_id,
			bonus_amount_cents,
			notes
		FROM MonthlyBonusAdjustments
		WHERE month = ?
	`).bind(month).all();

	const bonusMap = {};
	(bonuses.results || []).forEach(b => {
		bonusMap[b.user_id] = {
			bonusAmountCents: b.bonus_amount_cents,
			notes: b.notes || ""
		};
	});

	// 获取每个员工的默认绩效金额（从薪资项目中获取）
	const employeeData = [];
	for (const user of (users.results || [])) {
		// 查询员工的绩效奖金项目
		const perfItem = await env.DATABASE.prepare(`
			SELECT esi.amount_cents
			FROM EmployeeSalaryItems esi
			JOIN SalaryItemTypes sit ON sit.item_type_id = esi.item_type_id
			WHERE esi.user_id = ?
			  AND sit.item_code = 'PERFORMANCE'
			  AND esi.is_active = 1
			  AND esi.effective_date <= ?
			  AND (esi.expiry_date IS NULL OR esi.expiry_date >= ?)
			LIMIT 1
		`).bind(user.user_id, `${month}-01`, `${month}-01`).first();

		const defaultBonusCents = perfItem?.amount_cents || 0;
		const adjusted = bonusMap[user.user_id];

		employeeData.push({
			userId: user.user_id,
			username: user.username,
			name: user.name,
			baseSalary: user.base_salary || 0,
			defaultBonusCents,
			adjustedBonusCents: adjusted?.bonusAmountCents ?? null,
			notes: adjusted?.notes || ""
		});
	}

	return jsonResponse(200, {
		ok: true,
		data: {
			month,
			employees: employeeData
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 保存某月的绩效奖金调整
 */
async function saveMonthlyBonus(request, env, me, requestId, corsHeaders, month) {
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

	const { adjustments } = body; // adjustments: [{ userId, bonusAmountCents, notes }]

	if (!Array.isArray(adjustments)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_DATA",
			message: "调整数据格式错误",
			meta: { requestId }
		}, corsHeaders);
	}

	try {
		// 先删除该月的所有调整记录
		await env.DATABASE.prepare(
			`DELETE FROM MonthlyBonusAdjustments WHERE month = ?`
		).bind(month).run();

		// 插入新的调整记录（只插入有调整的员工）
		for (const adj of adjustments) {
			if (adj.bonusAmountCents === null || adj.bonusAmountCents === undefined) continue;

			await env.DATABASE.prepare(`
				INSERT INTO MonthlyBonusAdjustments 
				(user_id, month, bonus_amount_cents, notes, created_by)
				VALUES (?, ?, ?, ?, ?)
			`).bind(
				adj.userId,
				month,
				adj.bonusAmountCents,
				adj.notes || null,
				me.user_id
			).run();
		}

		return jsonResponse(200, {
			ok: true,
			data: { message: "保存成功" },
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[saveMonthlyBonus] Database error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "保存失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

