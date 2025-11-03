import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 处理打卡记录上传相关请求
 */
export async function handlePunchRecords(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);

	// 所有用户都可以访问打卡记录功能（管理员和普通员工）
	if (!me) {
		return jsonResponse(403, {
			ok: false,
			code: "FORBIDDEN",
			message: "需要登入才能使用此功能",
			meta: { requestId }
		}, corsHeaders);
	}

	const method = request.method;

	try {
		// GET /punch-records - 获取打卡记录列表
		if (method === "GET" && path === "/internal/api/v1/punch-records") {
			return await getPunchRecords(env, requestId, corsHeaders, me);
		}

		// POST /punch-records/upload - 直接上传文件
		if (method === "POST" && path === "/internal/api/v1/punch-records/upload") {
			return await uploadFile(request, env, me, requestId, corsHeaders);
		}

		// GET /punch-records/:recordId/download - 直接下载文件
		if (method === "GET" && path.match(/^\/internal\/api\/v1\/punch-records\/\d+\/download$/)) {
			const recordId = parseInt(path.split("/")[6]);
			return await downloadFile(env, me, requestId, corsHeaders, recordId, false);
		}

		// GET /punch-records/:recordId/preview - 预览文件
		if (method === "GET" && path.match(/^\/internal\/api\/v1\/punch-records\/\d+\/preview$/)) {
			const recordId = parseInt(path.split("/")[6]);
			return await downloadFile(env, me, requestId, corsHeaders, recordId, true);
		}

		// DELETE /punch-records/:recordId - 删除记录
		if (method === "DELETE" && path.match(/^\/internal\/api\/v1\/punch-records\/\d+$/)) {
			const recordId = parseInt(path.split("/")[5]);
			return await deletePunchRecord(env, me, requestId, corsHeaders, recordId);
		}

		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "API 端点不存在",
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handlePunchRecords] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 获取打卡记录列表（只能看到自己的）
 */
async function getPunchRecords(env, requestId, corsHeaders, me) {
	// 普通员工只能看到自己的记录
	// 管理员可以看到所有记录（可选功能，目前也只显示自己的）
	const records = await env.DATABASE.prepare(`
		SELECT 
			record_id,
			user_id,
			month,
			file_name,
			file_key,
			file_size_bytes,
			file_type,
			notes,
			status,
			uploaded_at,
			confirmed_at
		FROM PunchRecords
		WHERE user_id = ? AND status = 'confirmed'
		ORDER BY month DESC, uploaded_at DESC
	`).bind(me.user_id).all();

	return jsonResponse(200, {
		ok: true,
		data: {
			records: (records.results || []).map(r => ({
				recordId: r.record_id,
				userId: r.user_id,
				month: r.month,
				fileName: r.file_name,
				fileSizeBytes: r.file_size_bytes,
				fileType: r.file_type || 'application/octet-stream',
				notes: r.notes,
				uploadedAt: r.confirmed_at || r.uploaded_at
			}))
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 直接上传文件（使用FormData）
 */
async function uploadFile(request, env, me, requestId, corsHeaders) {
	try {
		const formData = await request.formData();
		const file = formData.get('file');
		const month = formData.get('month');
		const notes = formData.get('notes');

		if (!file || !month) {
			return jsonResponse(400, {
				ok: false,
				code: "MISSING_FIELDS",
				message: "缺少文件或月份",
				meta: { requestId }
			}, corsHeaders);
		}

		const fileName = file.name;
		const fileSize = file.size;

		// 检查文件大小（10MB）
		if (fileSize > 10 * 1024 * 1024) {
			return jsonResponse(400, {
				ok: false,
				code: "FILE_TOO_LARGE",
				message: "文件大小不能超过 10MB",
				meta: { requestId }
			}, corsHeaders);
		}

		// 生成文件key
		const timestamp = Date.now();
		const fileKey = `punch-records/${me.user_id}/${month}/${timestamp}-${fileName}`;

		// 上传到R2
		await env.FILE_STORAGE.put(fileKey, file, {
			httpMetadata: {
				contentType: file.type || 'application/octet-stream'
			}
		});

		// 创建数据库记录
		const result = await env.DATABASE.prepare(`
			INSERT INTO PunchRecords 
			(user_id, month, file_name, file_key, file_size_bytes, file_type, notes, status, confirmed_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))
		`).bind(
			me.user_id,
			month,
			fileName,
			fileKey,
			fileSize,
			file.type || 'application/octet-stream',
			notes || null
		).run();

		const recordId = result.meta.last_row_id;

		return jsonResponse(200, {
			ok: true,
			data: {
				recordId,
				message: "上传成功"
			},
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[uploadFile] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "UPLOAD_ERROR",
			message: "上传失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 下载或预览文件
 */
async function downloadFile(env, me, requestId, corsHeaders, recordId, isPreview = false) {
	try {
		// 检查记录是否存在且属于当前用户
		const record = await env.DATABASE.prepare(`
			SELECT record_id, user_id, file_key, file_name, file_type, status
			FROM PunchRecords
			WHERE record_id = ?
		`).bind(recordId).first();

		if (!record) {
			return jsonResponse(404, {
				ok: false,
				code: "RECORD_NOT_FOUND",
				message: "记录不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		if (record.user_id !== me.user_id && !me.is_admin) {
			return jsonResponse(403, {
				ok: false,
				code: "FORBIDDEN",
				message: "无权访问此文件",
				meta: { requestId }
			}, corsHeaders);
		}

		if (record.status !== 'confirmed') {
			return jsonResponse(400, {
				ok: false,
				code: "FILE_NOT_READY",
				message: "文件尚未准备就绪",
				meta: { requestId }
			}, corsHeaders);
		}

		// 从R2获取文件
		const object = await env.FILE_STORAGE.get(record.file_key);
		if (!object) {
			return jsonResponse(404, {
				ok: false,
				code: "FILE_NOT_FOUND",
				message: "文件不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		// 根据是否预览设置Content-Disposition
		const disposition = isPreview ? 'inline' : 'attachment';
		const headers = {
			'Content-Type': record.file_type || 'application/octet-stream',
			'Content-Disposition': `${disposition}; filename="${encodeURIComponent(record.file_name)}"`,
			...corsHeaders
		};

		return new Response(object.body, {
			status: 200,
			headers
		});

	} catch (error) {
		console.error("[downloadFile] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DOWNLOAD_ERROR",
			message: isPreview ? "预览失败" : "下载失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 删除打卡记录
 */
async function deletePunchRecord(env, me, requestId, corsHeaders, recordId) {
	try {
		// 检查记录是否存在且属于当前用户
		const record = await env.DATABASE.prepare(`
			SELECT record_id, user_id, file_key, status
			FROM PunchRecords
			WHERE record_id = ?
		`).bind(recordId).first();

		if (!record) {
			return jsonResponse(404, {
				ok: false,
				code: "RECORD_NOT_FOUND",
				message: "记录不存在",
				meta: { requestId }
			}, corsHeaders);
		}

		if (record.user_id !== me.user_id) {
			return jsonResponse(403, {
				ok: false,
				code: "FORBIDDEN",
				message: "无权删除此记录",
				meta: { requestId }
			}, corsHeaders);
		}

		// 从R2删除文件
		await env.FILE_STORAGE.delete(record.file_key);

		// 软删除数据库记录
		await env.DATABASE.prepare(`
			UPDATE PunchRecords
			SET status = 'deleted', deleted_at = datetime('now')
			WHERE record_id = ?
		`).bind(recordId).run();

		return jsonResponse(200, {
			ok: true,
			data: { message: "删除成功" },
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[deletePunchRecord] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "删除失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

