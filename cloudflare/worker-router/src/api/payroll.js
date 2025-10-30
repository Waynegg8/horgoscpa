import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handlePayroll(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	// 薪資功能尚未實作
	return jsonResponse(501, { 
		ok: false, 
		code: "NOT_IMPLEMENTED", 
		message: "薪資功能尚未實作", 
		meta: { requestId } 
	}, corsHeaders);
}

