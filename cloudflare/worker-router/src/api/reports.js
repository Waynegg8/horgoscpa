import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleReports(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	// 只有管理员可以访问报表
	if (!me.is_admin) {
		return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
	}

	// ============================================================
	// 月度报表 APIs
	// ============================================================

	if (path === "/internal/api/v1/reports/monthly/revenue") {
		return await handleMonthlyRevenue(request, env, me, requestId, url, corsHeaders);
	}

	if (path === "/internal/api/v1/reports/monthly/payroll") {
		return await handleMonthlyPayroll(request, env, me, requestId, url, corsHeaders);
	}

	if (path === "/internal/api/v1/reports/monthly/employee-performance") {
		return await handleMonthlyEmployeePerformance(request, env, me, requestId, url, corsHeaders);
	}

	if (path === "/internal/api/v1/reports/monthly/client-profitability") {
		return await handleMonthlyClientProfitability(request, env, me, requestId, url, corsHeaders);
	}

	// ============================================================
	// 年度报表 APIs
	// ============================================================

	if (path === "/internal/api/v1/reports/annual/revenue") {
		return await handleAnnualRevenue(request, env, me, requestId, url, corsHeaders);
	}

	if (path === "/internal/api/v1/reports/annual/payroll") {
		return await handleAnnualPayroll(request, env, me, requestId, url, corsHeaders);
	}

	if (path === "/internal/api/v1/reports/annual/employee-performance") {
		return await handleAnnualEmployeePerformance(request, env, me, requestId, url, corsHeaders);
	}

	if (path === "/internal/api/v1/reports/annual/client-profitability") {
		return await handleAnnualClientProfitability(request, env, me, requestId, url, corsHeaders);
	}

	return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "找不到此報表", meta: { requestId } }, corsHeaders);
}

