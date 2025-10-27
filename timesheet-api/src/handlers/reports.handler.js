/**
 * Reports Handler
 */
import { EmployeeRepository } from '../repositories/EmployeeRepository.js';
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getAnnualLeaveReport(env, request) {
  const url = new URL(request.url);
  const employeeName = url.searchParams.get('employee');
  const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();

  const empRepo = new EmployeeRepository(env.DB);
  const employee = await empRepo.findByName(employeeName);
  
  if (!employee) {
    return success({ leave_stats: {}, employee: employeeName, year });
  }

  const leaveRepo = new BaseRepository(env.DB, TABLES.LEAVE_EVENTS);
  const leaveEvents = await leaveRepo.raw(`
    SELECT le.*, lt.type_name
    FROM ${TABLES.LEAVE_EVENTS} le
    JOIN ${TABLES.LEAVE_TYPES} lt ON le.leave_type_id = lt.id
    WHERE le.employee_id = ? AND strftime('%Y', le.date) = ?
  `, [employee.id, year.toString()]);

  const leaveStats = {};
  leaveEvents.forEach(e => {
    leaveStats[e.type_name] = (leaveStats[e.type_name] || 0) + e.hours;
  });

  return success({ leave_stats: leaveStats, employee: employeeName, year });
}

export async function getWorkAnalysisReport(env, request) {
  // 简化版：返回空报表
  return success({ timesheets: [], stats: {} });
}

export async function getPivotReport(env, request) {
  // 枢纽分析报表
  return success({ pivot_data: [], summary: {} });
}

export async function clearCache(env, request) {
  return success({ message: '快取已清除' });
}

export default {
  getAnnualLeaveReport,
  getWorkAnalysisReport,
  getPivotReport,
  clearCache
};

