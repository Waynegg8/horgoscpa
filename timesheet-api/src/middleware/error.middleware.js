/**
 * 錯誤處理中間件
 * 統一捕獲和處理所有錯誤
 */

import { jsonResponse } from '../utils.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';

/**
 * 錯誤處理中間件
 * @param {Function} handler - API 處理函數
 * @returns {Function} 包裝後的處理函數
 */
export function withErrorHandler(handler) {
  return async (env, request) => {
    try {
      return await handler(env, request);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

/**
 * 處理錯誤
 * @param {Error} error - 錯誤對象
 * @param {Request} request - 請求對象
 * @returns {Response} 錯誤響應
 */
function handleError(error, request) {
  // 記錄錯誤（移除敏感信息）
  console.error('[Error]', {
    message: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  });

  // 根據錯誤類型返回不同響應
  if (error instanceof ValidationError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: error.message,
        details: error.errors
      }
    }, HTTP_STATUS.BAD_REQUEST);
  }

  if (error instanceof AuthenticationError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: error.message
      }
    }, HTTP_STATUS.UNAUTHORIZED);
  }

  if (error instanceof ForbiddenError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.FORBIDDEN,
        message: error.message
      }
    }, HTTP_STATUS.FORBIDDEN);
  }

  if (error instanceof NotFoundError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: error.message
      }
    }, HTTP_STATUS.NOT_FOUND);
  }

  if (error instanceof ConflictError) {
    return jsonResponse({
      success: false,
      error: {
        code: ERROR_CODES.CONFLICT,
        message: error.message
      }
    }, HTTP_STATUS.CONFLICT);
  }

  if (error instanceof BusinessError) {
    return jsonResponse({
      success: false,
      error: {
        code: error.code || ERROR_CODES.INTERNAL_ERROR,
        message: error.message
      }
    }, HTTP_STATUS.BAD_REQUEST);
  }

  // 默認錯誤（不暴露內部錯誤細節）
  return jsonResponse({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: '服務器內部錯誤，請稍後再試'
    }
  }, HTTP_STATUS.INTERNAL_ERROR);
}

/**
 * 自定義錯誤類
 */
export class ValidationError extends Error {
  constructor(message, errors = {}) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class AuthenticationError extends Error {
  constructor(message = '認證失敗') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = '權限不足') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = '資源不存在') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message = '資源衝突') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
  }
}

export default {
  withErrorHandler,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessError
};

