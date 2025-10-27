/**
 * Employees Handler
 */
import { EmployeeService } from '../services/EmployeeService.js';
import { success, list } from '../utils/response.util.js';

export async function getEmployees(env, request) {
  const service = new EmployeeService(env.DB);
  const employees = await service.getAll();
  return list(employees);
}

export default { getEmployees };

