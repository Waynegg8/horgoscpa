/**
 * Auth Service - 認證服務
 * 負責登入、登出、密碼管理等業務邏輯
 */

import { D1Database } from '@cloudflare/workers-types';
import { UserRepository } from '../repositories/UserRepository';
import { 
  User, 
  JWTPayload, 
  UnauthorizedError, 
  ValidationError,
  ConflictError,
  AppError,
  ErrorCode
} from '../types';
import { hashPassword, verifyPassword, generateToken } from '../utils/crypto';
import { validateRequired, validatePassword, validateEmail } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class AuthService {
  private userRepo: UserRepository;

  constructor(private db: D1Database) {
    this.userRepo = new UserRepository(db);
  }

  /**
   * 登入
   * 實現登入邏輯：驗證帳號密碼、帳號鎖定機制、JWT 生成
   */
  async login(
    username: string,
    password: string,
    jwtSecret: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    // 驗證必填欄位
    validateRequired(username, '帳號');
    validateRequired(password, '密碼');

    // 查詢用戶
    const user = await this.userRepo.findByUsername(username);

    if (!user) {
      throw new UnauthorizedError('帳號或密碼錯誤');
    }

    // ⭐ 檢查帳號鎖定（連續失敗 5 次，鎖定 15 分鐘）
    if (user.login_attempts >= 5) {
      const lastFailed = user.last_failed_login ? new Date(user.last_failed_login) : null;
      if (lastFailed) {
        const lockDuration = 15 * 60 * 1000; // 15 分鐘
        const unlockTime = new Date(lastFailed.getTime() + lockDuration);
        
        if (new Date() < unlockTime) {
          const remainingMinutes = Math.ceil((unlockTime.getTime() - Date.now()) / 60000);
          throw new AppError(
            403,
            ErrorCode.ACCOUNT_LOCKED,
            `帳號已鎖定，請在 ${remainingMinutes} 分鐘後重試`
          );
        } else {
          // 鎖定時間已過，重置嘗試次數
          await this.userRepo.updateLoginAttempts(user.user_id, 0);
          user.login_attempts = 0;
        }
      }
    }

    // 驗證密碼
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      // 密碼錯誤，增加失敗次數 [規格:L554-L556]
      await this.userRepo.incrementLoginAttempts(user.user_id);
      
      const newAttempts = user.login_attempts + 1;
      if (newAttempts >= 5) {
        throw new AppError(
          403,
          ErrorCode.ACCOUNT_LOCKED,
          '密碼錯誤次數過多，帳號已鎖定 15 分鐘'
        );
      }

      throw new UnauthorizedError(`帳號或密碼錯誤（剩餘嘗試次數：${5 - newAttempts}）`);
    }

    // 登入成功，重置失敗次數，更新最後登入時間
    await this.userRepo.updateLastLogin(user.user_id);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'LOGIN',
      table_name: 'Users',
      record_id: user.user_id.toString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // 生成 JWT Token
    const payload: JWTPayload = {
      user_id: user.user_id,
      username: user.username,
      is_admin: user.is_admin,
    };

    const token = generateToken(payload, jwtSecret, '7d'); // 7 天有效期

    // 移除敏感資訊
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * 登出
   */
  async logout(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: userId,
      action: 'LOGOUT',
      table_name: 'Users',
      record_id: userId.toString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // JWT 是無狀態的，實際登出由前端清除 token/cookie 實現
    // 這裡只記錄審計日誌
  }

  /**
   * 驗證 Token 並獲取用戶資訊
   */
  async verifySession(userId: number): Promise<Omit<User, 'password_hash'>> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new UnauthorizedError('用戶不存在或已被刪除');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * 修改密碼
   */
  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // 驗證必填欄位
    validateRequired(oldPassword, '舊密碼');
    validateRequired(newPassword, '新密碼');

    // 驗證新密碼強度
    validatePassword(newPassword);

    // 檢查新舊密碼不能相同
    if (oldPassword === newPassword) {
      throw new ValidationError('新密碼不能與舊密碼相同', 'newPassword');
    }

    // 獲取用戶
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('用戶不存在');
    }

    // 驗證舊密碼
    const isOldPasswordValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedError('舊密碼錯誤');
    }

    // 雜湊新密碼
    const newPasswordHash = await hashPassword(newPassword);

    // 更新密碼
    await this.userRepo.updatePassword(userId, newPasswordHash);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: userId,
      action: 'UPDATE',
      table_name: 'Users',
      record_id: userId.toString(),
      changes: JSON.stringify({ action: 'password_changed' }),
    });
  }

  /**
   * 重設密碼（管理員功能）
   */
  async resetPassword(
    targetUserId: number,
    newPassword: string,
    adminUserId: number
  ): Promise<void> {
    // 驗證新密碼強度
    validatePassword(newPassword);

    // 檢查目標用戶是否存在
    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new UnauthorizedError('目標用戶不存在');
    }

    // 雜湊新密碼
    const newPasswordHash = await hashPassword(newPassword);

    // 更新密碼並重置登入嘗試次數
    await this.userRepo.updatePassword(targetUserId, newPasswordHash);
    await this.userRepo.updateLoginAttempts(targetUserId, 0);

    // 記錄審計日誌
    await createAuditLog(this.db, {
      user_id: adminUserId,
      action: 'UPDATE',
      table_name: 'Users',
      record_id: targetUserId.toString(),
      changes: JSON.stringify({ 
        action: 'password_reset_by_admin',
        reset_by: adminUserId 
      }),
    });
  }
}

