/**
 * Client Service Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class ClientServiceRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.CLIENT_SERVICES);
  }

  async findByClient(clientId) {
    return this.findAll({ client_id: clientId });
  }

  async findAllWithClient() {
    const query = `
      SELECT 
        cs.*,
        c.name as client_name
      FROM ${TABLES.CLIENT_SERVICES} cs
      JOIN ${TABLES.CLIENTS} c ON cs.client_id = c.id
      ORDER BY c.name, cs.service_type
    `;
    return this.raw(query);
  }
}

export default ClientServiceRepository;

