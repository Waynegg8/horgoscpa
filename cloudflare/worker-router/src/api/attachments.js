import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

function b64urlEncode(u8) {
	const b64 = btoa(String.fromCharCode(...u8));
	return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmacSha256(keyBytes, msgBytes) {
	const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	const sig = await crypto.subtle.sign("HMAC", key, msgBytes);
	return new Uint8Array(sig);
}

function utf8(str) { return new TextEncoder().encode(str); }

function sanitizeFilename(name) {
	const n = String(name || "");
	return n.replace(/[\\/]/g, "_").replace(/\.{2,}/g, ".").slice(0, 200) || "file";
}

function extFromFilename(name) {
	const m = String(name||"").toLowerCase().match(/\.([a-z0-9]{1,10})$/);
	return m ? m[1] : "";
}

export async function handleAttachments(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	// 1) 上傳簽名（POST）
	if (path === "/internal/api/v1/attachments/upload-sign") {
		if (method !== "POST") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
		const entityType = String(body?.entity_type || "").trim();
		const entityId = String(body?.entity_id || "").trim();
		const filenameRaw = String(body?.filename || "").trim();
		const contentType = String(body?.content_type || "").trim().toLowerCase();
		const contentLength = Number(body?.content_length || 0);
		if (!['client','receipt','sop','task'].includes(entityType)) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"entity_type 不合法", meta:{ requestId } }, corsHeaders);
		if (!entityId) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"entity_id 必填", meta:{ requestId } }, corsHeaders);
		if (!filenameRaw) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"filename 必填", meta:{ requestId } }, corsHeaders);
		if (!Number.isFinite(contentLength) || contentLength <= 0) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"content_length 不合法", meta:{ requestId } }, corsHeaders);
		if (contentLength > 10 * 1024 * 1024) return jsonResponse(413, { ok:false, code:"PAYLOAD_TOO_LARGE", message:"檔案大小超過限制（最大 10MB）", meta:{ requestId } }, corsHeaders);
		const allowedExt = ["pdf","jpg","jpeg","png","xlsx","xls","docx","doc"];
		const allowedMime = [
			"application/pdf","image/jpeg","image/png",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/msword"
		];
		const safeName = sanitizeFilename(filenameRaw);
		const ext = extFromFilename(safeName);
		if (!allowedExt.includes(ext)) return jsonResponse(422, { ok:false, code:"INVALID_EXTENSION", message:"不支援的副檔名", meta:{ requestId } }, corsHeaders);
		if (!allowedMime.includes(contentType)) return jsonResponse(422, { ok:false, code:"INVALID_FILE_TYPE", message:"不支援的檔案型別", meta:{ requestId } }, corsHeaders);
		// 數量上限
		const limits = { client:20, receipt:5, sop:10, task:10 };
		const limit = limits[entityType] ?? 20;
		const cntRow = await env.DATABASE.prepare("SELECT COUNT(1) AS c FROM Attachments WHERE is_deleted = 0 AND entity_type = ? AND entity_id = ?").bind(entityType, entityId).first();
		if (Number(cntRow?.c || 0) >= limit) return jsonResponse(409, { ok:false, code:"TOO_MANY_FILES", message:`已達到附件數量上限（最多 ${limit} 個）`, meta:{ requestId } }, corsHeaders);
		// 產生 objectKey 與 token
		const envName = String(env.APP_ENV || "dev");
		const now = Math.floor(Date.now()/1000);
		const rand = crypto.getRandomValues(new Uint8Array(6));
		const randStr = b64urlEncode(rand);
		const folder = `private/${envName}/attachments/${entityType}_${entityId}`;
		const objectKey = `${folder}/f_${now}_${randStr}.${ext}`;
		const expiresAt = now + 300; // 5 分鐘
		const payload = {
			objectKey,
			entityType,
			entityId,
			filename: safeName,
			contentType,
			contentLength,
			userId: String(me.user_id),
			exp: expiresAt,
		};
		const secret = String(env.UPLOAD_SIGNING_SECRET || "change-me");
		const pBytes = utf8(JSON.stringify(payload));
		const sig = await hmacSha256(utf8(secret), pBytes);
		const token = `${b64urlEncode(pBytes)}.${b64urlEncode(sig)}`;
		const uploadUrl = `${url.origin}/internal/api/v1/attachments/upload-direct?token=${token}`;
		const data = { uploadUrl, objectKey, headers: { "Content-Type": contentType, "Content-Length": String(contentLength) } };
		return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, expiresAt } }, corsHeaders);
	}

	// 2) 直傳入口（PUT）
	if (path === "/internal/api/v1/attachments/upload-direct") {
		if (method !== "PUT") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const token = url.searchParams.get("token") || "";
			const parts = token.split(".");
			if (parts.length !== 2) return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"簽名無效", meta:{ requestId } }, corsHeaders);
			const pBytes = Uint8Array.from(atob(parts[0].replaceAll("-","+").replaceAll("_","/")), c => c.charCodeAt(0));
			const sBytes = Uint8Array.from(atob(parts[1].replaceAll("-","+").replaceAll("_","/")), c => c.charCodeAt(0));
			const secret = String(env.UPLOAD_SIGNING_SECRET || "change-me");
			const expected = await hmacSha256(utf8(secret), pBytes);
			if (expected.length !== sBytes.length) return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"簽名無效", meta:{ requestId } }, corsHeaders);
			let okSig = 0; for (let i=0;i<expected.length;i++) okSig |= (expected[i]^sBytes[i]);
			if (okSig !== 0) return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"簽名無效", meta:{ requestId } }, corsHeaders);
			const payload = JSON.parse(new TextDecoder().decode(pBytes));
			if (!payload || typeof payload !== 'object') return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"簽名無效", meta:{ requestId } }, corsHeaders);
			if (payload.exp < Math.floor(Date.now()/1000)) return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"簽名已過期", meta:{ requestId } }, corsHeaders);
			// 再次檢查當前使用者一致
			if (String(payload.userId) !== String(me.user_id)) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"不允許的使用者", meta:{ requestId } }, corsHeaders);
			// Header 驗證
			const reqCt = (request.headers.get("Content-Type") || "").toLowerCase();
			const reqLen = parseInt(request.headers.get("Content-Length") || "0", 10);
			if (reqCt !== String(payload.contentType).toLowerCase()) return jsonResponse(415, { ok:false, code:"INVALID_FILE_TYPE", message:"Content-Type 不匹配", meta:{ requestId } }, corsHeaders);
			if (!Number.isFinite(reqLen) || reqLen !== Number(payload.contentLength)) return jsonResponse(400, { ok:false, code:"VALIDATION_ERROR", message:"Content-Length 不匹配", meta:{ requestId } }, corsHeaders);
			if (!env.R2_BUCKET) return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"R2 未綁定", meta:{ requestId } }, corsHeaders);
			// 寫入 R2
			const cd = `attachment; filename="${sanitizeFilename(payload.filename)}"`;
			await env.R2_BUCKET.put(payload.objectKey, request.body, {
				httpMetadata: { contentType: payload.contentType, contentDisposition: cd },
				customMetadata: { ownerId: String(me.user_id), module: "attachments", entityId: `${payload.entityType}:${payload.entityId}` },
			});
			// 建立 DB 紀錄
			await env.DATABASE.prepare(
				"INSERT INTO Attachments (entity_type, entity_id, object_key, filename, content_type, size_bytes, uploader_user_id, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
			).bind(payload.entityType, payload.entityId, payload.objectKey, payload.filename, payload.contentType, String(payload.contentLength), String(me.user_id), new Date().toISOString()).run();
			const row = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			return jsonResponse(201, { ok:true, code:"CREATED", message:"已上傳", data:{ attachment_id: row?.id, object_key: payload.objectKey }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// GET /internal/api/v1/attachments - 获取附件列表
	if (path === "/internal/api/v1/attachments" && method === "GET") {
		try {
			const params = url.searchParams;
			const entityType = (params.get("entity_type") || "").trim();
			const entityId = (params.get("entity_id") || "").trim();
			if (!entityType || !entityId) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"entity_type 與 entity_id 必填", meta:{ requestId } }, corsHeaders);
			}
			if (!['client','receipt','sop','task'].includes(entityType)) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"entity_type 不合法", meta:{ requestId } }, corsHeaders);
			}
			const page = Math.max(1, parseInt(params.get("page") || "1", 10));
			const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
			const offset = (page - 1) * perPage;
			const q = (params.get("q") || "").trim();
			const fileType = (params.get("file_type") || "all").trim();
			const dateFrom = (params.get("dateFrom") || "").trim();
			const dateTo = (params.get("dateTo") || "").trim();

			const where = ["is_deleted = 0", "entity_type = ?", "entity_id = ?"];
			const binds = [entityType, entityId];
			if (q) { where.push("(filename LIKE ?)"); binds.push(`%${q}%`); }
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) { where.push("uploaded_at >= ?"); binds.push(`${dateFrom}T00:00:00.000Z`); }
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) { where.push("uploaded_at <= ?"); binds.push(`${dateTo}T23:59:59.999Z`); }
			if (fileType !== 'all') {
				// 以副檔名與 content_type 粗略分類
				if (fileType === 'pdf') { where.push("(LOWER(filename) LIKE '%.pdf' OR LOWER(content_type) = 'application/pdf')"); }
				else if (fileType === 'image') { where.push("(LOWER(content_type) LIKE 'image/%' OR LOWER(filename) GLOB '*.jpg' OR LOWER(filename) GLOB '*.jpeg' OR LOWER(filename) GLOB '*.png')"); }
				else if (fileType === 'excel') { where.push("(LOWER(filename) GLOB '*.xls' OR LOWER(filename) GLOB '*.xlsx' OR LOWER(content_type) IN ('application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))"); }
				else if (fileType === 'word') { where.push("(LOWER(filename) GLOB '*.doc' OR LOWER(filename) GLOB '*.docx' OR LOWER(content_type) IN ('application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'))"); }
			}
			const whereSql = `WHERE ${where.join(" AND ")}`;
			const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM Attachments ${whereSql}`).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			const rows = await env.DATABASE.prepare(
				`SELECT a.attachment_id, a.filename, a.content_type, a.size_bytes, a.uploader_user_id, a.uploaded_at, u.username AS uploader_name
				 FROM Attachments a LEFT JOIN Users u ON u.user_id = a.uploader_user_id
				 ${whereSql}
				 ORDER BY a.uploaded_at DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const data = (rows?.results || []).map(r => ({
				id: r.attachment_id,
				filename: r.filename,
				contentType: r.content_type,
				sizeBytes: Number(r.size_bytes || 0),
				uploaderUserId: r.uploader_user_id,
				uploaderName: r.uploader_name || String(r.uploader_user_id || ''),
				uploadedAt: r.uploaded_at,
			}));
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path:"/internal/api/v1/attachments", err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// GET /internal/api/v1/attachments/:id/download - 下载附件
	const matchDownload = path.match(/^\/internal\/api\/v1\/attachments\/(\d+)\/download$/);
	if (method === "GET" && matchDownload) {
		const attachmentId = matchDownload[1];
		try {
			const attachment = await env.DATABASE.prepare(
				`SELECT object_key, filename, content_type FROM Attachments WHERE attachment_id = ? AND is_deleted = 0`
			).bind(attachmentId).first();
			
			if (!attachment) {
				return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"附件不存在", meta:{ requestId } }, corsHeaders);
			}
			
			if (!env.R2_BUCKET) {
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"R2 未綁定", meta:{ requestId } }, corsHeaders);
			}
			
			const object = await env.R2_BUCKET.get(attachment.object_key);
			if (!object) {
				return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"檔案不存在", meta:{ requestId } }, corsHeaders);
			}
			
			return new Response(object.body, {
				headers: {
					'Content-Type': attachment.content_type || 'application/octet-stream',
					'Content-Disposition': `attachment; filename="${attachment.filename}"`,
					...corsHeaders
				}
			});
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// DELETE /internal/api/v1/attachments/:id - 删除附件
	const matchDelete = path.match(/^\/internal\/api\/v1\/attachments\/(\d+)$/);
	if (method === "DELETE" && matchDelete) {
		const attachmentId = matchDelete[1];
		try {
			await env.DATABASE.prepare(
				`UPDATE Attachments SET is_deleted = 1 WHERE attachment_id = ?`
			).bind(attachmentId).run();
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已刪除", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}


