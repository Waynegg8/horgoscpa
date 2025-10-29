/**
 * 認證中間件
 */

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { Env, UnauthorizedError, ForbiddenError, User } from '../types';
import { verifyToken } from '../utils/crypto';

/**
 * 認證中間件（驗證 JWT Token）
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    // 從 Cookie 或 Authorization Header 獲取 token
    let token = getCookie(c, 'token');
    
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      throw new UnauthorizedError('請先登入');
    }
    
    // 驗證 token
    const payload = verifyToken(token, c.env.JWT_SECRET);
    
    // 從資料庫獲取用戶資訊
    const user = await c.env.DB.prepare(`
      SELECT 
        user_id, username, name, email, is_admin, gender, 
        start_date, phone, created_at
      FROM Users
      WHERE user_id = ? AND is_deleted = 0
    `).bind(payload.user_id).first<User>();
    
    if (!user) {
      throw new UnauthorizedError('用戶不存在或已被刪除');
    }
    
    // 將用戶資訊附加到 context
    c.set('user', user);
    c.set('token', token);
    
    await next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('認證失敗：' + (error as Error).message);
  }
}

/**
 * 管理員權限中間件
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as User | undefined;
  
  if (!user) {
    throw new UnauthorizedError('請先登入');
  }
  
  if (!user.is_admin) {
    throw new ForbiddenError('此功能僅限管理員使用');
  }
  
  await next();
}

/**
 * 可選認證中間件（Token 存在則驗證，不存在則跳過）
 */
export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    let token = getCookie(c, 'token');
    
    if (!token) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (token) {
      const payload = verifyToken(token, c.env.JWT_SECRET);
      const user = await c.env.DB.prepare(`
        SELECT 
          user_id, username, name, email, is_admin, gender, 
          start_date, phone, created_at
        FROM Users
        WHERE user_id = ? AND is_deleted = 0
      `).bind(payload.user_id).first<User>();
      
      if (user) {
        c.set('user', user);
        c.set('token', token);
      }
    }
  } catch (error) {
    // 忽略錯誤，繼續執行
  }
  
  await next();
}

