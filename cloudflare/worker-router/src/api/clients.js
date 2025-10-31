import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleClients(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	// ⭐ 路由优先级 1: GET /api/v1/clients/:clientId/services/:serviceId/items
	if (method === "GET" && url.pathname.match(/\/clients\/[^\/]+\/services\/\d+\/items$/)) {
		const pathParts = url.pathname.split("/");
		const clientId = pathParts[pathParts.length - 4];
		const serviceId = parseInt(pathParts[pathParts.length - 2]);
		
		try {
			const client = await env.DATABASE.prepare(
				`SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
			).bind(clientId).first();
			
			if (!client) {
				return jsonResponse(404, {
					ok: false,
					code: "NOT_FOUND",
					message: "客戶不存在",
					meta: { requestId }
				}, corsHeaders);
			}
			
			const items = await env.DATABASE.prepare(
				`SELECT item_id, item_name, item_code, description, sort_order
				 FROM ServiceItems
				 WHERE service_id = ? AND is_active = 1
				 ORDER BY sort_order ASC, item_id ASC`
			).bind(serviceId).all();
			
			const data = items.results.map(item => ({
				item_id: item.item_id,
				item_name: item.item_name,
				item_code: item.item_code,
				description: item.description || ""
			}));
			
			return jsonResponse(200, {
				ok: true,
				code: "SUCCESS",
				message: "查詢成功",
				data,
				meta: { requestId }
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	// ⭐ 路由优先级 2: GET /api/v1/clients/:clientId/services
	if (method === "GET" && url.pathname.match(/\/clients\/[^\/]+\/services$/)) {
		const pathParts = url.pathname.split("/");
		const clientId = pathParts[pathParts.length - 2];
		
		console.log('[API DEBUG] 服務項目路由匹配！clientId:', clientId);
		
		try {
			const client = await env.DATABASE.prepare(
				`SELECT client_id FROM Clients WHERE client_id = ? AND is_deleted = 0`
			).bind(clientId).first();
			
			if (!client) {
				return jsonResponse(404, {
					ok: false,
					code: "NOT_FOUND",
					message: "客戶不存在",
					meta: { requestId }
				}, corsHeaders);
			}
			
			const clientServices = await env.DATABASE.prepare(
				`SELECT DISTINCT cs.service_id
				 FROM ClientServices cs
				 WHERE cs.client_id = ? AND cs.is_deleted = 0 AND cs.service_id IS NOT NULL`
			).bind(clientId).all();
			
			console.log('[API DEBUG] ClientServices 查詢結果:', clientServices.results);
			
			let services;
			
			if (clientServices.results && clientServices.results.length > 0) {
				const serviceIds = clientServices.results.map(r => r.service_id);
				const placeholders = serviceIds.map(() => '?').join(',');
				
				console.log('[API DEBUG] 客戶有指定服務，serviceIds:', serviceIds);
				
				services = await env.DATABASE.prepare(
					`SELECT service_id, service_name, service_code, description
					 FROM Services
					 WHERE service_id IN (${placeholders}) AND is_active = 1
					 ORDER BY sort_order ASC, service_id ASC`
				).bind(...serviceIds).all();
			} else {
				console.log('[API DEBUG] 客戶沒有指定服務，返回所有可用服務');
				services = await env.DATABASE.prepare(
					`SELECT service_id, service_name, service_code, description
					 FROM Services
					 WHERE is_active = 1
					 ORDER BY sort_order ASC, service_id ASC`
				).all();
			}
			
			const data = services.results.map(service => ({
				service_id: service.service_id,
				service_name: service.service_name,
				service_code: service.service_code,
				description: service.description || ""
			}));
			
			console.log('[API DEBUG] 最終返回服務列表:', data);
			
			return jsonResponse(200, {
				ok: true,
				code: "SUCCESS",
				message: "查詢成功",
				data,
				meta: { requestId }
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	// ⭐ 路由优先级 3: GET /api/v1/clients/:id - 客戶詳情
	if (method === "GET" && url.pathname.match(/\/clients\/[^\/]+$/)) {
		const clientId = url.pathname.split("/").pop();
		try {
			const row = await env.DATABASE.prepare(
				`SELECT c.client_id, c.company_name, c.tax_registration_number, c.phone, c.email, 
				        c.client_notes, c.payment_notes, c.created_at, c.updated_at,
				        u.user_id as assignee_id, u.name as assignee_name,
				        GROUP_CONCAT(t.tag_id || ':' || t.tag_name || ':' || COALESCE(t.tag_color, ''), '|') as tags
				 FROM Clients c
				 LEFT JOIN Users u ON u.user_id = c.assignee_user_id
				 LEFT JOIN ClientTagAssignments a ON a.client_id = c.client_id
				 LEFT JOIN CustomerTags t ON t.tag_id = a.tag_id
				 WHERE c.client_id = ? AND c.is_deleted = 0
				 GROUP BY c.client_id`
			).bind(clientId).first();
			
			if (!row) {
				return jsonResponse(404, { 
					ok: false, 
					code: "NOT_FOUND", 
					message: "客戶不存在", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 解析標籤
			const tags = [];
			if (row.tags) {
				const tagParts = String(row.tags).split('|');
				tagParts.forEach(part => {
					const [id, name, color] = part.split(':');
					if (id && name) {
						tags.push({
							tag_id: parseInt(id),
							tag_name: name,
							tag_color: color || null
						});
					}
				});
			}
			
			const data = {
				clientId: row.client_id,
				companyName: row.company_name,
				taxId: row.tax_registration_number,
				assigneeUserId: row.assignee_id,
				assigneeName: row.assignee_name || "",
				phone: row.phone || "",
				email: row.email || "",
				clientNotes: row.client_notes || "",
				paymentNotes: row.payment_notes || "",
				tags: tags,
				createdAt: row.created_at,
				updatedAt: row.updated_at
			};
			
			return jsonResponse(200, { 
				ok: true, 
				code: "SUCCESS", 
				message: "查詢成功", 
				data, 
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	// ⭐ 路由优先级 4: GET /api/v1/clients - 客戶列表（必须明确检查路径）
	if (method === "GET" && url.pathname === "/internal/api/v1/clients") {
		const params = url.searchParams;
		const page = Math.max(1, parseInt(params.get("page") || "1", 10));
		const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
		const offset = (page - 1) * perPage;
		const companyName = (params.get("company_name") || params.get("q") || "").trim();
		try {
			const where = ["c.is_deleted = 0"];
			const binds = [];
			if (companyName) {
				where.push("c.company_name LIKE ?");
				binds.push(`%${companyName}%`);
			}
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			const countRow = await env.DATABASE.prepare(
				`SELECT COUNT(1) as total FROM Clients c ${whereSql}`
			).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			const rows = await env.DATABASE.prepare(
				`SELECT c.client_id, c.company_name, c.tax_registration_number, c.phone, c.email, c.created_at, 
				        u.name as assignee_name,
				        GROUP_CONCAT(t.tag_name, ',') as tags
				 FROM Clients c
				 LEFT JOIN Users u ON u.user_id = c.assignee_user_id
				 LEFT JOIN ClientTagAssignments a ON a.client_id = c.client_id
				 LEFT JOIN CustomerTags t ON t.tag_id = a.tag_id
				 ${whereSql}
				 GROUP BY c.client_id
				 ORDER BY c.created_at DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const data = (rows?.results || []).map((r) => ({
				clientId: r.client_id,
				companyName: r.company_name,
				taxId: r.tax_registration_number,
				assigneeName: r.assignee_name || "",
				tags: (r.tags ? String(r.tags).split(",").filter(Boolean) : []),
				phone: r.phone || "",
				email: r.email || "",
				createdAt: r.created_at,
			}));
			const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
			return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	if (method === "POST") {
		let body;
		try {
			body = await request.json();
		} catch (_) {
			return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, corsHeaders);
		}
		const errors = [];
		const clientId = String(body?.client_id || "").trim();
		const companyName = String(body?.company_name || "").trim();
		const assigneeUserId = Number(body?.assignee_user_id || 0);
		const phone = (body?.phone || "").trim();
		const email = (body?.email || "").trim();
		const clientNotes = (body?.client_notes || "").trim();
		const paymentNotes = (body?.payment_notes || "").trim();
		const tagIds = Array.isArray(body?.tag_ids) ? body.tag_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];

		if (!/^\d{8}$/.test(clientId)) errors.push({ field: "client_id", message: "必填且須為8位數字" });
		if (companyName.length < 1 || companyName.length > 100) errors.push({ field: "company_name", message: "長度需 1–100" });
		if (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0) errors.push({ field: "assignee_user_id", message: "必填" });
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: "email", message: "Email 格式錯誤" });
		if (phone && !/^[-+()\s0-9]{6,}$/.test(phone)) errors.push({ field: "phone", message: "電話格式錯誤" });
		if (errors.length) {
			return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } }, corsHeaders);
		}
		try {
			// 檢查唯一/存在
			const dup = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(clientId).first();
			if (dup) {
				return jsonResponse(409, { ok: false, code: "CONFLICT", message: "客戶已存在", meta: { requestId } }, corsHeaders);
			}
			const assExist = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
			if (!assExist) {
				return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "負責人不存在", errors: [{ field: "assignee_user_id", message: "不存在" }], meta: { requestId } }, corsHeaders);
			}
			if (tagIds.length > 0) {
				const placeholders = tagIds.map(() => "?").join(",");
				const row = await env.DATABASE.prepare(`SELECT COUNT(1) as cnt FROM CustomerTags WHERE tag_id IN (${placeholders})`).bind(...tagIds).first();
				if (Number(row?.cnt || 0) !== tagIds.length) {
					return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "標籤不存在", meta: { requestId } }, corsHeaders);
				}
			}
			const now = new Date().toISOString();
			await env.DATABASE.prepare(
				"INSERT INTO Clients (client_id, company_name, assignee_user_id, phone, email, client_notes, payment_notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
			).bind(clientId, companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, now, now).run();
			for (const tagId of tagIds) {
				await env.DATABASE.prepare("INSERT OR IGNORE INTO ClientTagAssignments (client_id, tag_id, assigned_at) VALUES (?, ?, ?)").bind(clientId, tagId, now).run();
			}
			const data = { clientId, companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, tags: tagIds };
			return jsonResponse(201, { ok: true, code: "CREATED", message: "已建立", data, meta: { requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	// PUT /api/v1/clients/:id - 編輯客戶
	if (method === "PUT" && url.pathname.match(/\/clients\/[^\/]+$/)) {
		const clientId = url.pathname.split("/").pop();
		let body;
		try {
			body = await request.json();
		} catch (_) {
			return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, corsHeaders);
		}
		
		const errors = [];
		const companyName = String(body?.company_name || "").trim();
		const assigneeUserId = Number(body?.assignee_user_id || 0);
		const phone = (body?.phone || "").trim();
		const email = (body?.email || "").trim();
		const clientNotes = (body?.client_notes || "").trim();
		const paymentNotes = (body?.payment_notes || "").trim();
		const tagIds = Array.isArray(body?.tag_ids) ? body.tag_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];

		// 驗證
		if (companyName.length < 1 || companyName.length > 100) errors.push({ field: "company_name", message: "長度需 1–100" });
		if (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0) errors.push({ field: "assignee_user_id", message: "必填" });
		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: "email", message: "Email 格式錯誤" });
		if (phone && !/^[-+()\s0-9]{6,}$/.test(phone)) errors.push({ field: "phone", message: "電話格式錯誤" });
		if (errors.length) {
			return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } }, corsHeaders);
		}

		try {
			// 檢查客戶是否存在
			const existing = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(clientId).first();
			if (!existing) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "客戶不存在", meta: { requestId } }, corsHeaders);
			}
			
			// 檢查負責人員是否存在
			const assExist = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
			if (!assExist) {
				return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "負責人不存在", errors: [{ field: "assignee_user_id", message: "不存在" }], meta: { requestId } }, corsHeaders);
			}
			
			// 檢查標籤是否存在
			if (tagIds.length > 0) {
				const placeholders = tagIds.map(() => "?").join(",");
				const row = await env.DATABASE.prepare(`SELECT COUNT(1) as cnt FROM CustomerTags WHERE tag_id IN (${placeholders})`).bind(...tagIds).first();
				if (Number(row?.cnt || 0) !== tagIds.length) {
					return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "標籤不存在", meta: { requestId } }, corsHeaders);
				}
			}
			
			const now = new Date().toISOString();
			
			// 更新客戶資料
			await env.DATABASE.prepare(
				"UPDATE Clients SET company_name = ?, assignee_user_id = ?, phone = ?, email = ?, client_notes = ?, payment_notes = ?, updated_at = ? WHERE client_id = ?"
			).bind(companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, now, clientId).run();
			
			// 刪除舊的標籤關聯
			await env.DATABASE.prepare("DELETE FROM ClientTagAssignments WHERE client_id = ?").bind(clientId).run();
			
			// 新增新的標籤關聯
			for (const tagId of tagIds) {
				await env.DATABASE.prepare("INSERT INTO ClientTagAssignments (client_id, tag_id, assigned_at) VALUES (?, ?, ?)").bind(clientId, tagId, now).run();
			}
			
			const data = { clientId, companyName, assigneeUserId, phone, email, clientNotes, paymentNotes, tags: tagIds, updatedAt: now };
			return jsonResponse(200, { ok: true, code: "SUCCESS", message: "已更新", data, meta: { requestId } }, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	// DELETE /api/v1/clients/:id - 刪除客戶（軟刪除）
	if (method === "DELETE" && url.pathname.match(/\/clients\/[^\/]+$/)) {
		const clientId = url.pathname.split("/").pop();
		try {
			// 檢查客戶是否存在
			const existing = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(clientId).first();
			if (!existing) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "客戶不存在", meta: { requestId } }, corsHeaders);
			}
			
			const now = new Date().toISOString();
			
			// 軟刪除：設置 is_deleted = 1，記錄 deleted_at 和 deleted_by
			await env.DATABASE.prepare(
				"UPDATE Clients SET is_deleted = 1, deleted_at = ?, deleted_by = ? WHERE client_id = ?"
			).bind(now, me.user_id, clientId).run();
			
			return jsonResponse(200, { 
				ok: true, 
				code: "SUCCESS", 
				message: "已刪除", 
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	// POST /api/v1/clients/batch-assign - 批量分配負責人（僅管理員）
	if (method === "POST" && url.pathname === "/internal/api/v1/clients/batch-assign") {
		// 檢查管理員權限
		if (!me.is_admin) {
			return jsonResponse(403, { 
				ok: false, 
				code: "FORBIDDEN", 
				message: "權限不足，僅管理員可執行", 
				meta: { requestId } 
			}, corsHeaders);
		}
		
		let body;
		try {
			body = await request.json();
		} catch (_) {
			return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, corsHeaders);
		}
		
		const errors = [];
		const clientIds = Array.isArray(body?.client_ids) ? body.client_ids : [];
		const assigneeUserId = Number(body?.assignee_user_id || 0);
		
		// 驗證
		if (clientIds.length === 0) {
			errors.push({ field: "client_ids", message: "請選擇至少一個客戶" });
		}
		if (clientIds.length > 100) {
			errors.push({ field: "client_ids", message: "一次最多分配 100 個客戶" });
		}
		if (!Number.isInteger(assigneeUserId) || assigneeUserId <= 0) {
			errors.push({ field: "assignee_user_id", message: "請選擇負責人員" });
		}
		if (errors.length) {
			return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } }, corsHeaders);
		}
		
		try {
			// 檢查負責人員是否存在
			const assExist = await env.DATABASE.prepare("SELECT 1 FROM Users WHERE user_id = ? AND is_deleted = 0 LIMIT 1").bind(assigneeUserId).first();
			if (!assExist) {
				return jsonResponse(422, { 
					ok: false, 
					code: "VALIDATION_ERROR", 
					message: "負責人不存在", 
					errors: [{ field: "assignee_user_id", message: "不存在" }], 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			const now = new Date().toISOString();
			const placeholders = clientIds.map(() => "?").join(",");
			
			// 批量更新
			const result = await env.DATABASE.prepare(
				`UPDATE Clients SET assignee_user_id = ?, updated_at = ? WHERE client_id IN (${placeholders}) AND is_deleted = 0`
			).bind(assigneeUserId, now, ...clientIds).run();
			
			const updatedCount = result?.meta?.changes || 0;
			
			return jsonResponse(200, { 
				ok: true, 
				code: "SUCCESS", 
				message: `已更新 ${updatedCount} 個客戶`, 
				data: { updated_count: updatedCount },
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



