/**
 * Employee Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class EmployeeRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.EMPLOYEES);
  }

  async findByName(name) {
    return this.findOne({ name });
  }

  async findActive() {
    return this.findAll({ is_active: 1 }, { orderBy: 'name', order: 'ASC' });
  }
}

export default EmployeeRepository;

