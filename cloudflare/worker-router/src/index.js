// 工具：JSON 回應（符合 Envelope）
function jsonResponse(status, body, extraHeaders = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...extraHeaders,
		},
	});
}

// 工具：生成 Request Id（簡易）
function generateRequestId() {
	const random = crypto.getRandomValues(new Uint8Array(8));
	return (
		"req_" + Array.from(random).map((b) => b.toString(16).padStart(2, "0")).join("")
	);
}

// 工具：PBKDF2-SHA256 驗證（儲存格式：pbkdf2$<iterations>$<saltBase64>$<hashBase64>）
async function verifyPasswordPBKDF2(password, stored) {
	if (!stored || typeof stored !== "string") return false;
	const parts = stored.split("$");
	if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
	const iterations = parseInt(parts[1], 10);
	// Cloudflare Workers 限制：迭代上限較低；放寬下限至 100k
	if (!Number.isFinite(iterations) || iterations < 100000) return false;
	const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
	const expected = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));

	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"]
	);
	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			hash: "SHA-256",
			salt,
			iterations,
		},
		keyMaterial,
		expected.byteLength * 8
	);
	const derived = new Uint8Array(derivedBits);
	if (derived.byteLength !== expected.byteLength) return false;
	let diff = 0;
	for (let i = 0; i < derived.byteLength; i++) diff |= derived[i] ^ expected[i];
	return diff === 0;
}

