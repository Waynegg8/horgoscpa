/**
 * 員工管理 API 路由
 * 
 * 管理員專用：
 * GET    /api/v1/admin/users - 查詢員工列表
 * POST   /api/v1/admin/users - 新增員工
 * GET    /api/v1/admin/users/:id - 查詢員工詳情
 * PUT    /api/v1/admin/users/:id - 更新員工
 * DELETE /api/v1/admin/users/:id - 刪除員工
 * POST   /api/v1/admin/users/:id/reset-password - 重設密碼
 * 
 * 個人資料：
 * GET  /api/v1/profile - 獲取個人資料
 * PUT  /api/v1/profile - 更新個人資料
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { UserService } from '../services/UserService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const users = new Hono<{ Bindings: Env }>();

// =====================================================
// 管理員專用 - 員工管理
// =====================================================

/**
 * GET /api/v1/admin/users
 * 查詢員工列表（管理員專用）
 * 
 * @openapi
 * /admin/users:
 *   get:
 *     tags:
 *       - 員工管理
 *     summary: 查詢員工列表
 *     description: 查詢所有員工（僅管理員）
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *       - name: is_admin
 *         in: query
 *         description: 篩選管理員或員工
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 權限不足
 */
users.get('/admin/users', authMiddleware, requireAdmin, async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  const isAdminQuery = c.req.query('is_admin');
  
  const userService = new UserService(c.env.DB);
  
  const options: any = { limit, offset };
  if (isAdminQuery !== undefined) {
    options.is_admin = isAdminQuery === 'true';
  }
  
  const result = await userService.getUsers(options);
  
  return jsonResponse(
    c,
    successResponse(
      result.users,
      createPagination(result.total, limit, offset)
    ),
    200
  );
});

/**
 * POST /api/v1/admin/users
 * 新增員工（管理員專用）
 * ⭐ 規格要求：自動生成初始密碼，無需前端提供
 * 
 * @openapi
 * /admin/users:
 *   post:
 *     tags:
 *       - 員工管理
 *     summary: 新增員工
 *     description: 創建新員工帳號，系統自動生成初始密碼（僅管理員）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - name
 *               - email
 *               - gender
 *               - start_date
 *             properties:
 *               username:
 *                 type: string
 *                 example: "employee01"
 *               name:
 *                 type: string
 *                 example: "張員工"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "employee@example.com"
 *               is_admin:
 *                 type: boolean
 *                 default: false
 *               gender:
 *                 type: string
 *                 enum: [M, F]
 *                 example: "M"
 *               birth_date:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-01"
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-01"
 *               phone:
 *                 type: string
 *                 example: "0912-345-678"
 *               address:
 *                 type: string
 *                 example: "台北市信義區"
 *     responses:
 *       201:
 *         description: 創建成功（含自動生成的初始密碼）
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
 *                     initialPassword:
 *                       type: string
 *                       example: "aB3$xYz9Mn2!"
 *                       description: 自動生成的初始密碼，請妥善保管
 *       403:
 *         description: 權限不足
 *       409:
 *         description: 帳號或 Email 已存在
 *       422:
 *         description: 驗證錯誤
 */
users.post('/admin/users', authMiddleware, requireAdmin, async (c) => {
  const admin = c.get('user') as User;
  const userData = await c.req.json();
  
  const userService = new UserService(c.env.DB);
  const result = await userService.createUser(userData, admin.user_id);
  
  return jsonResponse(c, successResponse(result), 201);
});

/**
 * GET /api/v1/admin/users/:id
 * 查詢員工詳情（管理員專用）
 * 
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags:
 *       - 員工管理
 *     summary: 查詢員工詳情
 *     description: 查詢指定員工的詳細資訊（僅管理員）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 員工不存在
 */
users.get('/admin/users/:id', authMiddleware, requireAdmin, async (c) => {
  const userId = parseInt(c.req.param('id'));
  
  const userService = new UserService(c.env.DB);
  const user = await userService.getUserById(userId);
  
  return jsonResponse(c, successResponse(user), 200);
});

