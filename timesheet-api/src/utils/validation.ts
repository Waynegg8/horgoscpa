/**
 * 驗證工具函數
 */

import { ValidationError } from '../types';

/**
 * 驗證必填欄位
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} 為必填欄位`, fieldName);
  }
}

/**
 * 驗證 Email 格式
 */
export function validateEmail(email: string, fieldName: string = 'email'): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`${fieldName} 格式錯誤`, fieldName);
  }
}

/**
 * 驗證密碼強度（至少 6 個字元）
 */
export function validatePassword(password: string): void {
  if (password.length < 6) {
    throw new ValidationError('密碼至少需要 6 個字元', 'password');
  }
}

/**
 * 驗證性別
 * ⭐ 規格要求：L610-L613 允許 'M', 'F', '男', '女'
 */
export function validateGender(gender: string): void {
  if (!['M', 'F', '男', '女'].includes(gender)) {
    throw new ValidationError('性別必須為：M（男）或 F（女）', 'gender');
  }
}

/**
 * 驗證日期格式 (YYYY-MM-DD)
 */
export function validateDateFormat(date: string, fieldName: string): void {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    throw new ValidationError(`${fieldName} 格式錯誤，應為 YYYY-MM-DD`, fieldName);
  }
  
  // 檢查日期是否有效
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new ValidationError(`${fieldName} 日期無效`, fieldName);
  }
}

/**
 * 防止 SQL 注入檢測（基本檢查）
 */
export function detectSqlInjection(input: string): boolean {
  const sqlKeywords = [
    'DROP', 'DELETE', 'TRUNCATE', 'EXEC', 'EXECUTE',
    '--', ';--', '/*', '*/', 'xp_', 'sp_',
    'UNION', 'SELECT.*FROM', 'INSERT.*INTO'
  ];
  
  const upperInput = input.toUpperCase();
  return sqlKeywords.some(keyword => upperInput.includes(keyword));
}

/**
 * 清理字符串（移除危險字符）
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>'"]/g, '') // 移除可能造成 XSS 的字符
    .trim();
}

