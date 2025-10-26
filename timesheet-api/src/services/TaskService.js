/**
 * Task Service
 * 負責任務相關的業務邏輯
 */

import { TaskRepository } from '../repositories/TaskRepository.js';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/error.middleware.js';
import { validate } from '../utils/validation.util.js';
import { TASK_STATUS, TASK_TYPE, TASK_CATEGORY } from '../config/constants.js';

export class TaskService {
  constructor(db) {
    this.repository = new TaskRepository(db);
  }

  /**
   * 獲取任務列表
   * @param {Object} options - 查詢選項
   * @returns {Promise<Object>}
   */
  async getList(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      status,
      task_type,
      category,
      assigned_user_id,
      client_id,
      search
    } = options;

    // 構建過濾條件
    const filters = {};
    if (status) filters.status = status;
    if (task_type) filters.task_type = task_type;
    if (category) filters.category = category;
    if (assigned_user_id) filters.assigned_user_id = assigned_user_id;
    if (client_id) filters.client_id = client_id;

    // 查詢數據
    let allTasks = await this.repository.findAllWithUsers(filters);

    // 搜尋過濾
    if (search) {
      const searchLower = search.toLowerCase();
      allTasks = allTasks.filter(task =>
        task.title.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }

    // 分頁
    const total = allTasks.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const tasks = allTasks.slice(start, end);

    return {
      data: tasks,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 獲取任務詳情
   * @param {number} id - 任務 ID
   * @returns {Promise<Object>}
   */
  async getDetail(id) {
    const task = await this.repository.findByIdWithUsers(id);
    
    if (!task) {
      throw new NotFoundError('任務不存在');
    }

    return task;
  }

  /**
   * 創建任務
   * @param {Object} data - 任務數據
   * @param {Object} context - 上下文（當前用戶等）
   * @returns {Promise<Object>}
   */
  async create(data, context) {
    // 驗證數據
    this._validateTaskData(data);

    // 設置默認值
    if (!data.status) {
      data.status = TASK_STATUS.PENDING;
    }
    if (!data.task_type) {
      data.task_type = TASK_TYPE.TASK;
    }
    if (!data.priority) {
      data.priority = 'medium';
    }

    // 設置創建者
    if (context?.user?.id) {
      data.created_by_user_id = context.user.id;
    }

    // 創建記錄
    const id = await this.repository.create(data);

    // 記錄操作日誌
    console.log(`[TaskService] Task created: ${id} by user ${context?.user?.id}`);

    // 返回完整記錄
    return this.repository.findByIdWithUsers(id);
  }

  /**
   * 更新任務
   * @param {number} id - 任務 ID
   * @param {Object} data - 更新數據
   * @param {Object} context - 上下文
   * @returns {Promise<Object>}
   */
  async update(id, data, context) {
    // 檢查任務是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('任務不存在');
    }

    // 驗證數據（部分驗證）
    if (data.title) {
      validate(data).required('title', '任務標題為必填').throwIfFailed();
    }

    if (data.status) {
      validate(data)
        .enum('status', Object.values(TASK_STATUS))
        .throwIfFailed();
    }

    // 如果標記為完成，記錄完成時間
    if (data.status === TASK_STATUS.COMPLETED && !data.completed_date) {
      data.completed_date = new Date().toISOString();
    }

    // 執行更新
    const updated = await this.repository.update(id, data);

    // 記錄操作日誌
    console.log(`[TaskService] Task updated: ${id} by user ${context?.user?.id}`);

    return this.repository.findByIdWithUsers(id);
  }

  /**
   * 刪除任務
   * @param {number} id - 任務 ID
   * @param {Object} context - 上下文
   * @returns {Promise<boolean>}
   */
  async delete(id, context) {
    // 檢查任務是否存在
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError('任務不存在');
    }

    // 執行軟刪除
    await this.repository.softDelete(id);

    // 記錄操作日誌
    console.log(`[TaskService] Task deleted: ${id} by user ${context?.user?.id}`);

    return true;
  }

  /**
   * 獲取用戶任務統計
   * @param {number} userId - 用戶 ID
   * @returns {Promise<Object>}
   */
  async getUserStats(userId) {
    return this.repository.getUserTaskStats(userId);
  }

  /**
   * 獲取即將到期的任務
   * @param {number} days - 天數
   * @returns {Promise<Array>}
   */
  async getDueSoonTasks(days = 3) {
    return this.repository.findDueSoon(days);
  }

  /**
   * 獲取逾期任務
   * @returns {Promise<Array>}
   */
  async getOverdueTasks() {
    return this.repository.findOverdue();
  }

  /**
   * 驗證任務數據
   * @private
   */
  _validateTaskData(data) {
    const validator = validate(data)
      .required('title', '任務標題為必填');

    // 驗證狀態
    if (data.status) {
      validator.enum('status', Object.values(TASK_STATUS));
    }

    // 驗證任務類型
    if (data.task_type) {
      validator.enum('task_type', Object.values(TASK_TYPE));
    }

    // 驗證分類
    if (data.category) {
      validator.enum('category', Object.values(TASK_CATEGORY));
    }

    validator.throwIfFailed();
  }
}

export default TaskService;

