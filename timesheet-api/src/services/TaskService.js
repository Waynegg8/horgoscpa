/**
 * Task Service
 */
import { TaskRepository } from '../repositories/TaskRepository.js';

export class TaskService {
  constructor(db) {
    this.repo = new TaskRepository(db);
  }

  async getAll(filters = {}) {
    return this.repo.findAllWithRelations(filters);
  }

  async getById(id) {
    return this.repo.findById(id);
  }

  async create(data) {
    if (!data.status) data.status = 'pending';
    if (!data.priority) data.priority = 'medium';
    return this.repo.create(data);
  }

  async update(id, data) {
    return this.repo.update(id, data);
  }

  async delete(id) {
    return this.repo.delete(id);
  }
}

export default TaskService;
