import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { generateCacheKey, getCache, saveCache, invalidateCacheByType } from "../cache-helper.js";
import { getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../kv-cache-helper.js";

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

	// 生活事件：刪除（/internal/api/v1/leaves/life-events/:id）
	if (path.startsWith("/internal/api/v1/leaves/life-events/") && method === "DELETE") {
		const grantId = path.replace("/internal/api/v1/leaves/life-events/", "").trim();
		if (!/^\d+$/.test(grantId)) {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"缺少或無效的事件ID", meta:{ requestId } }, corsHeaders);
		}
		try {
			const row = await env.DATABASE.prepare(
				`SELECT grant_id, user_id, status FROM LifeEventLeaveGrants WHERE grant_id = ?`
			).bind(grantId).first();
			if (!row) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"事件不存在", meta:{ requestId } }, corsHeaders);
			if (!me.is_admin && String(row.user_id) !== String(me.user_id)) {
				return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
			}
			// 直接刪除事件
			await env.DATABASE.prepare(
				`DELETE FROM LifeEventLeaveGrants WHERE grant_id = ?`
			).bind(grantId).run();
			// 清除相關快取
			Promise.all([
				invalidateCacheByType(env, 'leaves_balances', { userId: String(row.user_id) })
			]).catch(()=>{});
			await deleteKVCacheByPrefix(env, 'leaves_');
			return jsonResponse(200, { ok:true, code:"OK", message:"事件已刪除", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// 編輯請假紀錄（不支援補休）：/internal/api/v1/leaves/:id
	if (method === "PUT" && /^\/internal\/api\/v1\/leaves\/\d+$/.test(path)) {
		const leaveId = path.split('/').pop();
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
		if (!/^\d{2}:\d{2}$/.test(start_time)) errors.push({ field:"start_time", message:"請選擇開始時間（格式 HH:MM）" });
		if (!/^\d{2}:\d{2}$/.test(end_time)) errors.push({ field:"end_time", message:"請選擇結束時間（格式 HH:MM）" });
		if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);

		try {
			const row = await env.DATABASE.prepare(
				`SELECT leave_id, user_id, leave_type FROM LeaveRequests WHERE leave_id = ? AND is_deleted = 0`
			).bind(leaveId).first();
			if (!row) return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"記錄不存在", meta:{ requestId } }, corsHeaders);
			if (!me.is_admin && String(row.user_id) !== String(me.user_id)) {
				return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
			}
			// 暫不支援編輯補休
			if (row.leave_type === 'comp' || leave_type === 'comp') {
				return jsonResponse(422, { ok:false, code:"UNSUPPORTED", message:"補休紀錄暫不支援編輯，請刪除後重建", meta:{ requestId } }, corsHeaders);
			}
			await env.DATABASE.prepare(
				`UPDATE LeaveRequests SET leave_type = ?, start_date = ?, end_date = ?, amount = ?, start_time = ?, end_time = ? WHERE leave_id = ?`
			).bind(leave_type, start_date, start_date, amount, start_time, end_time, leaveId).run();
			Promise.all([
				invalidateCacheByType(env, 'leaves_list', { userId: String(row.user_id) }),
				invalidateCacheByType(env, 'leaves_balances', { userId: String(row.user_id) })
			]).catch(()=>{});
			await deleteKVCacheByPrefix(env, 'leaves_');
			return jsonResponse(200, { ok:true, code:"OK", message:"已更新請假紀錄", meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// 刪除請假記錄 - 必須在通用 /leaves 路由之前檢查
	if (path.startsWith("/internal/api/v1/leaves/") && method === "DELETE") {
		const leaveId = path.replace("/internal/api/v1/leaves/", "").trim();
		
		// 排除其他子路由
		if (!leaveId || leaveId.includes('/') || leaveId === 'balances' || leaveId === 'life-events') {
			return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"缺少請假記錄 ID", meta:{ requestId } }, corsHeaders);
		}
		
		try {
			// 查詢請假記錄
			const leaveRow = await env.DATABASE.prepare(
				"SELECT leave_id, user_id, leave_type, amount, status FROM LeaveRequests WHERE leave_id = ? AND is_deleted = 0"
			).bind(leaveId).first();
			
			if (!leaveRow) {
				return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"請假記錄不存在", meta:{ requestId } }, corsHeaders);
			}
			
			// 權限檢查：只能刪除自己的記錄，管理員可以刪除任何記錄
			if (!me.is_admin && String(leaveRow.user_id) !== String(me.user_id)) {
				return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, corsHeaders);
			}
			
			// 如果是補休且已批准，需要歸還補休額度
			if (leaveRow.leave_type === 'comp' && leaveRow.status === 'approved') {
				const hoursToReturn = Number(leaveRow.amount || 0);
				
				// 查找最舊的未完全使用的補休記錄，歸還額度（FIFO反向）
				const compGrants = await env.DATABASE.prepare(
					`SELECT grant_id, hours_granted, hours_used, hours_remaining 
					 FROM CompensatoryLeaveGrants 
					 WHERE user_id = ? AND (status = 'active' OR status = 'fully_used')
					 ORDER BY generated_date ASC`
				).bind(String(leaveRow.user_id)).all();
				
				let remaining = hoursToReturn;
				for (const grant of (compGrants?.results || [])) {
					if (remaining <= 0) break;
					
					const hoursGranted = Number(grant.hours_granted || 0);
					const hoursUsed = Number(grant.hours_used || 0);
					const hoursRemaining = Number(grant.hours_remaining || 0);
					
					// 計算可以歸還的額度（不能超過已使用的）
					const canReturn = Math.min(remaining, hoursUsed);
					if (canReturn <= 0) continue;
					
					const newUsed = hoursUsed - canReturn;
					const newRemaining = hoursRemaining + canReturn;
					const newStatus = newRemaining > 0 ? 'active' : (newUsed > 0 ? 'partially_used' : 'active');
					
					await env.DATABASE.prepare(
						`UPDATE CompensatoryLeaveGrants 
						 SET hours_used = ?, hours_remaining = ?, status = ? 
						 WHERE grant_id = ?`
					).bind(newUsed, newRemaining, newStatus, grant.grant_id).run();
					
					remaining -= canReturn;
				}
			}
			
			// 軟刪除請假記錄
			await env.DATABASE.prepare(
				"UPDATE LeaveRequests SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ? WHERE leave_id = ?"
			).bind(String(me.user_id), leaveId).run();
			
			// ⚡ 失效該用戶的請假列表和余額緩存
			Promise.all([
				invalidateCacheByType(env, 'leaves_list', { userId: String(leaveRow.user_id) }),
				invalidateCacheByType(env, 'leaves_balances', { userId: String(leaveRow.user_id) })
			]).catch(err => console.error('[LEAVES] 失效緩存失敗:', err));
			
			// ⚡ 清除KV緩存
			await deleteKVCacheByPrefix(env, 'leaves_');
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已刪除請假記錄", meta:{ requestId } }, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

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
			
			// ⚡ 优先尝试从KV缓存读取（极快<50ms）
			const cacheKey = generateCacheKey('leaves_balances', { userId: targetUserId, year });
			const kvCached = await getKVCache(env, cacheKey);
			
			if (kvCached && kvCached.data) {
				return jsonResponse(200, { 
					ok: true, 
					code: "OK", 
					message: "成功（KV缓存）⚡", 
					data: kvCached.data, 
					meta: { requestId, year, userId: targetUserId, ...kvCached.meta, cache_source: 'kv' } 
				}, corsHeaders);
			}
			
			// ⚡ KV未命中，尝试D1缓存（备份）
			const d1Cached = await getCache(env, cacheKey);
			if (d1Cached && d1Cached.data) {
				// 异步同步到KV
				saveKVCache(env, cacheKey, 'leaves_balances', d1Cached.data, {
					userId: targetUserId,
					scopeParams: { userId: targetUserId, year },
					ttl: 3600
				}).catch(err => console.error('[LEAVES] KV同步失败:', err));
				
				return jsonResponse(200, { 
					ok: true, 
					code: "OK", 
					message: "成功（D1缓存）", 
					data: d1Cached.data, 
					meta: { requestId, year, userId: targetUserId, ...d1Cached.meta, cache_source: 'd1' } 
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
			
			// ⚡ 并行保存到KV（极快）和D1（备份）
			try {
				await Promise.all([
					saveKVCache(env, cacheKey, 'leaves_balances', data, {
						userId: targetUserId,
						scopeParams: { userId: targetUserId, year },
						ttl: 3600 // 1小时
					}),
					saveCache(env, cacheKey, 'leaves_balances', data, {
						userId: targetUserId,
						scopeParams: { userId: targetUserId, year }
					})
				]);
				console.log('[LEAVES] ✓ 假期余额缓存已保存（KV+D1）');
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
				
			// ⚡ 优先尝试从KV缓存读取（极快<50ms）
			const cacheKey = generateCacheKey('leaves_list', { 
				page, perPage, q, status, type, dateFrom, dateTo, userId: queryUserId || me.user_id 
			});
			
			// 1️⃣ 先尝试 KV 缓存
			const kvCached = await getKVCache(env, cacheKey);
			if (kvCached && kvCached.data) {
				return jsonResponse(200, { 
					ok: true, 
					code: "SUCCESS", 
					message: "查詢成功（KV缓存）⚡", 
					data: kvCached.data.list, 
					meta: { ...kvCached.data.meta, requestId, cache_source: 'kv' } 
				}, corsHeaders);
			}
			
			// 2️⃣ KV 未命中，尝试 D1 缓存
			const cached = await getCache(env, cacheKey);
			if (cached && cached.data) {
				// 异步同步回 KV
				saveKVCache(env, cacheKey, 'leaves_list', cached.data, { ttl: 3600 })
					.catch(err => console.error('[LEAVES] KV同步失败:', err));
				
				return jsonResponse(200, { 
					ok: true, 
					code: "OK", 
					message: "成功（D1缓存）", 
					data: cached.data.list, 
					meta: { ...cached.data.meta, requestId, cache_source: 'd1' } 
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
			
			// ⚡ 同时保存到 KV 和 D1 缓存
			const cacheData = { list: data, meta: { page, perPage, total, hasNext: offset + perPage < total } };
			try {
				await Promise.all([
					saveKVCache(env, cacheKey, 'leaves_list', cacheData, { ttl: 3600 }),
					saveCache(env, cacheKey, 'leaves_list', cacheData, {
						userId: queryUserId || String(me.user_id),
						scopeParams: { page, perPage, q, status, type, dateFrom, dateTo }
					})
				]);
				console.log('[LEAVES] ✓ 假期列表已保存到 KV+D1 缓存');
			} catch (err) {
				console.error('[LEAVES] ✗ 缓存保存失败:', err);
			}
				
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
			
			// 生理假特殊處理：每月最多1天（8小時）
			if (leave_type === 'menstrual') {
				const [year, month] = start_date.split('-');
				const monthFirstDay = `${year}-${month}-01`;
				const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
				const monthLastDay = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
				
				// 查询当月已有的生理假（已批准的）
				const existingRow = await env.DATABASE.prepare(
					`SELECT SUM(amount) as total_hours FROM LeaveRequests 
					 WHERE user_id = ? AND leave_type = 'menstrual' AND status = 'approved' 
					 AND start_date >= ? AND start_date <= ?`
				).bind(String(me.user_id), monthFirstDay, monthLastDay).first();
				
				const existingHours = Number(existingRow?.total_hours || 0);
				const totalHours = existingHours + amount;
				
				if (totalHours > 8) {
					errors.push({ 
						field:"amount", 
						message:`生理假每月限制1天（8小時）。本月已請 ${existingHours} 小時，無法再請 ${amount} 小時（總計 ${totalHours} 小時超過限制）` 
					});
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
			
			// ⚡ 失效该用户的请假列表和余额缓存（D1缓存）
			Promise.all([
				invalidateCacheByType(env, 'leaves_list', { userId: String(me.user_id) }),
				invalidateCacheByType(env, 'leaves_balances', { userId: String(me.user_id) })
			]).catch(err => console.error('[LEAVES] 失效缓存失败:', err));
			
			// ⚡ 失效緩存（D1 + KV）
			Promise.all([
				invalidateCacheByType(env, 'leaves_balances', { userId: String(user_id) }),
				deleteKVCacheByPrefix(env, 'leaves_')
			]).catch(()=>{});
			
			return jsonResponse(201, { ok:true, code:"CREATED", message:"申請成功", data:{ leaveId }, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	// 生活事件：列表
	if (path === "/internal/api/v1/leaves/life-events" && method === "GET") {
		try {
			const params = url.searchParams;
			const queryUserId = params.get('user_id');
			let targetUserId = String(me.user_id);
			if (queryUserId && me.is_admin) targetUserId = String(queryUserId);
			const rows = await env.DATABASE.prepare(
				`SELECT grant_id, event_type, event_date, leave_type, days_granted, days_used, days_remaining, valid_from, valid_until, status, notes, created_by, created_at
				 FROM LifeEventLeaveGrants
				 WHERE user_id = ? AND status != 'deleted'
				 ORDER BY created_at DESC, event_date DESC`
			).bind(targetUserId).all();
			const data = (rows?.results || []).map(r => ({
				id: String(r.grant_id),
				eventType: r.event_type,
				leaveType: r.leave_type,
				date: r.event_date,
				daysGranted: Number(r.days_granted || 0),
				daysRemaining: Number(r.days_remaining || 0),
				validFrom: r.valid_from,
				validUntil: r.valid_until,
				status: r.status,
				notes: r.notes || null,
				createdAt: r.created_at
			}));
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
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
			// 如果有指定target_month，使用指定月份；否則使用上個月
			const targetMonth = body?.target_month; // 格式: YYYY-MM
			let payrollMonth, expiryDate;
			
			if (targetMonth) {
				// 手動指定月份：處理該月底到期的補休，記入該月薪資
				const [year, month] = targetMonth.split('-');
				const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
				expiryDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
				payrollMonth = targetMonth;
				console.log(`[手動處理到期補休] 月份: ${targetMonth}, 到期日: ${expiryDate}`);
			} else {
				// 自動Cron：處理上月底到期的補休
				const now = new Date();
				const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
				const lastDayOfLastMonth = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0));
				expiryDate = `${lastDayOfLastMonth.getUTCFullYear()}-${String(lastDayOfLastMonth.getUTCMonth() + 1).padStart(2, '0')}-${String(lastDayOfLastMonth.getUTCDate()).padStart(2, '0')}`;
				payrollMonth = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;
			}
			
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
				payrollMonth,
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
				payrollMonth 
			})).run();
			
			return jsonResponse(200, { 
				ok:true, 
				code:"SUCCESS", 
				message:`已處理 ${processedCount} 筆到期補休`, 
				data:{ 
					processedCount, 
					expiryDate, 
					payrollMonth 
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
			
			// ⚡ 清除KV缓存
			await deleteKVCacheByPrefix(env, 'leaves_');
			
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



