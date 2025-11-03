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
 * 计算加班费和误餐费
 * 从 Timesheets 读取加班记录并计算
 * 返回 { overtimeCents, mealAllowanceCents, overtimeHours }
 */
async function calculateOvertimeAndMeal(env, userId, month, hourlyRateCents) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 读取该月的工时记录
	const timesheets = await env.DATABASE.prepare(`
		SELECT 
			work_date,
			regular_hours,
			overtime_hours,
			overtime_1_5x,
			overtime_2x,
			overtime_3x
		FROM Timesheets
		WHERE user_id = ?
		  AND work_date >= ?
		  AND work_date <= ?
	`).bind(userId, firstDay, lastDayStr).all();

	let totalOvertimeCents = 0;
	let totalOvertimeHours = 0;
	let mealAllowanceCount = 0;

	for (const ts of (timesheets.results || [])) {
		const ot_1_5 = ts.overtime_1_5x || 0;
		const ot_2 = ts.overtime_2x || 0;
		const ot_3 = ts.overtime_3x || 0;

		// 计算加班费
		totalOvertimeCents += Math.round(ot_1_5 * hourlyRateCents * 1.5);
		totalOvertimeCents += Math.round(ot_2 * hourlyRateCents * 2);
		totalOvertimeCents += Math.round(ot_3 * hourlyRateCents * 3);

		const totalOvertimeThisDay = ot_1_5 + ot_2 + ot_3;
		totalOvertimeHours += totalOvertimeThisDay;

		// 误餐费判定：平日加班满 1.5 小时
		if (totalOvertimeThisDay >= 1.5) {
			mealAllowanceCount += 1;
		}
	}

	// 读取误餐费设定（从系统设定或默认 100 元/次）
	const mealAllowancePerTime = 100 * 100; // 100 元 = 10000 分
	const mealAllowanceCents = mealAllowanceCount * mealAllowancePerTime;

	return {
		overtimeCents: totalOvertimeCents,
		mealAllowanceCents,
		overtimeHours: totalOvertimeHours
	};
}

/**
 * 计算交通补贴
 * 从 Trips 读取外出记录并按公里数计算
 */
async function calculateTransportAllowance(env, userId, month) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 读取该月的外出记录
	const trips = await env.DATABASE.prepare(`
		SELECT SUM(distance_km) as total_km
		FROM Trips
		WHERE user_id = ?
		  AND trip_date >= ?
		  AND trip_date <= ?
		  AND status = 'approved'
	`).bind(userId, firstDay, lastDayStr).first();

	const totalKm = trips?.total_km || 0;
	
	// 读取交通补贴单价（从系统设定或默认 5 元/公里）
	const ratePerKm = 5 * 100; // 5 元 = 500 分
	const transportCents = Math.round(totalKm * ratePerKm);

	return {
		transportCents,
		totalKm
	};
}

/**
 * 计算请假扣款
 * 从 Leaves 读取病假/事假记录并扣除
 */
async function calculateLeaveDeductions(env, userId, month, baseSalaryCents) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 读取该月的请假记录（病假、事假）
	const leaves = await env.DATABASE.prepare(`
		SELECT 
			leave_type,
			SUM(days) as total_days
		FROM Leaves
		WHERE user_id = ?
		  AND start_date <= ?
		  AND end_date >= ?
		  AND status = 'approved'
		  AND leave_type IN ('sick', 'personal')
		GROUP BY leave_type
	`).bind(userId, lastDayStr, firstDay).all();

	let sickDays = 0;
	let personalDays = 0;

	for (const leave of (leaves.results || [])) {
		if (leave.leave_type === 'sick') {
			sickDays = leave.total_days || 0;
		} else if (leave.leave_type === 'personal') {
			personalDays = leave.total_days || 0;
		}
	}

	// 日薪 = 底薪 / 30
	const dailySalaryCents = Math.round(baseSalaryCents / 30);
	
	// 病假扣款（通常全额扣除）
	const sickDeductionCents = Math.round(sickDays * dailySalaryCents);
	
	// 事假扣款（全额扣除）
	const personalDeductionCents = Math.round(personalDays * dailySalaryCents);

	return {
		leaveDeductionCents: sickDeductionCents + personalDeductionCents,
		sickDays,
		personalDays
	};
}

/**
 * 判定是否全勤
 * 规则：有病假或事假则不全勤
 */
