/**
 * System Service
 */
import { SystemRepository } from '../repositories/SystemRepository.js';

export class SystemService {
  constructor(db) {
    this.repo = new SystemRepository(db);
  }

  async getBusinessTypes() {
    return this.repo.getBusinessTypes();
  }

  async getLeaveTypes() {
    return this.repo.getLeaveTypes();
  }

  async getHolidays(year) {
    return this.repo.getHolidays(year);
  }

  async getWorkTypes() {
    return [
      { id: 1, name: '正常工時', rate: 1.00 },
      { id: 2, name: '平日加班(1.34)', rate: 1.34 },
      { id: 3, name: '平日加班(1.67)', rate: 1.67 },
      { id: 4, name: '休息日加班(1.34)', rate: 1.34 },
      { id: 5, name: '休息日加班(1.67)', rate: 1.67 },
      { id: 6, name: '休息日加班(2.67)', rate: 2.67 },
      { id: 7, name: '國定假日加班', rate: 2.00 }
    ];
  }

  async getLeaveQuota(employeeName, year) {
    // 简化版：返回基本配额
    return {
      quota: [
        { type: '特休', quota_hours: 56, used_hours: 0, remaining_hours: 56 },
        { type: '病假', quota_hours: 240, used_hours: 0, remaining_hours: 240 }
      ],
      employee: employeeName,
      year
    };
  }
}

export default SystemService;

