/**
 * Templates Routes
 */
import {
  getTemplates,
  getMultiStageTemplates,
  getRecurringTemplates,
  createTemplate
} from '../handlers/templates.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerTemplateRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/templates', auth(getTemplates));
  router.get('/api/multi-stage-templates', auth(getMultiStageTemplates));
  router.get('/api/recurring-templates', auth(getRecurringTemplates));
  router.post('/api/templates', admin(createTemplate));
}

export default registerTemplateRoutes;

