/**
 * 前端常量定義
 * 與後端保持一致
 */

// 用戶角色
export const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

// 任務狀態
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// 任務類型
export const TASK_TYPE = {
  TASK: 'task',
  PROJECT: 'project',
  RECURRING: 'recurring'
};

// 任務分類
export const TASK_CATEGORY = {
  RECURRING: 'recurring',
  BUSINESS: 'business',
  FINANCE: 'finance',
  CLIENT_SERVICE: 'client_service',
  GENERAL: 'general'
};

// 任務優先級
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// 服務類型
export const SERVICE_TYPE = {
  ACCOUNTING: 'accounting',
  VAT: 'vat',
  INCOME_TAX: 'income_tax',
  WITHHOLDING: 'withholding',
  AUDIT: 'audit'
};

// 服務頻率
export const SERVICE_FREQUENCY = {
  MONTHLY: 'monthly',
  BIMONTHLY: 'bimonthly',
  QUARTERLY: 'quarterly',
  BIANNUAL: 'biannual',
  ANNUAL: 'annual'
};

// 客戶狀態
export const CLIENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  POTENTIAL: 'potential'
};

// 顯示名稱映射
export const DISPLAY_NAMES = {
  USER_ROLES: {
    [USER_ROLES.ADMIN]: '管理員',
    [USER_ROLES.EMPLOYEE]: '員工'
  },
  TASK_STATUS: {
    [TASK_STATUS.PENDING]: '待處理',
    [TASK_STATUS.IN_PROGRESS]: '進行中',
    [TASK_STATUS.ON_HOLD]: '暫停',
    [TASK_STATUS.COMPLETED]: '已完成',
    [TASK_STATUS.CANCELLED]: '已取消'
  },
  TASK_TYPE: {
    [TASK_TYPE.TASK]: '任務',
    [TASK_TYPE.PROJECT]: '專案',
    [TASK_TYPE.RECURRING]: '週期任務'
  },
  TASK_CATEGORY: {
    [TASK_CATEGORY.RECURRING]: '周期任務',
    [TASK_CATEGORY.BUSINESS]: '工商登記',
    [TASK_CATEGORY.FINANCE]: '財稅簽證',
    [TASK_CATEGORY.CLIENT_SERVICE]: '客戶服務',
    [TASK_CATEGORY.GENERAL]: '一般任務'
  },
  TASK_PRIORITY: {
    [TASK_PRIORITY.LOW]: '低',
    [TASK_PRIORITY.MEDIUM]: '中',
    [TASK_PRIORITY.HIGH]: '高'
  },
  SERVICE_TYPE: {
    [SERVICE_TYPE.ACCOUNTING]: '記帳服務',
    [SERVICE_TYPE.VAT]: '營業稅申報',
    [SERVICE_TYPE.INCOME_TAX]: '營所稅申報',
    [SERVICE_TYPE.WITHHOLDING]: '扣繳申報',
    [SERVICE_TYPE.AUDIT]: '財務簽證'
  },
  SERVICE_FREQUENCY: {
    [SERVICE_FREQUENCY.MONTHLY]: '每月',
    [SERVICE_FREQUENCY.BIMONTHLY]: '雙月',
    [SERVICE_FREQUENCY.QUARTERLY]: '每季',
    [SERVICE_FREQUENCY.BIANNUAL]: '半年',
    [SERVICE_FREQUENCY.ANNUAL]: '年度'
  },
  CLIENT_STATUS: {
    [CLIENT_STATUS.ACTIVE]: '啟用',
    [CLIENT_STATUS.INACTIVE]: '停用',
    [CLIENT_STATUS.POTENTIAL]: '潛在'
  }
};

// 凍結所有常量
Object.freeze(USER_ROLES);
Object.freeze(TASK_STATUS);
Object.freeze(TASK_TYPE);
Object.freeze(TASK_CATEGORY);
Object.freeze(TASK_PRIORITY);
Object.freeze(SERVICE_TYPE);
Object.freeze(SERVICE_FREQUENCY);
Object.freeze(CLIENT_STATUS);
Object.freeze(DISPLAY_NAMES);

// 導出到全局
window.USER_ROLES = USER_ROLES;
window.TASK_STATUS = TASK_STATUS;
window.TASK_TYPE = TASK_TYPE;
window.TASK_CATEGORY = TASK_CATEGORY;
window.TASK_PRIORITY = TASK_PRIORITY;
window.SERVICE_TYPE = SERVICE_TYPE;
window.SERVICE_FREQUENCY = SERVICE_FREQUENCY;
window.CLIENT_STATUS = CLIENT_STATUS;
window.DISPLAY_NAMES = DISPLAY_NAMES;

export default {
  USER_ROLES,
  TASK_STATUS,
  TASK_TYPE,
  TASK_CATEGORY,
  TASK_PRIORITY,
  SERVICE_TYPE,
  SERVICE_FREQUENCY,
  CLIENT_STATUS,
  DISPLAY_NAMES
};

