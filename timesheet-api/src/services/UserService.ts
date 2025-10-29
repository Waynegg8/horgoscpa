/**
 * User Service - 員工管理服務
 * 負責員工 CRUD 操作的業務邏輯
 */

import { D1Database } from '@cloudflare/workers-types';
import { UserRepository } from '../repositories/UserRepository';
import { 
  User, 
  ValidationError, 
  ConflictError,
  NotFoundError,
  ForbiddenError
} from '../types';
import { 
  validateRequired, 
  validateEmail, 
  validatePassword, 
  validateGender,
  validateDateFormat 
} from '../utils/validation';
import { hashPassword } from '../utils/crypto';
import { createAuditLog } from '../middleware/logger';

export class UserService {
  private userRepo: UserRepository;

  constructor(private db: D1Database) {
    this.userRepo = new UserRepository(db);
  }

  /**
   * 查詢員工列表（管理員功能）
   */
  async getUsers(options: {
    limit?: number;
    offset?: number;
    is_admin?: boolean;
  } = {}): Promise<{ users: Omit<User, 'password_hash'>[]; total: number }> {
    const result = await this.userRepo.findAll(options);
    
    // 移除敏感資訊
    const users = result.users.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    return {
      users,
      total: result.total,
    };
  }

  /**
   * 查詢單個員工詳情（管理員功能）
   */
  async getUserById(userId: number): Promise<Omit<User, 'password_hash'>> {
    const user = await this.userRepo.findById(userId);
    
    if (!user) {
      throw new NotFoundError('員工不存在');
    }
    
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 創建新員工（管理員功能）
   */
  async createUser(
    userData: {
      username: string;
      password: string;
      name: string;
      email: string;
      is_admin?: boolean;
      gender: 'M' | 'F';
      birth_date?: string;
      start_date: string;
      phone?: string;
      address?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
    },
    createdBy: number
  ): Promise<Omit<User, 'password_hash'>> {
    // 驗證必填欄位
    validateRequired(userData.username, '帳號');
    validateRequired(userData.password, '密碼');
    validateRequired(userData.name, '姓名');
    validateRequired(userData.email, 'Email');
    validateRequired(userData.gender, '性別');
    validateRequired(userData.start_date, '到職日期');
    
    // 驗證格式
    validateEmail(userData.email, 'Email');
    validatePassword(userData.password);
    validateGender(userData.gender);
    validateDateFormat(userData.start_date, '到職日期');
    
    if (userData.birth_date) {
      validateDateFormat(userData.birth_date, '出生日期');
    }
    
    // 檢查帳號是否已存在
    const existingUser = await this.userRepo.findByUsername(userData.username);
    if (existingUser) {
      throw new ConflictError('帳號已存在', 'username');
    }
    
    // 檢查 Email 是否已存在
    const existingEmail = await this.userRepo.findByEmail(userData.email);
    if (existingEmail) {
      throw new ConflictError('Email 已被使用', 'email');
    }
    
    // 雜湊密碼
    const passwordHash = await hashPassword(userData.password);
    
    // 創建用戶
    const newUser = await this.userRepo.create({
      ...userData,
      password_hash: passwordHash,
      is_admin: userData.is_admin || false,
    });
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: createdBy,
      action: 'CREATE',
      table_name: 'Users',
      record_id: newUser.user_id.toString(),
      changes: JSON.stringify({
        username: userData.username,
        name: userData.name,
        is_admin: userData.is_admin || false,
      }),
    });
    
