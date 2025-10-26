/**
 * API 客戶端模組
 * 提供統一的 HTTP 請求方法
 */

import { AppConfig } from '../config/app.config.js';

/**
 * API 客戶端類
 */
export class APIClient {
  constructor(baseURL, timeout = 30000) {
    this.baseURL = baseURL || AppConfig.api.baseURL;
    this.timeout = timeout;
  }

  /**
   * 發送請求
   * @param {string} method - HTTP 方法
   * @param {string} url - API 端點
   * @param {Object} options - 請求選項
   * @returns {Promise<any>} 響應數據
   */
  async request(method, url, options = {}) {
    const { data, params, headers = {}, timeout } = options;
    
    // 構建完整 URL
    const fullUrl = this._buildUrl(url, params);
    
    // 構建請求配置
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this._getAuthHeaders(),
        ...headers
      }
    };
    
    // 添加請求體
    if (data) {
      config.body = JSON.stringify(data);
    }
    
    // 發送請求（帶超時）
    try {
      const response = await this._fetchWithTimeout(
        fullUrl,
        config,
        timeout || this.timeout
      );
      
      // 解析響應
      return await this._handleResponse(response);
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * GET 請求
   */
  get(url, options = {}) {
    return this.request('GET', url, options);
  }

  /**
   * POST 請求
   */
  post(url, data, options = {}) {
    return this.request('POST', url, { ...options, data });
  }

  /**
   * PUT 請求
   */
  put(url, data, options = {}) {
    return this.request('PUT', url, { ...options, data });
  }

  /**
   * DELETE 請求
   */
  delete(url, options = {}) {
    return this.request('DELETE', url, options);
  }

  /**
   * 構建完整 URL
   * @private
   */
  _buildUrl(url, params) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)
      ).toString();
      
      return queryString ? `${fullUrl}?${queryString}` : fullUrl;
    }
    
    return fullUrl;
  }

  /**
   * 獲取認證標頭
   * @private
   */
  _getAuthHeaders() {
    const token = localStorage.getItem(AppConfig.storage.keys.session);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * 帶超時的 fetch
   * @private
   */
  async _fetchWithTimeout(url, config, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('請求超時，請檢查網絡連接');
      }
      throw error;
    }
  }

  /**
   * 處理響應
   * @private
   */
  async _handleResponse(response) {
    // 解析 JSON
    const data = await response.json().catch(() => ({}));

    // 處理 HTTP 錯誤
    if (!response.ok) {
      if (response.status === 401) {
        // 未授權 - 清除登入狀態並跳轉
        localStorage.removeItem(AppConfig.storage.keys.session);
        localStorage.removeItem(AppConfig.storage.keys.user);
        window.location.href = '/login.html';
        throw new Error('登入已過期，請重新登入');
      }
      
      if (response.status === 403) {
        throw new Error('權限不足');
      }
      
      if (response.status === 404) {
        throw new Error('資源不存在');
      }
      
      if (response.status >= 500) {
        throw new Error('伺服器錯誤，請稍後再試');
      }
      
      // 其他錯誤
      throw new Error(data.error?.message || data.error || '請求失敗');
    }

    // 檢查業務錯誤
    if (data.success === false) {
      throw new Error(data.error?.message || data.error || '操作失敗');
    }

    return data;
  }

  /**
   * 處理錯誤
   * @private
   */
  _handleError(error) {
    console.error('[API Error]', error);
    
    // 網絡錯誤
    if (error.message === '請求超時，請檢查網絡連接' || error.name === 'TypeError') {
      return new Error('網絡連接失敗，請檢查您的網絡');
    }
    
    return error;
  }
}

// 創建全局實例
export const apiClient = new APIClient(AppConfig.api.baseURL);

// 導出到全局（向後兼容）
window.apiClient = apiClient;
window.APIClient = APIClient;

export default apiClient;

