import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 计算员工的时薪基准
 * 时薪基准 = (底薪 + 经常性给与) ÷ 240
 */
function calculateHourlyRate(baseSalaryCents, regularPaymentCents) {
	const totalCents = baseSalaryCents + regularPaymentCents;
	return Math.round(totalCents / 240); // 四舍五入到整数（分）
}

/**
 * 计算加班费
 * 目前简化处理，实际应该从工时记录计算
 */
async function calculateOvertimePay(env, userId, month, hourlyRateCents) {
	// TODO: 从 Timesheets 读取加班记录并计算
	// 目前返回 0，待后续实现
	return 0;
}

/**
 * 判定是否全勤
 * 规则：有病假或事假则不全勤
 */
async function checkFullAttendance(env, userId, month) {
	// TODO: 从 Leaves 读取请假记录
	// 目前默认全勤，待后续实现
	return true;
}

/**
 * 计算单个员工的月度薪资
 */
async function calculateEmployeePayroll(env, userId, month) {
	// 1. 读取员工基本信息
	const user = await env.DATABASE.prepare(
		`SELECT user_id, username, name, base_salary FROM Users WHERE user_id = ? AND is_deleted = 0`
	).bind(userId).first();

	if (!user) {
		return null;
	}

	const baseSalaryCents = (user.base_salary || 0) * 100; // 转换为分

	// 2. 读取该月有效的薪资项目
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	const salaryItems = await env.DATABASE.prepare(`
		SELECT 
			esi.amount_cents,
			sit.category,
			sit.item_name,
			sit.is_regular_payment
		FROM EmployeeSalaryItems esi
		JOIN SalaryItemTypes sit ON sit.item_type_id = esi.item_type_id
		WHERE esi.user_id = ?
		  AND esi.is_active = 1
		  AND sit.is_active = 1
		  AND esi.effective_date <= ?
		  AND (esi.expiry_date IS NULL OR esi.expiry_date >= ?)
	`).bind(userId, lastDayStr, firstDay).all();

	// 3. 分类统计薪资项目
	let regularAllowanceCents = 0;  // 经常性津贴（计入时薪）
	let bonusCents = 0;              // 奖金
	let deductionCents = 0;          // 扣款

	const items = salaryItems.results || [];
	
	for (const item of items) {
		const amount = item.amount_cents || 0;
		
		if (item.category === 'deduction') {
			// 扣款类别：累加到扣款总额
			deductionCents += amount;
		} else if (item.category === 'bonus') {
			// 奖金类别
			bonusCents += amount;
			// 如果是经常性给与的奖金（如全勤），也计入时薪基准
			if (item.is_regular_payment) {
				regularAllowanceCents += amount;
			}
		} else if (item.category === 'allowance') {
			// 津贴类别
			// 如果是经常性给与，计入时薪基准
			if (item.is_regular_payment) {
				regularAllowanceCents += amount;
			} else {
				// 非经常性津贴（如误餐费）计入奖金
				bonusCents += amount;
			}
		}
	}

	// 4. 计算时薪基准（用于加班费计算）
	const hourlyRateCents = calculateHourlyRate(baseSalaryCents, regularAllowanceCents);

	// 5. 判定全勤
	const isFullAttendance = await checkFullAttendance(env, userId, month);

	// 6. 计算加班费
	const overtimeCents = await calculateOvertimePay(env, userId, month, hourlyRateCents);

	// 7. 计算总薪资
	const grossSalaryCents = baseSalaryCents + regularAllowanceCents + bonusCents + overtimeCents;
	const netSalaryCents = grossSalaryCents - deductionCents;

	return {
		userId: user.user_id,
		username: user.username,
		name: user.name,
		baseSalaryCents,
		regularAllowanceCents,
		bonusCents,
		overtimeCents,
		deductionCents,
		grossSalaryCents,  // 应发薪资（扣款前）
		netSalaryCents,    // 实发薪资（扣款后）
		isFullAttendance,
		hourlyRateCents,
	};
}

/**
 * 处理薪资相关请求
 */
