/**
 * Employee Service Module
 */

import { apiClient } from '../../core/api/client.js';

export class EmployeeService {
  static async getAll() {
    const response = await apiClient.get('/api/employees');
    return response.data || response || [];
  }

  static async getById(id) {
    const response = await apiClient.get(`/api/employees/${id}`);
    return response.data || response;
  }

  static async create(data) {
    const response = await apiClient.post('/api/employees', data);
    return response.data || response;
  }

  static async update(id, data) {
    const response = await apiClient.put(`/api/employees/${id}`, data);
    return response.data || response;
  }
}

window.EmployeeService = EmployeeService;
export default EmployeeService;

