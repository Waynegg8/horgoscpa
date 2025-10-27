/**
 * SOPs Routes
 */
import {
  getSopCategories,
  getSops,
  searchSops,
  getSop,
  createSop,
  updateSop
} from '../handlers/sops.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerSopRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/sop-categories', auth(getSopCategories));
  router.get('/api/sops', auth(getSops));
  router.get('/api/sops/search', auth(searchSops));
  router.get('/api/sops/:id', auth(getSop));
  router.post('/api/sops', admin(createSop));
  router.put('/api/sops/:id', admin(updateSop));
}

export default registerSopRoutes;