export async function handlePayroll(request, env, me, requestId, url, path) {
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
		// GET /admin/payroll/preview - 薪资预览（不保存）
		if (method === "GET" && path === "/internal/api/v1/admin/payroll/preview") {
			return await previewPayroll(env, requestId, corsHeaders, url);
		}

		// POST /admin/payroll/finalize - 产制月结（保存）
		if (method === "POST" && path === "/internal/api/v1/admin/payroll/finalize") {
			return await finalizePayroll(request, env, me, requestId, corsHeaders);
		}

		// GET /admin/payroll - 查询已产制的薪资
		if (method === "GET" && path === "/internal/api/v1/admin/payroll") {
			return await getPayrollRun(env, requestId, corsHeaders, url);
		}

		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "API 端点不存在",
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handlePayroll] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 薪资预览（不保存到数据库）
 */
async function previewPayroll(env, requestId, corsHeaders, url) {
	const month = url.searchParams.get('month');
	
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_MONTH",
			message: "月份格式错误，应为 YYYY-MM",
			meta: { requestId }
		}, corsHeaders);
	}

	// 获取所有活跃员工
	const users = await env.DATABASE.prepare(
		`SELECT user_id FROM Users WHERE is_deleted = 0 ORDER BY user_id`
	).all();

	const results = [];
	for (const user of (users.results || [])) {
		const payroll = await calculateEmployeePayroll(env, user.user_id, month);
		if (payroll) {
			results.push(payroll);
		}
	}

	return jsonResponse(200, {
		ok: true,
		data: {
			month,
			users: results,
			total: results.length
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 产制月结（保存到数据库）
 */
async function finalizePayroll(request, env, me, requestId, corsHeaders) {
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

	const { month, idempotency_key } = body;

	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_MONTH",
			message: "月份格式错误，应为 YYYY-MM",
			meta: { requestId }
		}, corsHeaders);
	}

	// 检查是否已经产制过
	const existing = await env.DATABASE.prepare(
		`SELECT run_id FROM PayrollRuns WHERE month = ?`
	).bind(month).first();

	if (existing) {
		return jsonResponse(409, {
			ok: false,
			code: "ALREADY_FINALIZED",
			message: "该月份已经产制过",
			data: { runId: existing.run_id },
			meta: { requestId }
		}, corsHeaders);
	}

	// 生成 run_id
	const runId = `run_${month}_${Date.now()}`;

	// 计算所有员工薪资
	const users = await env.DATABASE.prepare(
		`SELECT user_id FROM Users WHERE is_deleted = 0 ORDER BY user_id`
	).all();

	const results = [];
	for (const user of (users.results || [])) {
		const payroll = await calculateEmployeePayroll(env, user.user_id, month);
		if (payroll) {
			results.push(payroll);
		}
	}

	// 保存到数据库（使用事务）
	try {
		// 创建 PayrollRun 记录
		await env.DATABASE.prepare(
			`INSERT INTO PayrollRuns (run_id, month, idempotency_key, created_by) VALUES (?, ?, ?, ?)`
		).bind(runId, month, idempotency_key || null, me.user_id).run();

		// 批量插入 MonthlyPayroll 记录
		for (const payroll of results) {
			await env.DATABASE.prepare(`
				INSERT INTO MonthlyPayroll 
				(run_id, user_id, base_salary_cents, regular_allowance_cents, bonus_cents, overtime_cents, total_cents, is_full_attendance)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`).bind(
				runId,
				payroll.userId,
				payroll.baseSalaryCents,
				payroll.regularAllowanceCents,
				payroll.bonusCents,
				payroll.overtimeCents,
				payroll.netSalaryCents,  // total_cents 存储实发薪资
				payroll.isFullAttendance ? 1 : 0
			).run();
		}

		return jsonResponse(201, {
			ok: true,
			data: {
				runId,
				month,
				totalEmployees: results.length
			},
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[finalizePayroll] Database error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "保存失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 查询已产制的薪资记录
 */
async function getPayrollRun(env, requestId, corsHeaders, url) {
	const month = url.searchParams.get('month');
	
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_MONTH",
			message: "月份格式错误，应为 YYYY-MM",
			meta: { requestId }
		}, corsHeaders);
	}

	const run = await env.DATABASE.prepare(
		`SELECT run_id, month, created_at FROM PayrollRuns WHERE month = ?`
	).bind(month).first();

	if (!run) {
		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "该月份尚未产制",
			meta: { requestId }
		}, corsHeaders);
	}

	return jsonResponse(200, {
		ok: true,
		data: {
			runId: run.run_id,
			month: run.month,
			createdAt: run.created_at
		},
		meta: { requestId }
	}, corsHeaders);
}

