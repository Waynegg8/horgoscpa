/**
 * Reminders Routes
 */
import { getReminders, markReminderRead, markAllRead, autoGenerateReminders } from '../handlers/reminders.handler.js';
import { withAuth, withAdmin } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerReminderRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));
  const admin = (h) => withErrorHandler(withAdmin(h));

  router.get('/api/reminders', auth(getReminders));
  router.put('/api/reminders/:id/read', auth(markReminderRead));
  router.put('/api/reminders/mark-all-read', auth(markAllRead));
  router.post('/api/reminders/auto-generate', admin(autoGenerateReminders));
}

export default registerReminderRoutes;

