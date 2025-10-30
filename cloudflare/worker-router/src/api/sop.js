import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleSOP(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

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
				`SELECT sop_id, title, category, tags, version, is_published, created_by, created_at, updated_at
				 FROM SOPDocuments
				 ${whereSql}
				 ORDER BY updated_at DESC, sop_id DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const items = (rows?.results || []).map(r => ({
				id: r.sop_id,
				title: r.title,
				category: r.category || "",
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

	return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}


