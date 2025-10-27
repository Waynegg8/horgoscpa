/**
 * Cloudflare Worker - 完全模块化架构
 * 版本: 3.0 完全重建版
 * 创建日期: 2025-10-27
 */

import { Router } from './routes/router.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerEmployeeRoutes } from './routes/employees.routes.js';
import { registerClientRoutes } from './routes/clients.routes.js';
import { registerTaskRoutes } from './routes/tasks.routes.js';
import { registerTimesheetRoutes } from './routes/timesheets.routes.js';
import { registerReminderRoutes } from './routes/reminders.routes.js';
import { registerSopRoutes } from './routes/sops.routes.js';
import { registerSystemRoutes } from './routes/system.routes.js';
import { registerReportRoutes } from './routes/reports.routes.js';
import { corsHeaders } from './utils.js';

/**
 * 处理 OPTIONS 请求
 */
function handleOptions() {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * 创建并配置路由器
 */
function createRouter() {
  const router = new Router();

  // 注册所有路由模块
  registerAuthRoutes(router);
  registerEmployeeRoutes(router);
  registerClientRoutes(router);
  registerTaskRoutes(router);
  registerTimesheetRoutes(router);
  registerReminderRoutes(router);
  registerSopRoutes(router);
  registerSystemRoutes(router);
  registerReportRoutes(router);

  return router;
}

/**
 * Worker 主入口
 */
export default {
  async fetch(request, env, ctx) {
    // 处理 OPTIONS 预检
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      const router = createRouter();
      return await router.handle(request, env);
    } catch (error) {
      console.error('[Global Error]', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务器内部错误'
        }
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

