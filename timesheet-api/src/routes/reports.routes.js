/**
 * Reports Routes
 */
import { getAnnualLeaveReport, getWorkAnalysisReport, clearCache } from '../handlers/reports.handler.js';
import { withAuth } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerReportRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));

  router.get('/api/reports/annual-leave', auth(getAnnualLeaveReport));
  router.get('/api/reports/work-analysis', auth(getWorkAnalysisReport));
  router.post('/api/reports/clear-cache', auth(clearCache));
}

export default registerReportRoutes;

