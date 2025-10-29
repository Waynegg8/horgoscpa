/**
 * 國定假日 API 路由
 * 
 * ⚠️ 小型事務所彈性設計 - 所有人可協助維護
 * 
 * GET    /api/v1/holidays - 查詢國定假日
 * POST   /api/v1/holidays - 新增國定假日
 * PUT    /api/v1/holidays/:id - 更新國定假日
 * DELETE /api/v1/holidays/:id - 刪除國定假日
 * POST   /api/v1/admin/holidays/import - 批量導入（僅管理員）
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { HolidayService } from '../services/HolidayService';
import { successResponse, jsonResponse, createPagination } from '../utils/response';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const holidays = new Hono<{ Bindings: Env }>();

/**
 * GET /api/v1/holidays
 * 查詢國定假日列表
 * 
 * @openapi
 * /holidays:
 *   get:
 *     tags:
 *       - 業務規則
 *     summary: 查詢國定假日列表
 *     description: 查詢國定假日和補班日（所有人可查看）
 *     parameters:
 *       - name: year
 *         in: query
 *         description: 篩選年份（如：2025）
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 100
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: 成功
 */
holidays.get('/holidays', authMiddleware, async (c) => {
  const year = c.req.query('year') ? parseInt(c.req.query('year')!) : undefined;
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const holidayService = new HolidayService(c.env.DB);
  const result = await holidayService.getHolidays({ year, limit, offset });
  
  return jsonResponse(
    c,
    successResponse(result.holidays, createPagination(result.total, limit, offset)),
    200
  );
});

/**
 * POST /api/v1/holidays
 * 新增國定假日（小型事務所彈性設計：所有人可用）
 * 
 * @openapi
 * /holidays:
 *   post:
 *     tags:
 *       - 業務規則
 *     summary: 新增國定假日
 *     description: 新增國定假日或補班日（所有人可用）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - holiday_date
 *               - name
 *             properties:
 *               holiday_date:
 *                 type: string
 *                 format: date
 *                 example: "2025-10-10"
 *               name:
 *                 type: string
 *                 example: "國慶日"
 *               is_national_holiday:
 *                 type: boolean
 *                 default: true
 *               is_makeup_workday:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: 創建成功
 *       409:
 *         description: 該日期已存在
 *       422:
 *         description: 驗證錯誤
 */
holidays.post('/holidays', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const data = await c.req.json();
  
  const holidayService = new HolidayService(c.env.DB);
  const holiday = await holidayService.createHoliday(data, user.user_id);
  
  return jsonResponse(c, successResponse(holiday), 201);
});

/**
 * PUT /api/v1/holidays/:id
 * 更新國定假日
 * 
 * @openapi
 * /holidays/{id}:
 *   put:
 *     tags:
 *       - 業務規則
 *     summary: 更新國定假日
 *     description: 更新國定假日資訊（所有人可用）
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
 *               is_national_holiday:
 *                 type: boolean
 *               is_makeup_workday:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 國定假日不存在
 *       422:
 *         description: 驗證錯誤
 */
holidays.put('/holidays/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const holidayId = parseInt(c.req.param('id'));
  const updates = await c.req.json();
  
  const holidayService = new HolidayService(c.env.DB);
  const holiday = await holidayService.updateHoliday(holidayId, updates, user.user_id);
  
  return jsonResponse(c, successResponse(holiday), 200);
});

/**
 * DELETE /api/v1/holidays/:id
 * 刪除國定假日
 * 
 * @openapi
 * /holidays/{id}:
 *   delete:
 *     tags:
 *       - 業務規則
 *     summary: 刪除國定假日
 *     description: 軟刪除國定假日（所有人可用）
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 刪除成功
 *       404:
 *         description: 國定假日不存在
 */
holidays.delete('/holidays/:id', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const holidayId = parseInt(c.req.param('id'));
  
  const holidayService = new HolidayService(c.env.DB);
  await holidayService.deleteHoliday(holidayId, user.user_id);
  
  return jsonResponse(c, successResponse({ message: '國定假日已刪除' }), 200);
});

/**
 * POST /api/v1/admin/holidays/import
 * 批量導入國定假日（僅管理員）
 * 
 * @openapi
 * /admin/holidays/import:
 *   post:
 *     tags:
 *       - 業務規則
 *     summary: 批量導入國定假日
 *     description: 批量導入國定假日（僅管理員，適用於年度假日導入）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - holidays
 *             properties:
 *               holidays:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - holiday_date
 *                     - name
 *                   properties:
 *                     holiday_date:
 *                       type: string
 *                       format: date
 *                     name:
 *                       type: string
 *                     is_national_holiday:
 *                       type: boolean
 *                     is_makeup_workday:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: 導入完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     imported:
 *                       type: integer
 *                       example: 15
 *                     skipped:
 *                       type: integer
 *                       example: 2
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       403:
 *         description: 權限不足
 */
holidays.post('/admin/holidays/import', authMiddleware, requireAdmin, async (c) => {
  const user = c.get('user') as User;
  const { holidays: holidaysData } = await c.req.json();
  
  const holidayService = new HolidayService(c.env.DB);
  const result = await holidayService.importHolidays(holidaysData, user.user_id);
  
  return jsonResponse(c, successResponse(result), 200);
});

export default holidays;

