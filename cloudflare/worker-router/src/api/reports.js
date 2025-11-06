import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleReports(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	const parseDate = (s) => {
		if (!s || typeof s !== "string") return null;
		const m = s.match(/^\d{4}-\d{2}-\d{2}$/);
		if (!m) return null;
		const d = new Date(s);
		return Number.isNaN(d.getTime()) ? null : s; // keep original yyyy-mm-dd
	};

	const parseYearMonth = (s) => {
		if (!s || typeof s !== "string") return null;
		const m = s.match(/^(\d{4})-(\d{2})$/);
		if (!m) return null;
		const y = parseInt(m[1], 10);
		const mo = parseInt(m[2], 10);
		if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
		return { year: y, month: mo };
	};

	// /internal/api/v1/reports/client-cost-analysis (GET, admin only)
	// 直接使用成本页面的API逻辑
	if (path === "/internal/api/v1/reports/client-cost-analysis") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
		
		// 调用成本页面的/admin/costs/client API（同样的计算逻辑）
		const { handleOverhead } = await import('./overhead.js');
		return await handleOverhead(request, env, me, requestId, url, '/internal/api/v1/admin/costs/client');
	}

	// /internal/api/v1/reports/employee-hours (GET)
	if (path === "/internal/api/v1/reports/employee-hours") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const p = url.searchParams;
			const y = parseInt(p.get("year") || "0", 10);
			const m = parseInt(p.get("month") || "0", 10);
			let qUserId = p.get("user_id");
			if (!Number.isFinite(y) || y < 2000 || !Number.isFinite(m) || m < 1 || m > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢月份", meta:{ requestId } }, corsHeaders);
			}
			// 權限：員工僅能看自己
			let userFilterId = null;
			if (!me.is_admin) userFilterId = String(me.user_id);
			else if (qUserId) userFilterId = String(parseInt(qUserId, 10));

			const ym = `${y}-${String(m).padStart(2,'0')}`;
			const whereBase = "t.is_deleted = 0 AND substr(t.work_date,1,7) = ?";
			let where = whereBase;
			const binds = [ym];
			if (userFilterId) { where += " AND t.user_id = ?"; binds.push(userFilterId); }

			// 彙總（每人）- 區分可計費/非計費工時
			const aggRows = await env.DATABASE.prepare(
				`SELECT t.user_id, 
					SUM(t.hours) AS total_hours,
					SUM(CASE WHEN t.work_type = 'normal' THEN t.hours ELSE 0 END) AS normal_hours,
					SUM(CASE WHEN t.work_type LIKE 'ot-%' OR t.work_type = 'holiday' THEN t.hours ELSE 0 END) AS overtime_hours,
					SUM(CASE WHEN t.client_id IS NOT NULL THEN t.hours ELSE 0 END) AS billable_hours,
					SUM(CASE WHEN t.client_id IS NULL THEN t.hours ELSE 0 END) AS non_billable_hours
				 FROM Timesheets t
				 WHERE ${where}
				 GROUP BY t.user_id`
			).bind(...binds).all();

			// 每日工時
			const dailyRows = await env.DATABASE.prepare(
				`SELECT t.user_id, t.work_date, SUM(t.hours) AS hours
				 FROM Timesheets t
				 WHERE ${where}
				 GROUP BY t.user_id, t.work_date
				 ORDER BY t.work_date ASC`
			).bind(...binds).all();

			// 客戶分布
			const distRows = await env.DATABASE.prepare(
				`SELECT t.user_id, t.client_id, SUM(t.hours) AS hours
				 FROM Timesheets t
				 WHERE ${where} AND t.client_id IS NOT NULL
				 GROUP BY t.user_id, t.client_id`
			).bind(...binds).all();

			// 使用者名稱
			const userIds = (aggRows?.results || []).map(r => r.user_id);
			let usersMap = new Map();
			if (userIds.length) {
				const placeholders = userIds.map(()=>"?").join(",");
				const uRows = await env.DATABASE.prepare(`SELECT user_id, name FROM Users WHERE user_id IN (${placeholders})`).bind(...userIds).all();
				usersMap = new Map((uRows?.results || []).map(r => [String(r.user_id), r.name || r.username]));
			}

			// 客戶名稱
			const clientIds = Array.from(new Set((distRows?.results || []).map(r => r.client_id).filter(Boolean)));
			let clientMap = new Map();
			if (clientIds.length) {
				const placeholders = clientIds.map(()=>"?").join(",");
				const cRows = await env.DATABASE.prepare(`SELECT client_id, company_name FROM Clients WHERE client_id IN (${placeholders})`).bind(...clientIds).all();
				clientMap = new Map((cRows?.results || []).map(r => [r.client_id, r.company_name]));
			}

			const dailyByUser = new Map();
			for (const r of (dailyRows?.results || [])) {
				const arr = dailyByUser.get(String(r.user_id)) || [];
				arr.push({ date: r.work_date, hours: Number(r.hours || 0) });
				dailyByUser.set(String(r.user_id), arr);
			}

			const distByUser = new Map();
			for (const r of (distRows?.results || [])) {
				const arr = distByUser.get(String(r.user_id)) || [];
				const hours = Number(r.hours || 0);
				arr.push({ client_id: r.client_id, company_name: clientMap.get(r.client_id) || r.client_id, hours });
				distByUser.set(String(r.user_id), arr);
			}

			// 計算工作天數（簡化：取該月份的工作日數，假設每月 22 天）
			const workingDays = 22;

			const data = [];
			for (const r of (aggRows?.results || [])) {
				const uid = String(r.user_id);
				const total = Number(r.total_hours || 0);
				const normal = Number(r.normal_hours || 0);
				const ot = Number(r.overtime_hours || 0);
				const billable = Number(r.billable_hours || 0);
				const nonBillable = Number(r.non_billable_hours || 0);
				// 使用率：可計費工時 / (工作天數 × 8)
				const utilization = (workingDays * 8) > 0 ? Number(((billable / (workingDays * 8)) * 100).toFixed(2)) : 0;
				let dist = distByUser.get(uid) || [];
				const distTotal = dist.reduce((s,x)=> s + x.hours, 0) || 1;
				dist = dist.map(x => ({ client_id: x.client_id, company_name: x.company_name, hours: x.hours, percentage: Number(((x.hours/distTotal)*100).toFixed(2)) }));
				const daily = dailyByUser.get(uid) || [];
				data.push({
					user_id: Number(uid),
					username: usersMap.get(uid) || uid,
					total_hours: Number(total.toFixed(2)),
					normal_hours: Number(normal.toFixed(2)),
					overtime_hours: Number(ot.toFixed(2)),
					billable_hours: Number(billable.toFixed(2)),
					non_billable_hours: Number(nonBillable.toFixed(2)),
					utilization_rate: utilization,
					client_distribution: dist,
					daily_hours: daily,
				});
			}

			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, year:y, month:m } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// /internal/api/v1/reports/payroll-summary (GET, admin only)
	// 直接使用薪资页面的preview API逻辑
	if (path === "/internal/api/v1/reports/payroll-summary") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
		try {
			const p = url.searchParams;
			const y = parseInt(p.get("year") || "0", 10);
			const m = parseInt(p.get("month") || "0", 10);
			let userId = p.get("user_id");
			if (!Number.isFinite(y) || y < 2000 || !Number.isFinite(m) || m < 1 || m > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇查詢月份", meta:{ requestId } }, corsHeaders);
			}
			const ym = `${y}-${String(m).padStart(2,'0')}`;
		
		// 调用薪资预览API（与薪资页面使用完全相同的逻辑）
		const { calculateEmployeePayroll } = await import('./payroll.js');
		
		// 获取所有活跃员工
		const usersQuery = await env.DATABASE.prepare(
			`SELECT user_id FROM Users WHERE is_deleted = 0 ORDER BY user_id`
		).all();
		const allUsers = usersQuery.results || [];
		
		// 如果指定了userId，只计算该用户
		const usersToCalculate = userId 
			? allUsers.filter(u => String(u.user_id) === String(userId))
			: allUsers;
		
		// 实时计算每个员工的薪资（与payroll.js的preview完全一致）
		const results = [];
		for (const user of usersToCalculate) {
			try {
				const payroll = await calculateEmployeePayroll(env, user.user_id, ym);
				if (payroll) {
					results.push(payroll);
				}
			} catch (error) {
				console.error(`[Reports] 计算员工 ${user.user_id} 薪资失败:`, error);
			}
		}
		
		const cents = (v)=> Number(v||0);
		const toAmt = (c)=> Math.round(c/100);
		
		const byEmployee = results.map(u => ({
			user_id: u.userId,
			username: u.name || u.username,
			base_salary: toAmt(cents(u.baseSalaryCents)),
			// 津贴 = 加给 + 不定期津贴
			total_allowances: toAmt(cents(u.totalRegularAllowanceCents) + cents(u.totalIrregularAllowanceCents)),
			// 奖金 = 月度奖金 + 年终奖金 + 绩效奖金
			total_bonuses: toAmt(cents(u.totalRegularBonusCents) + cents(u.totalYearEndBonusCents) + cents(u.performanceBonusCents)),
			overtime_pay: toAmt(cents(u.overtimeCents)),
			transport_subsidy: toAmt(cents(u.transportCents)),
			meal_allowance: toAmt(cents(u.mealAllowanceCents)),
			gross_salary: toAmt(cents(u.grossSalaryCents)),
			net_salary: toAmt(cents(u.netSalaryCents)),
			has_full_attendance: u.isFullAttendance === true,
		}));
		
		const sum = (k)=> byEmployee.reduce((s,x)=> s + Number(x[k]||0), 0);
		const summary = {
			total_base_salary: sum('base_salary'),
			total_allowances: sum('total_allowances'),
			total_bonuses: sum('total_bonuses'),
			total_overtime_pay: sum('overtime_pay'),
			total_transport_subsidy: sum('transport_subsidy'),
			total_meal_allowance: sum('meal_allowance'),
			total_gross_salary: sum('gross_salary'),
			total_net_salary: sum('net_salary'),
		};
		return jsonResponse(200, { ok:true, code:"OK", message:"成功", data:{ summary, by_employee: byEmployee }, meta:{ requestId, month:ym } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// /internal/api/v1/reports/revenue (GET, admin only)
	if (path === "/internal/api/v1/reports/revenue") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
		try {
			const p = url.searchParams;
			const start = parseDate(p.get("start_date"));
			const end = parseDate(p.get("end_date"));
			if (!start || !end || start > end) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇有效日期區間", meta:{ requestId } }, corsHeaders);
			}
			const rows = await env.DATABASE.prepare(
				`SELECT strftime('%Y-%m', receipt_date) AS ym,
					SUM(total_amount) AS receipts,
					SUM(COALESCE(paid_amount, 0)) AS paid
				 FROM Receipts
				 WHERE is_deleted = 0 AND status != 'cancelled' AND receipt_date >= ? AND receipt_date <= ?
				 GROUP BY ym
				 ORDER BY ym`
			).bind(start, end).all();
			const monthly_trend = (rows?.results || []).map(r => ({ month: r.ym, receipts: Number(r.receipts||0), paid: Number(r.paid||0), outstanding: Math.max(0, Number(r.receipts||0) - Number(r.paid||0)) }));
			const total_receipts = monthly_trend.reduce((s,x)=> s + x.receipts, 0);
			const total_paid = monthly_trend.reduce((s,x)=> s + x.paid, 0);
			const total_outstanding = Math.max(0, total_receipts - total_paid);
			const collection_rate = total_receipts > 0 ? Number(((total_paid/total_receipts)*100).toFixed(1)) : 0;

			const byClientRows = await env.DATABASE.prepare(
				`SELECT r.client_id, c.company_name, SUM(r.total_amount) AS total_receipts,
					SUM(COALESCE(r.paid_amount, 0)) AS total_paid
				 FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id
				 WHERE r.is_deleted = 0 AND r.status != 'cancelled' AND r.receipt_date >= ? AND r.receipt_date <= ?
				 GROUP BY r.client_id, c.company_name`
			).bind(start, end).all();
			const by_client = (byClientRows?.results || []).map(r => ({ client_id: r.client_id, company_name: r.company_name || r.client_id, total_receipts: Number(r.total_receipts||0), total_paid: Number(r.total_paid||0), total_outstanding: Math.max(0, Number(r.total_receipts||0) - Number(r.total_paid||0)) }));

			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data:{ summary:{ total_receipts, total_paid, total_outstanding, collection_rate }, monthly_trend, by_client }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}


