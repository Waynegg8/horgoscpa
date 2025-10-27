/**
 * Client Service
 */
import { ClientRepository } from '../repositories/ClientRepository.js';

export class ClientService {
  constructor(db) {
    this.repo = new ClientRepository(db);
  }

  async getAll() {
    return this.repo.findAll({}, { orderBy: 'name', order: 'ASC' });
  }

  async getById(id) {
    return this.repo.findWithServices(id);
  }

  async create(data) {
    return this.repo.create(data);
  }

  async update(id, data) {
    return this.repo.update(id, data);
  }

  async delete(id) {
    return this.repo.delete(id);
  }
}

export default ClientService;
