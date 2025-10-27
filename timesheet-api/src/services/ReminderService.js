/**
 * Reminder Service
 */
import { ReminderRepository } from '../repositories/ReminderRepository.js';

export class ReminderService {
  constructor(db) {
    this.repo = new ReminderRepository(db);
  }

  async getByUser(userId, isRead = null) {
    const reminders = await this.repo.findByUser(userId, isRead);
    return { reminders };
  }

  async markAsRead(id) {
    return this.repo.update(id, { is_read: 1, read_at: new Date().toISOString() });
  }

  async markAllAsRead(userId) {
    return this.repo.markAllAsRead(userId);
  }
}

export default ReminderService;

