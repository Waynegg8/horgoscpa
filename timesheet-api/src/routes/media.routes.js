/**
 * Media Routes
 */
import { getMediaList, uploadMedia, deleteMedia } from '../handlers/media.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerMediaRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/media', auth(getMediaList));
  router.post('/api/upload/image', admin(uploadMedia));
  router.delete('/api/media/:id', admin(deleteMedia));
}

export default registerMediaRoutes;

