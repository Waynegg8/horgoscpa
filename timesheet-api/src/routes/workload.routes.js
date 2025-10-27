/**
 * Workload Routes
 */
import { getWorkloadOverview, reassignTask } from '../handlers/workload.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerWorkloadRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/workload/overview', auth(getWorkloadOverview));
  router.post('/api/workload/reassign', admin(reassignTask));
}

export default registerWorkloadRoutes;

