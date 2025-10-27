/**
 * Auth Routes
 */
import { handleLogin, handleLogout, handleVerifySession, handleChangePassword } from '../auth.js';
import { withAuth } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

function adapt(handler) {
  return async (env, request) => handler(env.DB, request);
}

export function registerAuthRoutes(router) {
  router.post('/api/login', withErrorHandler(adapt(handleLogin)));
  router.post('/api/logout', withErrorHandler(withAuth(adapt(handleLogout))));
  router.get('/api/verify', withErrorHandler(withAuth(adapt(handleVerifySession))));
  router.post('/api/change-password', withErrorHandler(withAuth(adapt(handleChangePassword))));
}

export default registerAuthRoutes;