// ============================================================
// 工时类型定义（与payroll.js保持一致）
// ============================================================
const WORK_TYPES = {
	1: { name: '正常工時', multiplier: 1.0, isOvertime: false },
	2: { name: '平日加班（前2h）', multiplier: 1.34, isOvertime: true },
	3: { name: '平日加班（後2h）', multiplier: 1.67, isOvertime: true },
	4: { name: '休息日（前2h）', multiplier: 1.34, isOvertime: true },
	5: { name: '休息日（3-8h）', multiplier: 1.67, isOvertime: true },
	6: { name: '休息日（9-12h）', multiplier: 2.67, isOvertime: true },
	7: { name: '國定假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },
	8: { name: '國定假日（9-10h）', multiplier: 1.34, isOvertime: true },
	9: { name: '國定假日（11-12h）', multiplier: 1.67, isOvertime: true },
	10: { name: '例假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },
	11: { name: '例假日（9-10h）', multiplier: 1.34, isOvertime: true },
	12: { name: '例假日（11-12h）', multiplier: 1.67, isOvertime: true },
};

// 计算加权工时
function calculateWeightedHours(workTypeId, hours) {
	const workType = WORK_TYPES[workTypeId];
	if (!workType) return hours;
	
	if (workType.special === 'fixed_8h') {
		return 8; // 固定8小时
	}
	
	return hours * workType.multiplier;
}

// ============================================================
// 月度收款报表
// ============================================================
async function handleMonthlyRevenue(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);
		const month = parseInt(p.get("month") || "0", 10);

		if (!Number.isFinite(year) || year < 2000 || !Number.isFinite(month) || month < 1 || month > 12) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢月份", meta:{ requestId } }, corsHeaders);
		}

		const ym = `${year}-${String(month).padStart(2,'0')}`;

		// 1. 月度收款概况（按服务月份统计）
		const summaryRow = await env.DATABASE.prepare(`
			SELECT 
				SUM(r.total_amount) as total_receivable,
				SUM(COALESCE(r.paid_amount, 0)) as total_received,
				SUM(CASE WHEN r.status IN ('unpaid', 'partial') AND r.due_date < date('now') 
					THEN r.total_amount - COALESCE(r.paid_amount, 0) 
					ELSE 0 END) as overdue_amount
			FROM Receipts r
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND r.service_month = ?
		`).bind(ym).first();

		const totalReceivable = Number(summaryRow?.total_receivable || 0);
		const totalReceived = Number(summaryRow?.total_received || 0);
		const overdueAmount = Number(summaryRow?.overdue_amount || 0);
		const collectionRate = totalReceivable > 0 ? (totalReceived / totalReceivable * 100) : 0;

		// 2. 按客户明细
		const clientDetails = await env.DATABASE.prepare(`
			SELECT 
				c.client_id,
				c.company_name as client_name,
				s.service_name,
				r.receipt_id,
				r.receipt_date,
				r.total_amount,
				COALESCE(r.paid_amount, 0) as paid_amount,
				(r.total_amount - COALESCE(r.paid_amount, 0)) as unpaid_amount,
				r.due_date,
				r.status,
				CASE 
					WHEN r.status IN ('unpaid', 'partial') AND r.due_date < date('now') THEN 1
					ELSE 0
				END as is_overdue
			FROM Receipts r
			LEFT JOIN Clients c ON c.client_id = r.client_id
			LEFT JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
			LEFT JOIN Services s ON s.service_id = cs.service_id
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND r.service_month = ?
			ORDER BY c.company_name, s.service_name
		`).bind(ym).all();

		const data = {
			summary: {
				totalReceivable,
				totalReceived,
				collectionRate: Number(collectionRate.toFixed(2)),
				overdueAmount
			},
			clientDetails: (clientDetails?.results || []).map(r => ({
				clientId: r.client_id,
				clientName: r.client_name || '未知客户',
				serviceName: r.service_name || '未分类',
				receiptId: r.receipt_id,
				receiptDate: r.receipt_date,
				totalAmount: Number(r.total_amount || 0),
				paidAmount: Number(r.paid_amount || 0),
				unpaidAmount: Number(r.unpaid_amount || 0),
				collectionRate: r.total_amount > 0 ? Number((r.paid_amount / r.total_amount * 100).toFixed(2)) : 0,
				dueDate: r.due_date,
				status: r.status,
				isOverdue: Boolean(r.is_overdue)
			}))
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[MonthlyRevenue] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}

// ============================================================
// 年度收款报表
// ============================================================
async function handleAnnualRevenue(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);

		if (!Number.isFinite(year) || year < 2000) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢年度", meta:{ requestId } }, corsHeaders);
		}

		// 年度收款概况
		const summaryRow = await env.DATABASE.prepare(`
			SELECT 
				SUM(r.total_amount) as total_receivable,
				SUM(COALESCE(r.paid_amount, 0)) as total_received,
				SUM(CASE WHEN r.status IN ('unpaid', 'partial') AND r.due_date < date('now') 
					THEN r.total_amount - COALESCE(r.paid_amount, 0) 
					ELSE 0 END) as overdue_amount
			FROM Receipts r
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND substr(r.service_month, 1, 4) = ?
		`).bind(String(year)).first();

		const totalReceivable = Number(summaryRow?.total_receivable || 0);
		const totalReceived = Number(summaryRow?.total_received || 0);
		const overdueAmount = Number(summaryRow?.overdue_amount || 0);
		const collectionRate = totalReceivable > 0 ? (totalReceived / totalReceivable * 100) : 0;

		// 月度收款趋势
		const monthlyTrend = await env.DATABASE.prepare(`
			SELECT 
				CAST(substr(r.service_month, 6, 2) AS INTEGER) as month,
				SUM(r.total_amount) as total_receivable,
				SUM(COALESCE(r.paid_amount, 0)) as total_received,
				SUM(CASE WHEN r.status IN ('unpaid', 'partial') AND r.due_date < date('now') 
					THEN r.total_amount - COALESCE(r.paid_amount, 0) 
					ELSE 0 END) as overdue_amount
			FROM Receipts r
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND substr(r.service_month, 1, 4) = ?
			GROUP BY month
			ORDER BY month
		`).bind(String(year)).all();

		// 按客户年度汇总
		const clientSummary = await env.DATABASE.prepare(`
			SELECT 
				c.client_id,
				c.company_name as client_name,
				SUM(r.total_amount) as total_receivable,
				SUM(COALESCE(r.paid_amount, 0)) as total_received,
				SUM(r.total_amount - COALESCE(r.paid_amount, 0)) as unpaid_amount
			FROM Receipts r
			LEFT JOIN Clients c ON c.client_id = r.client_id
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND substr(r.service_month, 1, 4) = ?
			GROUP BY c.client_id, c.company_name
			ORDER BY total_receivable DESC
		`).bind(String(year)).all();

		// 按服务类型年度汇总
		const serviceTypeSummary = await env.DATABASE.prepare(`
			SELECT 
				s.service_name,
				SUM(r.total_amount) as total_receivable,
				SUM(COALESCE(r.paid_amount, 0)) as total_received,
				SUM(r.total_amount - COALESCE(r.paid_amount, 0)) as unpaid_amount
			FROM Receipts r
			LEFT JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
			LEFT JOIN Services s ON s.service_id = cs.service_id
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND substr(r.service_month, 1, 4) = ?
			GROUP BY s.service_name
			ORDER BY total_receivable DESC
		`).bind(String(year)).all();

		const data = {
			summary: {
				totalReceivable,
				totalReceived,
				collectionRate: Number(collectionRate.toFixed(2)),
				overdueAmount
			},
			monthlyTrend: (monthlyTrend?.results || []).map(r => ({
				month: r.month,
				totalReceivable: Number(r.total_receivable || 0),
				totalReceived: Number(r.total_received || 0),
				collectionRate: r.total_receivable > 0 ? Number((r.total_received / r.total_receivable * 100).toFixed(2)) : 0,
				overdueAmount: Number(r.overdue_amount || 0)
			})),
			clientSummary: (clientSummary?.results || []).map(r => ({
				clientId: r.client_id,
				clientName: r.client_name || '未知客户',
				totalReceivable: Number(r.total_receivable || 0),
				totalReceived: Number(r.total_received || 0),
				unpaidAmount: Number(r.unpaid_amount || 0),
				collectionRate: r.total_receivable > 0 ? Number((r.total_received / r.total_receivable * 100).toFixed(2)) : 0,
				avgMonthlyRevenue: Number((r.total_receivable / 12).toFixed(2))
			})),
			serviceTypeSummary: (serviceTypeSummary?.results || []).map(r => ({
				serviceName: r.service_name || '未分类',
				totalReceivable: Number(r.total_receivable || 0),
				totalReceived: Number(r.total_received || 0),
				unpaidAmount: Number(r.unpaid_amount || 0),
				collectionRate: r.total_receivable > 0 ? Number((r.total_received / r.total_receivable * 100).toFixed(2)) : 0
			}))
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[AnnualRevenue] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}

