/**
 * Employee Service
 */
import { EmployeeRepository } from '../repositories/EmployeeRepository.js';

export class EmployeeService {
  constructor(db) {
    this.repo = new EmployeeRepository(db);
  }

  async getAll() {
    return this.repo.findActive();
  }

  async getById(id) {
    return this.repo.findById(id);
  }

  async create(data) {
    return this.repo.create(data);
  }

  async update(id, data) {
    return this.repo.update(id, data);
  }
}

export default EmployeeService;

