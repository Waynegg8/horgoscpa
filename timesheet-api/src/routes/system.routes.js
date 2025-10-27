/**
 * System Routes
 */
import {
  getBusinessTypes,
  getLeaveTypes,
  getHolidays,
  getWorkTypes,
  createBusinessType
} from '../handlers/system.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerSystemRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/business-types', auth(getBusinessTypes));
  router.post('/api/business-types', admin(createBusinessType));
  router.get('/api/leave-types', auth(getLeaveTypes));
  router.get('/api/holidays', auth(getHolidays));
  router.get('/api/work-types', auth(getWorkTypes));
}

export default registerSystemRoutes;

