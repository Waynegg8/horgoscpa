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
	if (path === "/internal/api/v1/reports/client-cost-analysis") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
		try {
			const p = url.searchParams;
			const start = parseDate(p.get("start_date"));
			const end = parseDate(p.get("end_date"));
			const clientId = (p.get("client_id") || "").trim() || null;
			const includeBonus = (p.get("include_year_end_bonus") || "").toLowerCase() === "true";
			if (!start || !end || start > end) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"請選擇有效日期區間", meta:{ requestId } }, corsHeaders);
			}

			// 實際工時（以 Timesheets 為準，簡化：weighted_hours = hours）
			const binds = [start, end];
			let where = "t.is_deleted = 0 AND t.work_date >= ? AND t.work_date <= ?";
			if (clientId) { where += " AND t.client_id = ?"; binds.push(clientId); }
			const hoursRows = await env.DATABASE.prepare(
				`SELECT t.client_id, SUM(t.hours) AS actual_hours
				 FROM Timesheets t
				 WHERE ${where}
				 GROUP BY t.client_id`
			).bind(...binds).all();
			const hoursByClient = new Map();
			for (const r of (hoursRows?.results || [])) {
				if (!r.client_id) continue;
				hoursByClient.set(r.client_id, Number(r.actual_hours || 0));
			}
			const clientIds = Array.from(hoursByClient.keys());

			// 營收（Receipts：排除 cancelled）
			const recBinds = [start, end];
			let recWhere = "is_deleted = 0 AND status != 'cancelled' AND receipt_date >= ? AND receipt_date <= ?";
			if (clientId) { recWhere += " AND client_id = ?"; recBinds.push(clientId); }
			const recRows = await env.DATABASE.prepare(
				`SELECT client_id, SUM(total_amount) AS total_receipts
				 FROM Receipts
				 WHERE ${recWhere}
				 GROUP BY client_id`
			).bind(...recBinds).all();
			const revenueByClient = new Map();
			for (const r of (recRows?.results || [])) {
				revenueByClient.set(r.client_id, Number(r.total_receipts || 0));
				if (!hoursByClient.has(r.client_id)) clientIds.push(r.client_id);
			}

			// 管理成本總額（跨月份加總）
			const startYm = parseInt(start.slice(0,4) + start.slice(5,7), 10);
			const endYm = parseInt(end.slice(0,4) + end.slice(5,7), 10);
			const ohRows = await env.DATABASE.prepare(
				`SELECT (year*100+month) AS ym, SUM(amount) AS amt
				 FROM MonthlyOverheadCosts
				 WHERE is_deleted = 0 AND (year*100+month) >= ? AND (year*100+month) <= ?
				 GROUP BY ym`
			).bind(startYm, endYm).all();
			const totalOverhead = (ohRows?.results || []).reduce((s, r) => s + Number(r.amt || 0), 0);

			// 以工時占比分攤管理成本（簡化）
			const totalHours = Array.from(hoursByClient.values()).reduce((s, x) => s + x, 0);
			const warnings = [];
			if (totalOverhead <= 0) warnings.push({ type: "overhead_missing", message: "本期間管理成本未輸入" });

			// 取公司名稱
			const nameMap = new Map();
			if (clientIds.length) {
				const placeholders = clientIds.map(() => "?").join(",");
				const nameRows = await env.DATABASE.prepare(
					`SELECT client_id, company_name FROM Clients WHERE client_id IN (${placeholders})`
				).bind(...clientIds).all();
				for (const r of (nameRows?.results || [])) nameMap.set(r.client_id, r.company_name);
			}

			const data = [];
			for (const cid of clientIds) {
				const actual = Number(hoursByClient.get(cid) || 0);
				const weighted = actual; // 簡化：未有倍率維表
				const revenue = Number(revenueByClient.get(cid) || 0);
				const ohAlloc = totalHours > 0 ? Math.round(totalOverhead * (actual / totalHours)) : 0;
				const salaryCost = 0; // 尚無足夠資料，先回 0
				const bonusAlloc = includeBonus ? 0 : 0; // 尚無年終資料來源
				const totalCost = salaryCost + ohAlloc + bonusAlloc;
				const grossProfit = revenue - totalCost;
				const margin = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(1)) : 0;
				data.push({
					client_id: cid,
					company_name: nameMap.get(cid) || cid,
					total_actual_hours: Number(actual.toFixed(2)),
					total_weighted_hours: Number(weighted.toFixed(2)),
					cost_breakdown: {
						salary_cost: salaryCost,
						overhead_cost: ohAlloc,
						year_end_bonus: bonusAlloc,
						total_cost: totalCost,
					},
					labor_cost: totalCost,
					revenue,
					gross_profit: grossProfit,
					profit_margin: margin,
					cost_percentage: totalCost > 0 ? { salary: Number(((salaryCost/totalCost)*100).toFixed(1)), overhead: Number((((ohAlloc)/(totalCost))*100).toFixed(1)) } : { salary: 0, overhead: 0 },
					user_breakdown: [],
				});
			}

			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, warnings, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
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

			// 彙總（每人）
			const aggRows = await env.DATABASE.prepare(
				`SELECT t.user_id, SUM(t.hours) AS total_hours,
					SUM(CASE WHEN t.work_type = 'normal' THEN t.hours ELSE 0 END) AS normal_hours,
					SUM(CASE WHEN t.work_type LIKE 'ot-%' THEN t.hours ELSE 0 END) AS overtime_hours
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
				const uRows = await env.DATABASE.prepare(`SELECT user_id, username FROM Users WHERE user_id IN (${placeholders})`).bind(...userIds).all();
				usersMap = new Map((uRows?.results || []).map(r => [String(r.user_id), r.username]));
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

			const data = [];
			for (const r of (aggRows?.results || [])) {
				const uid = String(r.user_id);
				const total = Number(r.total_hours || 0);
				const normal = Number(r.normal_hours || 0);
				const ot = Number(r.overtime_hours || 0);
				const billable = total; // 簡化：無 is_billable 資料，全部視為可計費
				const nonBillable = 0;
				const utilization = total > 0 ? Number(((billable/total)*100).toFixed(2)) : 0;
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
			const run = await env.DATABASE.prepare("SELECT run_id FROM PayrollRuns WHERE month = ? LIMIT 1").bind(ym).first();
			if (!run) {
				return jsonResponse(200, { ok:true, code:"OK", message:"成功", data:{ summary:{ total_base_salary:0, total_allowances:0, total_bonuses:0, total_overtime_pay:0, total_gross_salary:0, total_net_salary:0 }, by_employee:[] }, meta:{ requestId, month:ym } }, corsHeaders);
			}
			let q = "SELECT mp.user_id, u.username, mp.base_salary_cents, mp.regular_allowance_cents, mp.bonus_cents, mp.overtime_cents, mp.total_cents, mp.is_full_attendance FROM MonthlyPayroll mp JOIN Users u ON u.user_id = mp.user_id WHERE mp.run_id = ?";
			const binds = [run.run_id];
			if (userId) { q += " AND mp.user_id = ?"; binds.push(String(parseInt(userId,10))); }
			const rows = await env.DATABASE.prepare(q).bind(...binds).all();
			const list = rows?.results || [];
			const cents = (v)=> Number(v||0);
			const toAmt = (c)=> Math.round(c/100);
			const byEmployee = list.map(r => ({
				user_id: r.user_id,
				username: r.username,
				base_salary: toAmt(cents(r.base_salary_cents)),
				total_allowances: toAmt(cents(r.regular_allowance_cents)),
				total_bonuses: toAmt(cents(r.bonus_cents)),
				overtime_pay: toAmt(cents(r.overtime_cents)),
				gross_salary: toAmt(cents(r.total_cents)),
				net_salary: toAmt(cents(r.total_cents)),
				has_full_attendance: r.is_full_attendance === 1,
			}));
			const sum = (k)=> byEmployee.reduce((s,x)=> s + Number(x[k]||0), 0);
			const summary = {
				total_base_salary: sum('base_salary'),
				total_allowances: sum('total_allowances'),
				total_bonuses: sum('total_bonuses'),
				total_overtime_pay: sum('overtime_pay'),
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
					SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) AS paid
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
					SUM(CASE WHEN r.status = 'paid' THEN r.total_amount ELSE 0 END) AS total_paid
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


