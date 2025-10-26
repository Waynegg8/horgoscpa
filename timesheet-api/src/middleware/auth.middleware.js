/**
 * 認證中間件
 * 提供統一的認證和授權檢查
 */

import { verifySession } from '../auth.js';
import { jsonResponse } from '../utils.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * 認證中間件 - 要求用戶已登入
 * @param {Function} handler - API 處理函數
 * @returns {Function} 包裝後的處理函數
 */
export function withAuth(handler) {
  return async (env, request) => {
    // 驗證 session
    const auth = await verifySession(env.DB, request);
    
    if (!auth || !auth.user) {
      return jsonResponse({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: '未授權，請先登入'
        }
      }, HTTP_STATUS.UNAUTHORIZED);
    }
    
    // 注入認證信息到請求對象
    request.auth = auth;
    request.user = auth.user;
    
    // 繼續執行 handler
    return handler(env, request);
  };
}

/**
 * 管理員中間件 - 要求用戶為管理員
 * @param {Function} handler - API 處理函數
 * @returns {Function} 包裝後的處理函數
 */
export function withAdmin(handler) {
  return withAuth(async (env, request) => {
    // 檢查用戶角色
    if (request.user.role !== 'admin') {
      return jsonResponse({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: '權限不足，需要管理員權限'
        }
      }, HTTP_STATUS.FORBIDDEN);
    }
    
    return handler(env, request);
  });
}

/**
 * 可選認證中間件 - 如果有 token 則驗證，沒有則跳過
 * @param {Function} handler - API 處理函數
 * @returns {Function} 包裝後的處理函數
 */
export function withOptionalAuth(handler) {
  return async (env, request) => {
    // 嘗試驗證
    const auth = await verifySession(env.DB, request);
    
    // 無論是否成功都繼續，但注入認證信息
    request.auth = auth || null;
    request.user = auth?.user || null;
    
    return handler(env, request);
  };
}

/**
 * 資源擁有權檢查 - 確保用戶有權訪問資源
 * @param {Function} getResource - 獲取資源的函數
 * @param {string} ownerField - 擁有者欄位名
 * @returns {Function} 中間件函數
 */
export function withOwnership(getResource, ownerField = 'created_by_user_id') {
  return (handler) => withAuth(async (env, request) => {
    const user = request.user;
    
    // 管理員可以訪問所有資源
    if (user.role === 'admin') {
      return handler(env, request);
    }
    
    // 獲取資源
    const resource = await getResource(env, request);
    
    if (!resource) {
      return jsonResponse({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: '資源不存在'
        }
      }, HTTP_STATUS.NOT_FOUND);
    }
    
    // 檢查擁有權
    if (resource[ownerField] !== user.id) {
      return jsonResponse({
        success: false,
        error: {
          code: ERROR_CODES.PERMISSION_DENIED,
          message: '權限不足，您只能訪問自己的資源'
        }
      }, HTTP_STATUS.FORBIDDEN);
    }
    
    // 注入資源到請求對象
    request.resource = resource;
    
    return handler(env, request);
  });
}

export default {
  withAuth,
  withAdmin,
  withOptionalAuth,
  withOwnership
};

