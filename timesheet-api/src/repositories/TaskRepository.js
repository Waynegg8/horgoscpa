/**
 * Task Repository
 * 負責任務表的所有資料庫操作
 */

import { BaseRepository } from './BaseRepository.js';
import { TABLES, FIELDS } from '../config/constants.js';

export class TaskRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.TASKS);
  }

  /**
   * 查詢任務（帶創建者和分配者信息）
   * @param {number} id - 任務 ID
   * @returns {Promise<Object|null>}
   */
  async findByIdWithUsers(id) {
    const query = `
      SELECT 
        t.*,
        u_assigned.username as assigned_user_name,
        u_created.username as created_by_user_name,
        c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.USERS} u_assigned ON t.${FIELDS.ASSIGNED_USER_ID} = u_assigned.id
      LEFT JOIN ${TABLES.USERS} u_created ON t.${FIELDS.CREATED_BY_USER_ID} = u_created.id
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
      WHERE t.${FIELDS.ID} = ?
    `;

    return this.rawFirst(query, [id]);
  }

  /**
   * 查詢任務列表（帶關聯信息）
   * @param {Object} filters - 過濾條件
   * @param {Object} options - 查詢選項
   * @returns {Promise<Array>}
   */
  async findAllWithUsers(filters = {}, options = {}) {
    let query = `
      SELECT 
        t.*,
        u_assigned.username as assigned_user_name,
        u_created.username as created_by_user_name,
        c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.USERS} u_assigned ON t.${FIELDS.ASSIGNED_USER_ID} = u_assigned.id
      LEFT JOIN ${TABLES.USERS} u_created ON t.${FIELDS.CREATED_BY_USER_ID} = u_created.id
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
    `;

    const conditions = [];
    const params = [];

    // 構建過濾條件
    if (filters.status) {
      conditions.push(`t.status = ?`);
      params.push(filters.status);
    }

    if (filters.task_type) {
      conditions.push(`t.task_type = ?`);
      params.push(filters.task_type);
    }

    if (filters.category) {
      conditions.push(`t.category = ?`);
      params.push(filters.category);
    }

    if (filters.assigned_user_id) {
      conditions.push(`t.${FIELDS.ASSIGNED_USER_ID} = ?`);
      params.push(filters.assigned_user_id);
    }

    if (filters.client_id) {
      conditions.push(`t.${FIELDS.CLIENT_ID} = ?`);
      params.push(filters.client_id);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // 排序
    const { orderBy = FIELDS.CREATED_AT, order = 'DESC' } = options;
    query += ` ORDER BY t.${orderBy} ${order}`;

    return this.raw(query, params);
  }

  /**
   * 查詢用戶的任務統計
   * @param {number} userId - 用戶 ID
   * @returns {Promise<Object>}
   */
  async getUserTaskStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
      FROM ${TABLES.TASKS}
      WHERE ${FIELDS.ASSIGNED_USER_ID} = ?
    `;

    return this.rawFirst(query, [userId]);
  }

  /**
   * 查詢即將到期的任務
   * @param {number} days - 幾天內到期
   * @returns {Promise<Array>}
   */
  async findDueSoon(days = 3) {
    const query = `
      SELECT t.*, c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
      WHERE t.status NOT IN ('completed', 'cancelled')
        AND t.due_date IS NOT NULL
        AND t.due_date <= datetime('now', '+${days} days')
        AND t.due_date >= datetime('now')
      ORDER BY t.due_date ASC
    `;

    return this.raw(query);
  }

  /**
   * 查詢逾期的任務
   * @returns {Promise<Array>}
   */
  async findOverdue() {
    const query = `
      SELECT t.*, c.name as client_name
      FROM ${TABLES.TASKS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.${FIELDS.CLIENT_ID} = c.id
      WHERE t.status NOT IN ('completed', 'cancelled')
        AND t.due_date IS NOT NULL
        AND t.due_date < datetime('now')
      ORDER BY t.due_date ASC
    `;

    return this.raw(query);
  }
}

export default TaskRepository;

