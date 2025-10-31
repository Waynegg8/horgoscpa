import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 工時類型定義（符合勞基法規定）
 */
const WORK_TYPES = {
	1: { name: '正常工時', multiplier: 1.0, isOvertime: false },
	2: { name: '平日加班（前2小時）', multiplier: 1.34, isOvertime: true },
	3: { name: '平日加班（後2小時）', multiplier: 1.67, isOvertime: true },
	4: { name: '休息日加班（前2小時）', multiplier: 1.34, isOvertime: true },
	5: { name: '休息日加班（第3-8小時）', multiplier: 1.67, isOvertime: true },
	6: { name: '休息日加班（第9-12小時）', multiplier: 2.67, isOvertime: true },
	7: { name: '國定假日加班（8小時內）', multiplier: 2.0, isOvertime: true, maxHours: 8, special: 'fixed_8h' },
	8: { name: '國定假日加班（第9-10小時）', multiplier: 1.34, isOvertime: true },
	9: { name: '國定假日加班（第11-12小時）', multiplier: 1.67, isOvertime: true },
	10: { name: '例假日加班（8小時內）', multiplier: 2.0, isOvertime: true, maxHours: 8, special: 'fixed_8h' },
	11: { name: '例假日加班（第9-12小時）', multiplier: 2.0, isOvertime: true },
};

/**
 * 計算加權工時
 */
function calculateWeightedHours(workTypeId, hours) {
	const workType = WORK_TYPES[workTypeId];
	if (!workType) return hours;
	
	// 特殊情況：國定假日/例假日 8小時內類型，固定為 8.0 加權工時
	if (workType.special === 'fixed_8h') {
		return 8.0;
	}
	
	// 一般情況：實際工時 × 倍率
	return hours * workType.multiplier;
}

/**
 * GET /api/v1/timelogs - 查詢工時記錄
 */
