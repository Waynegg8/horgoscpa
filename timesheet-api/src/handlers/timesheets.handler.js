/**
 * Timesheets Handler
 */
import { TimesheetService } from '../services/TimesheetService.js';
import { SystemService } from '../services/SystemService.js';
import { BaseRepository } from '../repositories/BaseRepository.js';
import { success, created } from '../utils/response.util.js';
import { TABLES } from '../config/constants.js';

export async function getTimesheetData(env, request) {
  const url = new URL(request.url);
  const employee = url.searchParams.get('employee');
  const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();
  const month = url.searchParams.get('month') ? parseInt(url.searchParams.get('month')) : null;

  const service = new TimesheetService(env.DB);
  const data = await service.getByEmployee(employee, year, month);
  
  return success(data);
}

export async function getLeaveQuota(env, request) {
  const url = new URL(request.url);
  const employee = url.searchParams.get('employee');
  const year = parseInt(url.searchParams.get('year')) || new Date().getFullYear();

  const service = new SystemService(env.DB);
  const quota = await service.getLeaveQuota(employee, year);
  
  return success(quota);
}

export async function saveTimesheet(env, request) {
  const data = await request.json();
  const repo = new BaseRepository(env.DB, TABLES.TIMESHEETS);
  
  // 简化版：直接创建
  const id = await repo.create(data);
  const timesheet = await repo.findById(id);
  
  return created(timesheet);
}

export default {
  getTimesheetData,
  getLeaveQuota,
  saveTimesheet
};
