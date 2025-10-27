/**
 * Automated Tasks Routes
 */
import { generateAutomatedTasks, previewAutomatedTasks } from '../handlers/automated.handler.js';
import { withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerAutomatedRoutes(router) {
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.post('/api/automated-tasks/generate', admin(generateAutomatedTasks));
  router.get('/api/automated-tasks/preview', admin(previewAutomatedTasks));
}

export default registerAutomatedRoutes;

