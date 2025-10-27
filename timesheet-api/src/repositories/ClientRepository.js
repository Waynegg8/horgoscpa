/**
 * Client Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES, FIELDS } from '../config/constants.js';

export class ClientRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.CLIENTS);
  }

  async findWithServices(id) {
    const client = await this.findById(id);
    if (!client) return null;

    const services = await this.db.prepare(`
      SELECT * FROM ${TABLES.CLIENT_SERVICES}
      WHERE client_id = ?
      ORDER BY service_type
    `).bind(id).all();

    return {
      ...client,
      services: services.results || []
    };
  }
}

export default ClientRepository;
