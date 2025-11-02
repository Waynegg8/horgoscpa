import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { autoAdjustDependentTasks, recordStatusUpdate, recordDueDateAdjustment, getAdjustmentHistory } from "./task_adjustments.js";

export async function handleTasks(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	// GET /api/v1/tasks/:id - 獲取任務詳情（必须在列表查询之前检查）
	if (method === "GET" && url.pathname.match(/\/tasks\/\d+$/)) {
		const taskId = url.pathname.split("/").pop();
		try {
		const task = await env.DATABASE.prepare(
			`SELECT t.task_id, t.task_name, t.due_date, t.status, t.assignee_user_id, t.notes, t.client_service_id,
			        t.completed_date, t.created_at, t.service_month, t.component_id,
			        t.prerequisite_task_id, t.original_due_date, t.due_date_adjusted, t.adjustment_reason,
			        t.adjustment_count, t.last_adjustment_date, t.can_start_date, t.estimated_work_days,
			        t.status_note, t.blocker_reason, t.overdue_reason, t.expected_completion_date,
			        t.is_overdue, t.completed_at, t.last_status_update,
			        c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
			        s.service_name,
			        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
			        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
			        u.name AS assignee_name,
			        pt.task_name AS prerequisite_task_name
			 FROM ActiveTasks t
			 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
			 LEFT JOIN Clients c ON c.client_id = cs.client_id
			 LEFT JOIN Services s ON s.service_id = cs.service_id
			 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
			 LEFT JOIN ActiveTasks pt ON pt.task_id = t.prerequisite_task_id AND pt.is_deleted = 0
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
				component_id: task.component_id || null,
				completed_stages: Number(task.completed_stages || 0),
				total_stages: Number(task.total_stages || 0),
				due_date: task.due_date || null,
				original_due_date: task.original_due_date || null,
				due_date_adjusted: Boolean(task.due_date_adjusted),
				adjustment_reason: task.adjustment_reason || "",
				adjustment_count: Number(task.adjustment_count || 0),
				last_adjustment_date: task.last_adjustment_date || null,
				can_start_date: task.can_start_date || null,
				estimated_work_days: Number(task.estimated_work_days || 3),
				prerequisite_task_id: task.prerequisite_task_id || null,
				prerequisite_task_name: task.prerequisite_task_name || null,
				status: task.status,
				status_note: task.status_note || "",
				blocker_reason: task.blocker_reason || "",
				overdue_reason: task.overdue_reason || "",
				expected_completion_date: task.expected_completion_date || null,
				is_overdue: Boolean(task.is_overdue),
				last_status_update: task.last_status_update || null,
				notes: task.notes || "",
				completed_date: task.completed_date || null,
				completed_at: task.completed_at || null,
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
	
	// GET /api/v1/tasks - 獲取任務列表（必须精确匹配，避免拦截子路径）
	if (method === "GET" && url.pathname.match(/\/tasks$/)) {
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
			if (status && ["in_progress","completed","cancelled"].includes(status)) {
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
				`SELECT t.task_id, t.task_name, t.due_date, t.original_due_date, t.status, t.assignee_user_id, t.notes, t.service_month, t.component_id,
				        t.prerequisite_task_id, t.is_overdue, t.due_date_adjusted, t.adjustment_count, t.overdue_reason,
				        c.company_name AS client_name, c.tax_registration_number AS client_tax_id, c.client_id,
				        s.service_name,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id) AS total_stages,
				        (SELECT COUNT(1) FROM ActiveTaskStages s WHERE s.task_id = t.task_id AND s.status = 'completed') AS completed_stages,
				        (CASE WHEN t.related_sop_id IS NOT NULL OR t.client_specific_sop_id IS NOT NULL THEN 1 ELSE 0 END) AS has_sop,
				        u.name AS assignee_name,
				        pt.task_name AS prerequisite_task_name
				 FROM ActiveTasks t
				 LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
				 LEFT JOIN Clients c ON c.client_id = cs.client_id
				 LEFT JOIN Services s ON s.service_id = cs.service_id
				 LEFT JOIN Users u ON u.user_id = t.assignee_user_id
				 LEFT JOIN ActiveTasks pt ON pt.task_id = t.prerequisite_task_id AND pt.is_deleted = 0
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
				clientServiceId: r.client_service_id || null,
				serviceId: r.service_id || null,
				serviceName: r.service_name || "",
				serviceMonth: r.service_month || "",
				componentId: r.component_id || null,
				assigneeName: r.assignee_name || "",
				assigneeUserId: r.assignee_user_id || null,
				progress: { completed: Number(r.completed_stages || 0), total: Number(r.total_stages || 0) },
				dueDate: r.due_date || null,
				originalDueDate: r.original_due_date || null,
				dueDateAdjusted: Boolean(r.due_date_adjusted),
				adjustmentCount: Number(r.adjustment_count || 0),
				prerequisiteTaskId: r.prerequisite_task_id || null,
				prerequisiteTaskName: r.prerequisite_task_name || null,
				isOverdue: Boolean(r.is_overdue),
				overdueReason: r.overdue_reason || "",
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

	// POST /api/v1/tasks - 新增任务（必须精确匹配路径，避免匹配到子路径）
	if (method === "POST" && url.pathname.match(/\/tasks$/)) {
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		const clientServiceId = Number(body?.client_service_id || 0);
		const taskName = String(body?.task_name || "").trim();
		const dueDate = body?.due_date ? String(body.due_date) : null;
		const assigneeUserId = body?.assignee_user_id ? Number(body.assignee_user_id) : null;
		const stageNames = Array.isArray(body?.stage_names) ? body.stage_names.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim()) : [];
		const prerequisiteTaskId = body?.prerequisite_task_id ? Number(body.prerequisite_task_id) : null;
		
		// 期限调整相关
		const defaultDueDate = body?.default_due_date ? String(body.default_due_date) : null; // 系统预设期限
		const adjustmentReason = body?.adjustment_reason ? String(body.adjustment_reason).trim() : null; // 调整原因
		
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
		
		// 如果提供了default_due_date且实际due_date与之不同，必须填写原因
		if (defaultDueDate && dueDate && defaultDueDate !== dueDate && !adjustmentReason) {
			errors.push({ field:"adjustment_reason", message:"調整預設期限時必須填寫原因" });
		}
		
		if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);

		try {
			const cs = await env.DATABASE.prepare("SELECT client_service_id FROM ClientServices WHERE client_service_id = ? LIMIT 1").bind(clientServiceId).first();
			if (!cs) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"客戶服務不存在", errors:[{ field:"client_service_id", message:"不存在" }], meta:{ requestId } }, corsHeaders);
			if (assigneeUserId) {
				const u = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
				if (!u) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"負責人不存在", errors:[{ field:"assignee_user_id", message:"不存在" }], meta:{ requestId } }, corsHeaders);
			}
			
		const now = new Date().toISOString();
		const originalDueDate = defaultDueDate || dueDate; // 保存原始期限
		
		// 预计完成日期默认等于到期日
		const expectedCompletionDate = dueDate;
		
		await env.DATABASE.prepare(`
			INSERT INTO ActiveTasks (
				client_service_id, template_id, task_name, start_date, due_date, service_month, 
				status, assignee_user_id, prerequisite_task_id, original_due_date, 
				expected_completion_date, created_at
			) VALUES (?, NULL, ?, NULL, ?, ?, 'in_progress', ?, ?, ?, ?, ?)
		`).bind(clientServiceId, taskName, dueDate, serviceMonth, assigneeUserId, prerequisiteTaskId, originalDueDate, expectedCompletionDate, now).run();
			
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			const taskId = String(idRow?.id);
			
			// 如果调整了默认期限，记录调整历史
			if (defaultDueDate && dueDate && defaultDueDate !== dueDate && adjustmentReason) {
				await recordDueDateAdjustment(
					env,
					taskId,
					defaultDueDate,
					dueDate,
					adjustmentReason,
					'initial_create',
					me.user_id,
					false,
					true // 标记为初始创建时的调整
				);
			}
			
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
			if (!["in_progress","completed","cancelled"].includes(status)) errors.push({ field:"status", message:"狀態無效" });
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
			
			// 注意：已移除 pending 状态，新任务默认为 in_progress
			
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
	
	// POST /api/v1/tasks/:id/update-status - 更新任务状态（逾期必填原因）
	if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/update-status$/)) {
		const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		
		const status = body?.status;
		const progress_note = (body?.progress_note || '').trim() || null;
		const blocker_reason = (body?.blocker_reason || '').trim() || null;
		const overdue_reason = (body?.overdue_reason || '').trim() || null;
		const expected_completion_date = body?.expected_completion_date || null;
		
		console.log('[任务状态更新] 收到数据:', { status, progress_note, overdue_reason, blocker_reason, expected_completion_date });
		
		const errors = [];
		if (!['in_progress', 'completed', 'cancelled'].includes(status)) {
			errors.push({ field: 'status', message: '状态无效' });
		}
		
		try {
			// 获取任务信息
			const task = await env.DATABASE.prepare(`
				SELECT task_id, due_date, status as current_status
				FROM ActiveTasks
				WHERE task_id = ? AND is_deleted = 0
			`).bind(taskId).first();
			
			if (!task) {
				return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"任務不存在", meta:{ requestId } }, corsHeaders);
			}
			
			// 检查是否逾期
			const today = new Date().toISOString().split('T')[0];
			const isOverdue = task.due_date && task.due_date < today && task.current_status !== 'completed';
			
			console.log('[任务状态更新] 逾期检查:', { due_date: task.due_date, today, isOverdue, overdue_reason });
			
			// 如果任务逾期，必须填写逾期原因
			if (isOverdue && !overdue_reason) {
				errors.push({ field: 'overdue_reason', message: '任务逾期，必须填写逾期原因' });
			}
			
			if (errors.length) {
				console.log('[任务状态更新] 验证失败:', errors);
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
			}
			
			// 记录状态更新
			await recordStatusUpdate(env, taskId, status, me.user_id, {
				progress_note,
				blocker_reason,
				overdue_reason,
				expected_completion_date
			});
			
			// 更新任务状态
			let completedAt = null;
			if (status === 'completed') {
				completedAt = new Date().toISOString();
			}
			
			await env.DATABASE.prepare(`
				UPDATE ActiveTasks
				SET status = ?,
					completed_at = ?,
					is_overdue = ?
				WHERE task_id = ?
			`).bind(status, completedAt, isOverdue ? 1 : 0, taskId).run();
			
			// 如果任务完成，自动调整后续依赖任务
			if (status === 'completed') {
				try {
					const adjustResult = await autoAdjustDependentTasks(env, taskId, me.user_id);
					console.log(`[任务完成] 自动调整了 ${adjustResult.adjusted} 个后续任务`);
				} catch (err) {
					console.error('[任务完成] 自动调整后续任务失败:', err);
					// 不阻塞主流程
				}
			}
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已更新狀態", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const resBody = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") resBody.error = String(err);
			return jsonResponse(500, resBody, corsHeaders);
		}
	}
	
	// POST /api/v1/tasks/:id/adjust-due-date - 调整到期日（必填原因）
	if (method === "POST" && url.pathname.match(/\/tasks\/\d+\/adjust-due-date$/)) {
		const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		
		const new_due_date = body?.new_due_date;
		const reason = (body?.reason || '').trim();
		
		console.log('[调整到期日] 收到数据:', { taskId, new_due_date, reason });
		
		const errors = [];
		if (!new_due_date || !/^\d{4}-\d{2}-\d{2}$/.test(new_due_date)) {
			errors.push({ field: 'new_due_date', message: '日期格式无效 (YYYY-MM-DD)' });
		}
		if (!reason) {
			errors.push({ field: 'reason', message: '必须填写调整原因' });
		}
		
		if (errors.length) {
			console.log('[调整到期日] 验证失败:', errors);
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
		}
		
		try {
			// 获取任务信息
			const task = await env.DATABASE.prepare(`
				SELECT task_id, due_date, status
				FROM ActiveTasks
				WHERE task_id = ? AND is_deleted = 0
			`).bind(taskId).first();
			
			if (!task) {
				return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"任務不存在", meta:{ requestId } }, corsHeaders);
			}
			
			// 检查是否逾期
			const today = new Date().toISOString().split('T')[0];
			const isOverdue = task.due_date && task.due_date < today && task.status !== 'completed';
			
			// 记录调整
			await recordDueDateAdjustment(
				env,
				taskId,
				task.due_date,
				new_due_date,
				reason,
				isOverdue ? 'overdue_adjust' : 'manual_adjust',
				me.user_id,
				isOverdue,
				false
			);
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已調整到期日", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const resBody = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") resBody.error = String(err);
			return jsonResponse(500, resBody, corsHeaders);
		}
	}
	
	// GET /api/v1/tasks/:id/adjustment-history - 查询调整历史
	if (method === "GET" && url.pathname.match(/\/tasks\/\d+\/adjustment-history$/)) {
		const taskId = url.pathname.split("/")[url.pathname.split("/").length - 2];
		console.log('[路由] 进入调整历史路由, taskId:', taskId, 'path:', url.pathname);
		
		try {
			console.log('[路由] 开始调用 getAdjustmentHistory');
			const history = await getAdjustmentHistory(env, taskId);
			console.log('[路由] getAdjustmentHistory 返回成功, 记录数:', history?.length);
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data: history, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error('[路由] getAdjustmentHistory 失败');
			console.error('[路由] 错误信息:', err.message);
			console.error('[路由] 错误堆栈:', err.stack);
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err), stack: err.stack }));
			const resBody = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") {
				resBody.error = String(err);
				resBody.errorMessage = err.message;
				resBody.stack = err.stack;
			}
			return jsonResponse(500, resBody, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



