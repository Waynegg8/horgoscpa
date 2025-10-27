/**
 * Admin Routes
 */
import { getUsers, createUser, resetUserPassword } from '../handlers/admin.handler.js';
import { withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerAdminRoutes(router) {
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/admin/users', admin(getUsers));
  router.post('/api/admin/users', admin(createUser));
  router.post('/api/admin/users/reset-password', admin(resetUserPassword));
}

export default registerAdminRoutes;

