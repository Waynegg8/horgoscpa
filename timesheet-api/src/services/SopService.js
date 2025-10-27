/**
 * SOP Service
 */
import { SopRepository } from '../repositories/SopRepository.js';
import { BaseRepository } from '../repositories/BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class SopService {
  constructor(db) {
    this.repo = new SopRepository(db);
    this.categoryRepo = new BaseRepository(db, TABLES.SOP_CATEGORIES);
  }

  async getCategories() {
    return this.categoryRepo.findAll({}, { orderBy: 'sort_order', order: 'ASC' });
  }

  async getAll() {
    return this.repo.findAllWithCategory();
  }

  async search(keyword) {
    return this.repo.search(keyword);
  }

  async getById(id) {
    return this.repo.findById(id);
  }

  async create(data) {
    if (!data.status) data.status = 'draft';
    return this.repo.create(data);
  }

  async update(id, data) {
    return this.repo.update(id, data);
  }
}

export default SopService;

