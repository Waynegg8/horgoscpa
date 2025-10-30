import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleClients(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	// GET /api/v1/clients/:id - 客戶詳情
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
	
	// GET /api/v1/clients - 客戶列表
	if (method === "GET") {
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

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



