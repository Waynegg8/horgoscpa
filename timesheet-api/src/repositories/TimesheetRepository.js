/**
 * Timesheet Repository
 */
import { BaseRepository } from './BaseRepository.js';
import { TABLES } from '../config/constants.js';

export class TimesheetRepository extends BaseRepository {
  constructor(db) {
    super(db, TABLES.TIMESHEETS);
  }

  async findByEmployeeAndPeriod(employeeId, year, month = null) {
    let query = `
      SELECT t.*, c.name as client_name
      FROM ${TABLES.TIMESHEETS} t
      LEFT JOIN ${TABLES.CLIENTS} c ON t.client_id = c.id
      WHERE t.employee_id = ?
        AND strftime('%Y', t.date) = ?
    `;
    const params = [employeeId, year.toString()];

    if (month) {
      query += ` AND strftime('%m', t.date) = ?`;
      params.push(month.toString().padStart(2, '0'));
    }

    query += ` ORDER BY t.date DESC`;

    return this.raw(query, params);
  }
}

export default TimesheetRepository;