// ============================================================
// 月度薪资报表
// ============================================================
async function handleMonthlyPayroll(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);
		const month = parseInt(p.get("month") || "0", 10);

		if (!Number.isFinite(year) || year < 2000 || !Number.isFinite(month) || month < 1 || month > 12) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢月份", meta:{ requestId } }, corsHeaders);
		}

		const { calculateEmployeePayroll } = await import('./payroll.js');
		
		const usersResult = await env.DATABASE.prepare(`
			SELECT user_id, username, name, base_salary
			FROM Users
			WHERE is_deleted = 0
			ORDER BY name
		`).all();

		const users = usersResult?.results || [];
		const payrollData = [];
		let totalGrossSalary = 0;
		let totalNetSalary = 0;

		for (const user of users) {
			const payroll = await calculateEmployeePayroll(env, user.user_id, year, month);
			
			// 获取月度绩效奖金
			const monthlyBonusRow = await env.DATABASE.prepare(`
				SELECT amount_cents 
				FROM MonthlyBonus 
				WHERE user_id = ? AND year = ? AND month = ? AND is_deleted = 0
			`).bind(user.user_id, year, month).first();
			const performanceBonus = (monthlyBonusRow?.amount_cents || 0) / 100;

			// 获取年终奖金（在12月显示）
			let yearEndBonus = 0;
			if (month === 12) {
				const yearEndBonusRow = await env.DATABASE.prepare(`
					SELECT amount_cents 
					FROM YearEndBonus 
					WHERE user_id = ? AND year = ? AND is_deleted = 0
				`).bind(user.user_id, year).first();
				yearEndBonus = (yearEndBonusRow?.amount_cents || 0) / 100;
			}
			
			const grossSalary = (payroll.grossSalaryCents / 100) + performanceBonus + yearEndBonus;
			const netSalary = (payroll.netSalaryCents / 100) + performanceBonus + yearEndBonus;

			payrollData.push({
				userId: user.user_id,
				username: user.username,
				name: user.name || user.username,
				baseSalary: payroll.baseSalaryCents / 100,
				regularAllowance: payroll.totalRegularAllowanceCents / 100,
				irregularAllowance: payroll.totalIrregularAllowanceCents / 100,
				bonusAmount: payroll.totalBonusCents / 100,
				fullAttendanceBonus: payroll.isFullAttendance ? (payroll.fullAttendanceBonusCents / 100) : 0,
				overtimePay: payroll.overtimeCents / 100,
				mealAllowance: payroll.mealAllowanceCents / 100,
				transportSubsidy: payroll.transportSubsidyCents / 100,
				performanceBonus,
				yearEndBonus,
				fixedDeduction: payroll.totalFixedDeductionCents / 100,
				leaveDeduction: payroll.leaveDeductionCents / 100,
				grossSalary,
				netSalary
			});

			totalGrossSalary += grossSalary;
			totalNetSalary += netSalary;
		}

		// 薪资构成分析
		const composition = {
			baseSalary: payrollData.reduce((sum, p) => sum + p.baseSalary, 0),
			regularAllowance: payrollData.reduce((sum, p) => sum + p.regularAllowance, 0),
			irregularAllowance: payrollData.reduce((sum, p) => sum + p.irregularAllowance, 0),
			bonusAmount: payrollData.reduce((sum, p) => sum + p.bonusAmount, 0),
			fullAttendanceBonus: payrollData.reduce((sum, p) => sum + p.fullAttendanceBonus, 0),
			overtimePay: payrollData.reduce((sum, p) => sum + p.overtimePay, 0),
			mealAllowance: payrollData.reduce((sum, p) => sum + p.mealAllowance, 0),
			transportSubsidy: payrollData.reduce((sum, p) => sum + p.transportSubsidy, 0),
			performanceBonus: payrollData.reduce((sum, p) => sum + p.performanceBonus, 0),
			yearEndBonus: payrollData.reduce((sum, p) => sum + p.yearEndBonus, 0),
			fixedDeduction: payrollData.reduce((sum, p) => sum + p.fixedDeduction, 0),
			leaveDeduction: payrollData.reduce((sum, p) => sum + p.leaveDeduction, 0)
		};

		const data = {
			summary: {
				totalGrossSalary,
				totalNetSalary,
				employeeCount: users.length,
				avgGrossSalary: users.length > 0 ? totalGrossSalary / users.length : 0,
				avgNetSalary: users.length > 0 ? totalNetSalary / users.length : 0
			},
			payrollDetails: payrollData,
			composition
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[MonthlyPayroll] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}

