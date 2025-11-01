import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleTasks(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	// GET /api/v1/tasks/:id - 獲取任務詳情（必须在列表查询之前检查）
	if (method === "GET" && url.pathname.match(/\/tasks\/\d+$/)) {
		const taskId = url.pathname.split("/").pop();
		try {
		const task = await env.DATABASE.prepare(
			`SELECT t.task_id, t.task_name, t.due_date, t.status, t.assignee_user_id, t.notes, t.client_service_id,
			        t.completed_date, t.created_at, t.service_month,
			        c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
			        s.service_name,
			        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
			        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
			        u.name AS assignee_name
			 FROM ActiveTasks t
			 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
			 LEFT JOIN Clients c ON c.client_id = cs.client_id
			 LEFT JOIN Services s ON s.service_id = cs.service_id
			 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
			 WHERE t.task_id = ? AND t.is_deleted = 0`
		).bind(taskId).first();
			
			if (!task) {
				return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"任務不存在", meta:{ requestId } }, corsHeaders);
			}
			
			const data = {
				task_id: String(task.task_id),
				task_name: task.task_name,
				client_name: task.client_name || "",
				client_tax_id: task.client_tax_id || "",
				client_id: task.client_id || "",
				service_name: task.service_name || "",
				service_month: task.service_month || "",
				assignee_name: task.assignee_name || "",
				assignee_user_id: task.assignee_user_id || null,
				client_service_id: task.client_service_id || null,
				completed_stages: Number(task.completed_stages || 0),
				total_stages: Number(task.total_stages || 0),
				due_date: task.due_date || null,
				status: task.status,
				notes: task.notes || "",
				completed_date: task.completed_date || null,
				created_at: task.created_at || null
			};
			
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	// GET /api/v1/tasks/:id/sops - 獲取任務關聯的SOP（必须在列表查询之前）
	if (method === "GET" && url.pathname.match(/\/tasks\/\d+\/sops$/)) {
		const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
		try {
			const sops = await env.DATABASE.prepare(
				`SELECT s.sop_id, s.title, s.category, s.version
				 FROM ActiveTaskSOPs ats
				 JOIN SOPDocuments s ON s.sop_id = ats.sop_id
				 WHERE ats.task_id = ? AND s.is_deleted = 0
				 ORDER BY ats.sort_order ASC`
			).bind(taskId).all();
			
			const data = (sops?.results || []).map(s => ({
				id: s.sop_id,
				title: s.title,
				category: s.category || "",
				version: s.version || 1
			}));
			
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// PUT /api/v1/tasks/:id/sops - 更新任務關聯的SOP（必须在列表查询之前）
	if (method === "PUT" && url.pathname.match(/\/tasks\/\d+\/sops$/)) {
		const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		
		const sopIds = Array.isArray(body?.sop_ids) ? body.sop_ids : [];
		
		try {
			// 刪除現有關聯
			await env.DATABASE.prepare(`DELETE FROM ActiveTaskSOPs WHERE task_id = ?`).bind(taskId).run();
			
			// 添加新關聯
			for (let i = 0; i < sopIds.length; i++) {
				await env.DATABASE.prepare(
					`INSERT INTO ActiveTaskSOPs (task_id, sop_id, sort_order) VALUES (?, ?, ?)`
				).bind(taskId, sopIds[i], i).run();
			}
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已更新", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}
	
	// GET /api/v1/tasks - 獲取任務列表
	if (method === "GET") {
		try {
			const params = url.searchParams;
			const page = Math.max(1, parseInt(params.get("page") || "1", 10));
			const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
			const offset = (page - 1) * perPage;
			const q = (params.get("q") || "").trim();
			const status = (params.get("status") || "").trim();
			const due = (params.get("due") || "").trim();
			const componentId = (params.get("component_id") || "").trim();
			const serviceYear = (params.get("service_year") || "").trim();
			const serviceMonth = (params.get("service_month") || "").trim();
			const hideCompleted = params.get("hide_completed") === "1";
			const where = ["t.is_deleted = 0"];
			const binds = [];
			if (!me.is_admin && !componentId) {
				where.push("t.assignee_user_id = ?");
				binds.push(String(me.user_id));
			}
			if (componentId) {
				where.push("t.component_id = ?");
				binds.push(componentId);
			}
			if (q) {
				where.push("(t.task_name LIKE ? OR c.company_name LIKE ? OR c.tax_registration_number LIKE ?)");
				binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
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
			// 按服务月份筛选
			if (serviceYear && serviceMonth) {
				where.push("t.service_month = ?");
				binds.push(`${serviceYear}-${serviceMonth.padStart(2, '0')}`);
			} else if (serviceYear) {
				where.push("t.service_month LIKE ?");
				binds.push(`${serviceYear}-%`);
			}
			// 隐藏已完成任务
			if (hideCompleted) {
				where.push("t.status != 'completed'");
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
				`SELECT t.task_id, t.task_name, t.due_date, t.status, t.assignee_user_id, t.notes, t.service_month,
				        c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
				        s.service_name,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
				        (CASE WHEN t.related_sop_id IS NOT NULL OR t.client_specific_sop_id IS NOT NULL THEN 1 ELSE 0 END) AS has_sop,
				        u.name AS assignee_name
				 FROM ActiveTasks t
				 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
				 LEFT JOIN Clients c ON c.client_id = cs.client_id
				 LEFT JOIN Services s ON s.service_id = cs.service_id
				 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
				 ${whereSql}
				 ORDER BY c.company_name ASC, s.service_name ASC, t.service_month DESC, date(t.due_date) ASC NULLS LAST, t.task_id DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const data = (rows?.results || []).map((r) => ({
				taskId: String(r.task_id),
				taskName: r.task_name,
				clientName: r.client_name || "",
				clientTaxId: r.client_tax_id || "",
				clientId: r.client_id || "",
				serviceName: r.service_name || "",
				serviceMonth: r.service_month || "",
				assigneeName: r.assignee_name || "",
				assigneeUserId: r.assignee_user_id || null,
				progress: { completed: Number(r.completed_stages || 0), total: Number(r.total_stages || 0) },
				dueDate: r.due_date || null,
				status: r.status,
				notes: r.notes || "",
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
		
		// service_month: 默认当前月份，但允许用户指定
		let serviceMonth = body?.service_month ? String(body.service_month).trim() : null;
		if (!serviceMonth) {
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			serviceMonth = `${year}-${month}`;
		}
		
		const errors = [];
		if (!Number.isInteger(clientServiceId) || clientServiceId <= 0) errors.push({ field:"client_service_id", message:"必填" });
		if (taskName.length < 1 || taskName.length > 200) errors.push({ field:"task_name", message:"長度需 1–200" });
		if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field:"due_date", message:"日期格式 YYYY-MM-DD" });
		if (serviceMonth && !/^\d{4}-\d{2}$/.test(serviceMonth)) errors.push({ field:"service_month", message:"格式需 YYYY-MM" });
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
			await env.DATABASE.prepare("INSERT INTO ActiveTasks (client_service_id, template_id, task_name, start_date, due_date, service_month, status, assignee_user_id, created_at) VALUES (?, NULL, ?, NULL, ?, ?, 'pending', ?, ?)").bind(clientServiceId, taskName, dueDate, serviceMonth, assigneeUserId, now).run();
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			const taskId = String(idRow?.id);
			if (stageNames.length > 0) {
				let order = 1;
				for (const s of stageNames) {
					await env.DATABASE.prepare("INSERT INTO ActiveTaskStages (task_id, stage_name, stage_order, status) VALUES (?, ?, ?, 'pending')").bind(taskId, s, order++).run();
				}
			}
			return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ taskId, taskName, clientServiceId, dueDate, serviceMonth, assigneeUserId }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	// PUT /api/v1/tasks/:id - 更新任務（含分配負責人）
	if (method === "PUT" && url.pathname.match(/\/tasks\/\d+$/)) {
		const taskId = url.pathname.split("/").pop();
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}

		const errors = [];
		const updates = [];
		const binds = [];

		// 可更新的欄位
		if (body.hasOwnProperty('task_name')) {
			const taskName = String(body.task_name || "").trim();
			if (taskName.length < 1 || taskName.length > 200) errors.push({ field:"task_name", message:"長度需 1–200" });
			else { updates.push("task_name = ?"); binds.push(taskName); }
		}
		if (body.hasOwnProperty('due_date')) {
			const dueDate = body.due_date ? String(body.due_date) : null;
			if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) errors.push({ field:"due_date", message:"日期格式 YYYY-MM-DD" });
			else { updates.push("due_date = ?"); binds.push(dueDate); }
		}
		if (body.hasOwnProperty('status')) {
			const status = String(body.status || "").trim();
			if (!["pending","in_progress","completed","cancelled"].includes(status)) errors.push({ field:"status", message:"狀態無效" });
			else { 
				updates.push("status = ?"); 
				binds.push(status);
				if (status === "completed") {
					updates.push("completed_date = ?");
					binds.push(new Date().toISOString());
				}
			}
		}
		if (body.hasOwnProperty('assignee_user_id')) {
			const assigneeUserId = body.assignee_user_id ? Number(body.assignee_user_id) : null;
			if (assigneeUserId !== null && (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0)) {
				errors.push({ field:"assignee_user_id", message:"格式錯誤" });
			} else {
				// 驗證負責人是否存在
				if (assigneeUserId) {
					const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
					if (!u) {
						errors.push({ field:"assignee_user_id", message:"負責人不存在" });
					}
				}
				if (errors.length === 0) {
					updates.push("assignee_user_id = ?");
					binds.push(assigneeUserId);
				}
			}
		}
		if (body.hasOwnProperty('notes')) {
			const notes = String(body.notes || "").trim();
			updates.push("notes = ?");
			binds.push(notes || null);
		}
		if (body.hasOwnProperty('service_month')) {
			const serviceMonth = body.service_month ? String(body.service_month).trim() : null;
			if (serviceMonth && !/^\d{4}-\d{2}$/.test(serviceMonth)) {
				errors.push({ field:"service_month", message:"格式需 YYYY-MM" });
			} else {
				updates.push("service_month = ?");
				binds.push(serviceMonth);
			}
		}

		if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
		if (updates.length === 0) return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"沒有要更新的欄位", meta:{ requestId } }, corsHeaders);

		try {
			// 檢查任務是否存在
			const task = await env.DATABASE.prepare("SELECT task_id, assignee_user_id FROM ActiveTasks WHERE task_id = ? AND is_deleted = 0 LIMIT 1").bind(taskId).first();
			if (!task) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"任務不存在", meta:{ requestId } }, corsHeaders);

			// 權限檢查：只有管理員或任務負責人可以更新
			if (!me.is_admin && Number(task.assignee_user_id) !== Number(me.user_id)) {
				return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"無權限更新此任務", meta:{ requestId } }, corsHeaders);
			}

			// 執行更新
			const sql = `UPDATE ActiveTasks SET ${updates.join(", ")} WHERE task_id = ?`;
			await env.DATABASE.prepare(sql).bind(...binds, taskId).run();

			return jsonResponse(200, { ok:true, code:"OK", message:"已更新", data:{ taskId }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	// GET /api/v1/tasks/:id/stages - 獲取任務階段
	if (method === "GET" && url.pathname.match(/\/tasks\/\d+\/stages$/)) {
		const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
		try {
			const stages = await env.DATABASE.prepare(
				`SELECT active_stage_id, stage_name, stage_order, status, started_at, completed_at
				 FROM ActiveTaskStages
				 WHERE task_id = ?
				 ORDER BY stage_order ASC`
			).bind(taskId).all();
			
			const data = (stages?.results || []).map(s => ({
				stage_id: s.active_stage_id,
				stage_name: s.stage_name,
				stage_order: s.stage_order,
				status: s.status,
				started_at: s.started_at,
				completed_at: s.completed_at
			}));
			
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// POST /api/v1/tasks/:id/stages/:stageId/start - 開始階段
	if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/stages\/\d+\/start$/)) {
		const parts = url.pathname.split("/");
		const taskId = parts[parts.length - 4];
		const stageId = parts[parts.length - 2];
		try {
			await env.DATABASE.prepare(
				`UPDATE ActiveTaskStages SET status = 'in_progress', started_at = ? WHERE active_stage_id = ?`
			).bind(new Date().toISOString(), stageId).run();
			
			await env.DATABASE.prepare(
				`UPDATE ActiveTasks SET status = 'in_progress' WHERE task_id = ? AND status = 'pending'`
			).bind(taskId).run();
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已開始", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// POST /api/v1/tasks/:id/stages/:stageId/complete - 完成階段
	if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/stages\/\d+\/complete$/)) {
		const parts = url.pathname.split("/");
		const taskId = parts[parts.length - 4];
		const stageId = parts[parts.length - 2];
		try {
			await env.DATABASE.prepare(
				`UPDATE ActiveTaskStages SET status = 'completed', completed_at = ? WHERE active_stage_id = ?`
			).bind(new Date().toISOString(), stageId).run();
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已完成", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



