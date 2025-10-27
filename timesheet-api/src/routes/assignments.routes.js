/**
 * Assignments Routes
 */
import { getAssignments, createAssignment } from '../handlers/assignments.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerAssignmentRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/assignments', auth(getAssignments));
  router.post('/api/assignments', admin(createAssignment));
  router.post('/api/admin/assignments', admin(createAssignment));
}

export default registerAssignmentRoutes;