// ============================================================
// 年度薪资报表
// ============================================================
async function handleAnnualPayroll(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);

		if (!Number.isFinite(year) || year < 2000) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢年度", meta:{ requestId } }, corsHeaders);
		}

		const { calculateEmployeePayroll } = await import('./payroll.js');

		const usersResult = await env.DATABASE.prepare(`
			SELECT user_id, username, name, base_salary
			FROM Users
			WHERE is_deleted = 0
			ORDER BY name
		`).all();

		const users = usersResult?.results || [];
		
		// 月度薪资趋势
		const monthlyTrend = [];
		for (let month = 1; month <= 12; month++) {
			let monthTotal = 0;
			let monthNetTotal = 0;
			for (const user of users) {
				const payroll = await calculateEmployeePayroll(env, user.user_id, year, month);
				
				const monthlyBonusRow = await env.DATABASE.prepare(`
					SELECT amount_cents FROM MonthlyBonus 
					WHERE user_id = ? AND year = ? AND month = ? AND is_deleted = 0
				`).bind(user.user_id, year, month).first();
				const performanceBonus = (monthlyBonusRow?.amount_cents || 0) / 100;

				let yearEndBonus = 0;
				if (month === 12) {
					const yearEndBonusRow = await env.DATABASE.prepare(`
						SELECT amount_cents FROM YearEndBonus 
						WHERE user_id = ? AND year = ? AND is_deleted = 0
					`).bind(user.user_id, year).first();
					yearEndBonus = (yearEndBonusRow?.amount_cents || 0) / 100;
				}

				monthTotal += (payroll.grossSalaryCents / 100) + performanceBonus + yearEndBonus;
				monthNetTotal += (payroll.netSalaryCents / 100) + performanceBonus + yearEndBonus;
			}
			monthlyTrend.push({
				month,
				totalGrossSalary: monthTotal,
				totalNetSalary: monthNetTotal,
				employeeCount: users.length,
				avgGrossSalary: users.length > 0 ? monthTotal / users.length : 0
			});
		}

		// 按员工年度汇总
		const employeeSummary = [];
		for (const user of users) {
			let annualGross = 0;
			let annualNet = 0;
			let totalOvertime = 0;
			let totalPerformance = 0;
			let totalYearEnd = 0;

			for (let month = 1; month <= 12; month++) {
				const payroll = await calculateEmployeePayroll(env, user.user_id, year, month);
				
				const monthlyBonusRow = await env.DATABASE.prepare(`
					SELECT amount_cents FROM MonthlyBonus 
					WHERE user_id = ? AND year = ? AND month = ? AND is_deleted = 0
				`).bind(user.user_id, year, month).first();
				const perfBonus = (monthlyBonusRow?.amount_cents || 0) / 100;
				totalPerformance += perfBonus;

				annualGross += (payroll.grossSalaryCents / 100) + perfBonus;
				annualNet += (payroll.netSalaryCents / 100) + perfBonus;
				totalOvertime += payroll.overtimeCents / 100;
			}

			const yearEndBonusRow = await env.DATABASE.prepare(`
				SELECT amount_cents FROM YearEndBonus 
				WHERE user_id = ? AND year = ? AND is_deleted = 0
			`).bind(user.user_id, year).first();
			totalYearEnd = (yearEndBonusRow?.amount_cents || 0) / 100;
			annualGross += totalYearEnd;
			annualNet += totalYearEnd;

			employeeSummary.push({
				userId: user.user_id,
				name: user.name || user.username,
				annualGrossSalary: annualGross,
				annualNetSalary: annualNet,
				avgMonthlySalary: annualGross / 12,
				totalOvertimePay: totalOvertime,
				totalPerformanceBonus: totalPerformance,
				totalYearEndBonus: totalYearEnd
			});
		}

		const totalGross = monthlyTrend.reduce((sum, m) => sum + m.totalGrossSalary, 0);
		const totalNet = monthlyTrend.reduce((sum, m) => sum + m.totalNetSalary, 0);

		const data = {
			summary: {
				annualGrossSalary: totalGross,
				annualNetSalary: totalNet,
				avgMonthlySalary: totalGross / 12,
				avgEmployeeCount: users.length
			},
			monthlyTrend,
			employeeSummary
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[AnnualPayroll] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}

