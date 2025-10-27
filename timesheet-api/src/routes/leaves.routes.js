/**
 * Leave Events Routes
 */
import { getLeaveEvents, createLeaveEvent } from '../handlers/leaves.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerLeaveRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/leave-events', auth(getLeaveEvents));
  router.post('/api/leave-events', auth(createLeaveEvent));
}

export default registerLeaveRoutes;

