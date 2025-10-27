/**
 * User Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class UserRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.USERS);
  }

  async findByUsername(username) {
    return this.findOne({ username });
  }

  async findWithEmployee(id) {
    const query = `
      SELECT u.*, e.name as employee_name
      FROM ${TABLES.USERS} u
      LEFT JOIN ${TABLES.EMPLOYEES} e ON u.employee_id = e.id
      WHERE u.id = ?
    `;
    return this.rawFirst(query, [id]);
  }
}

export default UserRepository;