// ============================================================
// 月度员工产值报表（完整实现）
// ============================================================
async function handleMonthlyEmployeePerformance(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);
		const month = parseInt(p.get("month") || "0", 10);

		if (!Number.isFinite(year) || year < 2000 || !Number.isFinite(month) || month < 1 || month > 12) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢月份", meta:{ requestId } }, corsHeaders);
		}

		const ym = `${year}-${String(month).padStart(2,'0')}`;

		const usersResult = await env.DATABASE.prepare(`
			SELECT user_id, username, name, base_salary
			FROM Users
			WHERE is_deleted = 0
			ORDER BY name
		`).all();

		const users = usersResult?.results || [];
		const { calculateEmployeePayroll } = await import('./payroll.js');
		
		// 获取该月所有服务的收入
		const serviceRevenueRows = await env.DATABASE.prepare(`
			SELECT 
				r.client_service_id,
				SUM(r.total_amount) as revenue
			FROM Receipts r
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND r.service_month = ?
			GROUP BY r.client_service_id
		`).bind(ym).all();

		const serviceRevenueMap = new Map();
		for (const row of (serviceRevenueRows?.results || [])) {
			serviceRevenueMap.set(row.client_service_id, Number(row.revenue || 0));
		}

		const employeePerformance = [];

		for (const user of users) {
			// 计算薪资成本
			const payroll = await calculateEmployeePayroll(env, user.user_id, year, month);
			const laborCost = payroll.grossSalaryCents / 100;

			// 获取管理费分摊
			let overheadAllocation = 0;
			try {
				const costRows = await env.DATABASE.prepare(`
					SELECT SUM(oc.amount * 
						CASE 
							WHEN ot.allocation_method = 'per_employee' THEN 1.0 / (SELECT COUNT(*) FROM Users WHERE is_deleted = 0)
							WHEN ot.allocation_method = 'per_hour' THEN 
								(SELECT SUM(hours) FROM Timesheets WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0) / 
								(SELECT SUM(hours) FROM Timesheets WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0)
							ELSE 0
						END
					) as overhead
					FROM OverheadCosts oc
					JOIN OverheadTypes ot ON ot.id = oc.cost_type_id
					WHERE oc.year = ? AND oc.month = ? AND oc.is_deleted = 0
				`).bind(user.user_id, ym, ym, year, month).first();
				
				overheadAllocation = Number(costRows?.overhead || 0);
			} catch (err) {
				console.warn('[EmployeePerformance] 获取管理费失败:', err);
			}

			const totalCost = laborCost + overheadAllocation;

			// 获取员工的工时记录
			const timesheetsRows = await env.DATABASE.prepare(`
				SELECT 
					t.timesheet_id,
					t.task_id,
					t.client_id,
					t.work_type,
					t.hours,
					t.work_date,
					task.client_service_id,
					task.status as task_status,
					c.company_name as client_name,
					s.service_name
				FROM Timesheets t
				LEFT JOIN Tasks task ON task.task_id = t.task_id
				LEFT JOIN Clients c ON c.client_id = t.client_id
				LEFT JOIN ClientServices cs ON cs.client_service_id = task.client_service_id
				LEFT JOIN Services s ON s.service_id = cs.service_id
				WHERE t.user_id = ?
					AND t.is_deleted = 0
					AND substr(t.work_date, 1, 7) = ?
				ORDER BY t.work_date
			`).bind(user.user_id, ym).all();

			const timesheets = timesheetsRows?.results || [];

			let standardHours = 0;
			let weightedHours = 0;
			let generatedRevenue = 0;
			const clientDistribution = new Map();

			// 按client_service_id分组
			const serviceHoursMap = new Map();
			
			for (const ts of timesheets) {
				const hours = Number(ts.hours || 0);
				const workTypeId = parseInt(ts.work_type) || 1;
				const weighted = calculateWeightedHours(workTypeId, hours);
				
				standardHours += hours;
				weightedHours += weighted;

				const clientServiceId = ts.client_service_id;
				
				// 如果没有任务关联（task_id = NULL），计入工时但不计入产值
				if (!clientServiceId) {
					continue;
				}

				if (!serviceHoursMap.has(clientServiceId)) {
					serviceHoursMap.set(clientServiceId, {
						hours: 0,
						weightedHours: 0,
						timesheets: []
					});
				}
				
				const service = serviceHoursMap.get(clientServiceId);
				service.hours += hours;
				service.weightedHours += weighted;
				service.timesheets.push({
					...ts,
					hours,
					weighted
				});
			}

			// 分配收入
			for (const [clientServiceId, serviceData] of serviceHoursMap) {
				const serviceRevenue = serviceRevenueMap.get(clientServiceId) || 0;
				
				if (serviceRevenue > 0 && serviceData.hours > 0) {
					// 获取该服务在当月的任务列表
					const tasksRows = await env.DATABASE.prepare(`
						SELECT 
							task_id,
							status,
							estimated_hours,
							(SELECT SUM(hours) FROM Timesheets WHERE task_id = t.task_id AND is_deleted = 0) as actual_hours
						FROM Tasks t
						WHERE t.client_service_id = ?
							AND t.is_deleted = 0
							AND t.service_month = ?
					`).bind(clientServiceId, ym).all();

					const tasks = tasksRows?.results || [];
					
					// 计算服务总工时（已完成用实际工时，未完成用预计工时）
					let serviceTotalHours = 0;
					for (const task of tasks) {
						if (task.status === 'completed' && task.actual_hours > 0) {
							serviceTotalHours += Number(task.actual_hours);
						} else if (task.estimated_hours > 0) {
							serviceTotalHours += Number(task.estimated_hours);
						}
					}

					// 如果没有预计工时，使用实际总工时
					if (serviceTotalHours === 0) {
						const actualTotalRow = await env.DATABASE.prepare(`
							SELECT SUM(t.hours) as total_hours
							FROM Timesheets t
							LEFT JOIN Tasks task ON task.task_id = t.task_id
							WHERE task.client_service_id = ?
								AND t.is_deleted = 0
								AND substr(t.work_date, 1, 7) = ?
						`).bind(clientServiceId, ym).first();
						
						serviceTotalHours = Number(actualTotalRow?.total_hours || 0);
					}

					if (serviceTotalHours > 0) {
						// 按工时比例分配收入
						const employeeRevenue = serviceRevenue * (serviceData.hours / serviceTotalHours);
						generatedRevenue += employeeRevenue;

						// 客户分布
						const firstTs = serviceData.timesheets[0];
						const clientKey = `${firstTs.client_id}_${clientServiceId}`;
						
						if (!clientDistribution.has(clientKey)) {
							clientDistribution.set(clientKey, {
								clientId: firstTs.client_id,
								clientName: firstTs.client_name || '未知客户',
								serviceName: firstTs.service_name || '未分类',
								hours: 0,
								weightedHours: 0,
								generatedRevenue: 0
							});
						}
						
						const dist = clientDistribution.get(clientKey);
						dist.hours += serviceData.hours;
						dist.weightedHours += serviceData.weightedHours;
						dist.generatedRevenue += employeeRevenue;
					}
				}
			}

			const profit = generatedRevenue - totalCost;
			const profitMargin = generatedRevenue > 0 ? (profit / generatedRevenue * 100) : 0;
			const hourlyRate = weightedHours > 0 ? (generatedRevenue / weightedHours) : 0;

			const clientDistArray = Array.from(clientDistribution.values()).map(d => ({
				...d,
				revenuePercentage: generatedRevenue > 0 ? Number((d.generatedRevenue / generatedRevenue * 100).toFixed(2)) : 0
			}));

			employeePerformance.push({
				userId: user.user_id,
				name: user.name || user.username,
				standardHours: Number(standardHours.toFixed(1)),
				weightedHours: Number(weightedHours.toFixed(1)),
				hoursDifference: Number((weightedHours - standardHours).toFixed(1)),
				generatedRevenue: Number(generatedRevenue.toFixed(2)),
				laborCost: Number(laborCost.toFixed(2)),
				totalCost: Number(totalCost.toFixed(2)),
				profit: Number(profit.toFixed(2)),
				profitMargin: Number(profitMargin.toFixed(2)),
				hourlyRate: Number(hourlyRate.toFixed(2)),
				clientDistribution: clientDistArray
			});
		}

		const data = {
			employeePerformance
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[MonthlyEmployeePerformance] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}

