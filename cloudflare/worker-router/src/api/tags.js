import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 標籤管理 API
 * GET /api/v1/tags - 查詢所有標籤
 * POST /api/v1/tags - 新增標籤
 * PUT /api/v1/tags/:id - 更新標籤
 * DELETE /api/v1/tags/:id - 刪除標籤
 */
export async function handleTags(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	// GET /api/v1/tags - 查詢所有標籤
	if (method === "GET" && !url.pathname.match(/\/tags\/\d+$/)) {
		try {
			const rows = await env.DATABASE.prepare(
				"SELECT tag_id, tag_name, tag_color, created_at FROM CustomerTags ORDER BY tag_name ASC"
			).all();
			
			const data = (rows?.results || []).map(r => ({
				tag_id: r.tag_id,
				tag_name: r.tag_name,
				tag_color: r.tag_color || null,
				created_at: r.created_at
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
	
	// GET /api/v1/tags/:id - 查詢單一標籤
	if (method === "GET" && url.pathname.match(/\/tags\/\d+$/)) {
		const tagId = parseInt(url.pathname.split("/").pop(), 10);
		try {
			const row = await env.DATABASE.prepare(
				"SELECT tag_id, tag_name, tag_color, created_at FROM CustomerTags WHERE tag_id = ?"
			).bind(tagId).first();
			
			if (!row) {
				return jsonResponse(404, { 
					ok: false, 
					code: "NOT_FOUND", 
					message: "標籤不存在", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			const data = {
				tag_id: row.tag_id,
				tag_name: row.tag_name,
				tag_color: row.tag_color || null,
				created_at: row.created_at
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
	
	// POST /api/v1/tags - 新增標籤
	if (method === "POST") {
		let body;
		try {
			body = await request.json();
		} catch (_) {
			return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, corsHeaders);
		}
		
		const errors = [];
		const tagName = String(body?.tag_name || "").trim();
		const tagColor = String(body?.tag_color || "").trim();
		
		// 驗證
		if (!tagName || tagName.length < 1 || tagName.length > 50) {
			errors.push({ field: "tag_name", message: "標籤名稱為必填（1-50字）" });
		}
		if (tagColor && !/^#[0-9A-Fa-f]{6}$/.test(tagColor)) {
			errors.push({ field: "tag_color", message: "顏色碼格式錯誤（需為 #RRGGBB）" });
		}
		if (errors.length) {
			return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } }, corsHeaders);
		}
		
		try {
			// 檢查標籤名稱唯一性
			const existing = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_name = ? LIMIT 1").bind(tagName).first();
			if (existing) {
				return jsonResponse(409, { ok: false, code: "CONFLICT", message: "標籤名稱已存在", meta: { requestId } }, corsHeaders);
			}
			
			const now = new Date().toISOString();
			await env.DATABASE.prepare(
				"INSERT INTO CustomerTags (tag_name, tag_color, created_at) VALUES (?, ?, ?)"
			).bind(tagName, tagColor || null, now).run();
			
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			const data = { tag_id: idRow?.id, tag_name: tagName, tag_color: tagColor || null, created_at: now };
			
			return jsonResponse(201, { ok: true, code: "CREATED", message: "已建立", data, meta: { requestId } }, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	// PUT /api/v1/tags/:id - 更新標籤
	if (method === "PUT" && url.pathname.match(/\/tags\/\d+$/)) {
		const tagId = parseInt(url.pathname.split("/").pop(), 10);
		let body;
		try {
			body = await request.json();
		} catch (_) {
			return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, corsHeaders);
		}
		
		const errors = [];
		const tagName = body?.tag_name ? String(body.tag_name).trim() : null;
		const tagColor = body?.tag_color ? String(body.tag_color).trim() : null;
		
		// 驗證
		if (tagName !== null && (tagName.length < 1 || tagName.length > 50)) {
			errors.push({ field: "tag_name", message: "標籤名稱長度需為 1-50字" });
		}
		if (tagColor !== null && tagColor !== "" && !/^#[0-9A-Fa-f]{6}$/.test(tagColor)) {
			errors.push({ field: "tag_color", message: "顏色碼格式錯誤（需為 #RRGGBB）" });
		}
		if (errors.length) {
			return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } }, corsHeaders);
		}
		
		try {
			// 檢查標籤是否存在
			const existing = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_id = ? LIMIT 1").bind(tagId).first();
			if (!existing) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "標籤不存在", meta: { requestId } }, corsHeaders);
			}
			
			// 如果更新名稱，檢查唯一性
			if (tagName !== null) {
				const dup = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_name = ? AND tag_id != ? LIMIT 1").bind(tagName, tagId).first();
				if (dup) {
					return jsonResponse(409, { ok: false, code: "CONFLICT", message: "標籤名稱已存在", meta: { requestId } }, corsHeaders);
				}
			}
			
			// 構建更新語句
			const updates = [];
			const binds = [];
			if (tagName !== null) {
				updates.push("tag_name = ?");
				binds.push(tagName);
			}
			if (tagColor !== null) {
				updates.push("tag_color = ?");
				binds.push(tagColor === "" ? null : tagColor);
			}
			
			if (updates.length === 0) {
				return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "沒有可更新的欄位", meta: { requestId } }, corsHeaders);
			}
			
			binds.push(tagId);
			await env.DATABASE.prepare(
				`UPDATE CustomerTags SET ${updates.join(", ")} WHERE tag_id = ?`
			).bind(...binds).run();
			
			const data = { tag_id: tagId, tag_name: tagName, tag_color: tagColor };
			return jsonResponse(200, { ok: true, code: "SUCCESS", message: "已更新", data, meta: { requestId } }, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	// DELETE /api/v1/tags/:id - 刪除標籤
	if (method === "DELETE" && url.pathname.match(/\/tags\/\d+$/)) {
		const tagId = parseInt(url.pathname.split("/").pop(), 10);
		try {
			// 檢查標籤是否存在
			const existing = await env.DATABASE.prepare("SELECT 1 FROM CustomerTags WHERE tag_id = ? LIMIT 1").bind(tagId).first();
			if (!existing) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "標籤不存在", meta: { requestId } }, corsHeaders);
			}
			
			// 檢查是否有客戶使用此標籤
			const usage = await env.DATABASE.prepare("SELECT COUNT(1) as cnt FROM ClientTagAssignments WHERE tag_id = ?").bind(tagId).first();
			if (Number(usage?.cnt || 0) > 0) {
				return jsonResponse(409, { 
					ok: false, 
					code: "CONFLICT", 
					message: `此標籤正被 ${usage.cnt} 個客戶使用，無法刪除`, 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 刪除標籤
			await env.DATABASE.prepare("DELETE FROM CustomerTags WHERE tag_id = ?").bind(tagId).run();
			
			return jsonResponse(200, { ok: true, code: "SUCCESS", message: "已刪除", meta: { requestId } }, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "方法不允許", meta: { requestId } }, corsHeaders);
}

