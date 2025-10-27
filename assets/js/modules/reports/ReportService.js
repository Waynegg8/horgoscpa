/**
 * Report Service Module
 */

import { apiClient } from '../../core/api/client.js';

export class ReportService {
  static async getAnnualLeave(employeeName, year) {
    const response = await apiClient.get('/api/reports/annual-leave', {
      params: { employee: employeeName, year }
    });
    return response.data || response;
  }

  static async getWorkAnalysis(params = {}) {
    const response = await apiClient.get('/api/reports/work-analysis', { params });
    return response.data || response;
  }

  static async getPivot(params = {}) {
    const response = await apiClient.get('/api/reports/pivot', { params });
    return response.data || response;
  }

  static async clearCache() {
    const response = await apiClient.post('/api/reports/clear-cache');
    return response.data || response;
  }
}

window.ReportService = ReportService;
export default ReportService;

