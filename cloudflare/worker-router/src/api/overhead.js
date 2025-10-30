import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleOverhead(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	if (path === "/internal/api/v1/admin/overhead-types") {
		if (method === "GET") {
			try {
				const params = url.searchParams;
				const page = Math.max(1, parseInt(params.get("page") || "1", 10));
				const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
				const offset = (page - 1) * perPage;
				const q = (params.get("q") || "").trim();
				const category = (params.get("category") || "").trim();
				const isActive = params.get("is_active");
				const where = [];
				const binds = [];
				if (q) { where.push("(cost_code LIKE ? OR cost_name LIKE ?)"); binds.push(`%${q}%`, `%${q}%`); }
				if (category && ["fixed","variable"].includes(category)) { where.push("category = ?"); binds.push(category); }
				if (isActive === "0" || isActive === "1") { where.push("is_active = ?"); binds.push(parseInt(isActive,10)); }
				const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
				const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM OverheadCostTypes ${whereSql}`).bind(...binds).first();
				const total = Number(countRow?.total || 0);
				const rows = await env.DATABASE.prepare(
					`SELECT cost_type_id, cost_code, cost_name, category, allocation_method, description, is_active, display_order, created_at, updated_at
					 FROM OverheadCostTypes
					 ${whereSql}
					 ORDER BY display_order ASC, cost_code ASC
					 LIMIT ? OFFSET ?`
				).bind(...binds, perPage, offset).all();
				const data = (rows?.results || []).map(r => ({
					id: r.cost_type_id,
					code: r.cost_code,
					name: r.cost_name,
					category: r.category,
					allocationMethod: r.allocation_method,
					description: r.description || "",
					isActive: r.is_active === 1,
					displayOrder: Number(r.display_order || 0),
					createdAt: r.created_at,
					updatedAt: r.updated_at,
				}));
				return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
		if (method === "POST") {
			let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
			const code = String(body?.cost_code || body?.code || "").trim();
			const name = String(body?.cost_name || body?.name || "").trim();
			const category = String(body?.category || "").trim();
			const methodVal = String(body?.allocation_method || body?.allocationMethod || "").trim();
			const description = (body?.description || "").trim();
			const errors = [];
			if (!/^[A-Z0-9_]{1,20}$/.test(code)) errors.push({ field:"cost_code", message:"格式需為 A-Z0-9_，≤20" });
			if (!name || name.length > 50) errors.push({ field:"cost_name", message:"必填且 ≤ 50" });
			if (!["fixed","variable"].includes(category)) errors.push({ field:"category", message:"不合法" });
			if (!["per_employee","per_hour","per_revenue"].includes(methodVal)) errors.push({ field:"allocation_method", message:"不合法" });
			if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
			try {
				await env.DATABASE.prepare(
					"INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description, is_active) VALUES (?, ?, ?, ?, ?, 1)"
				).bind(code, name, category, methodVal, description).run();
				const row = await env.DATABASE.prepare("SELECT cost_type_id FROM OverheadCostTypes WHERE cost_code = ?").bind(code).first();
				return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ id: row?.cost_type_id, code, name, category, allocationMethod: methodVal }, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				const msg = String(err || "");
				if (msg.includes("UNIQUE") && msg.includes("cost_code")) {
					return jsonResponse(409, { ok:false, code:"CONFLICT", message:"代碼已存在", meta:{ requestId } }, corsHeaders);
				}
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	if (path === "/internal/api/v1/admin/overhead-costs") {
		if (method === "GET") {
			try {
				const params = url.searchParams;
				const year = parseInt(params.get("year") || "0", 10);
				const month = parseInt(params.get("month") || "0", 10);
				if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
					return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
				}
				const q = (params.get("q") || "").trim();
				const where = ["m.is_deleted = 0", "m.year = ?", "m.month = ?"];
				const binds = [year, month];
				if (q) { where.push("(t.cost_code LIKE ? OR t.cost_name LIKE ? OR m.notes LIKE ?)"); binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
				const whereSql = `WHERE ${where.join(" AND ")}`;
				const rows = await env.DATABASE.prepare(
					`SELECT m.overhead_id, m.cost_type_id, t.cost_name, t.cost_code, t.category, t.allocation_method, m.amount, m.notes, m.recorded_by, m.recorded_at, m.updated_at
					 FROM MonthlyOverheadCosts m
					 JOIN OverheadCostTypes t ON t.cost_type_id = m.cost_type_id
					 ${whereSql}
					 ORDER BY t.display_order ASC, t.cost_code ASC`
				).bind(...binds).all();
				const items = (rows?.results || []).map(r => ({
					id: r.overhead_id,
					costTypeId: r.cost_type_id,
					costName: r.cost_name,
					costCode: r.cost_code,
					category: r.category,
					allocationMethod: r.allocation_method,
					amount: Number(r.amount || 0),
					notes: r.notes || "",
					recordedBy: r.recorded_by,
					recordedAt: r.recorded_at,
					updatedAt: r.updated_at,
				}));
				const total = items.reduce((s, x) => s + x.amount, 0);
				const totalFixed = items.filter(x => x.category === 'fixed').reduce((s, x) => s + x.amount, 0);
				const totalVariable = total - totalFixed;
				return jsonResponse(200, { ok:true, code:"OK", message:"成功", data:{ year, month, items, total, totalFixed, totalVariable }, meta:{ requestId, count: items.length } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
		if (method === "POST") {
			let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
			const cost_type_id = parseInt(body?.cost_type_id, 10);
			const year = parseInt(body?.year, 10);
			const month = parseInt(body?.month, 10);
			const amount = Number(body?.amount);
			const notes = (body?.notes || "").trim();
			const errors = [];
			if (!Number.isFinite(cost_type_id)) errors.push({ field:"cost_type_id", message:"必填" });
			if (!Number.isFinite(year) || year < 2000) errors.push({ field:"year", message:"不合法" });
			if (!Number.isFinite(month) || month < 1 || month > 12) errors.push({ field:"month", message:"不合法" });
			if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) errors.push({ field:"amount", message:"需介於 0 ~ 1e9" });
			if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
			try {
				const t = await env.DATABASE.prepare("SELECT cost_type_id FROM OverheadCostTypes WHERE cost_type_id = ? AND is_active = 1 LIMIT 1").bind(cost_type_id).first();
				if (!t) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"成本項目不存在或未啟用", errors:[{ field:"cost_type_id", message:"不存在或未啟用" }], meta:{ requestId } }, corsHeaders);
				await env.DATABASE.prepare(
					"INSERT INTO MonthlyOverheadCosts (cost_type_id, year, month, amount, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
				).bind(cost_type_id, year, month, amount, notes, String(me.user_id)).run();
				const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
				return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ id:String(idRow?.id) }, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				const msg = String(err || "");
				if (msg.includes("UNIQUE") && msg.includes("MonthlyOverheadCosts")) {
					return jsonResponse(409, { ok:false, code:"CONFLICT", message:"該月份已有此項目記錄", meta:{ requestId } }, corsHeaders);
				}
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	if (path === "/internal/api/v1/admin/overhead-summary" || path === "/internal/api/v1/admin/overhead-analysis") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const params = url.searchParams;
			const year = parseInt(params.get("year") || "0", 10);
			const month = parseInt(params.get("month") || "0", 10);
			if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
			}
			const rows = await env.DATABASE.prepare(
				`SELECT t.category, t.cost_type_id, t.cost_name, SUM(m.amount) AS amt
				 FROM MonthlyOverheadCosts m JOIN OverheadCostTypes t ON t.cost_type_id = m.cost_type_id
				 WHERE m.is_deleted = 0 AND m.year = ? AND m.month = ?
				 GROUP BY t.category, t.cost_type_id, t.cost_name`
			).bind(year, month).all();
			const list = rows?.results || [];
			const total = list.reduce((s, r) => s + Number(r.amt || 0), 0);
			const byCategory = { fixed: 0, variable: 0 };
			for (const r of list) { byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amt || 0); }
			const typeBreakdown = list.map(r => ({ costTypeId: r.cost_type_id, costName: r.cost_name, amount: Number(r.amt || 0), percentage: total ? Number((Number(r.amt||0)/total*100).toFixed(1)) : 0 }));
			const empRow = await env.DATABASE.prepare("SELECT COUNT(1) AS c FROM Users WHERE is_deleted = 0").first();
			const employeeCount = Number(empRow?.c || 0);
			const overheadPerEmployee = employeeCount ? Math.round(total / employeeCount) : 0;
			const data = { year, month, total_overhead: total, employee_count: employeeCount, overhead_per_employee: overheadPerEmployee, breakdown_by_category: byCategory, breakdown_by_type: typeBreakdown };
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}



