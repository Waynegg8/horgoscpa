import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

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
				date: r.holiday_date,
				name: r.name || "",
				is_national_holiday: Boolean(r.is_national_holiday),
				is_weekly_restday: Boolean(r.is_weekly_restday),
				is_makeup_workday: Boolean(r.is_makeup_workday),
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
	
	return jsonResponse(405, { 
		ok: false, 
		code: "METHOD_NOT_ALLOWED", 
		message: "方法不允許", 
		meta: { requestId } 
	}, corsHeaders);
}

