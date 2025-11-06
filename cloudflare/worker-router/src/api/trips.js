import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { generateCacheKey, getCache, saveCache, invalidateCacheByType } from "../cache-helper.js";
import { getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../kv-cache-helper.js";

/**
 * 計算交通補貼（分）
 * 規則：每5公里60元
 */
function calculateTransportSubsidy(distanceKm) {
	if (!distanceKm || distanceKm <= 0) return 0;
	return Math.floor(distanceKm / 5) * 60 * 100; // 轉換為分
}

export async function handleTrips(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	// GET /internal/api/v1/trips - 取得外出登記列表
	if (path === "/internal/api/v1/trips" && method === "GET") {
		try {
			const params = url.searchParams;
			const userId = params.get("user_id");
			const clientId = params.get("client_id");
			const startDate = params.get("start_date");
			const endDate = params.get("end_date");
			const status = params.get("status");
			const month = params.get("month"); // YYYY-MM format
			
			// 一般用戶只能查看自己的記錄，管理員可以查看所有
			let targetUserId = me.is_admin && userId ? userId : String(me.user_id);
			
			// 構建查詢條件
			const conditions = ["is_deleted = 0"];
			const bindings = [];
			
			if (!me.is_admin || !userId) {
				conditions.push("user_id = ?");
				bindings.push(targetUserId);
			} else if (userId) {
				conditions.push("user_id = ?");
				bindings.push(userId);
			}
			
			if (clientId) {
				conditions.push("client_id = ?");
				bindings.push(clientId);
			}
			
			if (startDate) {
				conditions.push("trip_date >= ?");
				bindings.push(startDate);
			}
			
			if (endDate) {
				conditions.push("trip_date <= ?");
				bindings.push(endDate);
			}
			
			if (month) {
				conditions.push("strftime('%Y-%m', trip_date) = ?");
				bindings.push(month);
			}
			
			if (status) {
				conditions.push("status = ?");
				bindings.push(status);
			}
			
			const whereClause = conditions.join(" AND ");
			
			// ⚡ 嘗試從KV緩存讀取
			const cacheKey = generateCacheKey('trips_list', { 
				userId: targetUserId, 
				clientId, 
				startDate, 
				endDate, 
				month,
				status 
			});
			
			const kvCached = await getKVCache(env, cacheKey);
			if (kvCached && kvCached.data) {
				return jsonResponse(200, { 
					ok: true, 
					code: "OK", 
					message: "成功（KV緩存）⚡", 
					data: kvCached.data, 
					meta: { requestId, ...kvCached.meta, cache_source: 'kv' } 
				}, corsHeaders);
			}
			
			// 查詢數據
			const sql = `
				SELECT 
					t.trip_id,
					t.user_id,
					t.client_id,
					t.trip_date,
					t.destination,
					t.distance_km,
					t.purpose,
					t.transport_subsidy_cents,
					t.status,
					t.submitted_at,
					t.reviewed_at,
					t.reviewed_by,
					t.notes,
					u.name as user_name,
					c.name as client_name,
					r.name as reviewer_name
				FROM BusinessTrips t
				LEFT JOIN Users u ON t.user_id = u.user_id
				LEFT JOIN Clients c ON t.client_id = c.client_id
				LEFT JOIN Users r ON t.reviewed_by = r.user_id
				WHERE ${whereClause}
				ORDER BY t.trip_date DESC, t.submitted_at DESC
			`;
			
			const rows = await env.DATABASE.prepare(sql).bind(...bindings).all();
			
			const data = (rows?.results || []).map(r => ({
				trip_id: r.trip_id,
				user_id: r.user_id,
				user_name: r.user_name,
				client_id: r.client_id,
				client_name: r.client_name,
				trip_date: r.trip_date,
				destination: r.destination,
				distance_km: Number(r.distance_km),
				purpose: r.purpose,
				transport_subsidy_cents: r.transport_subsidy_cents,
				transport_subsidy_twd: r.transport_subsidy_cents / 100,
				status: r.status,
				submitted_at: r.submitted_at,
				reviewed_at: r.reviewed_at,
				reviewed_by: r.reviewed_by,
				reviewer_name: r.reviewer_name,
				notes: r.notes
			}));
			
			// 保存到緩存（30分鐘）
			await saveKVCache(env, cacheKey, 'trips_list', data, {
				userId: targetUserId,
				scopeParams: { userId: targetUserId, clientId, startDate, endDate, month, status },
				ttl: 1800
			});
			
			return jsonResponse(200, { 
				ok: true, 
				code: "OK", 
				message: "成功", 
				data, 
				meta: { requestId, count: data.length } 
			}, corsHeaders);
			
		} catch (err) {
			console.error("[TRIPS] List error:", err);
			return jsonResponse(500, { 
				ok: false, 
				code: "INTERNAL_ERROR", 
				message: "取得外出登記列表失敗", 
				meta: { requestId } 
			}, corsHeaders);
		}
	}

	// POST /internal/api/v1/trips - 新增外出登記
	if (path === "/internal/api/v1/trips" && method === "POST") {
		try {
			const body = await request.json();
			const { 
				client_id, 
				trip_date, 
				destination, 
				distance_km, 
				purpose, 
				notes 
			} = body;
			
			// 驗證必填欄位
			if (!trip_date || !destination || !distance_km) {
				return jsonResponse(400, { 
					ok: false, 
					code: "VALIDATION_ERROR", 
					message: "請填寫日期、目的地和距離", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			if (distance_km <= 0) {
				return jsonResponse(400, { 
					ok: false, 
					code: "VALIDATION_ERROR", 
					message: "距離必須大於0公里", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 計算交通補貼
			const transportSubsidy = calculateTransportSubsidy(distance_km);
			
			// 新增記錄（直接設為已核准）
			const result = await env.DATABASE.prepare(`
				INSERT INTO BusinessTrips (
					user_id, client_id, trip_date, destination, 
					distance_km, purpose, transport_subsidy_cents, 
					status, notes, submitted_at, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, datetime('now'), datetime('now'), datetime('now'))
			`).bind(
				me.user_id,
				client_id || null,
				trip_date,
				destination,
				distance_km,
				purpose || null,
				transportSubsidy,
				notes || null
			).run();
			
			// 清除相關緩存
			await deleteKVCacheByPrefix(env, 'trips_list');
			await invalidateCacheByType(env, 'trips_list');
			
			return jsonResponse(201, { 
				ok: true, 
				code: "CREATED", 
				message: "外出登記已新增", 
				data: { 
					trip_id: result.meta.last_row_id,
					transport_subsidy_twd: transportSubsidy / 100
				}, 
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error("[TRIPS] Create error:", err);
			return jsonResponse(500, { 
				ok: false, 
				code: "INTERNAL_ERROR", 
				message: "新增外出登記失敗", 
				meta: { requestId } 
			}, corsHeaders);
		}
	}

	// PATCH /internal/api/v1/trips/:id - 更新外出登記
	const updateMatch = path.match(/^\/internal\/api\/v1\/trips\/(\d+)$/);
	if (updateMatch && method === "PATCH") {
		try {
			const tripId = updateMatch[1];
			const body = await request.json();
			
			// 檢查記錄是否存在
			const existing = await env.DATABASE.prepare(
				"SELECT * FROM BusinessTrips WHERE trip_id = ? AND is_deleted = 0"
			).bind(tripId).first();
			
			if (!existing) {
				return jsonResponse(404, { 
					ok: false, 
					code: "NOT_FOUND", 
					message: "找不到此外出登記", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 一般用戶只能修改自己的記錄
			if (!me.is_admin && existing.user_id !== me.user_id) {
				return jsonResponse(403, { 
					ok: false, 
					code: "FORBIDDEN", 
					message: "無權限修改此記錄", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			const updates = [];
			const bindings = [];
			
			if (body.client_id !== undefined) {
				updates.push("client_id = ?");
				bindings.push(body.client_id || null);
			}
			
			if (body.trip_date) {
				updates.push("trip_date = ?");
				bindings.push(body.trip_date);
			}
			
			if (body.destination) {
				updates.push("destination = ?");
				bindings.push(body.destination);
			}
			
			if (body.distance_km !== undefined) {
				if (body.distance_km <= 0) {
					return jsonResponse(400, { 
						ok: false, 
						code: "VALIDATION_ERROR", 
						message: "距離必須大於0公里", 
						meta: { requestId } 
					}, corsHeaders);
				}
				updates.push("distance_km = ?");
				bindings.push(body.distance_km);
				
				// 重新計算交通補貼
				const newSubsidy = calculateTransportSubsidy(body.distance_km);
				updates.push("transport_subsidy_cents = ?");
				bindings.push(newSubsidy);
			}
			
			if (body.purpose !== undefined) {
				updates.push("purpose = ?");
				bindings.push(body.purpose || null);
			}
			
			if (body.notes !== undefined) {
				updates.push("notes = ?");
				bindings.push(body.notes || null);
			}
			
			// 管理員可以審核
			if (me.is_admin && body.status && ['approved', 'rejected'].includes(body.status)) {
				updates.push("status = ?");
				bindings.push(body.status);
				updates.push("reviewed_at = datetime('now')");
				updates.push("reviewed_by = ?");
				bindings.push(me.user_id);
			}
			
			if (updates.length === 0) {
				return jsonResponse(400, { 
					ok: false, 
					code: "VALIDATION_ERROR", 
					message: "沒有要更新的欄位", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			updates.push("updated_at = datetime('now')");
			bindings.push(tripId);
			
			await env.DATABASE.prepare(`
				UPDATE BusinessTrips 
				SET ${updates.join(", ")} 
				WHERE trip_id = ?
			`).bind(...bindings).run();
			
			// 清除相關緩存
			await deleteKVCacheByPrefix(env, 'trips_list');
			await invalidateCacheByType(env, 'trips_list');
			
			return jsonResponse(200, { 
				ok: true, 
				code: "OK", 
				message: "外出登記已更新", 
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error("[TRIPS] Update error:", err);
			return jsonResponse(500, { 
				ok: false, 
				code: "INTERNAL_ERROR", 
				message: "更新外出登記失敗", 
				meta: { requestId } 
			}, corsHeaders);
		}
	}

	// DELETE /internal/api/v1/trips/:id - 刪除外出登記
	const deleteMatch = path.match(/^\/internal\/api\/v1\/trips\/(\d+)$/);
	if (deleteMatch && method === "DELETE") {
		try {
			const tripId = deleteMatch[1];
			
			// 檢查記錄是否存在
			const existing = await env.DATABASE.prepare(
				"SELECT * FROM BusinessTrips WHERE trip_id = ? AND is_deleted = 0"
			).bind(tripId).first();
			
			if (!existing) {
				return jsonResponse(404, { 
					ok: false, 
					code: "NOT_FOUND", 
					message: "找不到此外出登記", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 一般用戶只能刪除自己的記錄
			if (!me.is_admin && existing.user_id !== me.user_id) {
				return jsonResponse(403, { 
					ok: false, 
					code: "FORBIDDEN", 
					message: "無權限刪除此記錄", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 軟刪除
			await env.DATABASE.prepare(
				"UPDATE BusinessTrips SET is_deleted = 1, updated_at = datetime('now') WHERE trip_id = ?"
			).bind(tripId).run();
			
			// 清除相關緩存
			await deleteKVCacheByPrefix(env, 'trips_list');
			await invalidateCacheByType(env, 'trips_list');
			
			return jsonResponse(200, { 
				ok: true, 
				code: "OK", 
				message: "外出登記已刪除", 
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error("[TRIPS] Delete error:", err);
			return jsonResponse(500, { 
				ok: false, 
				code: "INTERNAL_ERROR", 
				message: "刪除外出登記失敗", 
				meta: { requestId } 
			}, corsHeaders);
		}
	}

	// GET /internal/api/v1/trips/summary - 取得交通補貼統計
	if (path === "/internal/api/v1/trips/summary" && method === "GET") {
		try {
			const params = url.searchParams;
			const userId = params.get("user_id");
			const month = params.get("month"); // YYYY-MM format
			
			if (!month) {
				return jsonResponse(400, { 
					ok: false, 
					code: "VALIDATION_ERROR", 
					message: "請提供月份參數", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 一般用戶只能查看自己的統計，管理員可以查看所有
			let targetUserId = me.is_admin && userId ? userId : String(me.user_id);
			
			// ⚡ 嘗試從KV緩存讀取
			const cacheKey = generateCacheKey('trips_summary', { userId: targetUserId, month });
			const kvCached = await getKVCache(env, cacheKey);
			
			if (kvCached && kvCached.data) {
				return jsonResponse(200, { 
					ok: true, 
					code: "OK", 
					message: "成功（KV緩存）⚡", 
					data: kvCached.data, 
					meta: { requestId, ...kvCached.meta, cache_source: 'kv' } 
				}, corsHeaders);
			}
			
			// 查詢該月份的外出登記統計
			const result = await env.DATABASE.prepare(`
				SELECT 
					COUNT(*) as trip_count,
					SUM(distance_km) as total_distance,
					SUM(transport_subsidy_cents) as total_subsidy_cents
				FROM BusinessTrips
				WHERE user_id = ? 
					AND strftime('%Y-%m', trip_date) = ?
					AND is_deleted = 0
			`).bind(targetUserId, month).first();
			
			const data = {
				month,
				user_id: parseInt(targetUserId),
				trip_count: result?.trip_count || 0,
				total_distance_km: Number(result?.total_distance || 0),
				total_subsidy_cents: result?.total_subsidy_cents || 0,
				total_subsidy_twd: (result?.total_subsidy_cents || 0) / 100
			};
			
			// 保存到緩存（1小時）
			await saveKVCache(env, cacheKey, 'trips_summary', data, {
				userId: targetUserId,
				scopeParams: { userId: targetUserId, month },
				ttl: 3600
			});
			
			return jsonResponse(200, { 
				ok: true, 
				code: "OK", 
				message: "成功", 
				data, 
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error("[TRIPS] Summary error:", err);
			return jsonResponse(500, { 
				ok: false, 
				code: "INTERNAL_ERROR", 
				message: "取得統計失敗", 
				meta: { requestId } 
			}, corsHeaders);
		}
	}

	return jsonResponse(404, { 
		ok: false, 
		code: "NOT_FOUND", 
		message: "路徑不存在", 
		meta: { requestId } 
	}, corsHeaders);
}

