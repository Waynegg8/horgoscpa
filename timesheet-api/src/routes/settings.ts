/**
 * 系統設定 API 路由
 * 
 * 管理員專用：
 * GET  /api/v1/admin/settings - 獲取所有設定
 * PUT  /api/v1/admin/settings/:key - 更新設定值
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { SettingService } from '../services/SettingService';
import { successResponse, jsonResponse } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const settings = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/admin/settings
 * 獲取所有系統設定（管理員專用）
 * 
 * @openapi
 * /admin/settings:
 *   get:
 *     tags:
 *       - 系統設定
 *     summary: 獲取所有系統設定
 *     description: 獲取所有系統參數（僅管理員）
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       setting_key:
 *                         type: string
 *                         example: "comp_leave_expiry_rule"
 *                       setting_value:
 *                         type: string
 *                         example: "current_month"
 *                       description:
 *                         type: string
 *                         example: "補休有效期規則"
 *                       is_dangerous:
 *                         type: boolean
 *                         example: true
 *                       is_readonly:
 *                         type: boolean
 *                         example: false
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       403:
 *         description: 權限不足
 */
settings.get('/admin/settings', authMiddleware, requireAdmin, async (c) => {
  const settingService = new SettingService(c.env.DB);
  const allSettings = await settingService.getAllSettings();
  
  return jsonResponse(c, successResponse(allSettings), 200);
});

/**
 * PUT /api/v1/admin/settings/:key
 * 更新系統設定值（管理員專用）
 * 
 * @openapi
 * /admin/settings/{key}:
 *   put:
 *     tags:
 *       - 系統設定
 *     summary: 更新系統設定
 *     description: |
 *       更新指定的系統參數（僅管理員）
 *       
 *       **危險設定需確認：**
 *       - comp_leave_expiry_rule：補休有效期規則
 *       - daily_work_hours_limit：每日工時上限（唯讀，勞基法規定）
 *       - hourly_wage_base：月薪制換算時數（唯讀，勞基法規定）
 *     parameters:
 *       - name: key
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "comp_leave_expiry_rule"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - setting_value
 *             properties:
 *               setting_value:
 *                 type: string
 *                 example: "next_month"
 *               confirmed:
 *                 type: boolean
 *                 default: false
 *                 description: 是否確認修改危險設定
 *           examples:
 *             一般設定:
 *               value:
 *                 setting_value: "霍爾果斯會計師事務所"
 *             危險設定:
 *               value:
 *                 setting_value: "next_month"
 *                 confirmed: true
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                     setting:
 *                       type: object
 *                       properties:
 *                         setting_key:
 *                           type: string
 *                         setting_value:
 *                           type: string
 *                         description:
 *                           type: string
 *                     old_value:
 *                       type: string
 *                       example: "current_month"
 *                     warning:
 *                       type: string
 *                       example: "⚠️ 延長補休有效期會增加人力成本"
 *       403:
 *         description: 權限不足或設定為唯讀
 *       404:
 *         description: 設定不存在
 *       422:
 *         description: 驗證錯誤（未確認危險設定或值格式錯誤）
 */
settings.put('/admin/settings/:key', authMiddleware, requireAdmin, async (c) => {
  const admin = c.get('user') as User;
  const key = c.req.param('key');
  const { setting_value, confirmed = false } = await c.req.json();
  
  const settingService = new SettingService(c.env.DB);
  const result = await settingService.updateSetting(
    key,
    setting_value,
    confirmed,
    admin.user_id
  );
  
  return jsonResponse(c, successResponse(result), 200);
});

export default settings;

