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

  // POST /api/auth/login - 登入（公開）
  router.post('/api/auth/login', withErrorHandler(handleLogin));

  // POST /api/auth/logout - 登出（需認證）
  router.post('/api/auth/logout', authHandler(handleLogout));

  // GET /api/auth/verify - 驗證 Session（需認證）
  router.get('/api/auth/verify', authHandler(handleVerifySession));

  // POST /api/auth/change-password - 修改密碼（需認證）
  router.post('/api/auth/change-password', authHandler(handleChangePassword));

  // POST /api/auth/admin/reset-password - 管理員重設密碼（管理員）
  router.post('/api/auth/admin/reset-password', adminHandler(handleAdminResetPassword));
}

export default registerAuthRoutes;

