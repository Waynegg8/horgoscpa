/**
 * 加密工具函數
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

/**
 * 雜湊密碼
 * ⭐ 使用 bcrypt，成本因子 12（符合規格要求）
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;  // 規格要求：L702-L705
  return await bcrypt.hash(password, saltRounds);
}

/**
 * 驗證密碼
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * 生成 JWT Token
 */
export function generateToken(payload: JWTPayload, secret: string, expiresIn: string = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * 驗證 JWT Token
 */
export function verifyToken(token: string, secret: string): JWTPayload {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    throw new Error('Token 無效或已過期');
  }
}

/**
 * 解碼 JWT Token（不驗證簽名，用於調試）
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * 生成隨機密碼（用於初始密碼和重設密碼）
 * ⭐ 規格要求：L727-L747
 * 
 * 生成規則：
 * - 長度：12個字元
 * - 包含：大寫字母、小寫字母、數字、特殊符號
 * - 隨機排列
 */
export function generateRandomPassword(): string {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*';
  
  let password = '';
  
  // 確保至少包含各類字元
  password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
  password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // 填充至 12 個字元
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // 打亂順序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

