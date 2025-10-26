/**
 * Auth Routes
 * 註冊認證相關的所有路由
 */

import {
  handleLogin,
  handleLogout,
  handleVerifySession,
  handleChangePassword,
  handleAdminResetPassword
} from '../auth.js';

import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

/**
 * 適配器：將舊的 (db, request) 簽名轉換為新的 (env, request) 簽名
 */
function adaptAuthHandler(handler) {
  return async (env, request) => {
    return handler(env.DB, request);
  };
}

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
 * 註冊認證路由
 * @param {Router} router - 路由器實例
 */
export function registerAuthRoutes(router) {
  const authHandler = compose(withErrorHandler, withAuth);
  const adminHandler = compose(withErrorHandler, withAdmin);

  // POST /api/auth/login - 登入（公開）- 新端點
  router.post('/api/auth/login', withErrorHandler(adaptAuthHandler(handleLogin)));
  
  // POST /api/login - 登入（公開）- 向後兼容舊端點
  router.post('/api/login', withErrorHandler(adaptAuthHandler(handleLogin)));

  // POST /api/auth/logout - 登出（需認證）
  router.post('/api/auth/logout', authHandler(adaptAuthHandler(handleLogout)));
  
  // POST /api/logout - 向後兼容舊端點
  router.post('/api/logout', authHandler(adaptAuthHandler(handleLogout)));

  // GET /api/auth/verify - 驗證 Session（需認證）
  router.get('/api/auth/verify', authHandler(adaptAuthHandler(handleVerifySession)));
  
  // GET /api/verify - 向後兼容舊端點
  router.get('/api/verify', authHandler(adaptAuthHandler(handleVerifySession)));
  
  // GET /api/auth/me - 獲取當前用戶
  router.get('/api/auth/me', authHandler(adaptAuthHandler(handleVerifySession)));

  // POST /api/auth/change-password - 修改密碼（需認證）
  router.post('/api/auth/change-password', authHandler(adaptAuthHandler(handleChangePassword)));
  
  // POST /api/change-password - 向後兼容舊端點
  router.post('/api/change-password', authHandler(adaptAuthHandler(handleChangePassword)));

  // POST /api/auth/admin/reset-password - 管理員重設密碼（管理員）
  router.post('/api/auth/admin/reset-password', adminHandler(adaptAuthHandler(handleAdminResetPassword)));
}

export default registerAuthRoutes;

