/**
 * Reminders Handler
 */
import { ReminderService } from '../services/ReminderService.js';
import { success, noContent } from '../utils/response.util.js';

export async function getReminders(env, request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id') ? parseInt(url.searchParams.get('user_id')) : request.user.id;
  const isRead = url.searchParams.get('is_read');

  const service = new ReminderService(env.DB);
  const result = await service.getByUser(userId, isRead === '0' ? false : null);
  
  return success(result);
}

export async function markReminderRead(env, request) {
  const id = parseInt(request.params.id);
  const service = new ReminderService(env.DB);
  await service.markAsRead(id);
  return noContent();
}

export async function markAllRead(env, request) {
  const userId = request.user.id;
  const service = new ReminderService(env.DB);
  const count = await service.markAllAsRead(userId);
  return success({ count });
}

export default {
  getReminders,
  markReminderRead,
  markAllRead
};

