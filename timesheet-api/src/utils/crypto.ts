/**
 * 加密工具函數
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types';

/**
 * 雜湊密碼
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
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

