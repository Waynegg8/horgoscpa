/**
 * Cloudflare Workers 主入口
 * 會計師事務所內部管理系統 API
 */

import { Hono } from 'hono';
import { Env } from './types';
import { errorHandler } from './middleware/error';
import { corsMiddleware } from './middleware/cors';
import { loggerMiddleware } from './middleware/logger';

// 導入路由
import auth from './routes/auth';
import users from './routes/users';
import settings from './routes/settings';
import auditlogs from './routes/auditlogs';
import holidays from './routes/holidays';
import leavetypes from './routes/leavetypes';
import businessrules from './routes/businessrules';
import services from './routes/services';
import clients from './routes/clients';
import timelogs from './routes/timelogs';
import leave from './routes/leave';
import clientservices from './routes/clientservices';
import tasks from './routes/tasks';
import knowledge from './routes/knowledge';
import externalContent from './routes/external-content';
import salary from './routes/salary';

// 創建 Hono 應用
const app = new Hono<{ Bindings: Env }>();

// =====================================================
// 全局中間件
// =====================================================

// CORS 中間件
app.use('*', corsMiddleware);

// 日誌中間件
app.use('*', loggerMiddleware);

// 錯誤處理中間件
app.onError(errorHandler);

// =====================================================
// 健康檢查端點
// =====================================================

app.get('/', (c) => {
  return c.json({
    success: true,
    message: '會計師事務所內部管理系統 API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// =====================================================
// API 路由 (v1)
// =====================================================

// 認證路由
app.route('/api/v1/auth', auth);

// 員工管理 & 個人資料路由
app.route('/api/v1', users);

// 系統設定路由
app.route('/api/v1', settings);

// 審計日誌路由
app.route('/api/v1', auditlogs);

// 業務規則路由
app.route('/api/v1', holidays);
app.route('/api/v1', leavetypes);
app.route('/api/v1', businessrules);
app.route('/api/v1', services);

// 客戶管理路由
app.route('/api/v1', clients);

// 工時管理路由
app.route('/api/v1', timelogs);

// 假期管理路由
app.route('/api/v1', leave);

// 服務生命週期管理路由
app.route('/api/v1', clientservices);

// 任務管理路由
app.route('/api/v1', tasks);
app.route('/api/v1', knowledge);

// 外部內容管理路由（Blog/FAQ/Resources/Images）
app.route('/api/v1', externalContent);

// 薪資管理路由
app.route('/api/v1', salary);

// 後續路由將在這裡添加
// etc...

// =====================================================
// 404 處理
// =====================================================

app.notFound((c) => {
  return c.json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '找不到請求的資源',
      path: c.req.path,
    },
  }, 404);
});

// =====================================================
// Cron Job 處理器
// =====================================================

// 導入 Cron Job 邏輯
import { convertExpiredCompensatoryLeave } from './cron/compensatory-leave';
import { checkMissingTimesheets } from './cron/timesheet-reminder';
import { annualLeaveYearEndProcessing } from './cron/annual-leave';
import { generateMonthlyTasks } from './cron/task-generation';

async function handleScheduled(event: ScheduledEvent, env: Env): Promise<void> {
  const cron = event.cron;
  const now = new Date();
  
  console.log(`[Cron] Triggered: ${cron} at ${now.toISOString()}`);
  
  try {
    // 每年1月1日 00:00 - 特休年初更新
    if (cron === "0 0 1 1 *") {
      console.log('[Cron] 執行特休年初更新...');
      const result = await annualLeaveYearEndProcessing(env.DB);
      console.log(`[Cron] 特休更新完成：${result.affected_users} 位員工`);
    }
    
    // 每月1日 00:00 - 任務自動生成 + 補休到期轉換
    if (cron === "0 0 1 * *") {
      console.log('[Cron] 執行任務自動生成...');
      const taskResult = await generateMonthlyTasks(env.DB);
      console.log(`[Cron] 任務生成完成：${taskResult.generated} 個`);
      
      console.log('[Cron] 執行補休到期轉換...');
      const compResult = await convertExpiredCompensatoryLeave(env.DB);
      console.log(`[Cron] 補休轉換完成：${compResult.processed} 筆，${compResult.total_hours} 小時`);
    }
    
    // 週一到週五 08:30 - 工時填寫提醒
    if (cron === "30 8 * * 1-5") {
      console.log('[Cron] 執行工時填寫提醒...');
      const result = await checkMissingTimesheets(env.DB);
      console.log(`[Cron] 工時檢查完成：${result.missing_count} 位員工缺填`);
    }
    
    // 每天 02:00 - 資料庫備份
    if (cron === "0 2 * * *") {
      console.log('[Cron] 執行資料庫備份...');
      // await backupDatabase(env.DB, env.R2_BACKUPS);
      // TODO: 實現資料庫備份邏輯（進階功能）
    }
    
    // 每小時 - 失敗 Cron Job 自動重試
    if (cron === "0 * * * *") {
      console.log('[Cron] 執行失敗任務重試...');
      // await retryFailedCronJobs(env.DB);
      // TODO: 實現重試邏輯（模組 5）
    }
    
    console.log(`[Cron] Completed: ${cron}`);
  } catch (error) {
    console.error(`[Cron] Failed: ${cron}`, error);
    
    // 通知管理員
    try {
      await env.DB.prepare(`
        INSERT INTO Notifications (
          user_id, type, message, priority, auto_dismiss
        ) SELECT 
          user_id, 
          'cron_failed',
          ?,
          'high',
          0
        FROM Users WHERE is_admin = 1 AND is_deleted = 0
      `).bind(
        `定時任務執行失敗：${cron} - ${(error as Error).message}`
      ).run();
    } catch (notifError) {
      console.error('[Cron] 無法發送失敗通知:', notifError);
    }
  }
}

// =====================================================
// Worker 導出
// =====================================================

export default {
  /**
   * Fetch 處理器（處理 HTTP 請求）
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  /**
   * Scheduled 處理器（處理 Cron Jobs）
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env));
  },
};

