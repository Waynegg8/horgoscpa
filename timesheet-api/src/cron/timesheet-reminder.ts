/**
 * 工時填寫提醒 Cron Job
 * 執行時間：每天 08:30（週一到週五）
 * 功能：檢查員工昨天是否填寫工時，未填則創建提醒
 */

import { D1Database } from '@cloudflare/workers-types';

/**
 * 檢查缺填工時並發送提醒
 */
export async function checkMissingTimesheets(db: D1Database): Promise<{
  missing_count: number;
  notified_users: number[];
}> {
  console.log('[Cron] 開始檢查工時填寫狀況...');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const dayOfWeek = yesterday.getDay();
  
  // ⭐ 檢查是否為工作日（考慮補班日）
  // 先查詢是否有特殊日期設定
  const holiday = await db.prepare(`
    SELECT is_national_holiday, is_makeup_workday 
    FROM Holidays 
    WHERE holiday_date = ?
  `).bind(yesterdayStr).first<any>();
  
  // 判斷是否應該檢查工時
  let shouldCheck = true;
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // 週末：預設不檢查
    shouldCheck = false;
    
    // 但如果是補班日，要檢查 ⭐
    if (holiday?.is_makeup_workday) {
      shouldCheck = true;
    }
  }
  
  // 如果是國定假日（且非補班日），不檢查
  if (holiday?.is_national_holiday && !holiday?.is_makeup_workday) {
    shouldCheck = false;
  }
  
  if (!shouldCheck) {
    console.log(`[Cron] ${yesterdayStr} 為假日，跳過工時檢查`);
    return { missing_count: 0, notified_users: [] };
  }
  
  // 查詢所有員工
  const users = await db.prepare(`
    SELECT user_id, name FROM Users WHERE is_deleted = 0
  `).all();
  
  const missingUsers: any[] = [];
  
  for (const user of users.results || []) {
    // 檢查昨天是否有工時記錄
    const timelog = await db.prepare(`
      SELECT * FROM TimeLogs
      WHERE user_id = ? AND work_date = ? AND is_deleted = 0
    `).bind(user.user_id, yesterdayStr).first();
    
    // 檢查是否有請假記錄
    const leave = await db.prepare(`
      SELECT * FROM LeaveApplications
      WHERE user_id = ? 
        AND start_date <= ? 
        AND end_date >= ?
        AND is_deleted = 0
    `).bind(user.user_id, yesterdayStr, yesterdayStr).first();
    
    if (!timelog && !leave) {
      missingUsers.push(user);
      
      // 1. 通知員工本人（檢查是否已有提醒，避免重複）
      const existingNotif = await db.prepare(`
        SELECT * FROM Notifications
        WHERE user_id = ? 
          AND type = 'missing_timesheet' 
          AND related_date = ?
          AND is_deleted = 0
      `).bind(user.user_id, yesterdayStr).first();
      
      if (!existingNotif) {
        await db.prepare(`
          INSERT INTO Notifications (
            user_id, type, message, related_date, action_url, auto_dismiss
          ) VALUES (?, 'missing_timesheet', ?, ?, ?, 1)
        `).bind(
          user.user_id,
          `提醒：${yesterdayStr} 工時尚未填寫`,
          yesterdayStr,
          `/timesheets/new?date=${yesterdayStr}`,
          1  // auto_dismiss=1：填寫後自動消失
        ).run();
      }
    }
  }
  
  // 2. 通知管理員（彙總所有缺填的員工）
  if (missingUsers.length > 0) {
    const admins = await db.prepare(`
      SELECT user_id FROM Users WHERE is_admin = 1 AND is_deleted = 0
    `).all();
    
    for (const admin of admins.results || []) {
      for (const missingUser of missingUsers) {
        // 檢查是否已有提醒
        const existingNotif = await db.prepare(`
          SELECT * FROM Notifications
          WHERE user_id = ? 
            AND type = 'missing_timesheet' 
            AND related_date = ?
            AND related_user_id = ?
            AND is_deleted = 0
        `).bind(admin.user_id, yesterdayStr, missingUser.user_id).first();
        
        if (!existingNotif) {
          await db.prepare(`
            INSERT INTO Notifications (
              user_id, type, message, related_date, related_user_id, action_url, auto_dismiss
            ) VALUES (?, 'missing_timesheet', ?, ?, ?, ?, 1)
          `).bind(
            admin.user_id,
            `${missingUser.name} 的 ${yesterdayStr} 工時尚未填寫`,
            yesterdayStr,
            missingUser.user_id,
            `/admin/timesheets?user_id=${missingUser.user_id}&date=${yesterdayStr}`,
            1  // auto_dismiss=1：該員工填寫後，管理員的提醒也自動消失
          ).run();
        }
      }
    }
  }
  
  console.log(`[Cron] 工時檢查完成：${missingUsers.length} 位員工缺填 ${yesterdayStr}`);
  
  return {
    missing_count: missingUsers.length,
    notified_users: missingUsers.map(u => u.user_id),
  };
}

