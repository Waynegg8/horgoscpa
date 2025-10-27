/**
 * Reminder Service Module
 */

import { apiClient } from '../../core/api/client.js';

export class ReminderService {
  static async getList(userId, isRead = null) {
    const params = { user_id: userId };
    if (isRead !== null) params.is_read = isRead ? 1 : 0;

    const response = await apiClient.get('/api/reminders', { params });
    return response.data?.reminders || response.reminders || [];
  }

  static async markAsRead(id) {
    await apiClient.put(`/api/reminders/${id}/read`);
  }

  static async markAllAsRead() {
    const response = await apiClient.put('/api/reminders/mark-all-read');
    return response.data || response;
  }
}

window.ReminderService = ReminderService;
export default ReminderService;