// ============================================================
// 年度员工产值报表
// ============================================================
async function handleAnnualEmployeePerformance(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);

		if (!Number.isFinite(year) || year < 2000) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢年度", meta:{ requestId } }, corsHeaders);
		}

		const usersResult = await env.DATABASE.prepare(`
			SELECT user_id, username, name
			FROM Users
			WHERE is_deleted = 0
			ORDER BY name
		`).all();

		const users = usersResult?.results || [];
		const employeeSummary = [];

		for (const user of users) {
			let annualStandardHours = 0;
			let annualWeightedHours = 0;
			let annualRevenue = 0;
			let annualCost = 0;
			const monthlyTrend = [];
			const clientDistribution = new Map();

			for (let month = 1; month <= 12; month++) {
				// 调用月度API
				const monthUrl = new URL(url);
				monthUrl.pathname = '/internal/api/v1/reports/monthly/employee-performance';
				monthUrl.searchParams.set('year', String(year));
				monthUrl.searchParams.set('month', String(month));
				
				const monthResponse = await handleMonthlyEmployeePerformance(
					new Request(monthUrl, request),
					env, me, requestId, monthUrl, corsHeaders
				);
				
				const monthData = await monthResponse.json();

				if (monthData.ok) {
					const empData = monthData.data?.employeePerformance?.find(e => e.userId === user.user_id);
					if (empData) {
						annualStandardHours += empData.standardHours;
						annualWeightedHours += empData.weightedHours;
						annualRevenue += empData.generatedRevenue;
						annualCost += empData.totalCost;

						monthlyTrend.push({
							month,
							standardHours: empData.standardHours,
							weightedHours: empData.weightedHours,
							generatedRevenue: empData.generatedRevenue,
							totalCost: empData.totalCost,
							profit: empData.profit,
							profitMargin: empData.profitMargin,
							hourlyRate: empData.hourlyRate
						});

						// 累积客户分布
						for (const dist of empData.clientDistribution) {
							const key = `${dist.clientId}_${dist.serviceName}`;
							if (!clientDistribution.has(key)) {
								clientDistribution.set(key, {
									clientId: dist.clientId,
									clientName: dist.clientName,
									serviceName: dist.serviceName,
									annualHours: 0,
									generatedRevenue: 0
								});
							}
							const annual = clientDistribution.get(key);
							annual.annualHours += dist.hours;
							annual.generatedRevenue += dist.generatedRevenue;
						}
					}
				}
			}

			const annualProfit = annualRevenue - annualCost;
			const annualProfitMargin = annualRevenue > 0 ? (annualProfit / annualRevenue * 100) : 0;
			const avgHourlyRate = annualWeightedHours > 0 ? (annualRevenue / annualWeightedHours) : 0;

			const clientDistArray = Array.from(clientDistribution.values()).map(d => ({
				...d,
				revenuePercentage: annualRevenue > 0 ? Number((d.generatedRevenue / annualRevenue * 100).toFixed(2)) : 0
			}));

			employeeSummary.push({
				userId: user.user_id,
				name: user.name || user.username,
				annualStandardHours: Number(annualStandardHours.toFixed(1)),
				annualWeightedHours: Number(annualWeightedHours.toFixed(1)),
				hoursDifference: Number((annualWeightedHours - annualStandardHours).toFixed(1)),
				annualRevenue: Number(annualRevenue.toFixed(2)),
				annualCost: Number(annualCost.toFixed(2)),
				annualProfit: Number(annualProfit.toFixed(2)),
				annualProfitMargin: Number(annualProfitMargin.toFixed(2)),
				avgHourlyRate: Number(avgHourlyRate.toFixed(2)),
				monthlyTrend,
				clientDistribution: clientDistArray
			});
		}

		const data = {
			employeeSummary
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[AnnualEmployeePerformance] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}

