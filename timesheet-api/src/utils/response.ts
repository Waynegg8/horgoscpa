/**
 * API 響應工具函數
 */

import { Context } from 'hono';
import { ApiResponse, ApiError, Pagination } from '../types';

/**
 * 成功響應
 */
export function successResponse<T>(data: T, pagination?: Pagination): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  
  if (pagination) {
    response.pagination = pagination;
  }
  
  return response;
}

/**
 * 錯誤響應
 */
export function errorResponse(
  code: string,
  message: string,
  field?: string,
  details?: any
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      field,
      details,
    },
  };
}

/**
 * JSON 響應（帶狀態碼）
 */
export function jsonResponse<T>(c: Context, data: ApiResponse<T>, status: number = 200) {
  return c.json(data, status);
}

/**
 * 創建分頁對象
 */
export function createPagination(
  total: number,
  limit: number,
  offset: number
): Pagination {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

