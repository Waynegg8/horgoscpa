import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleTimesheets(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	if (method === "GET") {
		try {
			const params = url.searchParams;
			const page = Math.max(1, parseInt(params.get("page") || "1", 10));
			const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
			const offset = (page - 1) * perPage;
			const dateFrom = (params.get("dateFrom") || "").trim();
			const dateTo = (params.get("dateTo") || "").trim();
			const q = (params.get("q") || "").trim();
			const type = (params.get("type") || "").trim();
			const where = ["t.is_deleted = 0"];
			const binds = [];
			if (!me.is_admin) { where.push("t.user_id = ?"); binds.push(String(me.user_id)); }
			if (dateFrom) { where.push("t.work_date >= ?"); binds.push(dateFrom); }
			if (dateTo) { where.push("t.work_date <= ?"); binds.push(dateTo); }
			if (q) { where.push("(c.company_name LIKE ? OR t.service_name LIKE ? OR t.note LIKE ?)"); binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
			if (type) { where.push("t.work_type = ?"); binds.push(type); }
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			const countRow = await env.DATABASE.prepare(
				`SELECT COUNT(1) AS total FROM Timesheets t LEFT JOIN Clients c ON c.client_id = t.client_id ${whereSql}`
			).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			const rows = await env.DATABASE.prepare(
				`SELECT t.timesheet_id, t.work_date, t.client_id, c.company_name AS client_name, t.service_name, t.work_type, t.hours, t.note
				 FROM Timesheets t LEFT JOIN Clients c ON c.client_id = t.client_id
				 ${whereSql}
				 ORDER BY t.work_date DESC, t.timesheet_id DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const data = (rows?.results || []).map(r => ({
				id: String(r.timesheet_id),
				date: r.work_date,
				clientId: r.client_id || null,
				clientName: r.client_name || "",
				service: r.service_name || "",
				type: r.work_type,
				hours: Number(r.hours || 0),
				note: r.note || "",
			}));
			const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
		}
	}

	if (method === "POST") {
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		const work_date = String(body?.work_date || "").trim();
		const client_id = (body?.client_id || "").trim();
		const service_name = String(body?.service_name || "").trim();
		const work_type = String(body?.work_type || "").trim();
		const hours = Number(body?.hours);
		const note = (body?.note || "").trim();
		const errors = [];
		if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) errors.push({ field:"work_date", message:"日期格式 YYYY-MM-DD" });
		if (!client_id) errors.push({ field:"client_id", message:"必填" });
		if (!service_name) errors.push({ field:"service_name", message:"必填" });
		if (!work_type) errors.push({ field:"work_type", message:"必填" });
		if (!Number.isFinite(hours) || hours <= 0) errors.push({ field:"hours", message:"必須大於 0" });
		if (Math.abs(hours * 2 - Math.round(hours * 2)) > 1e-9) errors.push({ field:"hours", message:"必須是 0.5 的倍數" });
		if (hours > 12) errors.push({ field:"hours", message:"不可超過 12 小時" });
		if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);

		try {
			// 單日合計不得超過 12
			const sumRow = await env.DATABASE.prepare("SELECT COALESCE(SUM(hours),0) AS s FROM Timesheets WHERE user_id = ? AND work_date = ? AND is_deleted = 0").bind(String(me.user_id), work_date).first();
			const current = Number(sumRow?.s || 0);
			if (current + hours > 12 + 1e-9) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"每日工時合計不可超過 12 小時", errors:[{ field:"hours", message:"超過上限" }], meta:{ requestId } }, corsHeaders);
			}
			await env.DATABASE.prepare(
				"INSERT INTO Timesheets (user_id, work_date, client_id, service_name, work_type, hours, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
			).bind(String(me.user_id), work_date, client_id, service_name, work_type, hours, note, new Date().toISOString(), new Date().toISOString()).run();
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			const data = { id:String(idRow?.id), date:work_date, clientId:client_id, service:service_name, type:work_type, hours, note };
			return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



