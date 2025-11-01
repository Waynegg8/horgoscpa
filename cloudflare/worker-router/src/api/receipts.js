import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleReceipts(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	const path = url.pathname;

	// GET /internal/api/v1/receipts/reminders - 获取应开收据提醒
	if (method === "GET" && path === "/internal/api/v1/receipts/reminders") {
		try {
			// 查询已完成的服务任务，但还没开收据的
			const now = new Date();
			const currentMonth = now.getMonth() + 1;
			
			const reminders = await env.DATABASE.prepare(
				`SELECT DISTINCT
				   c.client_id, c.company_name AS client_name,
				   cs.client_service_id, s.service_name,
				   sbs.billing_month, sbs.billing_amount AS amount
				 FROM ClientServices cs
				 JOIN Clients c ON c.client_id = cs.client_id
				 JOIN Services s ON s.service_id = cs.service_id
				 JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
				 WHERE cs.status = 'active'
				   AND sbs.billing_month = ?
				   AND NOT EXISTS (
				     SELECT 1 FROM Receipts r 
				     WHERE r.client_service_id = cs.client_service_id 
				       AND r.billing_month = sbs.billing_month
				       AND r.is_deleted = 0
				   )
				 ORDER BY c.company_name, s.service_name
				 LIMIT 20`
			).bind(currentMonth).all();
			
			const data = (reminders?.results || []).map(r => ({
				client_id: r.client_id,
				client_name: r.client_name,
				client_service_id: r.client_service_id,
				service_name: r.service_name,
				billing_month: r.billing_month,
				amount: Number(r.amount || 0)
			}));
			
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// GET /internal/api/v1/receipts/suggest-amount - 根据服务和月份建议金额
	if (method === "GET" && path === "/internal/api/v1/receipts/suggest-amount") {
		const clientServiceId = parseInt(url.searchParams.get("client_service_id") || "0", 10);
		const billingMonth = parseInt(url.searchParams.get("billing_month") || "0", 10);

		if (!clientServiceId || billingMonth < 1 || billingMonth > 12) {
			return jsonResponse(400, { 
				ok: false, 
				code: "BAD_REQUEST", 
				message: "请提供有效的client_service_id和billing_month（1-12）", 
				meta: { requestId } 
			}, corsHeaders);
		}

		try {
			// 查询收费明细
			const schedule = await env.DATABASE.prepare(
				`SELECT billing_amount, payment_due_days 
				 FROM ServiceBillingSchedule 
				 WHERE client_service_id = ? AND billing_month = ?`
			).bind(clientServiceId, billingMonth).first();

			if (!schedule) {
				return jsonResponse(200, {
					ok: true,
					code: "OK",
					message: "该月份未设定收费",
					data: {
						suggested_amount: 0,
						payment_due_days: 30,
						has_schedule: false
					},
					meta: { requestId }
				}, corsHeaders);
			}

			return jsonResponse(200, {
				ok: true,
				code: "OK",
				message: "成功获取建议金额",
				data: {
					suggested_amount: Number(schedule.billing_amount || 0),
					payment_due_days: Number(schedule.payment_due_days || 30),
					has_schedule: true
				},
				meta: { requestId }
			}, corsHeaders);

		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "服务器错误", meta: { requestId } }, corsHeaders);
		}
	}

	// GET /internal/api/v1/receipts - 收据列表
	if (method === "GET" && path === "/internal/api/v1/receipts") {
		try {
			const params = url.searchParams;
			const page = Math.max(1, parseInt(params.get("page") || "1", 10));
			const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
			const offset = (page - 1) * perPage;
			const q = (params.get("q") || "").trim();
			const status = (params.get("status") || "").trim();
			const receiptType = (params.get("receipt_type") || "").trim();
			const dateFrom = (params.get("dateFrom") || "").trim();
			const dateTo = (params.get("dateTo") || "").trim();
			const where = ["r.is_deleted = 0"];
			const binds = [];
			if (q) { where.push("(r.receipt_id LIKE ? OR c.company_name LIKE ?)"); binds.push(`%${q}%`, `%${q}%`); }
			if (status && ["unpaid","partial","paid","cancelled"].includes(status)) { where.push("r.status = ?"); binds.push(status); }
			if (receiptType && ["normal","prepayment","deposit"].includes(receiptType)) { where.push("r.receipt_type = ?"); binds.push(receiptType); }
			if (dateFrom) { where.push("r.receipt_date >= ?"); binds.push(dateFrom); }
			if (dateTo) { where.push("r.receipt_date <= ?"); binds.push(dateTo); }
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			const countRow = await env.DATABASE.prepare(
				`SELECT COUNT(1) AS total FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id ${whereSql}`
			).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			const rows = await env.DATABASE.prepare(
				`SELECT r.receipt_id, r.client_id, c.company_name AS client_name, r.total_amount, 
				        r.receipt_date, r.due_date, r.status, r.receipt_type
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
				receiptType: r.receipt_type || "normal",
			}));
			const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		}
	}

	if (method === "POST" && path === "/internal/api/v1/receipts") {
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
		
		// 新字段
		let receiptType = String(body?.receipt_type || "normal").trim();
		const relatedTaskId = body?.related_task_id ? parseInt(body.related_task_id, 10) : null;
		const clientServiceId = body?.client_service_id ? parseInt(body.client_service_id, 10) : null;
		const billingMonth = body?.billing_month ? parseInt(body.billing_month, 10) : null;
		
		const errors = [];
		if (!client_id) errors.push({ field:"client_id", message:"必填" });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(receipt_date)) errors.push({ field:"receipt_date", message:"日期格式 YYYY-MM-DD" });
		if (!Number.isFinite(total_amount) || total_amount <= 0) errors.push({ field:"total_amount", message:"必須大於 0" });
		if (!statusVal) statusVal = "unpaid";
		if (!["unpaid","partial","paid","cancelled"].includes(statusVal)) errors.push({ field:"status", message:"狀態不合法" });
		if (!["normal","prepayment","deposit"].includes(receiptType)) {
			receiptType = "normal"; // 默认为normal
		}
		if (billingMonth && (billingMonth < 1 || billingMonth > 12)) {
			errors.push({ field:"billing_month", message:"月份必须在1-12之间" });
		}
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

			// 到期日：未提供則根据收费明细或默认+30天
			let due_date = due_date_raw;
			if (!due_date) {
				let dueDays = 30; // 默认30天
				
				// 如果提供了client_service_id和billing_month，尝试从收费明细获取payment_due_days
				if (clientServiceId && billingMonth) {
					const schedule = await env.DATABASE.prepare(
						"SELECT payment_due_days FROM ServiceBillingSchedule WHERE client_service_id = ? AND billing_month = ?"
					).bind(clientServiceId, billingMonth).first();
					if (schedule && schedule.payment_due_days) {
						dueDays = Number(schedule.payment_due_days);
					}
				}
				
				const d = new Date(receipt_date + "T00:00:00Z");
				d.setUTCDate(d.getUTCDate() + dueDays);
				const y = d.getUTCFullYear();
				const m2 = String(d.getUTCMonth() + 1).padStart(2, "0");
				const day = String(d.getUTCDate()).padStart(2, "0");
				due_date = `${y}-${m2}-${day}`;
			}

			await env.DATABASE.prepare(
				`INSERT INTO Receipts (receipt_id, client_id, receipt_date, due_date, total_amount, status, 
				 receipt_type, related_task_id, client_service_id, billing_month, 
				 is_auto_generated, notes, created_by, created_at, updated_at) 
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
			).bind(
				receipt_id, client_id, receipt_date, due_date, total_amount, statusVal, 
				receiptType, relatedTaskId, clientServiceId, billingMonth,
				notes, String(me.user_id), new Date().toISOString(), new Date().toISOString()
			).run();
			
			const data = { 
				receiptId: receipt_id, 
				clientId: client_id, 
				totalAmount: total_amount, 
				receiptDate: receipt_date, 
				dueDate: due_date, 
				status: statusVal,
				receiptType: receiptType,
				relatedTaskId: relatedTaskId,
				clientServiceId: clientServiceId,
				billingMonth: billingMonth
			};
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



