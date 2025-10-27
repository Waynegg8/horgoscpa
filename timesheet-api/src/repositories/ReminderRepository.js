/**
 * Reminder Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class ReminderRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.TASK_REMINDERS);
  }

  async findByUser(userId, isRead = null) {
    const filters = { user_id: userId };
    if (isRead !== null) {
      filters.is_read = isRead ? 1 : 0;
    }
    return this.findAll(filters, { orderBy: 'remind_at', order: 'DESC' });
  }

  async markAllAsRead(userId) {
    const query = `
      UPDATE ${TABLES.TASK_REMINDERS}
      SET is_read = 1, read_at = ?
      WHERE user_id = ? AND is_read = 0
    `;
    const result = await this.db.prepare(query)
      .bind(new Date().toISOString(), userId)
      .run();
    return result.meta?.changes || 0;
  }
}

export default ReminderRepository;

