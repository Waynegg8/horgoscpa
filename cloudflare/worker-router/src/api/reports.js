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

	// 月度收款报表
	if (path === "/internal/api/v1/reports/monthly/revenue") {
		return await handleMonthlyRevenue(request, env, me, requestId, url, corsHeaders);
	}

	// 月度薪资报表
	if (path === "/internal/api/v1/reports/monthly/payroll") {
		return await handleMonthlyPayroll(request, env, me, requestId, url, corsHeaders);
	}

	// 月度员工产值报表
	if (path === "/internal/api/v1/reports/monthly/employee-performance") {
		return await handleMonthlyEmployeePerformance(request, env, me, requestId, url, corsHeaders);
	}

	// 月度客户毛利报表
	if (path === "/internal/api/v1/reports/monthly/client-profitability") {
		return await handleMonthlyClientProfitability(request, env, me, requestId, url, corsHeaders);
	}

	// ============================================================
	// 年度报表 APIs
	// ============================================================

	// 年度收款报表
	if (path === "/internal/api/v1/reports/annual/revenue") {
		return await handleAnnualRevenue(request, env, me, requestId, url, corsHeaders);
	}

	// 年度薪资报表
	if (path === "/internal/api/v1/reports/annual/payroll") {
		return await handleAnnualPayroll(request, env, me, requestId, url, corsHeaders);
	}

	// 年度员工产值报表
	if (path === "/internal/api/v1/reports/annual/employee-performance") {
		return await handleAnnualEmployeePerformance(request, env, me, requestId, url, corsHeaders);
	}

	// 年度客户毛利报表
	if (path === "/internal/api/v1/reports/annual/client-profitability") {
		return await handleAnnualClientProfitability(request, env, me, requestId, url, corsHeaders);
	}

	return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "找不到此報表", meta: { requestId } }, corsHeaders);
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

		// 1. 月度收款概况
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
				AND substr(r.receipt_date, 1, 7) = ?
		`).bind(ym).first();

		const totalReceivable = Number(summaryRow?.total_receivable || 0);
		const totalReceived = Number(summaryRow?.total_received || 0);
		const overdueAmount = Number(summaryRow?.overdue_amount || 0);
		const collectionRate = totalReceivable > 0 ? (totalReceived / totalReceivable * 100) : 0;

		// 2. 按客户明细（包含服务类型）
		const clientDetails = await env.DATABASE.prepare(`
			SELECT 
				c.client_id,
				c.company_name as client_name,
				s.service_name,
				r.receipt_id,
				r.total_amount,
				COALESCE(r.paid_amount, 0) as paid_amount,
				(r.total_amount - COALESCE(r.paid_amount, 0)) as unpaid_amount,
				r.due_date,
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
				AND substr(r.receipt_date, 1, 7) = ?
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
				totalAmount: Number(r.total_amount || 0),
				paidAmount: Number(r.paid_amount || 0),
				unpaidAmount: Number(r.unpaid_amount || 0),
				collectionRate: r.total_amount > 0 ? Number((r.paid_amount / r.total_amount * 100).toFixed(2)) : 0,
				dueDate: r.due_date,
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

		// 1. 年度收款概况
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
				AND substr(r.receipt_date, 1, 4) = ?
		`).bind(String(year)).first();

		const totalReceivable = Number(summaryRow?.total_receivable || 0);
		const totalReceived = Number(summaryRow?.total_received || 0);
		const overdueAmount = Number(summaryRow?.overdue_amount || 0);
		const collectionRate = totalReceivable > 0 ? (totalReceived / totalReceivable * 100) : 0;

		// 2. 月度收款趋势
		const monthlyTrend = await env.DATABASE.prepare(`
			SELECT 
				substr(r.receipt_date, 6, 2) as month,
				SUM(r.total_amount) as total_receivable,
				SUM(COALESCE(r.paid_amount, 0)) as total_received,
				SUM(CASE WHEN r.status IN ('unpaid', 'partial') AND r.due_date < date('now') 
					THEN r.total_amount - COALESCE(r.paid_amount, 0) 
					ELSE 0 END) as overdue_amount
			FROM Receipts r
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND substr(r.receipt_date, 1, 4) = ?
			GROUP BY month
			ORDER BY month
		`).bind(String(year)).all();

		// 3. 按客户年度汇总
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
				AND substr(r.receipt_date, 1, 4) = ?
			GROUP BY c.client_id, c.company_name
			ORDER BY total_receivable DESC
		`).bind(String(year)).all();

		// 4. 按服务类型年度汇总
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
				AND substr(r.receipt_date, 1, 4) = ?
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
				month: parseInt(r.month, 10),
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

		// 调用薪资计算逻辑
		const { calculateEmployeePayroll } = await import('./payroll.js');
		
		// 获取所有用户
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
				performanceBonus: 0, // 从月度绩效奖金表获取
				yearEndBonus: 0, // 从年终奖金表获取
				fixedDeduction: payroll.totalFixedDeductionCents / 100,
				leaveDeduction: payroll.leaveDeductionCents / 100,
				grossSalary: payroll.grossSalaryCents / 100,
				netSalary: payroll.netSalaryCents / 100
			});

			totalGrossSalary += payroll.grossSalaryCents / 100;
			totalNetSalary += payroll.netSalaryCents / 100;
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

		// 获取所有用户
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
				monthTotal += payroll.grossSalaryCents / 100;
				monthNetTotal += payroll.netSalaryCents / 100;
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
				annualGross += payroll.grossSalaryCents / 100;
				annualNet += payroll.netSalaryCents / 100;
				totalOvertime += payroll.overtimeCents / 100;
			}

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

		// 年度薪资构成分析
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
// 月度员工产值报表
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

		// 获取员工成本数据（从成本API）
		const { handleOverhead } = await import('./overhead.js');
		const employeeCostUrl = new URL(url);
		employeeCostUrl.pathname = '/internal/api/v1/admin/costs/employee';
		employeeCostUrl.searchParams.set('year', String(year));
		employeeCostUrl.searchParams.set('month', String(month));
		const costRequest = new Request(employeeCostUrl, request);
		const costResponse = await handleOverhead(costRequest, env, me, requestId, employeeCostUrl, '/internal/api/v1/admin/costs/employee');
		const costData = await costResponse.json();

		if (!costData.ok) {
			throw new Error('无法获取员工成本数据');
		}

		const employees = costData.data?.employees || [];
		
		// 获取每个员工的产生收入（基于工时占比）
		const employeePerformance = [];
		
		for (const emp of employees) {
			// 获取员工的工时表记录
			const timesheets = await env.DATABASE.prepare(`
				SELECT 
					t.timesheet_id,
					t.client_id,
					t.hours,
					t.weighted_hours,
					c.company_name as client_name,
					s.service_name,
					r.total_amount as receipt_amount,
					task_total.total_hours,
					task_total.task_id
				FROM Timesheets t
				LEFT JOIN Clients c ON c.client_id = t.client_id
				LEFT JOIN Tasks task ON task.task_id = t.task_id
				LEFT JOIN ClientServices cs ON cs.client_service_id = task.client_service_id
				LEFT JOIN Services s ON s.service_id = cs.service_id
				LEFT JOIN Receipts r ON r.client_service_id = task.client_service_id 
					AND substr(r.receipt_date, 1, 7) = substr(t.work_date, 1, 7)
					AND r.is_deleted = 0
					AND r.status != 'cancelled'
				LEFT JOIN (
					SELECT task_id, SUM(hours) as total_hours
					FROM Timesheets
					WHERE is_deleted = 0 AND substr(work_date, 1, 7) = ?
					GROUP BY task_id
				) task_total ON task_total.task_id = t.task_id
				WHERE t.user_id = ?
					AND t.is_deleted = 0
					AND substr(t.work_date, 1, 7) = ?
			`).bind(ym, emp.userId, ym).all();

			// 计算产生收入（按工时占比分配）
			let generatedRevenue = 0;
			const clientDistribution = new Map();

			for (const ts of (timesheets?.results || [])) {
				const receiptAmount = Number(ts.receipt_amount || 0);
				const taskTotalHours = Number(ts.total_hours || 0);
				const empHours = Number(ts.hours || 0);

				if (receiptAmount > 0 && taskTotalHours > 0) {
					const empRevenue = receiptAmount * (empHours / taskTotalHours);
					generatedRevenue += empRevenue;

					// 客户分布
					const clientKey = `${ts.client_id}_${ts.service_name}`;
					if (!clientDistribution.has(clientKey)) {
						clientDistribution.set(clientKey, {
							clientId: ts.client_id,
							clientName: ts.client_name || '未知客户',
							serviceName: ts.service_name || '未分类',
							hours: 0,
							weightedHours: 0,
							generatedRevenue: 0
						});
					}
					const dist = clientDistribution.get(clientKey);
					dist.hours += empHours;
					dist.weightedHours += Number(ts.weighted_hours || empHours);
					dist.generatedRevenue += empRevenue;
				}
			}

			const standardHours = Number(emp.monthHours || 0);
			const weightedHours = Number(emp.monthHours || 0); // 需要从工时表计算加权工时
			const laborCost = Number(emp.laborCost || 0);
			const totalCost = Number(emp.totalCost || 0);
			const profit = generatedRevenue - totalCost;
			const profitMargin = generatedRevenue > 0 ? (profit / generatedRevenue * 100) : 0;
			const hourlyRate = weightedHours > 0 ? (generatedRevenue / weightedHours) : 0;

			employeePerformance.push({
				userId: emp.userId,
				name: emp.name,
				standardHours,
				weightedHours,
				hoursDifference: weightedHours - standardHours,
				generatedRevenue,
				laborCost,
				totalCost,
				profit,
				profitMargin: Number(profitMargin.toFixed(2)),
				hourlyRate: Number(hourlyRate.toFixed(2)),
				clientDistribution: Array.from(clientDistribution.values())
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

		// 获取所有员工
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
				// 调用月度API获取数据
				const monthUrl = new URL(url);
				monthUrl.pathname = '/internal/api/v1/reports/monthly/employee-performance';
				monthUrl.searchParams.set('year', String(year));
				monthUrl.searchParams.set('month', String(month));
				const monthRequest = new Request(monthUrl, request);
				const monthResponse = await handleMonthlyEmployeePerformance(monthRequest, env, me, requestId, monthUrl, corsHeaders);
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
				annualStandardHours,
				annualWeightedHours,
				hoursDifference: annualWeightedHours - annualStandardHours,
				annualRevenue,
				annualCost,
				annualProfit,
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

		// 直接调用成本页面的客户成本API
		const { handleOverhead } = await import('./overhead.js');
		const costUrl = new URL(url);
		costUrl.pathname = '/internal/api/v1/admin/costs/client';
		costUrl.searchParams.set('year', String(year));
		costUrl.searchParams.set('month', String(month));
		const costRequest = new Request(costUrl, request);
		const costResponse = await handleOverhead(costRequest, env, me, requestId, costUrl, '/internal/api/v1/admin/costs/client');
		const costData = await costResponse.json();

		if (!costData.ok) {
			throw new Error('无法获取客户成本数据');
		}

		const clients = costData.data?.clients || [];
		
		// 获取收入数据
		const ym = `${year}-${String(month).padStart(2,'0')}`;
		const receipts = await env.DATABASE.prepare(`
			SELECT 
				r.client_id,
				cs.service_id,
				s.service_name,
				SUM(r.total_amount) as revenue
			FROM Receipts r
			LEFT JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
			LEFT JOIN Services s ON s.service_id = cs.service_id
			WHERE r.is_deleted = 0 
				AND r.status != 'cancelled'
				AND substr(r.receipt_date, 1, 7) = ?
			GROUP BY r.client_id, cs.service_id, s.service_name
		`).bind(ym).all();

		const revenueMap = new Map();
		for (const r of (receipts?.results || [])) {
			const key = `${r.client_id}_${r.service_name}`;
			revenueMap.set(key, Number(r.revenue || 0));
		}

		// 组织数据为三层结构
		const clientData = [];
		for (const client of clients) {
			const totalRevenue = revenueMap.get(`${client.clientId}_all`) || 0;
			const profit = totalRevenue - client.totalCost;
			const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100) : 0;

			clientData.push({
				clientId: client.clientId,
				clientName: client.clientName,
				totalHours: client.totalHours,
				weightedHours: client.weightedHours,
				avgHourlyRate: client.avgActualHourlyRate,
				totalCost: client.totalCost,
				revenue: totalRevenue,
				profit,
				profitMargin: Number(profitMargin.toFixed(2)),
				// 服务类型明细会在前端展开时再加载
			});
		}

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

		// 获取年度客户汇总
		const clients = await env.DATABASE.prepare(`
			SELECT 
				c.client_id,
				c.company_name as client_name
			FROM Clients c
			WHERE c.is_deleted = 0
			ORDER BY c.company_name
		`).all();

		const clientSummary = [];

		for (const client of (clients?.results || [])) {
			let annualHours = 0;
			let annualWeightedHours = 0;
			let annualCost = 0;
			let annualRevenue = 0;

			for (let month = 1; month <= 12; month++) {
				// 获取月度数据
				const monthUrl = new URL(url);
				monthUrl.pathname = '/internal/api/v1/reports/monthly/client-profitability';
				monthUrl.searchParams.set('year', String(year));
				monthUrl.searchParams.set('month', String(month));
				const monthRequest = new Request(monthUrl, request);
				const monthResponse = await handleMonthlyClientProfitability(monthRequest, env, me, requestId, monthUrl, corsHeaders);
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

			const annualProfit = annualRevenue - annualCost;
			const annualProfitMargin = annualRevenue > 0 ? (annualProfit / annualRevenue * 100) : 0;
			const avgMonthlyRevenue = annualRevenue / 12;

			clientSummary.push({
				clientId: client.client_id,
				clientName: client.client_name,
				annualHours,
				annualWeightedHours,
				annualCost,
				annualRevenue,
				annualProfit,
				annualProfitMargin: Number(annualProfitMargin.toFixed(2)),
				avgMonthlyRevenue
			});
		}

		// 按服务类型年度汇总
		const serviceTypeSummary = await env.DATABASE.prepare(`
			SELECT 
				s.service_name,
				SUM(t.hours) as total_hours,
				SUM(t.weighted_hours) as weighted_hours
			FROM Timesheets t
			LEFT JOIN Tasks task ON task.task_id = t.task_id
			LEFT JOIN ClientServices cs ON cs.client_service_id = task.client_service_id
			LEFT JOIN Services s ON s.service_id = cs.service_id
			WHERE t.is_deleted = 0
				AND substr(t.work_date, 1, 4) = ?
			GROUP BY s.service_name
		`).bind(String(year)).all();

		const data = {
			clientSummary,
			serviceTypeSummary: (serviceTypeSummary?.results || []).map(s => ({
				serviceName: s.service_name || '未分类',
				totalHours: Number(s.total_hours || 0),
				weightedHours: Number(s.weighted_hours || 0)
			}))
		};

		return jsonResponse(200, { ok: true, data, meta: { requestId } }, corsHeaders);
	} catch (err) {
		console.error("[AnnualClientProfitability] Error:", err);
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: err.message, meta: { requestId } }, corsHeaders);
	}
}
