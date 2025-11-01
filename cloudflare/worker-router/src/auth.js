import { jsonResponse, getCorsHeadersForRequest, verifyPasswordPBKDF2, generateSessionId, getSessionUser } from "./utils.js";

export async function handleLogin(request, env, requestId) {
	if (request.method.toUpperCase() !== "POST") {
		return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "方法不允許", meta: { requestId } }, getCorsHeadersForRequest(request, env));
	}
	let payload;
	try {
		payload = await request.json();
	} catch (_) {
		return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } }, getCorsHeadersForRequest(request, env));
	}
	const username = (payload?.username || "").trim().toLowerCase();
	const password = payload?.password || "";
	const errors = [];
	if (!username) errors.push({ field: "username", message: "必填" });
	if (!password) errors.push({ field: "password", message: "必填" });
	if (errors.length > 0) {
		return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } }, getCorsHeadersForRequest(request, env));
	}

	if (!env.DATABASE) {
		return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "資料庫未綁定", meta: { requestId } }, getCorsHeadersForRequest(request, env));
	}

	try {
		// 讀取使用者
		const userRow = await env.DATABASE.prepare(
			"SELECT user_id, username, password_hash, name, email, is_admin, is_deleted FROM Users WHERE LOWER(username) = ? LIMIT 1"
		).bind(username).first();

		// 避免洩漏帳號存在與否
		const corsHeaders = getCorsHeadersForRequest(request, env);
		const unauthorized = () => jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "帳號或密碼錯誤", meta: { requestId } }, corsHeaders);

		if (!userRow || userRow.is_deleted === 1) {
			return unauthorized();
		}

		// 密碼驗證
		const hash = userRow.password_hash || "";
		const passOk = await verifyPasswordPBKDF2(password, hash);
		if (!passOk) {
			return unauthorized();
		}

		// 成功：更新 last_login
		await env.DATABASE.prepare(
			"UPDATE Users SET last_login = ? WHERE user_id = ?"
		).bind(new Date().toISOString(), userRow.user_id).run();

		// 建立會話
		const sessionId = generateSessionId();
		const ttlSec = parseInt(env.SESSION_TTL_SECONDS || "2592000", 10);
		const createdAt = new Date();
		const expiresAt = new Date(createdAt.getTime() + ttlSec * 1000);
		await env.DATABASE.prepare(
			"INSERT INTO sessions (id, user_id, created_at, expires_at, meta_json) VALUES (?, ?, ?, ?, ?)"
		).bind(sessionId, String(userRow.user_id), createdAt.toISOString(), expiresAt.toISOString(), JSON.stringify({ ua: request.headers.get("User-Agent") || "" })).run();

		// 設定 Cookie
		const cookieName = String(env.SESSION_COOKIE_NAME || "session");
		const cookie = [
			`${cookieName}=${sessionId}`,
			"Domain=horgoscpa.com",
			"Path=/",
			"HttpOnly",
			"Secure",
			"SameSite=Lax",
			`Max-Age=${ttlSec}`,
		].join("; ");

		const data = {
			userId: String(userRow.user_id),
			username: userRow.username,
			name: userRow.name,
			email: userRow.email,
			isAdmin: userRow.is_admin === 1,
		};
		return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta: { requestId } }, { "Set-Cookie": cookie, ...corsHeaders });
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "/internal/api/v1/auth/login", err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
	}
}

export async function handleAuthMe(request, env, requestId) {
	if (request.method.toUpperCase() !== "GET") {
		return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "方法不允許", meta: { requestId } }, getCorsHeadersForRequest(request, env));
	}
	try {
		const row = await getSessionUser(request, env);
		if (!row) {
			return jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "未登入", meta: { requestId } }, getCorsHeadersForRequest(request, env));
		}
		const data = {
			userId: String(row.user_id),
			username: row.username,
			name: row.name,
			email: row.email,
			isAdmin: row.is_admin === 1,
			gender: row.gender || 'M',
		};
		return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta: { requestId } }, getCorsHeadersForRequest(request, env));
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "/internal/api/v1/auth/me", err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
	}
}

export async function handleLogout(request, env, requestId) {
	if (request.method.toUpperCase() !== "POST") {
		return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "方法不允許", meta: { requestId } }, getCorsHeadersForRequest(request, env));
	}
	try {
		// 取得當前 session
		const cookieName = String(env.SESSION_COOKIE_NAME || "session");
		const cookie = request.headers.get("Cookie") || "";
		const sessionId = cookie.split(";").map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.split("=")[1];

		// 若有 session，從資料庫中刪除
		if (sessionId && env.DATABASE) {
			await env.DATABASE.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
		}

		// 清除 Cookie
		const clearCookie = [
			`${cookieName}=`,
			"Domain=horgoscpa.com",
			"Path=/",
			"HttpOnly",
			"Secure",
			"SameSite=Lax",
			"Max-Age=0",
		].join("; ");

		const corsHeaders = getCorsHeadersForRequest(request, env);
		return jsonResponse(200, { ok: true, code: "OK", message: "已登出", meta: { requestId } }, { "Set-Cookie": clearCookie, ...corsHeaders });
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: "/internal/api/v1/auth/logout", err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
	}
}



