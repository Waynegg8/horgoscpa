/**
 * 前端應用配置模組
 * 集中管理所有應用層級的配置
 */

export const AppConfig = {
  // 應用信息
  app: {
    name: '霍爾果斯會計師事務所',
    version: '3.0.0',
    environment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'development'
      : 'production'
  },
  
  // API 配置
  api: {
    baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:8787'
      : 'https://timesheet-api.hergscpa.workers.dev',
    timeout: 30000,
    retryTimes: 3,
    retryDelay: 1000
  },
  
  // 功能開關
  features: {
    enableOfflineMode: true,
    enableNotifications: true,
    enableAutoSave: true,
    enableAnalytics: false
  },
  
  // UI 配置
  ui: {
    pageSize: 20,
    maxPageSize: 100,
    debounceDelay: 300,
    throttleDelay: 300,
    toastDuration: 3000,
    modalAnimationDuration: 200
  },
  
  // 本地存儲配置
  storage: {
    prefix: 'horgos_',
    keys: {
      session: 'session_token',
      user: 'user_info',
      theme: 'theme_preference',
      language: 'language_preference'
    },
    expiry: {
      session: 7 * 24 * 60 * 60 * 1000,  // 7 天
      cache: 1 * 60 * 60 * 1000           // 1 小時
    }
  },
  
  // 時間配置
  datetime: {
    timezone: 'Asia/Taipei',
    locale: 'zh-TW',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    datetimeFormat: 'YYYY-MM-DD HH:mm:ss'
  },
  
  // 驗證配置
  validation: {
    username: {
      minLength: 3,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_]+$/
    },
    password: {
      minLength: 8,
      maxLength: 128,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/
    }
  }
};

// 凍結配置，防止修改
Object.freeze(AppConfig);

// 導出到全局（向後兼容）
window.AppConfig = AppConfig;
window.CONFIG = {
  API_BASE: AppConfig.api.baseURL,
  ...AppConfig
};

export default AppConfig;

