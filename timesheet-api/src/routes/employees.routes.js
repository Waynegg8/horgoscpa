/**
 * Employees Routes
 */
import { getEmployees } from '../handlers/employees.handler.js';
import { withAuth } from '../middleware/auth.middleware.js';
import { withErrorHandler } from '../middleware/error.middleware.js';

export function registerEmployeeRoutes(router) {
  router.get('/api/employees', withErrorHandler(withAuth(getEmployees)));
}

export default registerEmployeeRoutes;