// 工具：隨機 Session Id（32 bytes base64）
function generateSessionId() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return btoa(String.fromCharCode(...bytes)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

// 工具：PBKDF2-SHA256 產生雜湊（儲存格式：pbkdf2$<iterations>$<saltBase64>$<hashBase64>）
async function hashPasswordPBKDF2(password, iterations = 100000, keyLen = 32) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		enc.encode(password),
		{ name: "PBKDF2" },
		false,
		["deriveBits"]
	);
	const derivedBits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt, iterations },
		keyMaterial,
		keyLen * 8
	);
	const derived = new Uint8Array(derivedBits);
	const b64 = (u8) => btoa(String.fromCharCode(...u8));
	return `pbkdf2${"$"}${iterations}${"$"}${b64(salt)}${"$"}${b64(derived)}`;
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method.toUpperCase();
		const requestId = request.headers.get("X-Request-Id") || generateRequestId();

		const proxy = (host, newPath) => {
			const target = new URL(request.url);
			target.protocol = "https:";
			target.hostname = host;
			target.pathname = newPath;
			return fetch(new Request(target.toString(), request));
		};

		// 登入 API（本 Worker 直處理）：/internal/api/v1/auth/login
		if (path === "/internal/api/v1/auth/login") {
			if (method !== "POST") {
				return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "方法不允許", meta: { requestId } });
			}
			let payload;
			try {
				payload = await request.json();
			} catch (_) {
				return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } });
			}
			const username = (payload?.username || "").trim().toLowerCase();
			const password = payload?.password || "";
			const errors = [];
			if (!username) errors.push({ field: "username", message: "必填" });
			if (!password) errors.push({ field: "password", message: "必填" });
			if (errors.length > 0) {
				return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "輸入有誤", errors, meta: { requestId } });
			}

			if (!env.DATABASE) {
				return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "資料庫未綁定", meta: { requestId } });
			}

			try {
				// 讀取使用者
				const userRow = await env.DATABASE.prepare(
					"SELECT user_id, username, password_hash, name, email, is_admin, login_attempts, last_failed_login, is_deleted FROM Users WHERE LOWER(username) = ? LIMIT 1"
				).bind(username).first();

				// 避免洩漏帳號存在與否
				const unauthorized = () => jsonResponse(401, { ok: false, code: "UNAUTHORIZED", message: "帳號或密碼錯誤", meta: { requestId } });

				if (!userRow || userRow.is_deleted === 1) {
					return unauthorized();
				}

				// 鎖定檢查（連續失敗 >=5 且 15 分鐘內）
				const attempts = Number(userRow.login_attempts || 0);
				if (attempts >= 5 && userRow.last_failed_login) {
					const lastFailedAt = Date.parse(userRow.last_failed_login);
					if (!Number.isNaN(lastFailedAt)) {
						const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
						if (lastFailedAt > fifteenMinAgo) {
							return jsonResponse(401, { ok: false, code: "ACCOUNT_LOCKED", message: "嘗試過多，稍後再試", meta: { requestId } });
						}
					}
				}

				// 密碼驗證
				const hash = userRow.password_hash || "";
				const passOk = await verifyPasswordPBKDF2(password, hash);
				if (!passOk) {
					await env.DATABASE.prepare(
						"UPDATE Users SET login_attempts = COALESCE(login_attempts,0) + 1, last_failed_login = ? WHERE user_id = ?"
					).bind(new Date().toISOString(), userRow.user_id).run();
					return unauthorized();
				}

				// 成功：重置嘗試次數、更新 last_login
				await env.DATABASE.prepare(
					"UPDATE Users SET login_attempts = 0, last_login = ? WHERE user_id = ?"
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
				return jsonResponse(200, { ok: true, code: "OK", message: "成功", data, meta: { requestId } }, { "Set-Cookie": cookie });
			} catch (err) {
				console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
				const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
				if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
				return jsonResponse(500, body);
			}
		}

			// DEV 專用：建立測試用戶（僅非 prod 環境可用）
			if (path === "/internal/api/v1/admin/dev-seed-user") {
				if (env.APP_ENV === "prod") {
					return jsonResponse(404, { ok: false, code: "NOT_FOUND", message: "不存在", meta: { requestId } });
				}
				if (method !== "POST") {
					return jsonResponse(405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "方法不允許", meta: { requestId } });
				}
				let body;
				try {
					body = await request.json();
				} catch (_) {
					return jsonResponse(400, { ok: false, code: "BAD_REQUEST", message: "請求格式錯誤", meta: { requestId } });
				}
				const username = (body?.username || "").trim().toLowerCase();
				const name = (body?.name || "測試用戶").trim();
				const password = body?.password || "changeme";
				let email = (body?.email || "").trim();
				if (!username || !password) {
					return jsonResponse(422, { ok: false, code: "VALIDATION_ERROR", message: "username/password 必填", meta: { requestId } });
				}
				if (!env.DATABASE) {
					return jsonResponse(500, { ok: false, code: "INTERNAL_ERROR", message: "資料庫未綁定", meta: { requestId } });
				}
				try {
					const exists = await env.DATABASE.prepare(
						"SELECT user_id FROM Users WHERE LOWER(username) = ? LIMIT 1"
					).bind(username).first();
					if (!email) email = `${username}@example.com`;
					const passwordHash = await hashPasswordPBKDF2(password);
					if (exists) {
						await env.DATABASE.prepare(
							"UPDATE Users SET username = ?, name = ?, email = ?, password_hash = ?, updated_at = ? WHERE user_id = ?"
						).bind(username, name, email, passwordHash, new Date().toISOString(), exists.user_id).run();
					} else {
						await env.DATABASE.prepare(
							"INSERT INTO Users (username, password_hash, name, email, gender, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, 'M', date('now'), datetime('now'), datetime('now'))"
						).bind(username, passwordHash, name, email).run();
					}
					return jsonResponse(200, { ok: true, code: "OK", message: "已建立/更新測試用戶", data: { username, email }, meta: { requestId } });
				} catch (err) {
					console.error(JSON.stringify({ level: "error", requestId, path, err: String(err) }));
					const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
					if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
					return jsonResponse(500, body);
				}
			}

		// API 代理：/internal/api/* → <INTERNAL_API_HOST>/api/*
		if (path.startsWith("/internal/api/")) {
			return proxy(env.INTERNAL_API_HOST, path.replace("/internal", ""));
		}

		// 登入頁：/login → <INTERNAL_BASE_HOST>/login
		if (path === "/login" || path.startsWith("/login/")) {
			return proxy(env.INTERNAL_BASE_HOST, "/login");
		}

		// 其他內部頁面：/internal/* → <INTERNAL_BASE_HOST>/*
		if (path.startsWith("/internal/")) {
			return proxy(env.INTERNAL_BASE_HOST, path.replace("/internal", ""));
		}

		// 未匹配路徑（理論上不會因為 routes 只綁定特定路徑）
		return fetch(request);
	},
};
