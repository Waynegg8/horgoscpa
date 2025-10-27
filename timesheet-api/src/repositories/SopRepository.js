/**
 * SOP Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class SopRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.SOPS);
  }

  async findAllWithCategory() {
    const query = `
      SELECT s.*, c.name as category_name
      FROM ${TABLES.SOPS} s
      LEFT JOIN ${TABLES.SOP_CATEGORIES} c ON s.category_id = c.id
      WHERE s.status = 'published'
      ORDER BY s.updated_at DESC
    `;
    return this.raw(query);
  }

  async search(keyword) {
    const query = `
      SELECT s.*, c.name as category_name
      FROM ${TABLES.SOPS} s
      LEFT JOIN ${TABLES.SOP_CATEGORIES} c ON s.category_id = c.id
      WHERE s.status = 'published'
        AND (s.title LIKE ? OR s.content LIKE ?)
      ORDER BY s.updated_at DESC
    `;
    const pattern = `%${keyword}%`;
    return this.raw(query, [pattern, pattern]);
  }
}

export default SopRepository;

