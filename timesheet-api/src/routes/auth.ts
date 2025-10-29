/**
 * 認證 API 路由
 * POST /api/v1/auth/login - 登入
 * POST /api/v1/auth/logout - 登出
 * GET  /api/v1/auth/me - 驗證當前會話
 * POST /api/v1/auth/change-password - 修改密碼
 */

import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { Env, User } from '../types';
import { AuthService } from '../services/AuthService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /api/v1/auth/login
 * 登入
 * 
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - 認證
 *     summary: 用戶登入
 *     description: 使用帳號密碼登入系統，返回 JWT Token（存於 HttpOnly Cookie）
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: 登入成功
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: token=eyJhbGc...; Path=/; HttpOnly; Secure; SameSite=Strict
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: "eyJhbGc..."
 *       401:
 *         description: 帳號或密碼錯誤
 *       403:
 *         description: 帳號已鎖定
 */
auth.post('/login', async (c) => {
  const { username, password } = await c.req.json();
  
  const authService = new AuthService(c.env.DB);
  
  // 獲取 IP 和 User-Agent
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP');
  const userAgent = c.req.header('User-Agent');
  
  const result = await authService.login(
    username,
    password,
    c.env.JWT_SECRET,
    ipAddress,
    userAgent
  );
  
  // 設置 HttpOnly Cookie
  const isSecure = c.env.COOKIE_SECURE === 'true';
  const domain = c.env.COOKIE_DOMAIN || undefined;
  
  setCookie(c, 'token', result.token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60, // 7 天
    path: '/',
    domain: domain,
  });
  
  return jsonResponse(c, successResponse(result), 200);
});

/**
 * POST /api/v1/auth/logout
 * 登出
 * 
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - 認證
 *     summary: 用戶登出
 *     description: 登出系統，清除 Cookie 中的 Token
 *     responses:
 *       200:
 *         description: 登出成功
 */
auth.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  
  const authService = new AuthService(c.env.DB);
  
  // 獲取 IP 和 User-Agent
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Real-IP');
  const userAgent = c.req.header('User-Agent');
  
  await authService.logout(user.user_id, ipAddress, userAgent);
  
  // 清除 Cookie
  deleteCookie(c, 'token', {
    path: '/',
    domain: c.env.COOKIE_DOMAIN || undefined,
  });
  
  return jsonResponse(c, successResponse({ message: '登出成功' }), 200);
});

/**
 * GET /api/v1/auth/me
 * 驗證當前會話
 * 
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - 認證
 *     summary: 驗證當前會話
 *     description: 驗證 Token 是否有效，返回當前登入用戶的資訊
 *     responses:
 *       200:
 *         description: Token 有效
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Token 無效或已過期
 */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  
  const authService = new AuthService(c.env.DB);
  const userData = await authService.verifySession(user.user_id);
  
  return jsonResponse(c, successResponse(userData), 200);
});

/**
 * POST /api/v1/auth/change-password
 * 修改密碼
 * 
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags:
 *       - 認證
 *     summary: 修改密碼
 *     description: 修改當前用戶的密碼（需提供舊密碼驗證）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 example: "oldpass123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "newpass456"
 *     responses:
 *       200:
 *         description: 密碼修改成功
 *       401:
 *         description: 舊密碼錯誤
 *       422:
 *         description: 驗證錯誤（如：新密碼太弱）
 */
auth.post('/change-password', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const { oldPassword, newPassword } = await c.req.json();
  
  const authService = new AuthService(c.env.DB);
  await authService.changePassword(user.user_id, oldPassword, newPassword);
  
  return jsonResponse(c, successResponse({ message: '密碼修改成功' }), 200);
});

export default auth;