/**
 * PUT /api/v1/admin/users/:id
 * 更新員工資訊（管理員專用）
 * 
 * @openapi
 * /admin/users/{id}:
 *   put:
 *     tags:
 *       - 員工管理
 *     summary: 更新員工資訊
 *     description: 更新員工資料（僅管理員）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               gender:
 *                 type: string
 *                 enum: [M, F]
 *               birth_date:
 *                 type: string
 *                 format: date
 *               start_date:
 *                 type: string
 *                 format: date
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 員工不存在
 *       409:
 *         description: Email 已被使用
 *       422:
 *         description: 驗證錯誤
 */
users.put('/admin/users/:id', authMiddleware, requireAdmin, async (c) => {
  const admin = c.get('user') as User;
  const userId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const userService = new UserService(c.env.DB);
  const updatedUser = await userService.updateUser(userId, updates, admin.user_id);
  
  return jsonResponse(c, successResponse(updatedUser), 200);
});

/**
 * DELETE /api/v1/admin/users/:id
 * 刪除員工（管理員專用，軟刪除）
 * 
 * @openapi
 * /admin/users/{id}:
 *   delete:
 *     tags:
 *       - 員工管理
 *     summary: 刪除員工
 *     description: 軟刪除員工（僅管理員，不能刪除自己）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 刪除成功
 *       403:
 *         description: 權限不足或不能刪除自己
 *       404:
 *         description: 員工不存在
 */
users.delete('/admin/users/:id', authMiddleware, requireAdmin, async (c) => {
  const admin = c.get('user') as User;
  const userId = parseInt(c.req.param('id'));
  
  const userService = new UserService(c.env.DB);
  await userService.deleteUser(userId, admin.user_id);
  
  return jsonResponse(c, successResponse({ message: '員工已刪除' }), 200);
});

/**
 * POST /api/v1/admin/users/:id/reset-password
 * 重設員工密碼（管理員專用）
 * ⭐ 規格要求：L643-L663 - 自動生成新密碼
 * 
 * @openapi
 * /admin/users/{id}/reset-password:
 *   post:
 *     tags:
 *       - 員工管理
 *     summary: 重設員工密碼
 *     description: 管理員重設指定員工的密碼，系統自動生成新密碼（僅管理員）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 密碼重設成功（返回新密碼）
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
 *                     message:
 *                       type: string
 *                       example: "密碼已重設"
 *                     newPassword:
 *                       type: string
 *                       example: "xY9$mNz2Bb4!"
 *                       description: 新密碼，請妥善保管
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 員工不存在
 */
users.post('/admin/users/:id/reset-password', authMiddleware, requireAdmin, async (c) => {
  const admin = c.get('user') as User;
  const userId = parseInt(c.req.param('id'));
  
  const userService = new UserService(c.env.DB);
  const result = await userService.resetUserPassword(userId, admin.user_id);
  
  return jsonResponse(c, successResponse({ 
    message: '密碼已重設',
    newPassword: result.newPassword 
  }), 200);
});

// =====================================================
// 個人資料管理（所有員工）
// =====================================================

/**
 * GET /api/v1/profile
 * 獲取個人資料
 * 
 * @openapi
 * /profile:
 *   get:
 *     tags:
 *       - 個人資料
 *     summary: 獲取個人資料
 *     description: 獲取當前登入用戶的個人資料
 *     responses:
 *       200:
 *         description: 成功
 *       401:
 *         description: 未登入
 */
users.get('/profile', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  
  const userService = new UserService(c.env.DB);
  const profile = await userService.getProfile(user.user_id);
  
  return jsonResponse(c, successResponse(profile), 200);
});

/**
 * PUT /api/v1/profile
 * 更新個人資料
 * 
 * @openapi
 * /profile:
 *   put:
 *     tags:
 *       - 個人資料
 *     summary: 更新個人資料
 *     description: 更新當前登入用戶的個人資料（限制可修改欄位）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "0912-345-678"
 *               address:
 *                 type: string
 *                 example: "台北市信義區"
 *               emergency_contact_name:
 *                 type: string
 *                 example: "張三"
 *               emergency_contact_phone:
 *                 type: string
 *                 example: "0911-222-333"
 *     responses:
 *       200:
 *         description: 更新成功
 *       401:
 *         description: 未登入
 *       422:
 *         description: 驗證錯誤
 */
users.put('/profile', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const updates = await c.req.json();
  
  const userService = new UserService(c.env.DB);
  const updatedProfile = await userService.updateProfile(user.user_id, updates);
  
  return jsonResponse(c, successResponse(updatedProfile), 200);
});

export default users;

