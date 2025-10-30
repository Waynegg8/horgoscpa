// 工具：JSON 回應（符合 Envelope）
export function jsonResponse(status, body, extraHeaders = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			...extraHeaders,
		},
	});
}

// 工具：生成 Request Id（簡易）
export function generateRequestId() {
	const random = crypto.getRandomValues(new Uint8Array(8));
	return (
		"req_" + Array.from(random).map((b) => b.toString(16).padStart(2, "0")).join("")
	);
}

// 工具：PBKDF2-SHA256 驗證（儲存格式：pbkdf2$<iterations>$<saltBase64>$<hashBase64>）
export async function verifyPasswordPBKDF2(password, stored) {
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

// 工具：PBKDF2-SHA256 產生雜湊（儲存格式：pbkdf2$<iterations>$<saltBase64>$<hashBase64>）
export async function hashPasswordPBKDF2(password, iterations = 100000, keyLen = 32) {
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

// 工具：隨機 Session Id（32 bytes base64）
export function generateSessionId() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return btoa(String.fromCharCode(...bytes)).replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

// CORS：允許特定來源（pages.dev 與主站），回傳標頭
export function getCorsHeadersForRequest(request, env) {
	const origin = request.headers.get("Origin") || "";
	if (!origin) return {};
	try {
		const o = new URL(origin);
		const host = o.hostname || "";
		if (host.endsWith(".pages.dev") || host.endsWith("horgoscpa.com")) {
			return {
				"Access-Control-Allow-Origin": origin,
				"Access-Control-Allow-Credentials": "true",
				"Vary": "Origin",
			};
		}
	} catch (_) {}
	return {};
}

export function corsPreflightResponse(request, env) {
	const headers = {
		...getCorsHeadersForRequest(request, env),
		"Access-Control-Allow-Methods": "GET,POST,OPTIONS",
		"Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Content-Type, X-Request-Id",
		"Access-Control-Max-Age": "600",
	};
	return new Response(null, { status: 204, headers });
}

// Cookie 讀取
export function getCookie(request, name) {
	const raw = request.headers.get("Cookie") || "";
	const parts = raw.split(";");
	for (const p of parts) {
		const [k, ...v] = p.trim().split("=");
		if (k === name) return v.join("=");
	}
	return null;
}

// 取得目前會話的使用者（若無或過期，回 null）
export async function getSessionUser(request, env) {
	const cookieName = String(env.SESSION_COOKIE_NAME || "session");
	const sessionId = getCookie(request, cookieName);
	if (!sessionId || !env.DATABASE) return null;
	const row = await env.DATABASE.prepare(
		"SELECT s.id as session_id, s.user_id, s.expires_at, u.username, u.name, u.email, u.is_admin FROM sessions s JOIN Users u ON u.user_id = s.user_id WHERE s.id = ? LIMIT 1"
	).bind(sessionId).first();
	if (!row) return null;
	const exp = Date.parse(row.expires_at);
	if (Number.isNaN(exp) || exp <= Date.now()) return null;
	return row;
}



