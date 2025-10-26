/**
 * Tasks Routes
 * 註冊任務相關的所有路由
 */

import {
  getTaskList,
  getTaskDetail,
  createTask,
  updateTask,
  deleteTask,
  getUserTaskStats,
  getDueSoonTasks,
  getOverdueTasks
} from '../handlers/tasks.handler.js';

import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

/**
 * 組合中間件
 */
function compose(...middlewares) {
  return (handler) => {
    return middlewares.reduceRight(
      (wrapped, middleware) => middleware(wrapped),
      handler
    );
  };
}

/**
 * 註冊任務路由
 * @param {Router} router - 路由器實例
 */
export function registerTaskRoutes(router) {
  // 所有任務路由都需要認證和錯誤處理
  const authHandler = compose(withErrorHandler, withAuth);
  const adminHandler = compose(withErrorHandler, withAdmin);

  // GET /api/tasks - 獲取任務列表（所有用戶）
  router.get('/api/tasks', authHandler(getTaskList));

  // GET /api/tasks/due-soon - 獲取即將到期的任務（所有用戶）
  router.get('/api/tasks/due-soon', authHandler(getDueSoonTasks));

  // GET /api/tasks/overdue - 獲取逾期任務（所有用戶）
  router.get('/api/tasks/overdue', authHandler(getOverdueTasks));

  // GET /api/tasks/stats/user/:userId - 獲取用戶任務統計（所有用戶）
  router.get('/api/tasks/stats/user/:userId', authHandler(getUserTaskStats));

  // GET /api/tasks/:id - 獲取任務詳情（所有用戶）
  router.get('/api/tasks/:id', authHandler(getTaskDetail));

  // POST /api/tasks - 創建任務（所有用戶）
  router.post('/api/tasks', authHandler(createTask));

  // PUT /api/tasks/:id - 更新任務（所有用戶）
  router.put('/api/tasks/:id', authHandler(updateTask));

  // DELETE /api/tasks/:id - 刪除任務（管理員）
  router.delete('/api/tasks/:id', adminHandler(deleteTask));
}

export default registerTaskRoutes;

