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
	
	return jsonResponse(405, { 
		ok: false, 
		code: "METHOD_NOT_ALLOWED", 
		message: "方法不允許", 
		meta: { requestId } 
	}, corsHeaders);
}

