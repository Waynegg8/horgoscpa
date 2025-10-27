/**
 * Timesheet Service Module
 */

import { apiClient } from '../../core/api/client.js';

export class TimesheetService {
  static async getData(employeeName, year, month = null) {
    const params = { employee: employeeName, year };
    if (month) params.month = month;

    const response = await apiClient.get('/api/timesheet-data', { params });
    return response.data || response;
  }

  static async save(data) {
    const response = await apiClient.post('/api/save-timesheet', data);
    return response.data || response;
  }

  static async getLeaveQuota(employeeName, year) {
    const response = await apiClient.get('/api/leave-quota', {
      params: { employee: employeeName, year }
    });
    return response.data || response;
  }
}

window.TimesheetService = TimesheetService;
export default TimesheetService;

