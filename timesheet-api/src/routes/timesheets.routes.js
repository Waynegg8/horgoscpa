/**
 * Timesheets Routes
 */
import { getTimesheetData, getLeaveQuota, saveTimesheet } from '../handlers/timesheets.handler.js';
import { withAuth } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerTimesheetRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));

  router.get('/api/timesheet-data', auth(getTimesheetData));
  router.get('/api/leave-quota', auth(getLeaveQuota));
  router.post('/api/save-timesheet', auth(saveTimesheet));
}

export default registerTimesheetRoutes;