// ============================================================
// 月度客户毛利报表
// ============================================================
async function handleMonthlyClientProfitability(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);
		const month = parseInt(p.get("month") || "0", 10);

		if (!Number.isFinite(year) || year < 2000 || !Number.isFinite(month) || month < 1 || month > 12) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢月份", meta:{ requestId } }, corsHeaders);
		}

		const ym = `${year}-${String(month).padStart(2,'0')}`;

		// 获取成本数据（直接使用成本API）
		const { handleOverhead } = await import('./overhead.js');
		const costUrl = new URL(url);
		costUrl.pathname = '/internal/api/v1/admin/costs/client';
		costUrl.searchParams.set('year', String(year));
		costUrl.searchParams.set('month', String(month));
		
		const costResponse = await handleOverhead(
			new Request(costUrl, request),
			env, me, requestId, costUrl,
			'/internal/api/v1/admin/costs/client'
		);
		
		const costData = await costResponse.json();

		if (!costData.ok) {
			throw new Error('无法获取客户成本数据');
		}

		const clients = costData.data?.clients || [];
		
		// 获取收入数据
		const revenueRows = await env.DATABASE.prepare(`
			SELECT 
				r.client_id,
				SUM(r.total_amount) as revenue
			FROM Receipts r
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND r.service_month = ?
			GROUP BY r.client_id
		`).bind(ym).all();

		const revenueMap = new Map();
		for (const r of (revenueRows?.results || [])) {
			revenueMap.set(r.client_id, Number(r.revenue || 0));
		}

		// 组合数据
		const clientData = clients.map(client => {
			const revenue = revenueMap.get(client.clientId) || 0;
			const profit = revenue - client.totalCost;
			const profitMargin = revenue > 0 ? (profit / revenue * 100) : 0;

			return {
				clientId: client.clientId,
				clientName: client.clientName,
				totalHours: Number(client.totalHours || 0),
				weightedHours: Number(client.weightedHours || 0),
				avgHourlyRate: Number(client.avgActualHourlyRate || 0),
				totalCost: Number(client.totalCost || 0),
				revenue: Number(revenue),
				profit: Number(profit.toFixed(2)),
				profitMargin: Number(profitMargin.toFixed(2))
			};
		});

		const data = {
			clients: clientData
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[MonthlyClientProfitability] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}

