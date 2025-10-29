/**
 * User Repository - 資料訪問層
 * 負責所有與 Users 表的資料庫操作
 */

import { D1Database } from '@cloudflare/workers-types';
import { User, NotFoundError } from '../types';

export class UserRepository {
  constructor(private db: D1Database) {}

  /**
   * 根據 username 查詢用戶
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM Users
      WHERE username = ? AND is_deleted = 0
    `).bind(username).first<User>();
    
    return result || null;
  }

  /**
   * 根據 user_id 查詢用戶
   */
  async findById(userId: number): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM Users
      WHERE user_id = ? AND is_deleted = 0
    `).bind(userId).first<User>();
    
    return result || null;
  }

  /**
   * 根據 email 查詢用戶
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.prepare(`
      SELECT * FROM Users
      WHERE email = ? AND is_deleted = 0
    `).bind(email).first<User>();
    
    return result || null;
  }

  /**
   * 查詢所有用戶（支援分頁）
   */
  async findAll(options: {
    limit?: number;
    offset?: number;
    is_admin?: boolean;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { limit = 50, offset = 0, is_admin } = options;
    
    // 構建查詢條件
    let whereClause = 'WHERE is_deleted = 0';
    const params: any[] = [];
    
    if (is_admin !== undefined) {
      whereClause += ' AND is_admin = ?';
      params.push(is_admin ? 1 : 0);
    }
    
    // 查詢總數
    const countResult = await this.db.prepare(`
      SELECT COUNT(*) as total FROM Users ${whereClause}
    `).bind(...params).first<{ total: number }>();
    
    const total = countResult?.total || 0;
    
    // 查詢數據
    params.push(limit, offset);
    const result = await this.db.prepare(`
      SELECT 
        user_id, username, name, email, is_admin, gender,
        birth_date, start_date, phone, address,
        emergency_contact_name, emergency_contact_phone,
        last_login, created_at, updated_at
      FROM Users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params).all<User>();
    
    return {
      users: result.results || [],
      total,
    };
  }

  /**
   * 創建新用戶
   */
  async create(userData: Omit<User, 'user_id' | 'created_at' | 'updated_at' | 'is_deleted' | 'login_attempts'>): Promise<User> {
    await this.db.prepare(`
      INSERT INTO Users (
        username, password_hash, name, email, is_admin, gender,
        birth_date, start_date, phone, address,
        emergency_contact_name, emergency_contact_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userData.username,
      userData.password_hash,
      userData.name,
      userData.email,
      userData.is_admin ? 1 : 0,
      userData.gender,
      userData.birth_date || null,
      userData.start_date,
      userData.phone || null,
      userData.address || null,
      userData.emergency_contact_name || null,
      userData.emergency_contact_phone || null
    ).run();
    
    // 獲取剛創建的用戶
    const user = await this.findByUsername(userData.username);
    if (!user) {
      throw new NotFoundError('創建用戶失敗');
    }
    
    return user;
  }

  /**
   * 更新用戶資訊
   */
  async update(userId: number, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    
    // 動態構建更新欄位
    const allowedFields = [
      'name', 'email', 'gender', 'birth_date', 'start_date',
      'phone', 'address', 'emergency_contact_name', 'emergency_contact_phone'
    ];
    
    for (const field of allowedFields) {
      if (updates[field as keyof User] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field as keyof User]);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('沒有可更新的欄位');
    }
    
    // 添加 updated_at
    fields.push('updated_at = datetime(\'now\')');
    values.push(userId);
    
    await this.db.prepare(`
      UPDATE Users
      SET ${fields.join(', ')}
      WHERE user_id = ?
    `).bind(...values).run();
    
    // 返回更新後的用戶
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundError('用戶不存在');
    }
    
    return user;
  }

  /**
   * 更新密碼
   */
  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.db.prepare(`
      UPDATE Users
      SET password_hash = ?,
          updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(passwordHash, userId).run();
  }

  /**
   * 軟刪除用戶
   */
  async delete(userId: number, deletedBy: number): Promise<void> {
    await this.db.prepare(`
      UPDATE Users
      SET is_deleted = 1,
          deleted_at = datetime('now'),
          deleted_by = ?
      WHERE user_id = ?
    `).bind(deletedBy, userId).run();
  }

  /**
   * 更新登入嘗試次數
   */
  async updateLoginAttempts(userId: number, attempts: number): Promise<void> {
    await this.db.prepare(`
      UPDATE Users
      SET login_attempts = ?,
          last_failed_login = CASE 
            WHEN ? > 0 THEN datetime('now')
            ELSE last_failed_login
          END
      WHERE user_id = ?
    `).bind(attempts, attempts, userId).run();
  }

  /**
   * 更新最後登入時間
   */
  async updateLastLogin(userId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE Users
      SET last_login = datetime('now'),
          login_attempts = 0
      WHERE user_id = ?
    `).bind(userId).run();
  }

  /**
   * 檢查 username 是否已存在
   */
  async existsByUsername(username: string, excludeUserId?: number): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count FROM Users
      WHERE username = ? AND is_deleted = 0
    `;
    const params: any[] = [username];
    
    if (excludeUserId) {
      query += ' AND user_id != ?';
      params.push(excludeUserId);
    }
    
    const result = await this.db.prepare(query).bind(...params).first<{ count: number }>();
    return (result?.count || 0) > 0;
  }

  /**
   * 檢查 email 是否已存在
   */
  async existsByEmail(email: string, excludeUserId?: number): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count FROM Users
      WHERE email = ? AND is_deleted = 0
    `;
    const params: any[] = [email];
    
    if (excludeUserId) {
      query += ' AND user_id != ?';
      params.push(excludeUserId);
    }
    
    const result = await this.db.prepare(query).bind(...params).first<{ count: number }>();
    return (result?.count || 0) > 0;
  }
}

