/**
 * System Config Routes
 */
import { getConfigCategories, getConfigByCategory, updateConfig } from '../handlers/config.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerConfigRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/system-config/categories', auth(getConfigCategories));
  router.get('/api/system-config/:category', auth(getConfigByCategory));
  router.put('/api/system-config/batch', admin(updateConfig));
}

export default registerConfigRoutes;

