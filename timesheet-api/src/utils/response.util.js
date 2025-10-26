/**
 * 響應工具函數
 * 提供統一的 HTTP 響應格式
 */

import { corsHeaders } from '../utils.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * 成功響應（帶數據）
 * @param {any} data - 響應數據
 * @param {Object} meta - 元數據（分頁等）
 * @param {number} status - HTTP 狀態碼
 * @returns {Response}
 */
export function success(data, meta = null, status = HTTP_STATUS.OK) {
  const response = {
    success: true,
    data
  };

  if (meta) {
    response.meta = meta;
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * 創建響應（201）
 * @param {any} data - 創建的資源
 * @param {string} message - 成功訊息
 * @returns {Response}
 */
export function created(data, message = '創建成功') {
  return success(data, { message }, HTTP_STATUS.CREATED);
}

/**
 * 無內容響應（204）
 * @returns {Response}
 */
export function noContent() {
  return new Response(null, {
    status: HTTP_STATUS.NO_CONTENT,
    headers: corsHeaders
  });
}

/**
 * 錯誤響應
 * @param {string} message - 錯誤訊息
 * @param {string} code - 錯誤代碼
 * @param {number} status - HTTP 狀態碼
 * @param {Object} details - 錯誤詳情
 * @returns {Response}
 */
export function error(message, code = 'ERROR', status = HTTP_STATUS.INTERNAL_ERROR, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message
    }
  };

  if (details) {
    response.error.details = details;
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * 分頁響應
 * @param {Array} data - 數據數組
 * @param {number} total - 總記錄數
 * @param {number} page - 當前頁碼
 * @param {number} pageSize - 每頁數量
 * @returns {Response}
 */
export function paginated(data, total, page, pageSize) {
  return success(data, {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  });
}

/**
 * 列表響應（不分頁）
 * @param {Array} data - 數據數組
 * @returns {Response}
 */
export function list(data) {
  return success(data, {
    total: data.length
  });
}

export default {
  success,
  created,
  noContent,
  error,
  paginated,
  list
};

