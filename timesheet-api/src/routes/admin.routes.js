/**
 * Admin Routes
 */
import {
  getUsers,
  createUser,
  resetUserPassword,
  createAdminClient,
  createAdminEmployee,
  getAdminEmployees,
  getSystemParams,
  updateSystemParam,
  createLeaveType,
  createHoliday,
  getCacheStats
} from '../handlers/admin.handler.js';
import { withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerAdminRoutes(router) {
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/admin/users', admin(getUsers));
  router.post('/api/admin/users', admin(createUser));
  router.post('/api/admin/users/reset-password', admin(resetUserPassword));
  
  router.post('/api/admin/clients', admin(createAdminClient));
  router.get('/api/admin/employees', admin(getAdminEmployees));
  router.post('/api/admin/employees', admin(createAdminEmployee));
  
  router.get('/api/admin/system-params', admin(getSystemParams));
  router.put('/api/admin/system-params', admin(updateSystemParam));
  
  router.post('/api/admin/leave-types', admin(createLeaveType));
  router.post('/api/holidays', admin(createHoliday));
  
  router.get('/api/admin/cache/stats', admin(getCacheStats));
}

export default registerAdminRoutes;

