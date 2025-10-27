/**
 * System Routes
 */
import {
  getBusinessTypes,
  getLeaveTypes,
  getHolidays,
  getWorkTypes
} from '../handlers/system.handler.js';
import { withAuth } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerSystemRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));

  router.get('/api/business-types', auth(getBusinessTypes));
  router.get('/api/leave-types', auth(getLeaveTypes));
  router.get('/api/holidays', auth(getHolidays));
  router.get('/api/work-types', auth(getWorkTypes));
}

export default registerSystemRoutes;