// ============================================================
// 年度客户毛利报表
// ============================================================
async function handleAnnualClientProfitability(request, env, me, requestId, url, corsHeaders) {
	try {
		const p = url.searchParams;
		const year = parseInt(p.get("year") || "0", 10);

		if (!Number.isFinite(year) || year < 2000) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢年度", meta:{ requestId } }, corsHeaders);
		}

		// 获取所有客户
		const clientsRows = await env.DATABASE.prepare(`
			SELECT client_id, company_name
			FROM Clients
			WHERE is_deleted = 0
			ORDER BY company_name
		`).all();

		const clients = clientsRows?.results || [];
		const clientSummary = [];

		for (const client of clients) {
			let annualHours = 0;
			let annualWeightedHours = 0;
			let annualCost = 0;
			let annualRevenue = 0;

			for (let month = 1; month <= 12; month++) {
				// 调用月度API
				const monthUrl = new URL(url);
				monthUrl.pathname = '/internal/api/v1/reports/monthly/client-profitability';
				monthUrl.searchParams.set('year', String(year));
				monthUrl.searchParams.set('month', String(month));
				
				const monthResponse = await handleMonthlyClientProfitability(
					new Request(monthUrl, request),
					env, me, requestId, monthUrl, corsHeaders
				);
				
				const monthData = await monthResponse.json();

				if (monthData.ok) {
					const clientData = monthData.data?.clients?.find(c => c.clientId === client.client_id);
					if (clientData) {
						annualHours += clientData.totalHours;
						annualWeightedHours += clientData.weightedHours;
						annualCost += clientData.totalCost;
						annualRevenue += clientData.revenue;
					}
				}
			}

			// 只包含有数据的客户
			if (annualHours > 0 || annualRevenue > 0) {
				const annualProfit = annualRevenue - annualCost;
				const annualProfitMargin = annualRevenue > 0 ? (annualProfit / annualRevenue * 100) : 0;

				clientSummary.push({
					clientId: client.client_id,
					clientName: client.company_name,
					annualHours: Number(annualHours.toFixed(1)),
					annualWeightedHours: Number(annualWeightedHours.toFixed(1)),
					annualCost: Number(annualCost.toFixed(2)),
					annualRevenue: Number(annualRevenue.toFixed(2)),
					annualProfit: Number(annualProfit.toFixed(2)),
					annualProfitMargin: Number(annualProfitMargin.toFixed(2)),
					avgMonthlyRevenue: Number((annualRevenue / 12).toFixed(2))
				});
			}
		}

		// 按服务类型年度汇总
		const serviceTypeSummary = await env.DATABASE.prepare(`
			SELECT 
				s.service_name,
				SUM(t.hours) as total_hours
			FROM Timesheets t
			LEFT JOIN Tasks task ON task.task_id = t.task_id
			LEFT JOIN ClientServices cs ON cs.client_service_id = task.client_service_id
			LEFT JOIN Services s ON s.service_id = cs.service_id
			WHERE t.is_deleted = 0
				AND substr(t.work_date, 1, 4) = ?
			GROUP BY s.service_name
		`).bind(String(year)).all();

		// 计算加权工时
		const serviceTypeData = [];
		for (const s of (serviceTypeSummary?.results || [])) {
			const timesheetsRows = await env.DATABASE.prepare(`
				SELECT t.work_type, t.hours
				FROM Timesheets t
				LEFT JOIN Tasks task ON task.task_id = t.task_id
				LEFT JOIN ClientServices cs ON cs.client_service_id = task.client_service_id
				LEFT JOIN Services serv ON serv.service_id = cs.service_id
				WHERE t.is_deleted = 0
					AND substr(t.work_date, 1, 4) = ?
					AND serv.service_name = ?
			`).bind(String(year), s.service_name).all();

			let weightedHours = 0;
			for (const ts of (timesheetsRows?.results || [])) {
				const workTypeId = parseInt(ts.work_type) || 1;
				const hours = Number(ts.hours || 0);
				weightedHours += calculateWeightedHours(workTypeId, hours);
			}

			serviceTypeData.push({
				serviceName: s.service_name || '未分类',
				totalHours: Number(s.total_hours || 0),
				weightedHours: Number(weightedHours.toFixed(1))
			});
		}

		const data = {
			clientSummary,
			serviceTypeSummary: serviceTypeData
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[AnnualClientProfitability] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}
