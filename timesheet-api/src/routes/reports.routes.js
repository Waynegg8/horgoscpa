/**
 * Reports Routes
 */
import { getAnnualLeaveReport, getWorkAnalysisReport, getPivotReport, clearCache } from '../handlers/reports.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerReportRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/reports/annual-leave', auth(getAnnualLeaveReport));
  router.get('/api/reports/work-analysis', auth(getWorkAnalysisReport));
  router.get('/api/reports/pivot', auth(getPivotReport));
  router.post('/api/reports/clear-cache', admin(clearCache));
  router.post('/api/admin/cache/clear', admin(clearCache));
}

export default registerReportRoutes;

