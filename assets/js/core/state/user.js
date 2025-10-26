/**
 * 用戶狀態模組
 * 管理用戶登入狀態
 */

import { Store } from './store.js';
import { AppConfig } from '../config/app.config.js';

class UserState extends Store {
  constructor() {
    super({
      user: null,
      token: null,
      isAuthenticated: false
    });
  }

  /**
   * 設置用戶信息
   * @param {Object} user - 用戶信息
   * @param {string} token - Session Token
   */
  setUser(user, token) {
    // 保存到 localStorage
    localStorage.setItem(AppConfig.storage.keys.session, token);
    localStorage.setItem(AppConfig.storage.keys.user, JSON.stringify(user));
    
    // 更新狀態
    this.setState({
      user,
      token,
      isAuthenticated: true
    });
  }

  /**
   * 獲取用戶信息
   */
  getUser() {
    return this.state.user;
  }

  /**
   * 獲取 Token
   */
  getToken() {
    return this.state.token || localStorage.getItem(AppConfig.storage.keys.session);
  }

  /**
   * 檢查是否已登入
   */
  isLoggedIn() {
    return this.state.isAuthenticated;
  }

  /**
   * 檢查是否為管理員
   */
  isAdmin() {
    return this.state.user?.role === 'admin';
  }

  /**
   * 登出
   */
  logout() {
    // 清除 localStorage
    localStorage.removeItem(AppConfig.storage.keys.session);
    localStorage.removeItem(AppConfig.storage.keys.user);
    
    // 清除狀態
    this.setState({
      user: null,
      token: null,
      isAuthenticated: false
    });
  }

  /**
   * 從 localStorage 恢復狀態
   */
  restore() {
    const token = localStorage.getItem(AppConfig.storage.keys.session);
    const userInfo = localStorage.getItem(AppConfig.storage.keys.user);
    
    if (token && userInfo) {
      try {
        const user = JSON.parse(userInfo);
        this.setState({
          user,
          token,
          isAuthenticated: true
        });
        return true;
      } catch (error) {
        console.error('[UserState] Failed to restore user state:', error);
        this.logout();
      }
    }
    
    return false;
  }
}

// 創建全局實例
export const userState = new UserState();

// 嘗試恢復狀態
userState.restore();

// 導出到全局
window.userState = userState;
window.currentUser = userState.getUser();  // 向後兼容
window.sessionToken = userState.getToken();  // 向後兼容

// 訂閱用戶狀態變化，同步到全局變量（向後兼容）
userState.subscribe('user', (newUser) => {
  window.currentUser = newUser;
});

userState.subscribe('token', (newToken) => {
  window.sessionToken = newToken;
});

export default userState;

