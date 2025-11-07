import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { generateCacheKey, getCache, saveCache } from "../cache-helper.js";
import { getKVCache, saveKVCache } from "../kv-cache-helper.js";

/**
 * GET /api/v1/holidays - 查詢假日資料
 */
export async function handleHolidays(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	if (method === "GET") {
		try {
			const params = url.searchParams;
			const startDate = (params.get("start_date") || "").trim();
			const endDate = (params.get("end_date") || "").trim();
			
			// ⚡ 优先尝试从KV缓存读取（极快<50ms）
			const cacheKey = generateCacheKey('holidays_all', { start: startDate, end: endDate });
			const kvCached = await getKVCache(env, cacheKey);
			
			if (kvCached && kvCached.data) {
				return jsonResponse(200, { 
					ok: true, 
					code: "SUCCESS", 
					message: "查詢成功（KV缓存）⚡", 
					data: kvCached.data, 
					meta: { requestId, ...kvCached.meta, cache_source: 'kv' } 
				}, corsHeaders);
			}
			
			// ⚡ KV未命中，尝试D1缓存（备份）
			const d1Cached = await getCache(env, cacheKey);
			if (d1Cached && d1Cached.data) {
				// 异步同步到KV
				saveKVCache(env, cacheKey, 'holidays_all', d1Cached.data, {
					scopeParams: { start: startDate, end: endDate },
					ttl: 3600
				}).catch(err => console.error('[HOLIDAYS] KV同步失败:', err));
				
				return jsonResponse(200, { 
					ok: true, 
					code: "SUCCESS", 
					message: "查詢成功（D1缓存）", 
					data: d1Cached.data, 
					meta: { requestId, ...d1Cached.meta, cache_source: 'd1' } 
				}, corsHeaders);
			}
			
			const where = [];
			const binds = [];
			
			// 日期範圍篩選
			if (startDate) {
				where.push("holiday_date >= ?");
				binds.push(startDate);
			}
			if (endDate) {
				where.push("holiday_date <= ?");
				binds.push(endDate);
			}
			
			const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
			
			const rows = await env.DATABASE.prepare(
				`SELECT holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday
				 FROM Holidays
				 ${whereSql}
				 ORDER BY holiday_date ASC`
			).bind(...binds).all();
			
		const data = (rows?.results || []).map(r => ({
			holiday_date: r.holiday_date, // 前端期望的欄位名稱
			date: r.holiday_date,         // 向後兼容
			name: r.name || "",
			is_national_holiday: Boolean(r.is_national_holiday),
			is_weekly_restday: Boolean(r.is_weekly_restday),
			is_makeup_workday: Boolean(r.is_makeup_workday),
		}));
			
			// ⚡ 并行保存到KV（极快）和D1（备份）
			try {
				await Promise.all([
					saveKVCache(env, cacheKey, 'holidays_all', data, {
						scopeParams: { start: startDate, end: endDate },
						ttl: 3600 // 1小时
					}),
					saveCache(env, cacheKey, 'holidays_all', data, {
						scopeParams: { start: startDate, end: endDate }
					})
				]);
				console.log('[HOLIDAYS] ✓ 假日数据缓存已保存（KV+D1）');
			} catch (err) {
				console.error('[HOLIDAYS] ✗ 缓存保存失败:', err);
			}
			
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
	
	if (method === "POST") {
		// 新增假日（支持單筆和批量）
		try {
			const body = await request.json();
			
			// 檢查是否為批量導入
			if (Array.isArray(body)) {
				// 批量導入
				let successCount = 0;
				let failCount = 0;
				const errors = [];
				
				for (const holiday of body) {
					const { holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday } = holiday;
					
					if (!holiday_date || !name) {
						failCount++;
						errors.push(`日期 ${holiday_date || '未知'} 缺少必填欄位`);
						continue;
					}
					
					try {
						await env.DATABASE.prepare(
							`INSERT OR REPLACE INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday)
							 VALUES (?, ?, ?, ?, ?)`
						).bind(
							holiday_date,
							name,
							is_national_holiday ? 1 : 0,
							is_weekly_restday ? 1 : 0,
							is_makeup_workday ? 1 : 0
						).run();
						successCount++;
					} catch (err) {
						failCount++;
						errors.push(`日期 ${holiday_date}: ${String(err)}`);
					}
				}
				
				// 清除緩存
				await env.DATABASE.prepare(
					`DELETE FROM UniversalCache WHERE cache_category = 'holidays_all'`
				).run();
				
				return jsonResponse(200, {
					ok: true,
					code: "SUCCESS",
					message: `批量導入完成：成功 ${successCount} 筆，失敗 ${failCount} 筆`,
					data: { successCount, failCount, errors: errors.slice(0, 10) }, // 只返回前10個錯誤
					meta: { requestId }
				}, corsHeaders);
			} else {
				// 單筆新增
				const { holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday } = body;
				
				if (!holiday_date || !name) {
					return jsonResponse(400, {
						ok: false,
						code: "VALIDATION_ERROR",
						message: "日期和名稱為必填項",
						meta: { requestId }
					}, corsHeaders);
				}
				
				await env.DATABASE.prepare(
					`INSERT INTO Holidays (holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday)
					 VALUES (?, ?, ?, ?, ?)`
				).bind(
					holiday_date,
					name,
					is_national_holiday ? 1 : 0,
					is_weekly_restday ? 1 : 0,
					is_makeup_workday ? 1 : 0
				).run();
				
				// 清除緩存
				await env.DATABASE.prepare(
					`DELETE FROM UniversalCache WHERE cache_category = 'holidays_all'`
				).run();
				
				return jsonResponse(201, {
					ok: true,
					code: "SUCCESS",
					message: "新增成功",
					meta: { requestId }
				}, corsHeaders);
			}
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "新增失敗", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	if (method === "PUT") {
		// 更新假日
		try {
			const body = await request.json();
			const { holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday } = body;
			
			if (!holiday_date || !name) {
				return jsonResponse(400, {
					ok: false,
					code: "VALIDATION_ERROR",
					message: "日期和名稱為必填項",
					meta: { requestId }
				}, corsHeaders);
			}
			
			await env.DATABASE.prepare(
				`UPDATE Holidays 
				 SET name = ?, is_national_holiday = ?, is_weekly_restday = ?, is_makeup_workday = ?, updated_at = datetime('now')
				 WHERE holiday_date = ?`
			).bind(
				name,
				is_national_holiday ? 1 : 0,
				is_weekly_restday ? 1 : 0,
				is_makeup_workday ? 1 : 0,
				holiday_date
			).run();
			
			// 清除緩存
			await env.DATABASE.prepare(
				`DELETE FROM UniversalCache WHERE cache_category = 'holidays_all'`
			).run();
			
			return jsonResponse(200, {
				ok: true,
				code: "SUCCESS",
				message: "更新成功",
				meta: { requestId }
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "更新失敗", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	if (method === "DELETE") {
		// 刪除假日
		try {
			const params = url.searchParams;
			const holiday_date = params.get("holiday_date");
			
			if (!holiday_date) {
				return jsonResponse(400, {
					ok: false,
					code: "VALIDATION_ERROR",
					message: "日期為必填項",
					meta: { requestId }
				}, corsHeaders);
			}
			
			await env.DATABASE.prepare(
				`DELETE FROM Holidays WHERE holiday_date = ?`
			).bind(holiday_date).run();
			
			// 清除緩存
			await env.DATABASE.prepare(
				`DELETE FROM UniversalCache WHERE cache_category = 'holidays_all'`
			).run();
			
			return jsonResponse(200, {
				ok: true,
				code: "SUCCESS",
				message: "刪除成功",
				meta: { requestId }
			}, corsHeaders);
			
		} catch (err) {
			console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
			const body = { ok: false, code: "INTERNAL_ERROR", message: "刪除失敗", meta: { requestId } };
			if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
			return jsonResponse(500, body, corsHeaders);
		}
	}
	
	return jsonResponse(405, { 
		ok: false, 
		code: "METHOD_NOT_ALLOWED", 
		message: "方法不允許", 
		meta: { requestId } 
	}, corsHeaders);
}

