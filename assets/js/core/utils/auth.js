/**
 * Auth Utils
 * 认证相关工具函数
 */

import { apiClient } from '../api/client.js';
import { AppConfig } from '../config/app.config.js';

export class AuthUtils {
  /**
   * 检查是否已登录
   */
  static async checkAuth() {
    const token = localStorage.getItem(AppConfig.storage.keys.session);
    if (!token) return false;

    try {
      const response = await apiClient.get('/api/verify');
      if (response.success && response.data?.user) {
        this.setCurrentUser(response.data.user);
        return true;
      }
    } catch (error) {
      console.error('[Auth] Verification failed:', error);
      this.clearAuth();
    }

    return false;
  }

  /**
   * 登录
   */
  static async login(username, password) {
    const response = await apiClient.post('/api/login', { username, password });
    
    if (response.success && response.session_token) {
      localStorage.setItem(AppConfig.storage.keys.session, response.session_token);
      this.setCurrentUser(response.user);
      return { success: true, user: response.user };
    }

    throw new Error(response.error || '登录失败');
  }

  /**
   * 登出
   */
  static async logout() {
    try {
      await apiClient.post('/api/logout');
    } catch (error) {
      console.error('[Auth] Logout failed:', error);
    } finally {
      this.clearAuth();
      window.location.href = '/login.html';
    }
  }

  /**
   * 设置当前用户
   */
  static setCurrentUser(user) {
    localStorage.setItem(AppConfig.storage.keys.user, JSON.stringify(user));
    window.currentUser = user;
  }

  /**
   * 获取当前用户
   */
  static getCurrentUser() {
    if (window.currentUser) return window.currentUser;

    const userJson = localStorage.getItem(AppConfig.storage.keys.user);
    if (userJson) {
      try {
        window.currentUser = JSON.parse(userJson);
        return window.currentUser;
      } catch (e) {
        console.error('[Auth] Failed to parse user data:', e);
      }
    }

    return null;
  }

  /**
   * 清除认证信息
   */
  static clearAuth() {
    localStorage.removeItem(AppConfig.storage.keys.session);
    localStorage.removeItem(AppConfig.storage.keys.user);
    window.currentUser = null;
    window.sessionToken = null;
  }

  /**
   * 要求登录
   */
  static requireAuth() {
    if (!this.getCurrentUser()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }

  /**
   * 要求管理员权限
   */
  static requireAdmin() {
    const user = this.getCurrentUser();
    if (!user || user.role !== 'admin') {
      alert('权限不足，需要管理员权限');
      return false;
    }
    return true;
  }
}

// 导出到全局
window.AuthUtils = AuthUtils;

export default AuthUtils;

