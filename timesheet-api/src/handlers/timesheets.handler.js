/**
 * Timesheets Handler
 */
import { TimesheetService } from '../services/TimesheetService.js';
import { SystemService } from '../services/SystemService.js';
import { success } from '../utils/response.util.js';

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

export default {
  getTimesheetData,
  getLeaveQuota
};

