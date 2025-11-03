import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { generateCacheKey, getCache, saveCache } from "../cache-helper.js";
import { getKVCache, saveKVCache } from "../kv-cache-helper.js";

/**
 * 計算誤餐費
 * 規則：平日加班超過1.5小時則給90元
 * 
 * @param {Object} env - Cloudflare環境
 * @param {number} userId - 用戶ID
 * @param {string} month - 月份 (YYYY-MM)
 * @returns {Promise<{days: number, amount_cents: number}>}
 */
export async function calculateMealAllowance(env, userId, month) {
	// 獲取該月的第一天和最後一天
	const [year, monthNum] = month.split('-');
	const startDate = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
	
	// 查詢該月所有平日加班記錄（ot-weekday）
	// 按日期分組，計算每天的加班總時數
	const rows = await env.DATABASE.prepare(`
		SELECT 
			work_date,
			SUM(hours) as total_ot_hours
		FROM Timesheets
		WHERE user_id = ?
			AND work_date >= ?
			AND work_date <= ?
			AND work_type = 'ot-weekday'
			AND is_deleted = 0
		GROUP BY work_date
		HAVING total_ot_hours > 1.5
	`).bind(userId, startDate, endDate).all();
	
	const qualifiedDays = rows?.results?.length || 0;
	const amountCents = qualifiedDays * 90 * 100; // 90元 × 符合天數，轉換為分
	
	return {
		days: qualifiedDays,
		amount_cents: amountCents,
		amount_twd: qualifiedDays * 90
	};
}

export async function handleMealAllowance(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	// GET /internal/api/v1/meal-allowance/summary - 取得誤餐費統計
	if (path === "/internal/api/v1/meal-allowance/summary" && method === "GET") {
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
			
			// 驗證月份格式
			if (!/^\d{4}-\d{2}$/.test(month)) {
				return jsonResponse(400, { 
					ok: false, 
					code: "VALIDATION_ERROR", 
					message: "月份格式錯誤，應為 YYYY-MM", 
					meta: { requestId } 
				}, corsHeaders);
			}
			
			// 一般用戶只能查看自己的統計，管理員可以查看所有
			let targetUserId = me.is_admin && userId ? userId : String(me.user_id);
			
			// ⚡ 嘗試從KV緩存讀取
			const cacheKey = generateCacheKey('meal_allowance_summary', { userId: targetUserId, month });
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
			
			// 計算誤餐費
			const result = await calculateMealAllowance(env, targetUserId, month);
			
			const data = {
				month,
				user_id: parseInt(targetUserId),
				qualified_days: result.days,
				meal_allowance_cents: result.amount_cents,
				meal_allowance_twd: result.amount_twd
			};
			
			// 保存到緩存（1小時）
			await saveKVCache(env, cacheKey, 'meal_allowance_summary', data, {
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
			console.error("[MEAL_ALLOWANCE] Summary error:", err);
			return jsonResponse(500, { 
				ok: false, 
				code: "INTERNAL_ERROR", 
				message: "取得統計失敗", 
				meta: { requestId } 
			}, corsHeaders);
		}
	}

	// GET /internal/api/v1/meal-allowance/details - 取得詳細記錄
	if (path === "/internal/api/v1/meal-allowance/details" && method === "GET") {
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
			
			// 一般用戶只能查看自己的記錄，管理員可以查看所有
			let targetUserId = me.is_admin && userId ? userId : String(me.user_id);
			
			// 獲取該月的第一天和最後一天
			const [year, monthNum] = month.split('-');
			const startDate = `${year}-${monthNum}-01`;
			const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
			const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
			
			// 查詢該月所有平日加班記錄，按日期分組
			const rows = await env.DATABASE.prepare(`
				SELECT 
					work_date,
					SUM(hours) as total_ot_hours,
					GROUP_CONCAT(client_id || ':' || COALESCE(service_name, '') || ':' || hours, '; ') as work_details
				FROM Timesheets
				WHERE user_id = ?
					AND work_date >= ?
					AND work_date <= ?
					AND work_type = 'ot-weekday'
					AND is_deleted = 0
				GROUP BY work_date
				ORDER BY work_date
			`).bind(targetUserId, startDate, endDate).all();
			
			const details = (rows?.results || []).map(r => {
				const totalHours = Number(r.total_ot_hours || 0);
				const qualifies = totalHours > 1.5;
				
				return {
					date: r.work_date,
					total_ot_hours: totalHours,
					qualifies_for_allowance: qualifies,
					allowance_amount: qualifies ? 90 : 0,
					work_summary: r.work_details || ''
				};
			});
			
			const qualifiedCount = details.filter(d => d.qualifies_for_allowance).length;
			const totalAmount = qualifiedCount * 90;
			
			const data = {
				month,
				user_id: parseInt(targetUserId),
				details,
				summary: {
					total_days_with_ot: details.length,
					qualified_days: qualifiedCount,
					total_allowance: totalAmount
				}
			};
			
			return jsonResponse(200, { 
				ok: true, 
				code: "OK", 
				message: "成功", 
				data, 
				meta: { requestId } 
			}, corsHeaders);
			
		} catch (err) {
			console.error("[MEAL_ALLOWANCE] Details error:", err);
			return jsonResponse(500, { 
				ok: false, 
				code: "INTERNAL_ERROR", 
				message: "取得詳細記錄失敗", 
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

