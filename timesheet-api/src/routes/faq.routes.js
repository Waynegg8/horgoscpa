/**
 * FAQ Routes
 */
import { getFaqCategories, getFaqs, createFaq } from '../handlers/faq.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerFaqRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/faq/categories', auth(getFaqCategories));
  router.get('/api/faqs', auth(getFaqs));
  router.post('/api/faqs', admin(createFaq));
}

export default registerFaqRoutes;

