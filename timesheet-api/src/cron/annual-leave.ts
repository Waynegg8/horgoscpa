/**
 * 特休年初更新 Cron Job
 * 執行時間：每年 1月1日 00:00
 * 功能：計算每位員工今年應得特休，累積去年剩餘特休
 */

import { D1Database } from '@cloudflare/workers-types';

/**
 * 計算年資（月數）
 */
function calculateMonths(startDate: string, endDate: Date): number {
  const start = new Date(startDate);
  let months = (endDate.getFullYear() - start.getFullYear()) * 12;
  months += endDate.getMonth() - start.getMonth();
  return months;
}

/**
 * 特休年初更新處理（累積制）
 */
export async function annualLeaveYearEndProcessing(
  db: D1Database,
  targetDate?: string
): Promise<{
  success: boolean;
  affected_users: number;
  execution_duration_ms: number;
  skipped?: boolean;
}> {
  const startTime = Date.now();
  const executionDate = targetDate || new Date().toISOString().split('T')[0];
  const currentYear = parseInt(executionDate.substring(0, 4));
  const lastYear = currentYear - 1;
  
  console.log(`[Cron] 開始執行特休年初更新（${currentYear}年度）...`);
  
  // ⭐ 冪等性檢查：防止重複執行
  const existingExecution = await db.prepare(`
    SELECT * FROM CronJobExecutions
    WHERE job_name = 'annual_leave_update'
      AND execution_date = ?
      AND status = 'success'
  `).bind(executionDate).first();
  
  if (existingExecution) {
    console.log(`[Cron] 特休更新已執行過（${executionDate}），跳過`);
    return {
      success: true,
      skipped: true,
      affected_users: 0,
      execution_duration_ms: Date.now() - startTime,
    };
  }
  
  try {
    // 查詢所有員工
    const users = await db.prepare(`
      SELECT user_id, start_date FROM Users WHERE is_deleted = 0
    `).all();
    
    let affectedUsers = 0;
    
    for (const user of users.results || []) {
      // 計算年資（到當年度12月31日）
      const months = calculateMonths(user.start_date, new Date(currentYear, 11, 31));
      
      // 查詢特休規則
      const rule = await db.prepare(`
        SELECT days FROM AnnualLeaveRules
        WHERE min_months <= ? AND (max_months IS NULL OR max_months > ?)
        ORDER BY min_months DESC
        LIMIT 1
      `).bind(months, months).first<{ days: number }>();
      
      if (!rule || months < 6) {
        console.log(`[Cron] 員工 ${user.user_id} 年資不足（${months}個月），跳過`);
        continue;
      }
      
      // ⭐ 查詢去年剩餘特休（累積制）
      const lastYearBalance = await db.prepare(`
        SELECT remaining_days FROM AnnualLeaveBalance
        WHERE user_id = ? AND year = ?
      `).bind(user.user_id, lastYear).first<{ remaining_days: number }>();
      
      const carriedOver = lastYearBalance?.remaining_days || 0;
      
      // 創建今年度特休記錄
      await db.prepare(`
        INSERT OR REPLACE INTO AnnualLeaveBalance (
          user_id, year, entitled_days, carried_over_days, used_days, remaining_days
        ) VALUES (?, ?, ?, ?, 0, ?)
      `).bind(
        user.user_id,
        currentYear,
        rule.days,
        carriedOver,  // ✅ 去年剩餘累積到今年
        rule.days + carriedOver  // 總可用 = 當年新增 + 去年累積
      ).run();
      
      affectedUsers++;
    }
    
    // 記錄執行成功
    const duration = Date.now() - startTime;
    await db.prepare(`
      INSERT INTO CronJobExecutions (
        job_name, execution_date, status, affected_records, details
      ) VALUES (?, ?, 'success', ?, ?)
    `).bind(
      'annual_leave_update',
      executionDate,
      affectedUsers,
      JSON.stringify({ year: currentYear, duration_ms: duration })
    ).run();
    
    console.log(`[Cron] 特休更新完成：${affectedUsers} 位員工，耗時 ${duration}ms`);
    
    return {
      success: true,
      affected_users: affectedUsers,
      execution_duration_ms: duration,
    };
    
  } catch (error) {
    // 記錄執行失敗
    const duration = Date.now() - startTime;
    await db.prepare(`
      INSERT INTO CronJobExecutions (
        job_name, execution_date, status, error_message
      ) VALUES (?, ?, 'failed', ?)
    `).bind('annual_leave_update', executionDate, (error as Error).message).run();
    
    console.error('[Cron] 特休更新失敗:', error);
    throw error;
  }
}