async function handleGetTimelogs(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	try {
		const params = url.searchParams;
		const startDate = (params.get("start_date") || "").trim();
		const endDate = (params.get("end_date") || "").trim();
		
		const where = ["is_deleted = 0"];
		const binds = [];
		
		// 權限控制：員工只能看自己的
		if (!me.is_admin) {
			where.push("user_id = ?");
			binds.push(String(me.user_id));
		}
		
		// 日期範圍篩選
		if (startDate) {
			where.push("work_date >= ?");
			binds.push(startDate);
		}
		if (endDate) {
			where.push("work_date <= ?");
			binds.push(endDate);
		}
		
		const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
		
		const rows = await env.DATABASE.prepare(
			`SELECT timesheet_id, user_id, work_date, client_id, service_id, service_item_id, service_name, work_type, hours, note
			 FROM Timesheets
			 ${whereSql}
			 ORDER BY work_date ASC, timesheet_id ASC`
		).bind(...binds).all();
		
		const data = (rows?.results || []).map(r => ({
			log_id: r.timesheet_id,
			user_id: r.user_id,
			work_date: r.work_date,
			client_id: r.client_id || "",
			service_id: parseInt(r.service_id) || parseInt(r.service_name) || 1, // 優先使用新欄位，向後相容
			service_item_id: parseInt(r.service_item_id) || 1,
			work_type_id: parseInt(r.work_type) || 1,
			hours: Number(r.hours || 0),
			notes: r.note || "",
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
		return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
	}
}

/**
 * POST /api/v1/timelogs - 新增/更新工時（UPSERT）
 */
async function handlePostTimelogs(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	let body;
	try { 
		body = await request.json(); 
	} catch (_) {
		return jsonResponse(400, { 
			ok: false, 
			code: "BAD_REQUEST", 
			message: "請求格式錯誤", 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	// 解析欄位
	const work_date = String(body?.work_date || "").trim();
	const client_id = String(body?.client_id || "").trim();
	const service_id = parseInt(body?.service_id) || 0;
	const service_item_id = parseInt(body?.service_item_id) || 0;
	const work_type_id = parseInt(body?.work_type_id) || 0;
	const hours = Number(body?.hours);
	const notes = String(body?.notes || "").trim();
	
	// 驗證
	const errors = [];
	
	if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
		errors.push({ field: "work_date", message: "日期格式必須為 YYYY-MM-DD" });
	}
	
	if (!client_id) {
		errors.push({ field: "client_id", message: "請選擇客戶" });
	}
	
	if (!service_id) {
		errors.push({ field: "service_id", message: "請選擇服務項目" });
	}
	
	if (!service_item_id) {
		errors.push({ field: "service_item_id", message: "請選擇服務子項目" });
	}
	
	if (!work_type_id || !WORK_TYPES[work_type_id]) {
		errors.push({ field: "work_type_id", message: "請選擇有效的工時類型" });
	}
	
	if (!Number.isFinite(hours) || hours <= 0) {
		errors.push({ field: "hours", message: "工時必須大於 0" });
	}
	
	// 檢查 0.5 倍數
	if (Math.abs(hours * 2 - Math.round(hours * 2)) > 1e-9) {
		errors.push({ field: "hours", message: "工時必須是 0.5 的倍數" });
	}
	
	// 檢查最大值限制
	const workType = WORK_TYPES[work_type_id];
	if (workType && workType.maxHours && hours > workType.maxHours) {
		errors.push({ 
			field: "hours", 
			message: `${workType.name}最多只能填 ${workType.maxHours} 小時` 
		});
	}
	
	if (hours > 12) {
		errors.push({ field: "hours", message: "工時不可超過 12 小時" });
	}
	
	if (errors.length) {
		return jsonResponse(422, { 
			ok: false, 
			code: "VALIDATION_ERROR", 
			message: "輸入有誤", 
			errors, 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	try {
		// 檢查是否已存在相同組合的記錄（UPSERT 邏輯）
		// 註：不使用 service_id/service_item_id 作為匹配條件，避免修改服務項目時創建重複記錄
		const existingRow = await env.DATABASE.prepare(
			`SELECT timesheet_id, hours 
			 FROM Timesheets 
			 WHERE user_id = ? 
			   AND work_date = ? 
			   AND client_id = ? 
			   AND work_type = ? 
			   AND is_deleted = 0 
			 LIMIT 1`
		).bind(
			String(me.user_id), 
			work_date, 
			client_id, 
			String(work_type_id)
		).first();
		
		// 計算加權工時
		const weighted_hours = calculateWeightedHours(work_type_id, hours);
		
		let log_id;
		
		if (existingRow) {
			// UPDATE：更新現有記錄
			log_id = existingRow.timesheet_id;
			
			await env.DATABASE.prepare(
				`UPDATE Timesheets 
				 SET service_id = ?, service_item_id = ?, hours = ?, updated_at = ?
				 WHERE timesheet_id = ?`
			).bind(service_id, service_item_id, hours, new Date().toISOString(), log_id).run();
			
		} else {
			// INSERT：新增記錄
			// 先檢查單日總工時是否超過 12
			const sumRow = await env.DATABASE.prepare(
				`SELECT COALESCE(SUM(hours), 0) AS s 
				 FROM Timesheets 
				 WHERE user_id = ? AND work_date = ? AND is_deleted = 0`
			).bind(String(me.user_id), work_date).first();
			
			const currentTotal = Number(sumRow?.s || 0);
			if (currentTotal + hours > 12 + 1e-9) {
				return jsonResponse(422, { 
					ok: false, 
					code: "VALIDATION_ERROR", 
					message: "每日工時合計不可超過 12 小時", 
					errors: [{ field: "hours", message: "超過每日上限" }], 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			await env.DATABASE.prepare(
				`INSERT INTO Timesheets (user_id, work_date, client_id, service_id, service_item_id, service_name, work_type, hours, note, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				String(me.user_id), 
				work_date, 
				client_id, 
				service_id,
				service_item_id,
				String(service_id), // 保留舊欄位以向後相容
				String(work_type_id),
				hours, 
				notes, 
				new Date().toISOString(), 
				new Date().toISOString()
			).run();
			
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			log_id = idRow?.id;
		}
		
		// 計算補休工時（如果是加班）
		const comp_hours_generated = workType.isOvertime ? (workType.special === 'fixed_8h' ? 8 : hours) : 0;
		
		// 如果是加班，寫入補休追蹤表
		if (comp_hours_generated > 0) {
			const generatedDate = work_date;
			// 計算到期日（當月底）
			const dateObj = new Date(work_date + 'T00:00:00Z');
			const year = dateObj.getUTCFullYear();
			const month = dateObj.getUTCMonth();
			const lastDay = new Date(Date.UTC(year, month + 1, 0));
			const expiryDate = `${lastDay.getUTCFullYear()}-${String(lastDay.getUTCMonth() + 1).padStart(2, '0')}-${String(lastDay.getUTCDate()).padStart(2, '0')}`;
			
			// 寫入 CompensatoryLeaveGrants
			await env.DATABASE.prepare(
				`INSERT INTO CompensatoryLeaveGrants 
				 (user_id, source_timelog_id, hours_generated, hours_remaining, generated_date, expiry_date, original_rate, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
			).bind(
				String(me.user_id),
				log_id,
				comp_hours_generated,
				comp_hours_generated,  // 初始時 remaining = generated
				generatedDate,
				expiryDate,
				workType.multiplier
			).run();
		}
		
		return jsonResponse(200, { 
			ok: true, 
			code: "SUCCESS", 
			message: existingRow ? "已更新" : "已建立", 
			data: { 
				log_id, 
				weighted_hours, 
				comp_hours_generated 
			}, 
			meta: { requestId } 
		}, corsHeaders);
		
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, corsHeaders);
	}
}

/**
 * DELETE /api/v1/timelogs/batch - 批次刪除工時（刪除整列）
 */
async function handleDeleteTimelogsBatch(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	let body;
	try { 
		body = await request.json(); 
	} catch (_) {
		return jsonResponse(400, { 
			ok: false, 
			code: "BAD_REQUEST", 
			message: "請求格式錯誤", 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	const start_date = String(body?.start_date || "").trim();
	const end_date = String(body?.end_date || "").trim();
	const client_id = String(body?.client_id || "").trim();
	const service_id = parseInt(body?.service_id) || 0;
	const service_item_id = parseInt(body?.service_item_id) || 0;
	const work_type_id = String(body?.work_type_id || "").trim();
	
	if (!start_date || !end_date || !client_id || !service_id || !service_item_id || !work_type_id) {
		return jsonResponse(400, { 
			ok: false, 
			code: "BAD_REQUEST", 
			message: "缺少必要參數", 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	try {
		// 軟刪除符合條件的所有記錄
		const result = await env.DATABASE.prepare(
			`UPDATE Timesheets 
			 SET is_deleted = 1, updated_at = ?
			 WHERE user_id = ? 
			   AND work_date >= ? 
			   AND work_date <= ? 
			   AND client_id = ? 
			   AND service_id = ? 
			   AND service_item_id = ?
			   AND work_type = ?
			   AND is_deleted = 0`
		).bind(
			new Date().toISOString(),
			String(me.user_id), 
			start_date, 
			end_date, 
			client_id, 
			service_id,
			service_item_id,
			work_type_id
		).run();
		
		const deleted_count = result.changes || 0;
		
		return jsonResponse(200, { 
			ok: true, 
			code: "SUCCESS", 
			message: `已刪除 ${deleted_count} 筆記錄`, 
			data: { deleted_count }, 
			meta: { requestId } 
		}, corsHeaders);
		
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, corsHeaders);
	}
}

/**
 * GET /api/v1/timelogs/summary - 月統計
 */
async function handleGetMonthlySummary(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	try {
		const params = url.searchParams;
		const month = (params.get("month") || "").trim(); // 格式：YYYY-MM
		
		// 驗證月份格式
		if (!month || !/^\d{4}-\d{2}$/.test(month)) {
			return jsonResponse(400, {
				ok: false,
				code: "INVALID_MONTH",
				message: "月份格式錯誤，應為 YYYY-MM",
				meta: { requestId }
			}, corsHeaders);
		}
		
		// 計算月份起始和結束日期
		const [year, monthNum] = month.split('-');
		const startDate = `${year}-${monthNum}-01`;
		const nextMonth = parseInt(monthNum) === 12 ? `${parseInt(year) + 1}-01` : `${year}-${String(parseInt(monthNum) + 1).padStart(2, '0')}`;
		const endDate = `${nextMonth}-01`;
		
	// 權限控制：員工只能查詢自己的，管理員可以指定 user_id
	let userId = me.user_id;
	if (me.is_admin && params.get("user_id")) {
		userId = parseInt(params.get("user_id"));
	}
		
		// 查詢當月工時記錄
		const timelogs = await env.DATABASE.prepare(
			`SELECT work_type, hours
			 FROM Timesheets
			 WHERE user_id = ?
			   AND work_date >= ?
			   AND work_date < ?
			   AND is_deleted = 0`
		).bind(userId, startDate, endDate).all();
		
		// 計算統計數據
		let totalHours = 0;
		let overtimeHours = 0;
		let weightedHours = 0;
		
		timelogs.results.forEach(log => {
			const hours = parseFloat(log.hours) || 0;
			const workTypeId = parseInt(log.work_type) || 1;
			const workType = WORK_TYPES[workTypeId];
			
			if (workType) {
				totalHours += hours;
				
				if (workType.isOvertime) {
					overtimeHours += hours;
				}
				
				weightedHours += calculateWeightedHours(workTypeId, hours);
			}
		});
		
	// 查詢當月請假時數（需要根據 unit 轉換）
	const leaveRows = await env.DATABASE.prepare(
		`SELECT unit, amount
		 FROM LeaveRequests
		 WHERE user_id = ?
		   AND start_date >= ?
		   AND start_date < ?
		   AND status = 'approved'
		   AND is_deleted = 0`
	).bind(userId, startDate, endDate).all();
	
	// 計算總請假時數（day 換算為 8 小時）
	let leaveHours = 0;
	if (leaveRows.results) {
		leaveRows.results.forEach(row => {
			const amount = parseFloat(row.amount) || 0;
			if (row.unit === 'hour') {
				leaveHours += amount;
			} else if (row.unit === 'day') {
				leaveHours += amount * 8; // 1天 = 8小時
			}
		});
	}
		
		// 回傳統計結果
		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: "查詢成功",
			data: {
				month,
				total_hours: Math.round(totalHours * 10) / 10,
				overtime_hours: Math.round(overtimeHours * 10) / 10,
				weighted_hours: Math.round(weightedHours * 10) / 10,
				leave_hours: Math.round(leaveHours * 10) / 10
			},
			meta: { requestId }
		}, corsHeaders);
		
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, corsHeaders);
	}
}

/**
 * 主路由處理
 */
export async function handleTimesheets(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	// GET /api/v1/timelogs/summary - 月統計
	if (method === "GET" && url.pathname.endsWith("/summary")) {
		return handleGetMonthlySummary(request, env, me, requestId, url);
	}
	
	// GET /api/v1/timelogs
	if (method === "GET") {
		return handleGetTimelogs(request, env, me, requestId, url);
	}
	
	// POST /api/v1/timelogs
	if (method === "POST") {
		return handlePostTimelogs(request, env, me, requestId, url);
	}
	
	// DELETE /api/v1/timelogs/batch
	if (method === "DELETE" && url.pathname.endsWith("/batch")) {
		return handleDeleteTimelogsBatch(request, env, me, requestId, url);
	}
	
	return jsonResponse(405, { 
		ok: false, 
		code: "METHOD_NOT_ALLOWED", 
		message: "方法不允許", 
		meta: { requestId } 
	}, corsHeaders);
}
