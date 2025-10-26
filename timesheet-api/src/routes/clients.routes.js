/**
 * Clients Routes
 * 註冊客戶相關的所有路由
 */

import {
  getClientList,
  getClientDetail,
  createClient,
  updateClient,
  deleteClient
} from '../handlers/clients.handler.js';

import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

/**
 * 組合中間件
 * 使用函數組合模式，從右到左執行
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
 * 註冊客戶路由
 * @param {Router} router - 路由器實例
 */
export function registerClientRoutes(router) {
  // 所有客戶路由都需要認證和錯誤處理
  const authHandler = compose(withErrorHandler, withAuth);
  const adminHandler = compose(withErrorHandler, withAdmin);

  // GET /api/clients - 獲取客戶列表（所有用戶）
  router.get('/api/clients', authHandler(getClientList));

  // GET /api/clients/:id - 獲取客戶詳情（所有用戶）
  router.get('/api/clients/:id', authHandler(getClientDetail));

  // POST /api/clients - 創建客戶（管理員）
  router.post('/api/clients', adminHandler(createClient));

  // PUT /api/clients/:id - 更新客戶（管理員）
  router.put('/api/clients/:id', adminHandler(updateClient));

  // DELETE /api/clients/:id - 刪除客戶（管理員）
  router.delete('/api/clients/:id', adminHandler(deleteClient));
}

export default registerClientRoutes;

