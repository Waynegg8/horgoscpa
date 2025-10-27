/**
 * Task Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class TaskRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.TASKS);
  }

  async findAllWithRelations(filters = {}) {
    let query = `
      SELECT 
        t.*,
        c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ` AND t.status = ?`;
      params.push(filters.status);
    }

    if (filters.assigned_user_id) {
      query += ` AND t.assigned_user_id = ?`;
      params.push(filters.assigned_user_id);
    }

    if (filters.category) {
      query += ` AND t.category = ?`;
      params.push(filters.category);
    }

    query += ` ORDER BY t.created_at DESC`;

    return this.raw(query, params);
  }
}

export default TaskRepository;
