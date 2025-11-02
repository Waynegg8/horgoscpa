import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleSOP(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	// POST /internal/api/v1/sop - 創建新 SOP
	if (path === "/internal/api/v1/sop" && method === "POST") {
		try {
			const body = await request.json();
			const { title, content, category, tags, scope } = body;
			
			if (!title || !content) {
				return jsonResponse(400, { ok:false, code:"VALIDATION_ERROR", message:"標題和內容為必填", meta:{ requestId } }, corsHeaders);
			}
			
			const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
			const scopeValue = scope || 'both'; // 默認為 both（兩者皆可）
			const now = new Date().toISOString();
			
			const result = await env.DATABASE.prepare(
				`INSERT INTO SOPDocuments (title, content, category, tags, scope, version, is_published, created_by, created_at, updated_at, is_deleted)
				 VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?, ?, 0)`
			).bind(title, content, category || '', tagsJson, scopeValue, String(me.user_id), now, now).run();
			
			const sopId = result.meta.last_row_id;
			
			return jsonResponse(201, { ok:true, code:"CREATED", message:"創建成功", data:{ sop_id: sopId }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}
	
	// GET /internal/api/v1/sop
	if (path === "/internal/api/v1/sop") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const p = url.searchParams;
			const page = Math.max(1, parseInt(p.get("page") || "1", 10));
			const perPage = Math.min(100, Math.max(1, parseInt(p.get("perPage") || "12", 10)));
			const offset = (page - 1) * perPage;
			const q = (p.get("q") || "").trim();
			const category = (p.get("category") || "").trim();
			const tagsCsv = (p.get("tags") || "").trim();
			const published = (p.get("published") || "all").trim().toLowerCase();

			const where = ["is_deleted = 0"];
			const binds = [];
			if (q) { where.push("(title LIKE ? OR tags LIKE ?)"); binds.push(`%${q}%`, `%${q}%`); }
			if (category && category !== "all") { where.push("category = ?"); binds.push(category); }
			if (published !== "all") {
				if (["1","true","published"].includes(published)) { where.push("is_published = 1"); }
				else if (["0","false","draft"].includes(published)) { where.push("is_published = 0"); }
			}
			if (tagsCsv) {
				const tagList = tagsCsv.split(",").map(s => s.trim()).filter(Boolean);
				for (const t of tagList) { where.push("(tags LIKE ?)"); binds.push(`%${t}%`); }
			}
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM SOPDocuments ${whereSql}`).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			const rows = await env.DATABASE.prepare(
				`SELECT sop_id, title, category, tags, scope, version, is_published, created_by, created_at, updated_at
				 FROM SOPDocuments
				 ${whereSql}
				 ORDER BY updated_at DESC, sop_id DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const items = (rows?.results || []).map(r => ({
				id: r.sop_id,
				title: r.title,
				category: r.category || "",
				scope: r.scope || "both",
				tags: (() => { try { return JSON.parse(r.tags || "[]"); } catch(_) { return []; } })(),
				version: Number(r.version || 1),
				isPublished: r.is_published === 1,
				createdBy: r.created_by,
				createdAt: r.created_at,
				updatedAt: r.updated_at,
			}));
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data: items, meta:{ requestId, page, perPage, total } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// GET /internal/api/v1/sop/:id - 獲取單個 SOP 詳情
	const matchDetail = path.match(/^\/internal\/api\/v1\/sop\/(\d+)$/);
	if (method === "GET" && matchDetail) {
		const sopId = parseInt(matchDetail[1]);
		try {
			const row = await env.DATABASE.prepare(
				`SELECT sop_id, title, content, category, tags, scope, version, is_published, created_by, created_at, updated_at
				 FROM SOPDocuments
				 WHERE sop_id = ? AND is_deleted = 0`
			).bind(sopId).first();

			if (!row) {
				return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"SOP 不存在", meta:{ requestId } }, corsHeaders);
			}

			const data = {
				id: row.sop_id,
				title: row.title,
				content: row.content || "",
				category: row.category || "",
				scope: row.scope || "both",
				tags: (() => { try { return JSON.parse(row.tags || "[]"); } catch(_) { return []; } })(),
				version: Number(row.version || 1),
				isPublished: row.is_published === 1,
				createdBy: row.created_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			};

			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}
	
	// PUT /internal/api/v1/sop/:id - 更新 SOP
	const matchUpdate = path.match(/^\/internal\/api\/v1\/sop\/(\d+)$/);
	if (method === "PUT" && matchUpdate) {
		const sopId = parseInt(matchUpdate[1]);
		try {
			const body = await request.json();
			const { title, content, category, tags, scope } = body;
			
			if (!title || !content) {
				return jsonResponse(400, { ok:false, code:"VALIDATION_ERROR", message:"標題和內容為必填", meta:{ requestId } }, corsHeaders);
			}
			
			const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);
			const scopeValue = scope || 'both'; // 默認為 both（兩者皆可）
			const now = new Date().toISOString();
			
			await env.DATABASE.prepare(
				`UPDATE SOPDocuments 
				 SET title = ?, content = ?, category = ?, tags = ?, scope = ?, updated_at = ?, version = version + 1
				 WHERE sop_id = ? AND is_deleted = 0`
			).bind(title, content, category || '', tagsJson, scopeValue, now, sopId).run();
			
			return jsonResponse(200, { ok:true, code:"OK", message:"更新成功", data:{ sop_id: sopId }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}
	
	// DELETE /internal/api/v1/sop/:id - 刪除 SOP
	const matchDelete = path.match(/^\/internal\/api\/v1\/sop\/(\d+)$/);
	if (method === "DELETE" && matchDelete) {
		const sopId = parseInt(matchDelete[1]);
		try {
			await env.DATABASE.prepare(
				`UPDATE SOPDocuments SET is_deleted = 1, updated_at = ? WHERE sop_id = ?`
			).bind(new Date().toISOString(), sopId).run();
			
			return jsonResponse(200, { ok:true, code:"OK", message:"刪除成功", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}


