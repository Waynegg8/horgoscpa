/**
 * Posts Routes (CMS)
 */
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  getPublicPosts,
  getPublicResources
} from '../handlers/posts.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerPostRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/posts', auth(getPosts));
  router.get('/api/posts/:id', auth(getPost));
  router.post('/api/posts', admin(createPost));
  router.put('/api/posts/:id', admin(updatePost));
  router.delete('/api/posts/:id', admin(deletePost));
  
  // 公开端点（无需认证）
  router.get('/api/public/posts', withErrorHandler(getPublicPosts));
  router.get('/api/public/resources', withErrorHandler(getPublicResources));
}

export default registerPostRoutes;

