/**
 * Client Service Config Service
 * 客户服务配置业务逻辑
 */
import { ClientServiceRepository } from '../repositories/ClientServiceRepository.js';

export class ClientServiceConfigService {
  constructor(db) {
    this.repo = new ClientServiceRepository(db);
  }

  async getAll(filters = {}) {
    if (filters.client_id) {
      return this.repo.findByClient(filters.client_id);
    }
    return this.repo.findAllWithClient();
  }

  async create(data) {
    if (!data.is_active) data.is_active = true;
    if (!data.advance_days) data.advance_days = 7;
    if (!data.due_days) data.due_days = 15;
    
    return this.repo.create(data);
  }

  async update(id, data) {
    return this.repo.update(id, data);
  }

  async toggleActive(id) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error('服务配置不存在');
    
    return this.repo.update(id, { is_active: !existing.is_active });
  }

  async delete(id) {
    return this.repo.delete(id);
  }
}

export default ClientServiceConfigService;

