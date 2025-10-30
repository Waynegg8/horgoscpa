import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleTasks(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	if (method === "GET") {
		try {
			const params = url.searchParams;
			const page = Math.max(1, parseInt(params.get("page") || "1", 10));
			const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
			const offset = (page - 1) * perPage;
			const q = (params.get("q") || "").trim();
			const status = (params.get("status") || "").trim();
			const due = (params.get("due") || "").trim();
			const where = ["t.is_deleted = 0"];
			const binds = [];
			if (!me.is_admin) {
				where.push("t.assignee_user_id = ?");
				binds.push(String(me.user_id));
			}
			if (q) {
				where.push("(t.task_name LIKE ? OR c.company_name LIKE ?)");
				binds.push(`%${q}%`, `%${q}%`);
			}
			if (status && ["pending","in_progress","completed","cancelled"].includes(status)) {
				where.push("t.status = ?");
				binds.push(status);
			}
			if (due === "overdue") {
				where.push("date(t.due_date) < date('now') AND t.status != 'completed'");
			}
			if (due === "soon") {
				where.push("date(t.due_date) BETWEEN date('now') AND date('now','+3 days')");
			}
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			const countRow = await env.DATABASE.prepare(
				`SELECT COUNT(1) as total
				 FROM ActiveTasks t
				 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
				 LEFT JOIN Clients c ON c.client_id = cs.client_id
				 ${whereSql}`
			).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			const rows = await env.DATABASE.prepare(
				`SELECT t.task_id, t.task_name, t.due_date, t.status, t.assignee_user_id,
				        c.company_name AS client_name,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
				        (CASE WHEN t.related_sop_id IS NOT NULL OR t.client_specific_sop_id IS NOT NULL THEN 1 ELSE 0 END) AS has_sop,
				        u.name AS assignee_name
				 FROM ActiveTasks t
				 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
				 LEFT JOIN Clients c ON c.client_id = cs.client_id
				 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
				 ${whereSql}
				 ORDER BY date(t.due_date) ASC NULLS LAST, t.task_id DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const data = (rows?.results || []).map((r) => ({
				taskId: String(r.task_id),
				taskName: r.task_name,
				clientName: r.client_name || "",
				assigneeName: r.assignee_name || "",
				progress: { completed: Number(r.completed_stages || 0), total: Number(r.total_stages || 0) },
				dueDate: r.due_date || null,
				status: r.status,
				hasSop: Number(r.has_sop || 0) === 1,
			}));
			const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
			return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
		}
	}

	if (method === "POST") {
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		const clientServiceId = Number(body?.client_service_id || 0);
		const taskName = String(body?.task_name || "").trim();
		const dueDate = body?.due_date ? String(body.due_date) : null;
		const assigneeUserId = body?.assignee_user_id ? Number(body.assignee_user_id) : null;
		const stageNames = Array.isArray(body?.stage_names) ? body.stage_names.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim()) : [];
		const errors = [];
		if (!Number.isInteger(clientServiceId) || clientServiceId <= 0) errors.push({ field:"client_service_id", message:"必填" });
		if (taskName.length < 1 || taskName.length > 200) errors.push({ field:"task_name", message:"長度需 1–200" });
		if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field:"due_date", message:"日期格式 YYYY-MM-DD" });
		if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) errors.push({ field:"assignee_user_id", message:"格式錯誤" });
		if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);

		try {
			const cs = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_service_id = ? LIMIT 1").bind(clientServiceId).first();
			if (!cs) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"客戶服務不存在", errors:[{ field:"client_service_id", message:"不存在" }], meta:{ requestId } }, corsHeaders);
			if (assigneeUserId) {
				const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
				if (!u) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"負責人不存在", errors:[{ field:"assignee_user_id", message:"不存在" }], meta:{ requestId } }, corsHeaders);
			}
			const now = new Date().toISOString();
			await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, template_id, task_name, start_date, due_date, status, assignee_user_id, created_at) VALUES (?, NULL, ?, NULL, ?, 'pending', ?, ?)").bind(clientServiceId, taskName, dueDate, assigneeUserId, now).run();
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			const taskId = String(idRow?.id);
			if (stageNames.length > 0) {
				let order = 1;
				for (const s of stageNames) {
					await env.DATABASE.prepare("INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status) VALUES (?, ?, ?, 'pending')").bind(taskId, s, order++).run();
				}
			}
			return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ taskId, taskName, clientServiceId, dueDate, assigneeUserId }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



