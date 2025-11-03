import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 处理年终奖金相关请求
 */
export async function handleYearEnd(request, env, me, requestId, url, path) {
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
		// GET /admin/yearend/:year - 获取某年的年终奖金
		if (method === "GET" && path.match(/^\/internal\/api\/v1\/admin\/yearend\/\d+$/)) {
			const year = parseInt(path.split("/")[6]);
			return await getYearEndBonus(env, requestId, corsHeaders, year);
		}

		// PUT /admin/yearend/:year - 保存某年的年终奖金
		if (method === "PUT" && path.match(/^\/internal\/api\/v1\/admin\/yearend\/\d+$/)) {
			const year = parseInt(path.split("/")[6]);
			return await saveYearEndBonus(request, env, me, requestId, corsHeaders, year);
		}

		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "API 端点不存在",
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handleYearEnd] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 获取某年的年终奖金
 */
async function getYearEndBonus(env, requestId, corsHeaders, year) {
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

	// 获取该年的年终奖金记录
	const bonuses = await env.DATABASE.prepare(`
		SELECT 
			user_id,
			amount_cents,
			payment_date,
			notes
		FROM YearEndBonus
		WHERE year = ?
	`).bind(year).all();

	const bonusMap = {};
	(bonuses.results || []).forEach(b => {
		bonusMap[b.user_id] = {
			amountCents: b.amount_cents,
			paymentDate: b.payment_date,
			notes: b.notes || ""
		};
	});

	const employeeData = (users.results || []).map(user => {
		const bonus = bonusMap[user.user_id];
		return {
			userId: user.user_id,
			username: user.username,
			name: user.name,
			baseSalary: user.base_salary || 0,
			amountCents: bonus?.amountCents || 0,
			paymentDate: bonus?.paymentDate || null,
			notes: bonus?.notes || ""
		};
	});

	// 计算统计数据
	const totalCents = employeeData.reduce((sum, e) => sum + e.amountCents, 0);
	const count = employeeData.filter(e => e.amountCents > 0).length;
	const averageCents = count > 0 ? Math.round(totalCents / count) : 0;

	return jsonResponse(200, {
		ok: true,
		data: {
			year,
			employees: employeeData,
			summary: {
				totalCents,
				count,
				averageCents
			}
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 保存某年的年终奖金
 */
async function saveYearEndBonus(request, env, me, requestId, corsHeaders, year) {
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

	const { bonuses } = body; // bonuses: [{ userId, amountCents, paymentDate, notes }]

	if (!Array.isArray(bonuses)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_DATA",
			message: "奖金数据格式错误",
			meta: { requestId }
		}, corsHeaders);
	}

	try {
		// 先删除该年的所有奖金记录
		await env.DATABASE.prepare(
			`DELETE FROM YearEndBonus WHERE year = ?`
		).bind(year).run();

		// 插入新的奖金记录（只插入有金额的员工）
		for (const bonus of bonuses) {
			if (!bonus.amountCents || bonus.amountCents <= 0) continue;

			await env.DATABASE.prepare(`
				INSERT INTO YearEndBonus 
				(user_id, year, amount_cents, payment_date, notes, created_by)
				VALUES (?, ?, ?, ?, ?, ?)
			`).bind(
				bonus.userId,
				year,
				bonus.amountCents,
				bonus.paymentDate || null,
				bonus.notes || null,
				me.user_id
			).run();
		}

		return jsonResponse(200, {
			ok: true,
			data: { message: "保存成功" },
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[saveYearEndBonus] Database error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "保存失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

