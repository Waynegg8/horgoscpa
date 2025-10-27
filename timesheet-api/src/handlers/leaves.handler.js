/**
 * Leave Events Handler
 * 请假管理
 */
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, list, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getLeaveEvents(env, request) {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employee_id');
  const year = url.searchParams.get('year');
  
  const repo = new BaseRepository(env.DB, TABLES.LEAVE_EVENTS);
  let query = `
    SELECT le.*, e.name as employee_name, lt.type_name
    FROM ${TABLES.LEAVE_EVENTS} le
    JOIN ${TABLES.EMPLOYEES} e ON le.employee_id = e.id
    JOIN ${TABLES.LEAVE_TYPES} lt ON le.leave_type_id = lt.id
    WHERE 1=1
  `;
  const params = [];

  if (employeeId) {
    query += ` AND le.employee_id = ?`;
    params.push(parseInt(employeeId));
  }

  if (year) {
    query += ` AND strftime('%Y', le.date) = ?`;
    params.push(year);
  }

  query += ` ORDER BY le.date DESC`;

  const events = await repo.raw(query, params);
  return list(events);
}

export async function createLeaveEvent(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.LEAVE_EVENTS);
  
  if (!data.status) data.status = 'pending';
  
  const id = await repo.create(data);
  const event = await repo.findById(id);
  
  return created(event);
}

export default {
  getLeaveEvents,
  createLeaveEvent
};

