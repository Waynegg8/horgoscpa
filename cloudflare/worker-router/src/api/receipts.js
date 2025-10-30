import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleReceipts(request, env, me, requestId, url) {
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
			const dateFrom = (params.get("dateFrom") || "").trim();
			const dateTo = (params.get("dateTo") || "").trim();
			const where = ["r.is_deleted = 0"];
			const binds = [];
			if (q) { where.push("(r.receipt_id LIKE ? OR c.company_name LIKE ?)"); binds.push(`%${q}%`, `%${q}%`); }
			if (status && ["unpaid","partial","paid","cancelled"].includes(status)) { where.push("r.status = ?"); binds.push(status); }
			if (dateFrom) { where.push("r.receipt_date >= ?"); binds.push(dateFrom); }
			if (dateTo) { where.push("r.receipt_date <= ?"); binds.push(dateTo); }
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			const countRow = await env.DATABASE.prepare(
				`SELECT COUNT(1) AS total FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id ${whereSql}`
			).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			const rows = await env.DATABASE.prepare(
				`SELECT r.receipt_id, r.client_id, c.company_name AS client_name, r.total_amount, r.receipt_date, r.due_date, r.status
				 FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id
				 ${whereSql}
				 ORDER BY r.receipt_date DESC, r.receipt_id DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			const data = (rows?.results || []).map(r => ({
				receiptId: r.receipt_id,
				clientId: r.client_id,
				clientName: r.client_name || "",
				totalAmount: Number(r.total_amount || 0),
				receiptDate: r.receipt_date,
				dueDate: r.due_date || null,
				status: r.status,
			}));
			const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		}
	}

	if (method === "POST") {
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		const client_id = String(body?.client_id || "").trim();
		const receipt_date = String(body?.receipt_date || "").trim();
		const due_date_raw = String(body?.due_date || "").trim();
		const total_amount = Number(body?.total_amount);
		let statusVal = String(body?.status || "unpaid").trim();
		const notes = (body?.notes || "").trim();
		const errors = [];
		if (!client_id) errors.push({ field:"client_id", message:"必填" });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt_date)) errors.push({ field:"receipt_date", message:"日期格式 YYYY-MM-DD" });
		if (!Number.isFinite(total_amount) || total_amount <= 0) errors.push({ field:"total_amount", message:"必須大於 0" });
		if (!statusVal) statusVal = "unpaid";
		if (!["unpaid","partial","paid","cancelled"].includes(statusVal)) errors.push({ field:"status", message:"狀態不合法" });
		if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);

		try {
			// 驗證客戶存在
			const c = await env.DATABASE.prepare("SELECT 1 FROM Clients WHERE client_id = ? AND is_deleted = 0 LIMIT 1").bind(client_id).first();
			if (!c) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"客戶不存在", errors:[{ field:"client_id", message:"不存在" }], meta:{ requestId } }, corsHeaders);

			// 產生收據號：YYYYMM-XXX
			const [yyyy, mm] = receipt_date.split("-");
			const prefix = `${yyyy}${mm}`;
			const maxRow = await env.DATABASE.prepare("SELECT receipt_id FROM Receipts WHERE receipt_id LIKE ? ORDER BY receipt_id DESC LIMIT 1").bind(`${prefix}-%`).first();
			let seq = 1;
			if (maxRow && typeof maxRow.receipt_id === "string") {
				const m = maxRow.receipt_id.match(/^(\d{6})-(\d{3})$/);
				if (m) seq = Math.max(seq, parseInt(m[2], 10) + 1);
			}
			const receipt_id = `${prefix}-${String(seq).padStart(3, "0")}`;

			// 到期日：未提供則 +30 天
			let due_date = due_date_raw;
			if (!due_date) {
				const d = new Date(receipt_date + "T00:00:00Z");
				d.setUTCDate(d.getUTCDate() + 30);
				const y = d.getUTCFullYear();
				const m2 = String(d.getUTCMonth() + 1).padStart(2, "0");
				const day = String(d.getUTCDate()).padStart(2, "0");
				due_date = `${y}-${m2}-${day}`;
			}

			await env.DATABASE.prepare(
				"INSERT INTO Receipts (receipt_id, client_id, receipt_date, due_date, total_amount, status, is_auto_generated, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)"
			).bind(
				receipt_id, client_id, receipt_date, due_date, total_amount, statusVal, notes, String(me.user_id), new Date().toISOString(), new Date().toISOString()
			).run();
			const data = { receiptId: receipt_id, clientId: client_id, totalAmount: total_amount, receiptDate: receipt_date, dueDate: due_date, status: statusVal };
			return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



