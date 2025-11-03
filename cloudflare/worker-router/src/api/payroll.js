import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { getSettingValue } from "./payroll-settings.js";

/**
 * 判断薪资项目是否应该在指定月份发放
 * @param {string} recurringType - 循环类型：'monthly', 'yearly', 'once'
 * @param {string|null} recurringMonths - 发放月份JSON数组，例如 "[6,9,12]"
 * @param {string} effectiveDate - 生效日期 YYYY-MM-DD
 * @param {string|null} expiryDate - 到期日期 YYYY-MM-DD
 * @param {string} targetMonth - 目标月份 YYYY-MM
 * @returns {boolean}
 */
function shouldPayInMonth(recurringType, recurringMonths, effectiveDate, expiryDate, targetMonth) {
	const [targetYear, targetMonthNum] = targetMonth.split('-');
	const currentMonthInt = parseInt(targetMonthNum);
	
	// 检查是否在有效期内
	const firstDay = `${targetYear}-${targetMonthNum}-01`;
	const lastDay = new Date(parseInt(targetYear), parseInt(targetMonthNum), 0).getDate();
	const lastDayStr = `${targetYear}-${targetMonthNum}-${String(lastDay).padStart(2, '0')}`;
	
	if (effectiveDate > lastDayStr) return false; // 还未生效
	if (expiryDate && expiryDate < firstDay) return false; // 已过期
	
	// 根据循环类型判断
	if (recurringType === 'monthly') {
		return true; // 每月都发放
	}
	
	if (recurringType === 'once') {
		// 仅一次：只在生效月份发放
		const [effYear, effMonth] = effectiveDate.split('-');
		return effYear === targetYear && effMonth === targetMonthNum;
	}
	
	if (recurringType === 'yearly') {
		// 每年指定月份：检查当前月份是否在列表中
		if (!recurringMonths) return false;
		try {
			const months = JSON.parse(recurringMonths);
			return Array.isArray(months) && months.includes(currentMonthInt);
		} catch (e) {
			console.error('Invalid recurring_months JSON:', recurringMonths);
			return false;
		}
	}
	
	return false;
}

/**
 * 计算员工的时薪基准
 * 时薪基准 = (底薪 + 经常性给与) ÷ 时薪除数（从系统设定读取，默认240）
 */
async function calculateHourlyRate(env, baseSalaryCents, regularPaymentCents) {
	const divisor = await getSettingValue(env, 'hourly_rate_divisor', 240);
	const totalCents = baseSalaryCents + regularPaymentCents;
	return Math.round(totalCents / divisor); // 四舍五入到整数（分）
}

/**
 * 计算误餐费
 * 从 Timesheets 读取平日加班记录，统计满足条件的天数
 * 返回 { mealAllowanceCents, overtimeDays }
 */
async function calculateMealAllowance(env, userId, month) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 从系统设定读取误餐费条件
	const minOvertimeHours = await getSettingValue(env, 'meal_allowance_min_overtime_hours', 1.5);
	
	// 读取该月的平日加班记录（work_type = 2 或 3）
	const timesheets = await env.DATABASE.prepare(`
		SELECT 
			work_date,
			SUM(hours) as daily_overtime_hours
		FROM Timesheets
		WHERE user_id = ?
		  AND work_date >= ?
		  AND work_date <= ?
		  AND work_type IN ('2', '3')
		  AND is_deleted = 0
		GROUP BY work_date
	`).bind(userId, firstDay, lastDayStr).all();

	let mealAllowanceCount = 0;
	
	// 统计满足条件的天数
	for (const ts of (timesheets.results || [])) {
		const dailyHours = parseFloat(ts.daily_overtime_hours) || 0;
		if (dailyHours >= minOvertimeHours) {
			mealAllowanceCount++;
		}
	}

	// 从系统设定读取误餐费单价
	const mealAllowancePerTime = await getSettingValue(env, 'meal_allowance_per_time', 100);
	const mealAllowanceCents = mealAllowanceCount * (mealAllowancePerTime * 100); // 元转分

	return {
		mealAllowanceCents,
		overtimeDays: mealAllowanceCount
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
	
	// 从系统设定读取交通补贴区间设定
	const amountPerInterval = await getSettingValue(env, 'transport_amount_per_interval', 60); // 每区间60元
	const kmPerInterval = await getSettingValue(env, 'transport_km_per_interval', 5); // 每5公里1个区间
	
	// 计算区间数（向上取整）
	const intervals = totalKm > 0 ? Math.ceil(totalKm / kmPerInterval) : 0;
	const transportCents = intervals * amountPerInterval * 100; // 元转分

	return {
		transportCents,
		totalKm,
		intervals
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
			SUM(amount) as total_days
		FROM LeaveRequests
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

	// 从系统设定读取日薪计算除数和扣款比例
	const dailySalaryDivisor = await getSettingValue(env, 'leave_daily_salary_divisor', 30);
	const sickLeaveRate = await getSettingValue(env, 'sick_leave_deduction_rate', 1.0);
	const personalLeaveRate = await getSettingValue(env, 'personal_leave_deduction_rate', 1.0);

	// 日薪 = 底薪 / 除数
	const dailySalaryCents = Math.round(baseSalaryCents / dailySalaryDivisor);
	
	// 病假扣款（按比例扣除）
	const sickDeductionCents = Math.round(sickDays * dailySalaryCents * sickLeaveRate);
	
	// 事假扣款（按比例扣除）
	const personalDeductionCents = Math.round(personalDays * dailySalaryCents * personalLeaveRate);

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
		FROM LeaveRequests
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
			esi.recurring_type,
			esi.recurring_months,
			esi.effective_date,
			esi.expiry_date,
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

	// 3. 分类统计薪资项目（根据循环类型过滤）
	let regularAllowanceCents = 0;  // 经常性津贴（计入时薪）
	let bonusCents = 0;              // 奖金
	let deductionCents = 0;          // 扣款

	const items = salaryItems.results || [];
	
	for (const item of items) {
		try {
			// 判断是否应该在当月发放
			const recurringType = item.recurring_type || 'monthly';
			const shouldPay = shouldPayInMonth(
				recurringType,
				item.recurring_months,
				item.effective_date,
				item.expiry_date,
				month
			);
			
			if (!shouldPay) {
				continue; // 不在发放月份，跳过
			}
		} catch (error) {
			console.error('[calculateEmployeePayroll] Error checking recurring:', error, item);
			// 如果判断失败，默认发放（向下兼容）
		}
		
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
	const hourlyRateCents = await calculateHourlyRate(env, baseSalaryCents, regularAllowanceCents);

	// 5. 判定全勤
	const isFullAttendance = await checkFullAttendance(env, userId, month);

	// 6. 计算误餐费（仅统计平日加班）
	const mealResult = await calculateMealAllowance(env, userId, month);
	const mealAllowanceCents = mealResult.mealAllowanceCents;
	const overtimeDays = mealResult.overtimeDays;
	
	// TODO: 加班费从工时表或其他来源读取（工时表已经计算过）
	const overtimeCents = 0;

	// 7. 计算交通补贴
	const transportResult = await calculateTransportAllowance(env, userId, month);
	const transportCents = transportResult.transportCents;
	const totalKm = transportResult.totalKm;
	const transportIntervals = transportResult.intervals || 0;

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
		overtimeDays,             // 满足误餐费条件的天数
		totalKm,
		transportIntervals,
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

