/**
 * Projects Routes
 * 专案路由（兼容层，实际使用 tasks）
 */
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} from '../handlers/projects.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerProjectRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/projects', auth(getProjects));
  router.get('/api/projects/:id', auth(getProject));
  router.post('/api/projects', auth(createProject));
  router.put('/api/projects/:id', auth(updateProject));
  router.delete('/api/projects/:id', admin(deleteProject));
}

export default registerProjectRoutes;

