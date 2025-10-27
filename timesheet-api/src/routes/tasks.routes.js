/**
 * Tasks Routes
 */
import {
  getTasks,
  getMultiStageTasks,
  getRecurringTasks,
  createTask,
  updateTask
} from '../handlers/tasks.handler.js';
import { withAuth } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerTaskRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));

  router.get('/api/tasks', auth(getTasks));
  router.get('/api/tasks/multi-stage', auth(getMultiStageTasks));
  router.get('/api/tasks/recurring', auth(getRecurringTasks));
  router.post('/api/tasks', auth(createTask));
  router.put('/api/tasks/multi-stage/:id', auth(updateTask));
}

export default registerTaskRoutes;
