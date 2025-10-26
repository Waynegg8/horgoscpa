// =================================================================
// 認證相關函數
// =================================================================

// Helper function to create JSON responses
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

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
    SELECT 
      u.id, 
      u.username, 
      u.role, 
      u.is_active,
      u.employee_id,
      e.name as employee_name
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN employees e ON u.employee_id = e.id
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

// ================================================================
// Handler functions (moved from index.js)
// ================================================================

async function handleLogin(db, request) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return jsonResponse({ error: '請提供使用者名稱和密碼' }, 400);
    }
    // 更新查詢以符合新的數據庫結構（使用 JOIN 獲取員工名稱）
    const user = await db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.password_hash, 
        u.role, 
        u.is_active,
        u.employee_id,
        e.name as employee_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.username = ? AND u.is_active = 1
    `).bind(username).first();
    if (!user) {
      return jsonResponse({ error: '使用者名稱或密碼錯誤' }, 401);
    }
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: '使用者名稱或密碼錯誤' }, 401);
    }
    const sessionToken = await createSession(db, user.id);
    return jsonResponse({
      success: true,
      session_token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_name: user.employee_name || user.username
      }
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleLogout(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    if (sessionToken) {
      await deleteSession(db, sessionToken);
    }
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleVerifySession(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    const user = await verifySession(db, sessionToken);
    if (!user) {
      return jsonResponse({ error: '用戶不存在' }, 401);
    }
    return jsonResponse({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_name: user.employee_name
      }
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleChangePassword(db, request) {
  try {
    const auth = await requireAuth(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 401);
    }
    const body = await request.json();
    const oldPassword = body.old_password || body.currentPassword;
    const newPassword = body.new_password || body.newPassword;
    if (!oldPassword || !newPassword) {
      return jsonResponse({ error: '請提供目前密碼和新密碼' }, 400);
    }
    if (newPassword.length < 6) {
      return jsonResponse({ error: '新密碼至少需要6個字元' }, 400);
    }
    const user = await db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).bind(auth.user.id).first();
    if (!user) {
      return jsonResponse({ error: '使用者不存在' }, 404);
    }
    const isValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: '舊密碼錯誤' }, 401);
    }
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newHash, auth.user.id).run();
    return jsonResponse({ success: true, message: '密碼已成功更新' });
  } catch (err) {
    return jsonResponse({ error: err.message || '密碼更新失敗' }, 500);
  }
}

async function handleAdminResetPassword(db, request, username) {
  try {
    const auth = await requireAdmin(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 403);
    }
    const body = await request.json();
    const newPassword = body.new_password || body.newPassword;
    if (!newPassword) {
      return jsonResponse({ error: '請提供新密碼' }, 400);
    }
    if (newPassword.length < 6) {
      return jsonResponse({ error: '新密碼至少需要6個字元' }, 400);
    }
    const user = await db.prepare(`
      SELECT id FROM users WHERE username = ?
    `).bind(username).first();
    if (!user) {
      return jsonResponse({ error: '使用者不存在' }, 404);
    }
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?
    `).bind(newHash, username).run();
    return jsonResponse({ success: true, message: `已重設 ${username} 的密碼` });
  } catch (err) {
    return jsonResponse({ error: err.message || '密碼重設失敗' }, 500);
  }
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
  requireAdmin,
  handleLogin,
  handleLogout,
  handleVerifySession,
  handleChangePassword,
  handleAdminResetPassword
};

