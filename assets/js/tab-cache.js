/**
 * 通用 Tab 缓存系统
 * 避免重复加载已访问过的 tab 内容
 */
(function() {
  'use strict';

  // 创建全局 TabCache 对象
  window.TabCache = {
    // 缓存标记对象
    loaded: {},
    
    /**
     * 初始化 tab 缓存系统
     * @param {Array<string>} tabNames - tab 名称数组，例如 ['sop', 'faq', 'resources']
     */
    init: function(tabNames) {
      tabNames.forEach(name => {
        this.loaded[name] = false;
      });
      console.log('[TabCache] 初始化完成，tabs:', tabNames);
    },
    
    /**
     * 检查 tab 是否已加载
     * @param {string} tabName - tab 名称
     * @returns {boolean}
     */
    isLoaded: function(tabName) {
      return this.loaded[tabName] === true;
    },
    
    /**
     * 标记 tab 为已加载
     * @param {string} tabName - tab 名称
     */
    markLoaded: function(tabName) {
      this.loaded[tabName] = true;
      console.log(`[TabCache] ✓ ${tabName} 已标记为已加载`);
    },
    
    /**
     * 标记 tab 为未加载（强制刷新）
     * @param {string} tabName - tab 名称
     */
    markUnloaded: function(tabName) {
      this.loaded[tabName] = false;
      console.log(`[TabCache] 🔄 ${tabName} 已标记为未加载`);
    },
    
    /**
     * 清除所有缓存标记
     */
    clearAll: function() {
      Object.keys(this.loaded).forEach(key => {
        this.loaded[key] = false;
      });
      console.log('[TabCache] 🗑 所有缓存标记已清除');
    },
    
    /**
     * 智能 switchTab 包装器
     * @param {string} currentTab - 当前激活的 tab
     * @param {string} targetTab - 要切换到的 tab
     * @param {Function} loadFunction - 加载数据的函数
     * @param {boolean} forceRefresh - 是否强制刷新
     * @returns {boolean} - 是否需要加载数据
     */
    shouldLoad: function(currentTab, targetTab, forceRefresh = false) {
      // 如果点击当前 tab，强制刷新
      if (currentTab === targetTab && !forceRefresh) {
        console.log(`[TabCache] 🔄 点击当前 tab ${targetTab}，强制刷新`);
        this.markUnloaded(targetTab);
        return true;
      }
      
      // 如果强制刷新，返回 true
      if (forceRefresh) {
        this.markUnloaded(targetTab);
        return true;
      }
      
      // 如果已加载，返回 false（使用缓存）
      if (this.isLoaded(targetTab)) {
        console.log(`[TabCache] ⚡ ${targetTab} 使用缓存内容`);
        return false;
      }
      
      // 未加载，返回 true（需要加载）
      return true;
    }
  };

  console.log('[TabCache] Tab 缓存系统已就绪');
})();


