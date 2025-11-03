import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { generateCacheKey, getCache, saveCache, invalidateCacheByType } from "../cache-helper.js";

// 确保用户有基本假期余额记录
async function ensureBasicLeaveBalances(env, userId, year) {
	// 病假：30天/年
	await env.DATABASE.prepare(
		"INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) VALUES (?, 'sick', ?, 30, 0, 30, datetime('now'))"
	).bind(userId, year).run();
	
	// 事假：14天/年
	await env.DATABASE.prepare(
		"INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at) VALUES (?, 'personal', ?, 14, 0, 14, datetime('now'))"
	).bind(userId, year).run();
}

export async function handleLeaves(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	if (path === "/internal/api/v1/leaves/balances") {
		if (method !== "GET") {
			return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		}
		try {
			const params = url.searchParams; 
			const year = parseInt(params.get("year") || String(new Date().getFullYear()), 10);
			const queryUserId = params.get("user_id");
			
			// 確定查詢的用戶ID：管理員可以指定，員工只能查自己
			let targetUserId = String(me.user_id);
			if (queryUserId && me.is_admin) {
				targetUserId = String(queryUserId);
			}
			
			// ⚡ 尝试从缓存读取
			const cacheKey = generateCacheKey('leaves_balances', { userId: targetUserId, year });
			const cached = await getCache(env, cacheKey);
			
			if (cached && cached.data) {
				return jsonResponse(200, { 
					ok: true, 
					code: "OK", 
					message: "成功（缓存）", 
					data: cached.data, 
					meta: { requestId, year, userId: targetUserId, ...cached.meta } 
				}, corsHeaders);
			}
			
			// 确保用户有基本假期余额记录
			await ensureBasicLeaveBalances(env, targetUserId, year);
			
			// 排除補休類型（補休由 CompensatoryLeaveGrants 計算）
			const rows = await env.DATABASE.prepare(
				"SELECT leave_type, year, total, used, remain FROM LeaveBalances WHERE user_id = ? AND year = ? AND leave_type != 'comp'"
			).bind(targetUserId, year).all();
			const data = (rows?.results || []).map(r => ({ type: r.leave_type, year: Number(r.year), total: Number(r.total), used: Number(r.used), remain: Number(r.remain) }));
			
			// 補休餘額從 CompensatoryLeaveGrants 計算（當月有效）
			const compRow = await env.DATABASE.prepare(
				`SELECT SUM(hours_remaining) as total FROM CompensatoryLeaveGrants 
				 WHERE user_id = ? AND status = 'active' AND hours_remaining > 0`
			).bind(targetUserId).first();
			const compRemain = Number(compRow?.total || 0);
			
			if (compRemain > 0) {
				data.push({ type: 'comp', year, total: compRemain, used: 0, remain: compRemain });
			}
			
			// 添加生活事件假期餘額
			const lifeEventRows = await env.DATABASE.prepare(
				`SELECT event_type, leave_type, days_granted, days_used, days_remaining, valid_until
				 FROM LifeEventLeaveGrants 
				 WHERE user_id = ? AND status = 'active' AND days_remaining > 0 
				 AND date(valid_until) >= date('now')`
			).bind(targetUserId).all();
			
			(lifeEventRows?.results || []).forEach(r => {
				const typeName = r.leave_type;
				data.push({ 
					type: typeName, 
					year, 
					total: Number(r.days_granted || 0), 
					used: Number(r.days_used || 0), 
					remain: Number(r.days_remaining || 0),
					validUntil: r.valid_until
				});
			});
			
			// ⚡ 保存到缓存（同步等待）
			try {
				await saveCache(env, cacheKey, 'leaves_balances', data, {
					userId: targetUserId,
					scopeParams: { userId: targetUserId, year }
				});
				console.log('[LEAVES] ✓ 假期余额缓存已保存');
			} catch (err) {
				console.error('[LEAVES] ✗ 余额缓存保存失败:', err);
			}
			
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, year, userId: targetUserId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	if (path === "/internal/api/v1/leaves") {
		if (method === "GET") {
			try {
				const params = url.searchParams;
				const page = Math.max(1, parseInt(params.get("page") || "1", 10));
				const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "20", 10)));
				const offset = (page - 1) * perPage;
				const q = (params.get("q") || "").trim();
				const status = (params.get("status") || "").trim();
				const type = (params.get("type") || "").trim();
				const dateFrom = (params.get("dateFrom") || "").trim();
				const dateTo = (params.get("dateTo") || "").trim();
				const queryUserId = params.get("user_id");
				
				// ⚡ 尝试从缓存读取
				const cacheKey = generateCacheKey('leaves_list', { 
					page, perPage, q, status, type, dateFrom, dateTo, userId: queryUserId || me.user_id 
				});
				const cached = await getCache(env, cacheKey);
				
				if (cached && cached.data) {
					return jsonResponse(200, { 
						ok: true, 
						code: "OK", 
						message: "成功（缓存）", 
						data: cached.data.list, 
						meta: { ...cached.data.meta, requestId, ...cached.meta } 
					}, corsHeaders);
				}
				
				const where = ["l.is_deleted = 0"];
				const binds = [];
				
				// 管理員可以指定user_id，員工只能看自己的
				if (queryUserId && me.is_admin) {
					where.push("l.user_id = ?");
					binds.push(String(queryUserId));
				} else if (!me.is_admin) { 
					where.push("l.user_id = ?"); 
					binds.push(String(me.user_id)); 
				}
				
				if (q) { where.push("l.leave_type LIKE ?"); binds.push(`%${q}%`); }
				if (status && ["pending","approved","rejected"].includes(status)) { where.push("l.status = ?"); binds.push(status); }
				if (type) { where.push("l.leave_type = ?"); binds.push(type); }
				if (dateFrom) { where.push("l.start_date >= ?"); binds.push(dateFrom); }
				if (dateTo) { where.push("l.end_date <= ?"); binds.push(dateTo); }
				const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
				const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM LeaveRequests l ${whereSql}`).bind(...binds).first();
				const total = Number(countRow?.total || 0);
				const rows = await env.DATABASE.prepare(
					`SELECT l.leave_id, l.leave_type, l.start_date, l.end_date, l.unit, l.amount, l.start_time, l.end_time, l.status, l.submitted_at
					 FROM LeaveRequests l
					 ${whereSql}
					 ORDER BY l.submitted_at DESC, l.leave_id DESC
					 LIMIT ? OFFSET ?`
				).bind(...binds, perPage, offset).all();
				const data = (rows?.results || []).map(r => ({
					leaveId: String(r.leave_id),
					type: r.leave_type,
					start: r.start_date,
					end: r.end_date,
					unit: r.unit,
					amount: Number(r.amount || 0),
					startTime: r.start_time || null,
					endTime: r.end_time || null,
					status: r.status,
					submittedAt: r.submitted_at,
				}));
				const meta = { requestId, page, perPage, total, hasNext: offset + perPage < total };
				
				// ⚡ 保存到缓存（不等待完成）
				saveCache(env, cacheKey, 'leaves_list', { list: data, meta }, {
					userId: queryUserId || String(me.user_id),
					scopeParams: { page, perPage, q, status, type, dateFrom, dateTo }
				}).catch(err => console.error('[LEAVES] 列表缓存保存失败:', err));
				
				return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				const body = { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } };
				if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
				return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
			}
		}

		if (method === "POST") {
			let body;
			try { body = await request.json(); } catch (_) {
				return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
			}
			const leave_type = String(body?.leave_type || "").trim();
			const start_date = String(body?.start_date || "").trim();
			const amount = Number(body?.amount);
			const start_time = String(body?.start_time || "").trim();
			const end_time = String(body?.end_time || "").trim();
			const errors = [];
			if (!leave_type) errors.push({ field:"leave_type", message:"必選假別" });
			if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) errors.push({ field:"start_date", message:"日期格式 YYYY-MM-DD" });
			if (!Number.isFinite(amount) || amount <= 0) errors.push({ field:"amount", message:"需大於 0" });
			// 驗證必須是 0.5 的倍數（半小時）
			if (Math.abs(amount * 2 - Math.round(amount * 2)) > 1e-9) {
				errors.push({ field:"amount", message:"請假小時數必須是 0.5 的倍數（例如：0.5、1、1.5、2）" });
			}
			// 必須提供時間
			if (!/^\d{2}:\d{2}$/.test(start_time)) errors.push({ field:"start_time", message:"請選擇開始時間（格式 HH:MM）" });
			if (!/^\d{2}:\d{2}$/.test(end_time)) errors.push({ field:"end_time", message:"請選擇結束時間（格式 HH:MM）" });
			
			// 驗證時間必須是30分鐘的倍數
			if (start_time && /^\d{2}:\d{2}$/.test(start_time)) {
				const [h, m] = start_time.split(':').map(Number);
				if (m !== 0 && m !== 30) errors.push({ field:"start_time", message:"時間必須是整點或半點（如 9:00、9:30）" });
			}
			if (end_time && /^\d{2}:\d{2}$/.test(end_time)) {
				const [h, m] = end_time.split(':').map(Number);
				if (m !== 0 && m !== 30) errors.push({ field:"end_time", message:"時間必須是整點或半點（如 9:00、9:30）" });
			}
			// 性別限制檢查
			const femaleOnlyLeaveTypes = ['maternity', 'menstrual', 'prenatal_checkup'];
			const maleOnlyLeaveTypes = ['paternity'];
			
			if (femaleOnlyLeaveTypes.includes(leave_type) && me.gender === 'M') {
				errors.push({ field:"leave_type", message:"此假別僅限女性" });
			}
			if (maleOnlyLeaveTypes.includes(leave_type) && me.gender === 'F') {
				errors.push({ field:"leave_type", message:"此假別僅限男性" });
			}
			
			// 需要先登記生活事件的假別，檢查是否有足夠餘額
			const lifeEventLeaveTypes = ['marriage', 'funeral', 'maternity', 'prenatal_checkup', 'paternity'];
			if (lifeEventLeaveTypes.includes(leave_type)) {
				const daysNeeded = amount / 8; // 統一使用小時，8小時=1天
				const grantRow = await env.DATABASE.prepare(
					`SELECT SUM(days_remaining) as available FROM LifeEventLeaveGrants 
					 WHERE user_id = ? AND leave_type = ? AND status = 'active' 
					 AND date(valid_until) >= date('now')`
				).bind(String(me.user_id), leave_type).first();
				
				const availableDays = Number(grantRow?.available || 0);
				if (availableDays < daysNeeded) {
					errors.push({ field:"leave_type", message:`${leave_type}餘額不足，請先登記生活事件。剩餘：${availableDays}日，需要：${daysNeeded}日` });
				}
			}
			
			// 補休特殊處理：檢查餘額（FIFO）
			if (leave_type === 'comp') {
				const hoursNeeded = amount; // 統一使用小時
				const compGrants = await env.DATABASE.prepare(
					`SELECT grant_id, hours_remaining FROM CompensatoryLeaveGrants 
					 WHERE user_id = ? AND status = 'active' AND hours_remaining > 0 
					 ORDER BY generated_date ASC`
				).bind(String(me.user_id)).all();
				const totalAvailable = (compGrants?.results || []).reduce((sum, g) => sum + Number(g.hours_remaining || 0), 0);
				if (totalAvailable < hoursNeeded) {
					errors.push({ field:"amount", message:`補休不足（剩餘 ${totalAvailable} 小時，需要 ${hoursNeeded} 小時）` });
				}
			}
			
			if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);

			try {
				// 建立請假申請（自動批准，結束日期等於開始日期，統一使用小時單位）
				await env.DATABASE.prepare(
					"INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, unit, amount, start_time, end_time, status, submitted_at, reviewed_at, reviewed_by) VALUES (?, ?, ?, ?, 'hour', ?, ?, ?, 'approved', datetime('now'), datetime('now'), ?)"
				).bind(String(me.user_id), leave_type, start_date, start_date, amount, start_time || null, end_time || null, String(me.user_id)).run();
				const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
				const leaveId = String(idRow?.id);
				
				// 如果是補休，立即扣減（FIFO）
				if (leave_type === 'comp') {
					const hoursNeeded = amount; // 統一使用小時
					const compGrants = await env.DATABASE.prepare(
						`SELECT grant_id, hours_remaining FROM CompensatoryLeaveGrants 
						 WHERE user_id = ? AND status = 'active' AND hours_remaining > 0 
						 ORDER BY generated_date ASC`
					).bind(String(me.user_id)).all();
					
					let remaining = hoursNeeded;
					for (const grant of (compGrants?.results || [])) {
						if (remaining <= 0) break;
						const deduct = Math.min(remaining, Number(grant.hours_remaining || 0));
						const newRemaining = Number(grant.hours_remaining || 0) - deduct;
						const newUsed = (await env.DATABASE.prepare(`SELECT hours_used FROM CompensatoryLeaveGrants WHERE grant_id = ?`).bind(grant.grant_id).first())?.hours_used || 0;
						const newStatus = newRemaining <= 0 ? 'fully_used' : 'active';
						
						await env.DATABASE.prepare(
							`UPDATE CompensatoryLeaveGrants 
							 SET hours_used = ?, hours_remaining = ?, status = ? 
							 WHERE grant_id = ?`
						).bind(Number(newUsed) + deduct, newRemaining, newStatus, grant.grant_id).run();
						
					remaining -= deduct;
				}
			}
			
			// ⚡ 失效该用户的请假列表和余额缓存
			Promise.all([
				invalidateCacheByType(env, 'leaves_list', { userId: String(me.user_id) }),
				invalidateCacheByType(env, 'leaves_balances', { userId: String(me.user_id) })
			]).catch(err => console.error('[LEAVES] 失效缓存失败:', err));
			
			return jsonResponse(201, { ok:true, code:"CREATED", message:"申請成功", data:{ leaveId }, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	// Cron Job: 手動觸發補休到期轉加班費
	if (path === "/internal/api/v1/admin/cron/execute" && method === "POST") {
		if (!me?.is_admin) {
			return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
		}
		
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		
		const jobName = String(body?.job_name || '').trim();
		if (jobName !== 'comp_leave_expiry') {
			return jsonResponse(400, { ok:false, code:"INVALID_JOB", message:"不支援的 Job 名稱", meta:{ requestId } }, corsHeaders);
		}
		
		try {
			// 計算上月底日期
			const now = new Date();
			const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
			const lastDayOfLastMonth = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0));
			const expiryDate = `${lastDayOfLastMonth.getUTCFullYear()}-${String(lastDayOfLastMonth.getUTCMonth() + 1).padStart(2, '0')}-${String(lastDayOfLastMonth.getUTCDate()).padStart(2, '0')}`;
			const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
			
			// 掃描到期的補休記錄
			const expiredGrants = await env.DATABASE.prepare(
				`SELECT g.grant_id, g.user_id, g.hours_remaining, g.original_rate, u.base_salary
				 FROM CompensatoryLeaveGrants g
				 LEFT JOIN Users u ON g.user_id = u.user_id
				 WHERE g.expiry_date = ? AND g.status = 'active' AND g.hours_remaining > 0`
			).bind(expiryDate).all();
			
			let processedCount = 0;
			const grantIds = [];
			
			for (const grant of (expiredGrants?.results || [])) {
				const baseSalary = Number(grant.base_salary || 0);
				const hourlyRate = baseSalary / 240;  // 月薪 ÷ 240 = 時薪
				const hours = Number(grant.hours_remaining || 0);
				const rate = Number(grant.original_rate || 1);
				const amountCents = Math.round(hours * hourlyRate * rate * 100);  // 轉為分
				
				// 寫入加班費記錄
				await env.DATABASE.prepare(
					`INSERT INTO CompensatoryOvertimePay 
					 (user_id, year_month, hours_expired, amount_cents, source_grant_ids)
					 VALUES (?, ?, ?, ?, ?)`
				).bind(
					String(grant.user_id),
					currentMonth,
					hours,
					amountCents,
					JSON.stringify([grant.grant_id])
				).run();
				
				// 更新補休記錄狀態為 expired
				await env.DATABASE.prepare(
					`UPDATE CompensatoryLeaveGrants SET status = 'expired' WHERE grant_id = ?`
				).bind(grant.grant_id).run();
				
				grantIds.push(grant.grant_id);
				processedCount++;
			}
			
			// 記錄 Cron 執行
			await env.DATABASE.prepare(
				`INSERT INTO CronJobExecutions 
				 (job_name, status, executed_at, details)
				 VALUES (?, 'success', datetime('now'), ?)`
			).bind(jobName, JSON.stringify({ 
				expiryDate, 
				processedCount, 
				grantIds,
				currentMonth 
			})).run();
			
			return jsonResponse(200, { 
				ok:true, 
				code:"SUCCESS", 
				message:`已處理 ${processedCount} 筆到期補休`, 
				data:{ 
					processedCount, 
					expiryDate, 
					currentMonth 
				}, 
				meta:{ requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			
			// 記錄失敗
			try {
				await env.DATABASE.prepare(
					`INSERT INTO CronJobExecutions 
					 (job_name, status, executed_at, error_message)
					 VALUES (?, 'failed', datetime('now'), ?)`
				).bind(jobName, String(err)).run();
			} catch (_) {}
			
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}
	
	// Cron Job: 查詢執行歷史
	if (path === "/internal/api/v1/admin/cron/history" && method === "GET") {
		if (!me?.is_admin) {
			return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
		}
		
		try {
			const params = url.searchParams;
			const jobName = params.get('job_name') || '';
			const page = Math.max(1, parseInt(params.get('page') || '1', 10));
			const perPage = Math.min(100, Math.max(1, parseInt(params.get('perPage') || '20', 10)));
			const offset = (page - 1) * perPage;
			
			const whereSql = jobName ? 'WHERE job_name = ?' : '';
			const binds = jobName ? [jobName] : [];
			
			const totalRow = await env.DATABASE.prepare(
				`SELECT COUNT(1) AS total FROM CronJobExecutions ${whereSql}`
			).bind(...binds).first();
			
			const rows = await env.DATABASE.prepare(
				`SELECT execution_id, job_name, status, executed_at, details, error_message
				 FROM CronJobExecutions ${whereSql}
				 ORDER BY executed_at DESC LIMIT ? OFFSET ?`
			).bind(...binds, perPage, offset).all();
			
			const data = (rows?.results || []).map(r => ({
				id: r.execution_id,
				jobName: r.job_name,
				status: r.status,
				executedAt: r.executed_at,
				details: r.details ? JSON.parse(r.details) : null,
				errorMessage: r.error_message
			}));
			
			return jsonResponse(200, { 
				ok:true, 
				code:"OK", 
				message:"成功", 
				data, 
				meta:{ 
					requestId, 
					page, 
					perPage, 
					total: Number(totalRow?.total || 0) 
				} 
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// 登記生活事件，自動授予假期
	if (path === "/internal/api/v1/leaves/life-events" && method === "POST") {
		let body;
		try { body = await request.json(); } catch (_) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders);
		}
		
		const event_type = String(body?.event_type || "").trim();
		const event_date = String(body?.event_date || "").trim();
		const notes = String(body?.notes || "").trim();
		const user_id = body?.user_id ? String(body.user_id) : String(me.user_id);
		
		// 權限檢查：非管理員只能為自己登記
		if (!me.is_admin && user_id !== String(me.user_id)) {
			return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
		}
		
		const errors = [];
		if (!event_type) errors.push({ field:"event_type", message:"請選擇事件類型" });
		if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) errors.push({ field:"event_date", message:"日期格式 YYYY-MM-DD" });
		
		// 定義各種生活事件的假期規則（依勞基法及性別工作平等法）
		const eventRules = {
			marriage: { leave_type: 'marriage', days: 8, valid_days: 365, name: '婚假', gender: null },
			funeral_parent: { leave_type: 'funeral', days: 8, valid_days: 365, name: '喪假（父母/養父母/繼父母/配偶喪亡）', gender: null },
			funeral_grandparent: { leave_type: 'funeral', days: 6, valid_days: 365, name: '喪假（祖父母/子女/配偶之父母喪亡）', gender: null },
			funeral_sibling: { leave_type: 'funeral', days: 3, valid_days: 365, name: '喪假（曾祖父母/兄弟姊妹/配偶之祖父母喪亡）', gender: null },
			maternity: { leave_type: 'maternity', days: 56, valid_days: 180, name: '產假（分娩前後8週）', gender: 'F' },
			miscarriage: { leave_type: 'maternity', days: 28, valid_days: 180, name: '產假（妊娠3個月以上流產4週）', gender: 'F' },
			pregnancy: { leave_type: 'prenatal_checkup', days: 7, valid_days: 365, name: '產檢假（妊娠期間7日）', gender: 'F' },
			paternity: { leave_type: 'paternity', days: 7, valid_days: 60, name: '陪產檢及陪產假（配偶分娩或懷孕7日）', gender: 'M' },
		};
		
		const rule = eventRules[event_type];
		if (!rule) {
			errors.push({ field:"event_type", message:"無效的事件類型" });
		}
		
		// 性別限制檢查
		if (rule && rule.gender) {
			// 獲取目標用戶的性別
			const userRow = await env.DATABASE.prepare(
				"SELECT gender FROM Users WHERE user_id = ?"
			).bind(user_id).first();
			
			const userGender = userRow?.gender;
			if (userGender !== rule.gender) {
				const genderName = rule.gender === 'F' ? '女性' : '男性';
				errors.push({ field:"event_type", message:`此事件類型僅限${genderName}` });
			}
		}
		
		if (errors.length) {
			return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
		}
		
		try {
			// 計算有效期
			const eventDateObj = new Date(event_date);
			const validFrom = event_date;
			const validUntilObj = new Date(eventDateObj);
			validUntilObj.setDate(validUntilObj.getDate() + rule.valid_days);
			const validUntil = validUntilObj.toISOString().slice(0, 10);
			
			// 建立生活事件假期授予記錄
			await env.DATABASE.prepare(
				`INSERT INTO LifeEventLeaveGrants 
				 (user_id, event_type, event_date, leave_type, days_granted, days_used, days_remaining, 
				  valid_from, valid_until, notes, status, created_by) 
				 VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'active', ?)`
			).bind(
				user_id, 
				event_type, 
				event_date, 
				rule.leave_type, 
				rule.days, 
				rule.days, 
				validFrom, 
				validUntil, 
				notes || null, 
				String(me.user_id)
			).run();
			
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			const grantId = String(idRow?.id);
			
			return jsonResponse(201, { 
				ok:true, 
				code:"CREATED", 
				message:`已登記${rule.name}，授予 ${rule.days} 天假期`, 
				data:{ grantId, daysGranted: rule.days, validUntil }, 
				meta:{ requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}
	
	return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
}



