// =================================================================
// 認證相關函數
// =================================================================

// 使用 Web Crypto API 進行密碼雜湊
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 驗證密碼
async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// 生成隨機 session token
function generateSessionToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// 從請求取得 session token
function getSessionToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 也支援從 cookie 讀取
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/session_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// 驗證 session 並取得使用者資訊
async function verifySession(db, sessionToken) {
  if (!sessionToken) {
    return null;
  }
  
  const result = await db.prepare(`
    SELECT u.id, u.username, u.role, u.employee_name, u.is_active
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.session_token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
  `).bind(sessionToken).first();
  
  return result;
}

// 創建新 session
async function createSession(db, userId) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 天後過期
  
  await db.prepare(`
    INSERT INTO sessions (session_token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionToken, userId, expiresAt.toISOString()).run();
  
  return sessionToken;
}

// 刪除 session (登出)
async function deleteSession(db, sessionToken) {
  await db.prepare(`
    DELETE FROM sessions WHERE session_token = ?
  `).bind(sessionToken).run();
}

// 清理過期 sessions
async function cleanupExpiredSessions(db) {
  await db.prepare(`
    DELETE FROM sessions WHERE expires_at < datetime('now')
  `).run();
}

// 檢查使用者是否有權限存取特定員工的資料
function canAccessEmployee(user, employeeName) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.employee_name === employeeName;
}

// 需要登入的中介函數
async function requireAuth(db, request) {
  const sessionToken = getSessionToken(request);
  const user = await verifySession(db, sessionToken);
  
  if (!user) {
    return { authorized: false, user: null, error: '未授權，請先登入' };
  }
  
  return { authorized: true, user, error: null };
}

// 需要管理員權限的中介函數
async function requireAdmin(db, request) {
  const auth = await requireAuth(db, request);
  
  if (!auth.authorized) {
    return auth;
  }
  
  if (auth.user.role !== 'admin') {
    return { authorized: false, user: auth.user, error: '需要管理員權限' };
  }
  
  return auth;
}

export {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  getSessionToken,
  verifySession,
  createSession,
  deleteSession,
  cleanupExpiredSessions,
  canAccessEmployee,
  requireAuth,
  requireAdmin
};

