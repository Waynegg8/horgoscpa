/**
 * Reminders Routes
 */
import { getReminders, markReminderRead, markAllRead } from '../handlers/reminders.handler.js';
import { withAuth } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerReminderRoutes(router) {
  const auth = (h) => withErrorHandler(withAuth(h));

  router.get('/api/reminders', auth(getReminders));
  router.put('/api/reminders/:id/read', auth(markReminderRead));
  router.put('/api/reminders/mark-all-read', auth(markAllRead));
}

export default registerReminderRoutes;

