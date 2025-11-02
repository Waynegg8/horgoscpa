/**
 * 数据失效与智能预加载系统
 * 
 * 当 API 操作导致数据变更时，自动：
 * 1. 清除受影响的缓存
 * 2. 触发相关页面的数据预加载
 */

(function() {
  'use strict';

  // ==================== 数据依赖关系映射 ====================
  
  const DATA_DEPENDENCIES = {
    // 任务相关操作
    'tasks': {
      affectedCaches: ['tasks_pending', 'tasks_in_progress', 'tasks_completed', 'tasks_all', 'dashboard'],
      affectedPages: ['dashboard', 'tasks'],
      description: '任务数据变更'
    },
    
    // 工时相关操作
    'timesheets': {
      affectedCaches: ['timesheets_recent', 'timesheets_summary', 'timesheets_more', 'dashboard', 'costs_by_employee'],
      affectedPages: ['dashboard', 'timesheets', 'costs'],
      clearWeekCache: true, // 需要清除周缓存
      description: '工时数据变更'
    },
    
    // 客户相关操作
    'clients': {
      affectedCaches: ['clients_all', 'clients_page1', 'clients_page2', 'clients_page3', 'clients_page4', 'clients_page5', 'dashboard'],
      affectedPages: ['dashboard', 'clients'],
      description: '客户数据变更'
    },
    
    // 请假相关操作
    'leaves': {
      affectedCaches: ['leaves_recent', 'leaves_balances', 'leaves_all', 'leaves_pending', 'leaves_approved', 'dashboard'],
      affectedPages: ['dashboard', 'leaves', 'timesheets'],
      description: '请假数据变更'
    },
    
    // 收据/收款相关操作
    'receipts': {
      affectedCaches: ['receipts_all', 'receipts_unpaid', 'receipts_paid', 'receipts_statistics', 'receipts_aging', 'dashboard'],
      affectedPages: ['dashboard', 'receipts'],
      description: '收据/收款数据变更'
    },
    
    // 服务配置相关操作
    'services': {
      affectedCaches: ['services_types', 'clients_all'],
      affectedPages: ['settings', 'clients'],
      description: '服务配置变更'
    },
    
    // 用户相关操作
    'users': {
      affectedCaches: ['users', 'me'],
      affectedPages: ['settings'],
      description: '用户数据变更'
    },
    
    // 知识库相关操作
    'knowledge': {
      affectedCaches: ['sop_list', 'faq_list', 'documents_list'],
      affectedPages: ['knowledge'],
      description: '知识库数据变更'
    },
    
    // 成本相关操作
    'costs': {
      affectedCaches: ['costs_summary', 'costs_by_employee', 'costs_by_client'],
      affectedPages: ['costs'],
      description: '成本数据变更'
    },
    
    // 薪资相关操作
    'payroll': {
      affectedCaches: ['payroll_summary', 'payroll_latest'],
      affectedPages: ['payroll'],
      description: '薪资数据变更'
    }
  };

  // ==================== 核心功能 ====================
  
  class DataInvalidation {
    constructor() {
      this.listeners = new Map(); // 监听器
      this.processing = new Set(); // 防止重复处理
      
      console.log('[DataInvalidation] 数据失效系统已启动');
    }
    
    /**
     * 触发数据失效
     * @param {string} dataType - 数据类型（如 'tasks', 'timesheets'）
     * @param {object} options - 额外选项
     */
    async invalidate(dataType, options = {}) {
      if (this.processing.has(dataType)) {
        console.log(`[DataInvalidation] ⏭ 跳过重复处理: ${dataType}`);
        return;
      }
      
      const config = DATA_DEPENDENCIES[dataType];
      if (!config) {
        console.warn(`[DataInvalidation] ⚠ 未知数据类型: ${dataType}`);
        return;
      }
      
      this.processing.add(dataType);
      
      console.log(`[DataInvalidation] 🔄 ${config.description} - 开始处理...`);
      
      try {
        // 1. 清除受影响的缓存
        this.clearAffectedCaches(config, options);
        
        // 2. 触发预加载（延迟执行，避免阻塞）
        setTimeout(() => {
          this.triggerPreload(config);
        }, 200);
        
        // 3. 通知监听器
        this.notifyListeners(dataType);
        
        console.log(`[DataInvalidation] ✅ ${config.description} - 处理完成`);
      } catch (err) {
        console.error(`[DataInvalidation] ❌ 处理失败:`, err);
      } finally {
        this.processing.delete(dataType);
      }
    }
    
    /**
     * 清除受影响的缓存
     */
    clearAffectedCaches(config, options) {
      const clearedCaches = [];
      
      // 清除 DataCache 中的缓存
      if (window.DataCache && config.affectedCaches) {
        config.affectedCaches.forEach(cacheKey => {
          const fullKey = `data_cache_${cacheKey}`;
          try {
            localStorage.removeItem(fullKey);
            clearedCaches.push(cacheKey);
          } catch (e) {
            console.warn(`[DataInvalidation] ⚠ 清除缓存失败: ${cacheKey}`, e);
          }
        });
      }
      
      // 清除工时周缓存
      if (config.clearWeekCache || options.clearWeekCache) {
        this.clearTimesheetWeekCaches();
      }
      
      if (clearedCaches.length > 0) {
        console.log(`[DataInvalidation] 🗑️ 已清除 ${clearedCaches.length} 个缓存:`, clearedCaches);
      }
    }
    
    /**
     * 清除工时周缓存
     */
    clearTimesheetWeekCaches() {
      const keysToRemove = [];
      
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('timesheet_week_')) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        if (keysToRemove.length > 0) {
          console.log(`[DataInvalidation] 🗑️ 已清除 ${keysToRemove.length} 个工时周缓存`);
        }
      } catch (e) {
        console.warn('[DataInvalidation] ⚠ 清除工时周缓存失败:', e);
      }
    }
    
    /**
     * 触发预加载
     */
    triggerPreload(config) {
      if (!window.DataCache || !config.affectedPages) return;
      
      console.log(`[DataInvalidation] ⚡ 触发预加载:`, config.affectedPages);
      
      // 触发相关数据预加载
      if (config.affectedCaches && config.affectedCaches.length > 0) {
        // 只预加载受影响的数据
        const preloadTasks = config.affectedCaches.map(cacheKey => {
          return { cacheKey, force: true };
        });
        
        // 使用 DataCache 的预加载功能
        window.DataCache.preloadAll({ force: true, adminMode: true });
      }
    }
    
    /**
     * 通知监听器
     */
    notifyListeners(dataType) {
      const listeners = this.listeners.get(dataType);
      if (listeners && listeners.length > 0) {
        listeners.forEach(callback => {
          try {
            callback(dataType);
          } catch (e) {
            console.warn('[DataInvalidation] ⚠ 监听器执行失败:', e);
          }
        });
      }
    }
    
    /**
     * 注册监听器
     */
    on(dataType, callback) {
      if (!this.listeners.has(dataType)) {
        this.listeners.set(dataType, []);
      }
      this.listeners.get(dataType).push(callback);
    }
    
    /**
     * 移除监听器
     */
    off(dataType, callback) {
      if (!this.listeners.has(dataType)) return;
      const listeners = this.listeners.get(dataType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  // ==================== 导出全局实例 ====================
  
  if (!window.DataInvalidation) {
    window.DataInvalidation = new DataInvalidation();
  }
  
})();