async function checkFullAttendance(env, userId, month) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 检查是否有病假或事假
	const leaves = await env.DATABASE.prepare(`
		SELECT COUNT(*) as count
		FROM Leaves
		WHERE user_id = ?
		  AND start_date <= ?
		  AND end_date >= ?
		  AND status = 'approved'
		  AND leave_type IN ('sick', 'personal')
	`).bind(userId, lastDayStr, firstDay).first();

	return (leaves?.count || 0) === 0;
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

	// 6. 计算加班费和误餐费
	const overtimeResult = await calculateOvertimeAndMeal(env, userId, month, hourlyRateCents);
	const overtimeCents = overtimeResult.overtimeCents;
	const mealAllowanceCents = overtimeResult.mealAllowanceCents;
	const overtimeHours = overtimeResult.overtimeHours;

	// 7. 计算交通补贴
	const transportResult = await calculateTransportAllowance(env, userId, month);
	const transportCents = transportResult.transportCents;
	const totalKm = transportResult.totalKm;

	// 8. 计算请假扣款
	const leaveResult = await calculateLeaveDeductions(env, userId, month, baseSalaryCents);
	const leaveDeductionCents = leaveResult.leaveDeductionCents;
	const sickDays = leaveResult.sickDays;
	const personalDays = leaveResult.personalDays;

	// 9. 检查绩效奖金调整（如果有月度调整，优先使用调整后的金额）
	const bonusAdjustment = await env.DATABASE.prepare(`
		SELECT bonus_amount_cents 
		FROM MonthlyBonusAdjustments 
		WHERE user_id = ? AND month = ?
	`).bind(userId, month).first();

	let performanceBonusCents = 0;
	if (bonusAdjustment) {
		// 使用调整后的绩效奖金
		performanceBonusCents = bonusAdjustment.bonus_amount_cents || 0;
	} else {
		// 使用默认的绩效奖金（从薪资项目中提取）
		const perfItem = items.find(i => i.item_name === '绩效奖金' || i.item_name === '績效獎金');
		if (perfItem) {
			performanceBonusCents = perfItem.amount_cents || 0;
		}
	}

	// 10. 计算总薪资
	// 应发 = 底薪 + 经常性津贴 + 奖金 + 加班费 + 误餐费 + 交通补贴 + 绩效奖金
	const grossSalaryCents = baseSalaryCents + regularAllowanceCents + bonusCents + 
	                          overtimeCents + mealAllowanceCents + transportCents + performanceBonusCents;
	
	// 总扣款 = 固定扣款 + 请假扣款
	const totalDeductionCents = deductionCents + leaveDeductionCents;
	
	// 实发 = 应发 - 总扣款
	const netSalaryCents = grossSalaryCents - totalDeductionCents;

	return {
		userId: user.user_id,
		username: user.username,
		name: user.name,
		baseSalaryCents,
		regularAllowanceCents,
		bonusCents,
		overtimeCents,
		mealAllowanceCents,
		transportCents,
		performanceBonusCents,
		deductionCents,           // 固定扣款
		leaveDeductionCents,      // 请假扣款
		totalDeductionCents,      // 总扣款
		grossSalaryCents,         // 应发薪资（扣款前）
		netSalaryCents,           // 实发薪资（扣款后）
		isFullAttendance,
		hourlyRateCents,
		// 附加信息
		overtimeHours,
		totalKm,
		sickDays,
		personalDays,
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

	// 调试日志
	console.log(`[Payroll] Method: ${method}, Path: ${path}, URL: ${url.pathname}`);

	try {
		// GET /admin/payroll/preview - 薪资预览（不保存）
		if (method === "GET" && path === "/internal/api/v1/admin/payroll/preview") {
			console.log('[Payroll] Matched: preview');
			return await previewPayroll(env, requestId, corsHeaders, url);
		}

		// POST /admin/payroll/finalize - 产制月结（保存）
		if (method === "POST" && path === "/internal/api/v1/admin/payroll/finalize") {
			console.log('[Payroll] Matched: finalize');
			return await finalizePayroll(request, env, me, requestId, corsHeaders);
		}

		// GET /admin/payroll - 查询已产制的薪资
		if (method === "GET" && path === "/internal/api/v1/admin/payroll") {
			console.log('[Payroll] Matched: get run');
			return await getPayrollRun(env, requestId, corsHeaders, url);
		}

		console.log('[Payroll] No route matched! Returning 404');
		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: `API 端点不存在: ${method} ${path}`,
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

