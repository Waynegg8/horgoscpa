/**
 * 補休到期轉換 Cron Job
 * 執行時間：每月 1 日 00:00
 * 功能：將上月到期的補休轉換為加班費
 */

import { D1Database } from '@cloudflare/workers-types';

/**
 * 補休到期轉換處理
 */
export async function convertExpiredCompensatoryLeave(db: D1Database): Promise<{
  processed: number;
  total_hours: number;
  errors: string[];
}> {
  console.log('[Cron] 開始執行補休到期轉換...');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // 檢查冪等性（防止重複執行）
  const executed = await db.prepare(`
    SELECT * FROM CronJobExecutions
    WHERE job_name = 'comp_leave_conversion'
      AND execution_date = ?
      AND status = 'success'
  `).bind(yesterdayStr).first();
  
  if (executed) {
    console.log('[Cron] 本月補休轉換已執行過，跳過');
    return { processed: 0, total_hours: 0, errors: [] };
  }
  
  try {
    // 查詢昨天（上月最後一天）到期的補休
    const expiredLeaves = await db.prepare(`
      SELECT * FROM CompensatoryLeave
      WHERE expiry_date = ?
        AND status = 'active'
        AND hours_remaining > 0
      ORDER BY user_id, earned_date ASC
    `).bind(yesterdayStr).all();
    
    let processed = 0;
    let totalHours = 0;
    const errors: string[] = [];
    
    for (const leave of expiredLeaves.results || []) {
      try {
        // 使用原始儲存的費率（避免回溯查詢）
        const conversionRate = leave.original_rate || 1.0;
        
        // 標記為已轉換
        await db.prepare(`
          UPDATE CompensatoryLeave
          SET status = 'converted',
              converted_to_payment = 1,
              conversion_date = datetime('now'),
              conversion_rate = ?
          WHERE compe_leave_id = ?
        `).bind(conversionRate, leave.compe_leave_id).run();
        
        // 通知員工（創建通知）
        await db.prepare(`
          INSERT INTO Notifications (
            user_id, type, message, priority, auto_dismiss
          ) VALUES (?, 'comp_leave_converted', ?, 'normal', 1)
        `).bind(
          leave.user_id,
          `您在 ${leave.earned_date} 累積的 ${leave.hours_remaining} 小時補休已到期，` +
          `已自動轉換為加班費（費率 ${conversionRate}）`
        ).run();
        
        processed++;
        totalHours += leave.hours_remaining;
      } catch (error) {
        errors.push(`補休ID ${leave.compe_leave_id}: ${(error as Error).message}`);
      }
    }
    
    // 記錄執行成功
    await db.prepare(`
      INSERT INTO CronJobExecutions (
        job_name, execution_date, status, affected_records, details
      ) VALUES (?, ?, 'success', ?, ?)
    `).bind(
      'comp_leave_conversion',
      yesterdayStr,
      processed,
      JSON.stringify({ total_hours: totalHours, errors: errors.length })
    ).run();
    
    console.log(`[Cron] 補休到期轉換完成：處理 ${processed} 筆，共 ${totalHours} 小時`);
    
    return { processed, total_hours: totalHours, errors };
  } catch (error) {
    // 記錄執行失敗
    await db.prepare(`
      INSERT INTO CronJobExecutions (
        job_name, execution_date, status, error_message
      ) VALUES (?, ?, 'failed', ?)
    `).bind(
      'comp_leave_conversion',
      yesterdayStr,
      (error as Error).message
    ).run();
    
    console.error('[Cron] 補休到期轉換失敗:', error);
    throw error;
  }
}