    const { password_hash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * 更新員工資訊（管理員功能）
   */
  async updateUser(
    userId: number,
    updates: {
      name?: string;
      email?: string;
      gender?: 'M' | 'F';
      birth_date?: string;
      start_date?: string;
      phone?: string;
      address?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
    },
    updatedBy: number
  ): Promise<Omit<User, 'password_hash'>> {
    // 檢查用戶是否存在
    const existingUser = await this.userRepo.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('員工不存在');
    }
    
    // 驗證格式
    if (updates.email) {
      validateEmail(updates.email, 'Email');
      
      // 檢查 Email 是否已被其他人使用
      const emailExists = await this.userRepo.existsByEmail(updates.email, userId);
      if (emailExists) {
        throw new ConflictError('Email 已被使用', 'email');
      }
    }
    
    if (updates.gender) {
      validateGender(updates.gender);
    }
    
    if (updates.start_date) {
      validateDateFormat(updates.start_date, '到職日期');
    }
    
    if (updates.birth_date) {
      validateDateFormat(updates.birth_date, '出生日期');
    }
    
    // 記錄變更（用於審計日誌）
    const changes: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== (existingUser as any)[key]) {
        changes[key] = {
          old: (existingUser as any)[key],
          new: value,
        };
      }
    }
    
    // 更新用戶
    const updatedUser = await this.userRepo.update(userId, updates);
    
    // 記錄審計日誌
    if (Object.keys(changes).length > 0) {
      await createAuditLog(this.db, {
        user_id: updatedBy,
        action: 'UPDATE',
        table_name: 'Users',
        record_id: userId.toString(),
        changes: JSON.stringify(changes),
      });
    }
    
    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * 刪除員工（管理員功能，軟刪除）
   */
  async deleteUser(userId: number, deletedBy: number): Promise<void> {
    // 檢查用戶是否存在
    const existingUser = await this.userRepo.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('員工不存在');
    }
    
    // 不能刪除自己
    if (userId === deletedBy) {
      throw new ForbiddenError('不能刪除自己的帳號');
    }
    
    // 軟刪除
    await this.userRepo.delete(userId, deletedBy);
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: deletedBy,
      action: 'DELETE',
      table_name: 'Users',
      record_id: userId.toString(),
      changes: JSON.stringify({
        username: existingUser.username,
        name: existingUser.name,
      }),
    });
  }

  /**
   * 重設密碼（管理員功能）
   */
  async resetUserPassword(
    targetUserId: number,
    newPassword: string,
    adminUserId: number
  ): Promise<void> {
    // 驗證新密碼
    validatePassword(newPassword);
    
    // 檢查目標用戶是否存在
    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError('目標員工不存在');
    }
    
    // 雜湊新密碼
    const passwordHash = await hashPassword(newPassword);
    
    // 更新密碼並重置登入嘗試次數
    await this.userRepo.updatePassword(targetUserId, passwordHash);
    await this.userRepo.updateLoginAttempts(targetUserId, 0);
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: adminUserId,
      action: 'UPDATE',
      table_name: 'Users',
      record_id: targetUserId.toString(),
      changes: JSON.stringify({
        action: 'password_reset_by_admin',
        reset_by: adminUserId,
        target_username: targetUser.username,
      }),
    });
  }

  /**
   * 獲取個人資料（員工自己查詢）
   */
  async getProfile(userId: number): Promise<Omit<User, 'password_hash'>> {
    const user = await this.userRepo.findById(userId);
    
    if (!user) {
      throw new NotFoundError('用戶不存在');
    }
    
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 更新個人資料（員工自己更新，限制可修改欄位）
   */
  async updateProfile(
    userId: number,
    updates: {
      phone?: string;
      address?: string;
      emergency_contact_name?: string;
      emergency_contact_phone?: string;
    }
  ): Promise<Omit<User, 'password_hash'>> {
    // 檢查用戶是否存在
    const existingUser = await this.userRepo.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('用戶不存在');
    }
    
    // 員工只能更新這些欄位（email、name、gender、start_date 等需要管理員修改）
    const allowedUpdates = {
      phone: updates.phone,
      address: updates.address,
      emergency_contact_name: updates.emergency_contact_name,
      emergency_contact_phone: updates.emergency_contact_phone,
    };
    
    // 移除 undefined 值
    const cleanUpdates = Object.fromEntries(
      Object.entries(allowedUpdates).filter(([_, v]) => v !== undefined)
    );
    
    if (Object.keys(cleanUpdates).length === 0) {
      throw new ValidationError('沒有可更新的欄位');
    }
    
    // 更新用戶
    const updatedUser = await this.userRepo.update(userId, cleanUpdates);
    
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: userId,
      action: 'UPDATE',
      table_name: 'Users',
      record_id: userId.toString(),
      changes: JSON.stringify({ action: 'profile_update', fields: Object.keys(cleanUpdates) }),
    });
    
    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}

