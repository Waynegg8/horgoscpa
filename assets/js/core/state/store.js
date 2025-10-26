/**
 * 狀態管理器
 * 輕量級狀態管理，基於觀察者模式
 */

export class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = new Map();
  }

  /**
   * 獲取完整狀態
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 獲取單個狀態值
   */
  get(key) {
    return this.state[key];
  }

  /**
   * 設置狀態
   * @param {Object} updates - 要更新的狀態
   */
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // 通知訂閱者
    this._notify(oldState, this.state);
  }

  /**
   * 訂閱狀態變化
   * @param {string|Array<string>} keys - 要訂閱的鍵（可以是單個或數組）
   * @param {Function} callback - 回調函數
   * @returns {Function} 取消訂閱函數
   */
  subscribe(keys, callback) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    
    keyArray.forEach(key => {
      if (!this.listeners.has(key)) {
        this.listeners.set(key, []);
      }
      this.listeners.get(key).push(callback);
    });
    
    // 返回取消訂閱函數
    return () => {
      keyArray.forEach(key => {
        const callbacks = this.listeners.get(key);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      });
    };
  }

  /**
   * 清除所有狀態
   */
  clear() {
    const oldState = { ...this.state };
    this.state = {};
    this._notify(oldState, this.state);
  }

  /**
   * 重置到初始狀態
   */
  reset(initialState = {}) {
    const oldState = { ...this.state };
    this.state = { ...initialState };
    this._notify(oldState, this.state);
  }

  /**
   * 通知訂閱者
   * @private
   */
  _notify(oldState, newState) {
    // 找出變化的鍵
    const changedKeys = new Set([
      ...Object.keys(newState),
      ...Object.keys(oldState)
    ].filter(key => newState[key] !== oldState[key]));
    
    // 通知對應的訂閱者
    changedKeys.forEach(key => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(newState[key], oldState[key]);
          } catch (error) {
            console.error(`[Store] Error in subscriber callback for key "${key}":`, error);
          }
        });
      }
    });
  }
}

export default Store;

