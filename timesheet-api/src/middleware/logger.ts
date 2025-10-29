/**
 * 日誌中間件
 */

import { Context, Next } from 'hono';
import { Env, AuditLog, User } from '../types';

/**
 * 請求日誌中間件
 */
export async function loggerMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  
  console.log(`--> ${method} ${path}`);
  
  await next();
  
  const duration = Date.now() - start;
  const status = c.res.status;
  
  console.log(`<-- ${method} ${path} ${status} (${duration}ms)`);
}

/**
 * 審計日誌工具（用於記錄重要操作）
 */
export async function createAuditLog(
  db: any,
  log: Omit<AuditLog, 'log_id' | 'created_at'>
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO AuditLogs (
        user_id, action, table_name, record_id, changes, 
        ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log.user_id,
      log.action,
      log.table_name,
      log.record_id || null,
      log.changes || null,
      log.ip_address || null,
      log.user_agent || null
    ).run();
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // 不拋出錯誤，避免影響主流程
  }
}

/**
 * 自動記錄審計日誌的裝飾器函數
 */
export function withAudit(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  tableName: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // 記錄審計日誌的邏輯
      // 這裡可以根據需要擴展
      
      return result;
    };
    
    return descriptor;
  };
}

