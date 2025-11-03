import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleReceipts(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	const path = url.pathname;
	
	// 健康检查端点
	if (method === "GET" && path === "/internal/api/v1/receipts/health") {
		return jsonResponse(200, { ok: true, message: "Receipts API is healthy", timestamp: new Date().toISOString() }, corsHeaders);
	}

	// GET /internal/api/v1/receipts/reminders - 获取应开收据提醒（任务完成后才提醒）
	if (method === "GET" && path === "/internal/api/v1/receipts/reminders") {
		try {
			// 查询任务已全部完成、但还没开收据的服务
			const now = new Date();
			const currentMonth = now.getMonth() + 1;
			const currentYear = now.getFullYear();
			const serviceMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`; // YYYY-MM格式
			
			const reminders = await env.DATABASE.prepare(
				`SELECT DISTINCT
				   c.client_id, c.company_name AS client_name,
				   cs.client_service_id, s.service_name,
				   sbs.billing_month, sbs.billing_amount AS amount,
				   (SELECT COUNT(*) FROM ActiveTasks t 
				    WHERE t.client_service_id = cs.client_service_id 
				      AND t.service_month = ?
				      AND t.is_deleted = 0) as total_tasks,
				   (SELECT COUNT(*) FROM ActiveTasks t 
				    WHERE t.client_service_id = cs.client_service_id 
				      AND t.service_month = ?
				      AND t.is_deleted = 0
				      AND t.status = 'completed') as completed_tasks
				 FROM ClientServices cs
				 JOIN Clients c ON c.client_id = cs.client_id
				 JOIN Services s ON s.service_id = cs.service_id
				 JOIN ServiceBillingSchedule sbs ON sbs.client_service_id = cs.client_service_id
				 WHERE cs.status = 'active'
				   AND sbs.billing_month = ?
				   -- 该月份还没开收据（排除已作废的收据）
				   AND NOT EXISTS (
				     SELECT 1 FROM Receipts r 
				     WHERE r.client_service_id = cs.client_service_id 
				       AND r.billing_month = sbs.billing_month
				       AND r.is_deleted = 0
				       AND r.status != 'cancelled'
				   )
				   -- 该服务该月有任务
				   AND EXISTS (
				     SELECT 1 FROM ActiveTasks t
				     WHERE t.client_service_id = cs.client_service_id
				       AND t.service_month = ?
				       AND t.is_deleted = 0
				   )
				   -- 该服务该月的任务全部完成（没有未完成的任务）
				   AND NOT EXISTS (
				     SELECT 1 FROM ActiveTasks t
				     WHERE t.client_service_id = cs.client_service_id
				       AND t.service_month = ?
				       AND t.is_deleted = 0
				       AND t.status != 'completed'
				   )
				 ORDER BY c.company_name, s.service_name
				 LIMIT 20`
			).bind(serviceMonth, serviceMonth, currentMonth, serviceMonth, serviceMonth).all();
			
			const data = (reminders?.results || []).map(r => ({
				client_id: r.client_id,
				client_name: r.client_name,
				client_service_id: r.client_service_id,
				service_name: r.service_name,
				billing_month: r.billing_month,
				amount: Number(r.amount || 0),
				total_tasks: Number(r.total_tasks || 0),
				completed_tasks: Number(r.completed_tasks || 0)
			}));
			
			// 详细日志：帮助调试
			console.log(`[收据提醒] 当前月份: ${currentMonth} (${serviceMonth}), 找到 ${data.length} 个待开收据（任务已完成）`);
			if (data.length > 0) {
				data.forEach(item => {
					console.log(`  - ${item.client_name} (client_service_id: ${item.client_service_id}), ${item.service_name}, ${item.billing_month}月, $${item.amount}`);
				});
			}
			
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
		const params = url.searchParams;
		const page = Math.max(1, parseInt(params.get("page") || "1", 10));
		const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
		const offset = (page - 1) * perPage;
		const q = (params.get("q") || "").trim();
		const status = (params.get("status") || "").trim();
		const receiptType = (params.get("receipt_type") || "").trim();
		const dateFrom = (params.get("dateFrom") || "").trim();
		const dateTo = (params.get("dateTo") || "").trim();
		
		try {
			console.log(`[收据列表] 查询参数:`, { page, perPage, status, q, dateFrom, dateTo });
			
			const where = ["r.is_deleted = 0"];
			const binds = [];
			if (q) { where.push("(r.receipt_id LIKE ? OR c.company_name LIKE ?)"); binds.push(`%${q}%`, `%${q}%`); }
			if (status && ["unpaid","partial","paid","cancelled"].includes(status)) { where.push("r.status = ?"); binds.push(status); }
			if (receiptType && ["normal","prepayment","deposit"].includes(receiptType)) { where.push("r.receipt_type = ?"); binds.push(receiptType); }
			if (dateFrom) { where.push("r.receipt_date >= ?"); binds.push(dateFrom); }
			if (dateTo) { where.push("r.receipt_date <= ?"); binds.push(dateTo); }
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			
			console.log(`[收据列表] SQL WHERE:`, whereSql, `绑定参数:`, binds.length);
			
			const countRow = await env.DATABASE.prepare(
				`SELECT COUNT(1) AS total FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id ${whereSql}`
			).bind(...binds).first();
			const total = Number(countRow?.total || 0);
			console.log(`[收据列表] 总记录数:`, total);
			
			const rows = await env.DATABASE.prepare(
				`SELECT r.receipt_id, r.client_id, c.company_name AS client_name, c.tax_registration_number AS client_tax_id, 
				        r.total_amount, r.receipt_date, r.due_date, r.status, r.receipt_type
				 FROM Receipts r LEFT JOIN Clients c ON c.client_id = r.client_id
				 ${whereSql}
				 ORDER BY r.receipt_date DESC, r.receipt_id DESC
				 LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			
			console.log(`[收据列表] 查询到 ${rows?.results?.length || 0} 条记录`);
			
			const data = (rows?.results || []).map((r, index) => {
				try {
					return {
						receiptId: r.receipt_id,
						clientId: r.client_id,
						clientName: r.client_name || "",
						clientTaxId: r.client_tax_id || "",
						totalAmount: Number(r.total_amount || 0),
						receiptDate: r.receipt_date,
						dueDate: r.due_date || null,
						status: r.status,
						receiptType: r.receipt_type || "normal",
					};
				} catch (mapErr) {
					console.error(`[收据列表] 映射第${index}条记录失败:`, JSON.stringify({ 
						receipt_id: r.receipt_id, 
						error: String(mapErr),
						raw: r 
					}));
					return null;
				}
			}).filter(r => r !== null);
			
			console.log(`[收据列表] 成功返回 ${data.length} 条记录`);
			
			const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta }, corsHeaders);
		} catch (err) {
			const errorDetail = {
				level:"error", 
				requestId, 
				path: url.pathname, 
				method: "GET /receipts",
				params: {
					page,
					perPage,
					status,
					q,
					dateFrom,
					dateTo
				},
				err:String(err),
				stack: err.stack || '',
				message: err.message || '',
				name: err.name || ''
			};
			console.error(JSON.stringify(errorDetail));
			
			// 临时：在开发环境返回详细错误（方便调试）
			if (env.APP_ENV === "dev") {
				return jsonResponse(500, { 
					ok:false, 
					code:"INTERNAL_ERROR", 
					message:"伺服器錯誤", 
					debug: errorDetail,
					meta:{ requestId } 
				}, getCorsHeadersForRequest(request, env));
			}
			
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		}
	}

	// GET /internal/api/v1/receipts/statistics - 应收账款统计
	if (method === "GET" && path === "/internal/api/v1/receipts/statistics") {
		try {
			const today = new Date().toISOString().split('T')[0];
			
			// 总应收（未收款+部分收款）
			const totalRow = await env.DATABASE.prepare(
				`SELECT SUM(total_amount - COALESCE(paid_amount, 0)) as total_receivable
				 FROM Receipts 
				 WHERE is_deleted = 0 AND status IN ('unpaid', 'partial')`
			).first();
			
			// 逾期应收
			const overdueRow = await env.DATABASE.prepare(
				`SELECT SUM(total_amount - COALESCE(paid_amount, 0)) as overdue_receivable
				 FROM Receipts 
				 WHERE is_deleted = 0 AND status IN ('unpaid', 'partial') AND due_date < ?`
			).bind(today).first();
			
			// 各状态统计
			const statusStats = await env.DATABASE.prepare(
				`SELECT status, COUNT(*) as count, SUM(total_amount) as amount
				 FROM Receipts 
				 WHERE is_deleted = 0
				 GROUP BY status`
			).all();
			
			const data = {
				totalReceivable: Number(totalRow?.total_receivable || 0),
				overdueReceivable: Number(overdueRow?.overdue_receivable || 0),
				statusBreakdown: (statusStats?.results || []).map(s => ({
					status: s.status,
					count: Number(s.count || 0),
					amount: Number(s.amount || 0)
				}))
			};
			
			return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta: { requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } }, corsHeaders);
		}
	}

	// GET /internal/api/v1/receipts/aging-report - 账龄分析
	if (method === "GET" && path === "/internal/api/v1/receipts/aging-report") {
		try {
			const today = new Date().toISOString().split('T')[0];
			
			const receipts = await env.DATABASE.prepare(
				`SELECT r.receipt_id, r.client_id, c.company_name as client_name,
				        r.receipt_date, r.due_date, r.total_amount, 
				        COALESCE(r.paid_amount, 0) as paid_amount,
				        (r.total_amount - COALESCE(r.paid_amount, 0)) as outstanding_amount,
				        julianday(?) - julianday(r.due_date) as days_overdue
				 FROM Receipts r
				 LEFT JOIN Clients c ON c.client_id = r.client_id
				 WHERE r.is_deleted = 0 AND r.status IN ('unpaid', 'partial')
				 ORDER BY days_overdue DESC`
			).bind(today).all();
			
			const aging = {
				current: [],      // 未到期
				days_30: [],      // 1-30天
				days_60: [],      // 31-60天
				days_90: [],      // 61-90天
				over_90: []       // 90天以上
			};
			
			let totals = { current: 0, days_30: 0, days_60: 0, days_90: 0, over_90: 0 };
			
			(receipts?.results || []).forEach(r => {
				const item = {
					receiptId: r.receipt_id,
					clientId: r.client_id,
					clientName: r.client_name || "",
					receiptDate: r.receipt_date,
					dueDate: r.due_date,
					outstandingAmount: Number(r.outstanding_amount || 0),
					daysOverdue: Math.round(Number(r.days_overdue || 0))
				};
				
				const days = item.daysOverdue;
				if (days < 0) {
					aging.current.push(item);
					totals.current += item.outstandingAmount;
				} else if (days <= 30) {
					aging.days_30.push(item);
					totals.days_30 += item.outstandingAmount;
				} else if (days <= 60) {
					aging.days_60.push(item);
					totals.days_60 += item.outstandingAmount;
				} else if (days <= 90) {
					aging.days_90.push(item);
					totals.days_90 += item.outstandingAmount;
				} else {
					aging.over_90.push(item);
					totals.over_90 += item.outstandingAmount;
				}
			});
			
			const data = { aging, totals };
			return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta: { requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } }, corsHeaders);
		}
	}

	// GET /internal/api/v1/receipts/:id - 收据详情
	const getDetailMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)$/);
	if (method === "GET" && getDetailMatch) {
		const receiptId = decodeURIComponent(getDetailMatch[1]);
		
		try {
			console.log(`[收据详情] 查询收据ID: ${receiptId}`);
			
			// 获取收据基本信息
			const receipt = await env.DATABASE.prepare(
				`SELECT r.receipt_id, r.client_id, r.receipt_date, r.due_date, r.total_amount, 
				        r.paid_amount, r.status, r.receipt_type, r.related_task_id, 
				        r.client_service_id, r.billing_month, r.service_month, r.notes, 
				        r.created_at, r.created_by,
				        c.company_name as client_name, c.tax_registration_number as client_tax_id,
				        u.name as created_by_name
				 FROM Receipts r
				 LEFT JOIN Clients c ON c.client_id = r.client_id
				 LEFT JOIN Users u ON u.user_id = r.created_by
				 WHERE r.receipt_id = ? AND r.is_deleted = 0`
			).bind(receiptId).first();
			
			console.log(`[收据详情] 查询结果: ${receipt ? '找到' : '未找到'}`);
			
			if (!receipt) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收據不存在", meta: { requestId } }, corsHeaders);
			}
			
			// 获取收据明细（兼容新旧数据库结构）
			let items;
			try {
				// 尝试查询新格式（包含三个费用字段）
				items = await env.DATABASE.prepare(
					`SELECT item_id, service_name, quantity, unit_price, subtotal, notes, 
					        COALESCE(service_fee, 0) as service_fee, 
					        COALESCE(government_fee, 0) as government_fee, 
					        COALESCE(miscellaneous_fee, 0) as miscellaneous_fee
					 FROM ReceiptItems
					 WHERE receipt_id = ?
					 ORDER BY item_id`
				).bind(receiptId).all();
			} catch (err) {
				// 如果新字段不存在，回退到旧格式
				console.log('[ReceiptItems] 使用旧格式查询（新字段可能不存在）:', err.message);
				items = await env.DATABASE.prepare(
					`SELECT item_id, service_name, quantity, unit_price, subtotal, notes
					 FROM ReceiptItems
					 WHERE receipt_id = ?
					 ORDER BY item_id`
				).bind(receiptId).all();
			}
			
			// 获取收款记录
			const payments = await env.DATABASE.prepare(
				`SELECT p.payment_id, p.payment_date, p.payment_amount, p.payment_method,
				        p.reference_number, p.notes, p.created_at, u.name as created_by_name
				 FROM Payments p
				 LEFT JOIN Users u ON u.user_id = p.created_by
				 WHERE p.receipt_id = ? AND p.is_deleted = 0
				 ORDER BY p.payment_date DESC, p.payment_id DESC`
			).bind(receiptId).all();
			
			const data = {
				receiptId: receipt.receipt_id,
				clientId: receipt.client_id,
				clientName: receipt.client_name || "",
				clientTaxId: receipt.client_tax_id || "",
				receiptDate: receipt.receipt_date,
				dueDate: receipt.due_date,
				totalAmount: Number(receipt.total_amount || 0),
				paidAmount: Number(receipt.paid_amount || 0),
				outstandingAmount: Number(receipt.total_amount || 0) - Number(receipt.paid_amount || 0),
				status: receipt.status,
				receiptType: receipt.receipt_type || "normal",
				relatedTaskId: receipt.related_task_id,
				clientServiceId: receipt.client_service_id,
				billingMonth: receipt.billing_month,
				notes: receipt.notes || "",
				createdBy: receipt.created_by_name || "",
				createdAt: receipt.created_at,
				items: (items?.results || []).map(i => ({
					itemId: i.item_id,
					serviceName: i.service_name,
					quantity: Number(i.quantity || 1),
					unitPrice: Number(i.unit_price || 0),
					serviceFee: Number(i.service_fee || 0),
					governmentFee: Number(i.government_fee || 0),
					miscellaneousFee: Number(i.miscellaneous_fee || 0),
					subtotal: Number(i.subtotal || 0),
					notes: i.notes || ""
				})),
				payments: (payments?.results || []).map(p => ({
					paymentId: p.payment_id,
					paymentDate: p.payment_date,
					paymentAmount: Number(p.payment_amount || 0),
					paymentMethod: p.payment_method,
					referenceNumber: p.reference_number || "",
					notes: p.notes || "",
					createdBy: p.created_by_name || "",
					createdAt: p.created_at
				}))
			};
			
			console.log(`[收据详情] 成功返回数据`);
			return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta: { requestId } }, corsHeaders);
		} catch (err) {
			const errorDetail = {
				level: "error", 
				requestId, 
				path, 
				receiptId,
				err: String(err),
				stack: err.stack || '',
				message: err.message || '',
				name: err.name || ''
			};
			console.error(JSON.stringify(errorDetail));
			
			// 临时：在开发环境返回详细错误
			if (env.APP_ENV === "dev") {
				return jsonResponse(500, { 
					ok: false, 
					code: "INTERNAL_ERROR", 
					message: "伺服器錯誤", 
					debug: errorDetail,
					meta: { requestId } 
				}, corsHeaders);
			}
			
			return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } }, corsHeaders);
		}
	}

	// POST /internal/api/v1/receipts/:id/payments - 新增收款记录
	const addPaymentMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)\/payments$/);
	if (method === "POST" && addPaymentMatch) {
		const receiptId = decodeURIComponent(addPaymentMatch[1]);
		
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, corsHeaders);
		}
		
		const payment_date = String(body?.payment_date || "").trim();
		const payment_amount = Number(body?.payment_amount);
		const payment_method = String(body?.payment_method || "transfer").trim();
		const reference_number = String(body?.reference_number || "").trim();
		const notes = String(body?.notes || "").trim();
		
		const errors = [];
		if (!/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) errors.push({ field: "payment_date", message: "日期格式 YYYY-MM-DD" });
		if (!Number.isFinite(payment_amount) || payment_amount <= 0) errors.push({ field: "payment_amount", message: "必須大於 0" });
		if (!["cash", "transfer", "check", "other"].includes(payment_method)) errors.push({ field: "payment_method", message: "收款方式不合法" });
		if (errors.length) return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } }, corsHeaders);
		
		try {
			// 检查收据是否存在
			const receipt = await env.DATABASE.prepare(
				"SELECT receipt_id, total_amount, COALESCE(paid_amount, 0) as paid_amount, status FROM Receipts WHERE receipt_id = ? AND is_deleted = 0"
			).bind(receiptId).first();
			
			if (!receipt) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收據不存在", meta: { requestId } }, corsHeaders);
			}
			
			if (receipt.status === "cancelled") {
				return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "已作廢的收據不可收款", meta: { requestId } }, corsHeaders);
			}
			
			const outstanding = Number(receipt.total_amount) - Number(receipt.paid_amount);
			if (payment_amount > outstanding) {
				return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: `收款金額超過未收金額（${outstanding}）`, meta: { requestId } }, corsHeaders);
			}
			
			// 插入收款记录
			const insertResult = await env.DATABASE.prepare(
				`INSERT INTO Payments (receipt_id, payment_date, payment_amount, payment_method, reference_number, notes, created_by, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				receiptId, payment_date, payment_amount, payment_method, reference_number, notes,
				String(me.user_id), new Date().toISOString(), new Date().toISOString()
			).run();
			
			// 更新收据的已收金额和状态
			const newPaidAmount = Number(receipt.paid_amount) + payment_amount;
			const newStatus = newPaidAmount >= Number(receipt.total_amount) ? "paid" : (newPaidAmount > 0 ? "partial" : "unpaid");
			
			await env.DATABASE.prepare(
				"UPDATE Receipts SET paid_amount = ?, status = ?, updated_at = ? WHERE receipt_id = ?"
			).bind(newPaidAmount, newStatus, new Date().toISOString(), receiptId).run();
			
			const data = {
				paymentId: insertResult.meta.last_row_id,
				receiptId: receiptId,
				paymentDate: payment_date,
				paymentAmount: payment_amount,
				paymentMethod: payment_method,
				receiptStatus: newStatus,
				paidAmount: newPaidAmount,
				outstandingAmount: Number(receipt.total_amount) - newPaidAmount
			};
			
			return jsonResponse(201, { ok: true, code: "CREATED", message: "已記錄收款", data, meta: { requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } }, corsHeaders);
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
		const items = Array.isArray(body?.items) ? body.items : [];
		
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
		
		// 验证items
		if (items.length > 0) {
			let itemsTotal = 0;
			items.forEach((item, idx) => {
				const service_name = String(item?.service_name || "").trim();
				const quantity = Number(item?.quantity || 1);
				const unit_price = Number(item?.unit_price || 0);
				
				if (!service_name) errors.push({ field: `items[${idx}].service_name`, message: "必填" });
				if (!Number.isFinite(quantity) || quantity <= 0) errors.push({ field: `items[${idx}].quantity`, message: "必須大於 0" });
				if (!Number.isFinite(unit_price) || unit_price < 0) errors.push({ field: `items[${idx}].unit_price`, message: "必須大於等於 0" });
				
				itemsTotal += quantity * unit_price;
			});
			
			// 检查items总计是否与total_amount一致（允许小误差）
			if (Math.abs(itemsTotal - total_amount) > 0.01) {
				errors.push({ field: "items", message: `明細總計（${itemsTotal}）與總金額（${total_amount}）不符` });
			}
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

			// 计算 service_month (YYYY-MM格式，用于关联任务)
			let serviceMonth = null;
			if (billingMonth) {
				// 如果有 billing_month，使用 receipt_date 的年份 + billing_month
				const year = receipt_date.split('-')[0];
				serviceMonth = `${year}-${String(billingMonth).padStart(2, '0')}`;
			} else {
				// 否则使用 receipt_date 的年月
				serviceMonth = receipt_date.substring(0, 7);
			}
			
			// 插入收据
			await env.DATABASE.prepare(
				`INSERT INTO Receipts (receipt_id, client_id, receipt_date, due_date, total_amount, paid_amount, status, 
				 receipt_type, related_task_id, client_service_id, billing_month, service_month,
				 is_auto_generated, notes, created_by, created_at, updated_at) 
				 VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
			).bind(
				receipt_id, client_id, receipt_date, due_date, total_amount, statusVal, 
				receiptType, relatedTaskId, clientServiceId, billingMonth, serviceMonth,
				notes, String(me.user_id), new Date().toISOString(), new Date().toISOString()
			).run();
			
			// 插入收据明细
			if (items.length > 0) {
				for (const item of items) {
					const service_name = String(item.service_name).trim();
					const service_fee = Number(item.service_fee || 0);
					const government_fee = Number(item.government_fee || 0);
					const miscellaneous_fee = Number(item.miscellaneous_fee || 0);
					const subtotal = service_fee + government_fee + miscellaneous_fee;
					const item_notes = String(item.notes || "").trim();
					
					// 为了向后兼容，保留quantity和unit_price字段
					const quantity = Number(item.quantity || 1);
					const unit_price = Number(item.unit_price || subtotal);
					
					try {
						// 尝试插入新格式（包含三个费用字段）
						await env.DATABASE.prepare(
							`INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes, service_fee, government_fee, miscellaneous_fee, created_at)
							 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
						).bind(receipt_id, service_name, quantity, unit_price, subtotal, item_notes, service_fee, government_fee, miscellaneous_fee, new Date().toISOString()).run();
					} catch (err) {
						// 如果新字段不存在，回退到旧格式
						console.log('[ReceiptItems] 使用旧格式插入（新字段可能不存在）:', err.message);
						await env.DATABASE.prepare(
							`INSERT INTO ReceiptItems (receipt_id, service_name, quantity, unit_price, subtotal, notes, created_at)
							 VALUES (?, ?, ?, ?, ?, ?, ?)`
						).bind(receipt_id, service_name, quantity, unit_price, subtotal, item_notes, new Date().toISOString()).run();
					}
				}
			}
			
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
				billingMonth: billingMonth,
				itemsCount: items.length
			};
			return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path: url.pathname, err:String(err) }));
			const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}

	// PATCH /internal/api/v1/receipts/:id - 编辑收据
	const patchMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)$/);
	if (method === "PATCH" && patchMatch) {
		const receiptId = decodeURIComponent(patchMatch[1]);
		
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, corsHeaders);
		}
		
		try {
			// 检查收据是否存在
			const existing = await env.DATABASE.prepare(
				"SELECT * FROM Receipts WHERE receipt_id = ? AND is_deleted = 0"
			).bind(receiptId).first();
			
			if (!existing) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收據不存在", meta: { requestId } }, corsHeaders);
			}
			
			// 构建更新字段
			const updates = [];
			const binds = [];
			
			if (body.due_date !== undefined) {
				const due_date = String(body.due_date || "").trim();
				if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
					return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "到期日格式錯誤", meta: { requestId } }, corsHeaders);
				}
				updates.push("due_date = ?");
				binds.push(due_date || null);
			}
			
			if (body.notes !== undefined) {
				updates.push("notes = ?");
				binds.push(String(body.notes || "").trim());
			}
			
			if (body.status !== undefined) {
				const status = String(body.status).trim();
				if (!["unpaid", "partial", "paid", "cancelled"].includes(status)) {
					return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "狀態不合法", meta: { requestId } }, corsHeaders);
				}
				updates.push("status = ?");
				binds.push(status);
			}
			
			if (updates.length === 0) {
				return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "未提供更新字段", meta: { requestId } }, corsHeaders);
			}
			
			updates.push("updated_at = ?");
			binds.push(new Date().toISOString());
			binds.push(receiptId);
			
			await env.DATABASE.prepare(
				`UPDATE Receipts SET ${updates.join(", ")} WHERE receipt_id = ?`
			).bind(...binds).run();
			
			return jsonResponse(200, { ok: true, code: "OK", message: "已更新", meta: { requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } }, corsHeaders);
		}
	}

	// DELETE /internal/api/v1/receipts/:id - 作废收据
	const deleteMatch = path.match(/^\/internal\/api\/v1\/receipts\/([^/]+)$/);
	if (method === "DELETE" && deleteMatch) {
		const receiptId = decodeURIComponent(deleteMatch[1]);
		
		try {
			// 检查收据是否存在
			const existing = await env.DATABASE.prepare(
				"SELECT receipt_id, status FROM Receipts WHERE receipt_id = ? AND is_deleted = 0"
			).bind(receiptId).first();
			
			if (!existing) {
				return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "收據不存在", meta: { requestId } }, corsHeaders);
			}
			
			// 标记为作废（软删除+状态改为cancelled）
			await env.DATABASE.prepare(
				"UPDATE Receipts SET status = 'cancelled', is_deleted = 1, updated_at = ? WHERE receipt_id = ?"
			).bind(new Date().toISOString(), receiptId).run();
			
			return jsonResponse(200, { ok: true, code: "OK", message: "已作廢", meta: { requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
			return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } }, corsHeaders);
		}
	}

	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



