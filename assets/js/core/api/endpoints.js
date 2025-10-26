/**
 * API 端點定義
 * 集中管理所有 API 路徑
 */

export const endpoints = {
  // 認證
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    verify: '/api/verify',  // 向後兼容
    changePassword: '/api/auth/change-password'
  },
  
  // 客戶
  clients: {
    list: '/api/clients',
    detail: (id) => `/api/clients/${id}`,
    create: '/api/clients',
    update: (id) => `/api/clients/${id}`,
    delete: (id) => `/api/clients/${id}`,
    stats: (id) => `/api/clients/${id}/stats`
  },
  
  // 客戶服務
  clientServices: {
    list: (clientId) => `/api/clients/${clientId}/services`,
    detail: (clientId, serviceId) => `/api/clients/${clientId}/services/${serviceId}`,
    create: (clientId) => `/api/clients/${clientId}/services`,
    update: (clientId, serviceId) => `/api/clients/${clientId}/services/${serviceId}`,
    delete: (clientId, serviceId) => `/api/clients/${clientId}/services/${serviceId}`,
    toggle: (clientId, serviceId) => `/api/clients/${clientId}/services/${serviceId}/toggle`
  },
  
  // 任務
  tasks: {
    list: '/api/tasks',
    detail: (id) => `/api/tasks/${id}`,
    create: '/api/tasks',
    update: (id) => `/api/tasks/${id}`,
    delete: (id) => `/api/tasks/${id}`,
    stages: (id) => `/api/tasks/${id}/stages`,
    updateStage: (taskId, stageId) => `/api/tasks/${taskId}/stages/${stageId}`,
    stats: '/api/tasks/stats'
  },
  
  // 範本
  templates: {
    list: '/api/templates',
    detail: (id) => `/api/templates/${id}`,
    create: '/api/templates',
    update: (id) => `/api/templates/${id}`,
    delete: (id) => `/api/templates/${id}`
  },
  
  // 工時
  timesheets: {
    list: '/api/timesheets',
    create: '/api/timesheets',
    update: (id) => `/api/timesheets/${id}`,
    summary: '/api/timesheets/summary',
    byEmployee: (employeeId) => `/api/timesheets/employee/${employeeId}`
  },
  
  // 報表
  reports: {
    annualLeave: '/api/reports/annual-leave',
    workAnalysis: '/api/reports/work-analysis',
    pivot: '/api/reports/pivot',
    clearCache: '/api/reports/clear-cache'
  },
  
  // 知識庫
  knowledge: {
    sops: {
      list: '/api/sops',
      detail: (id) => `/api/sops/${id}`,
      create: '/api/sops',
      update: (id) => `/api/sops/${id}`,
      delete: (id) => `/api/sops/${id}`
    },
    categories: {
      list: '/api/sop-categories',
      create: '/api/sop-categories'
    }
  },
  
  // 系統
  system: {
    employees: '/api/system/employees',
    config: '/api/system/config',
    holidays: '/api/system/holidays',
    leaveTypes: '/api/system/leave-types',
    businessTypes: '/api/system/business-types'
  }
};

// 凍結端點定義
Object.freeze(endpoints);

// 導出到全局
window.endpoints = endpoints;

export default endpoints;

