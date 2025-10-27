/**
 * Timesheet Service
 */
import { TimesheetRepository } from '../repositories/TimesheetRepository.js';
import { EmployeeRepository } from '../repositories/EmployeeRepository.js';

export class TimesheetService {
  constructor(db) {
    this.repo = new TimesheetRepository(db);
    this.empRepo = new EmployeeRepository(db);
  }

  async getByEmployee(employeeName, year, month = null) {
    const employee = await this.empRepo.findByName(employeeName);
    if (!employee) return { workEntries: [], leaveEntries: [] };

    const timesheets = await this.repo.findByEmployeeAndPeriod(employee.id, year, month);
    
    return {
      workEntries: timesheets.filter(t => t.regular_hours > 0 || t.overtime_hours > 0),
      leaveEntries: []
    };
  }

  async create(data) {
    return this.repo.create(data);
  }
}

export default TimesheetService;

