/**
 * Tasks Routes
 */
import {
  getTasks,
  getMultiStageTasks,
  getRecurringTasks,
  createTask,
  updateTask,
  getMultiStageStats,
  getRecurringStats,
  generateRecurringTasks,
  addChecklistItem
} from '../handlers/tasks.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerTaskRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/tasks', auth(getTasks));
  router.post('/api/tasks', auth(createTask));
  
  router.get('/api/tasks/multi-stage', auth(getMultiStageTasks));
  router.get('/api/tasks/multi-stage/stats', auth(getMultiStageStats));
  router.put('/api/tasks/multi-stage/:id', auth(updateTask));
  router.post('/api/tasks/multi-stage', auth(createTask));
  
  router.get('/api/tasks/recurring', auth(getRecurringTasks));
  router.get('/api/tasks/recurring/stats', auth(getRecurringStats));
  router.post('/api/tasks/recurring/generate', admin(generateRecurringTasks));
  
  router.post('/api/checklist', auth(addChecklistItem));
}

export default registerTaskRoutes;
