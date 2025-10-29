/**
 * 錯誤處理中間件
 */

import { Context } from 'hono';
import { AppError, ErrorCode } from '../types';
import { errorResponse, jsonResponse } from '../utils/response';

/**
 * 全局錯誤處理中間件
 */
export async function errorHandler(error: Error, c: Context) {
  console.error('Error:', error);
  
  // 自訂應用錯誤
  if (error instanceof AppError) {
    return jsonResponse(
      c,
      errorResponse(error.code, error.message, error.field, error.details),
      error.statusCode
    );
  }
  
  // 資料庫錯誤
  if (error.message.includes('SQLITE') || error.message.includes('database')) {
    return jsonResponse(
      c,
      errorResponse(ErrorCode.DATABASE_ERROR, '資料庫錯誤：' + error.message),
      500
    );
  }
  
  // 未知錯誤
  return jsonResponse(
    c,
    errorResponse(
      ErrorCode.INTERNAL_ERROR,
      c.env?.ENVIRONMENT === 'development' 
        ? error.message 
        : '伺服器內部錯誤'
    ),
    500
  );
}

