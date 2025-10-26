/**
 * Cloudflare Worker API - 重構後的主入口
 * 使用模組化架構：Router + Middleware + Handler + Service + Repository
 * 
 * 版本: 3.0
 * 創建日期: 2025-10-26
 */

import { Router } from './routes/router.js';
import { registerAuthRoutes } from './routes/auth.routes.js';
import { registerClientRoutes } from './routes/clients.routes.js';
import { registerTaskRoutes } from './routes/tasks.routes.js';
// ... 其他路由待實現

import { corsHeaders } from './utils.js';

/**
 * 處理 OPTIONS 請求（CORS 預檢）
 */
function handleOptions(request) {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400'
    }
  });
}

/**
 * 創建路由器並註冊所有路由
 */
function createRouter() {
  const router = new Router();

  // 測試端點 - 驗證部署版本
  router.get('/api/version', async (env, request) => {
    return new Response(JSON.stringify({
      version: '3.0',
      timestamp: new Date().toISOString(),
      status: 'refactored',
      modules: ['auth', 'clients', 'tasks']
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  });
  
  // 測試端點 - 測試登錄（不需認證）
  router.post('/api/test-login', async (env, request) => {
    const { username, password } = await request.json();
    return new Response(JSON.stringify({
      success: true,
      test: 'ok',
      received: { username, password }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  });

  // 註冊各模組的路由
  registerAuthRoutes(router);
  registerClientRoutes(router);
  registerTaskRoutes(router);
  // ... 註冊其他路由（Reports, SOPs, Media, etc.）

  return router;
}

/**
 * Worker 主入口
 */
export default {
  async fetch(request, env, ctx) {
    // 處理 OPTIONS 請求
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    try {
      // 創建路由器
      const router = createRouter();
      
      // 處理請求
      return await router.handle(request, env);
    } catch (error) {
      // 全局錯誤處理（最後防線）
      console.error('[Global Error]', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服務器內部錯誤'
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

/**
 * 使用說明：
 * 
 * 1. 創建新功能時：
 *    - 創建 Repository (repositories/XxxRepository.js)
 *    - 創建 Service (services/XxxService.js)
 *    - 創建 Handler (handlers/xxx.handler.js)
 *    - 創建 Routes (routes/xxx.routes.js)
 *    - 在此文件中導入並註冊路由
 * 
 * 2. 中間件使用：
 *    - withAuth: 需要認證
 *    - withAdmin: 需要管理員權限
 *    - withErrorHandler: 統一錯誤處理（所有路由必須使用）
 * 
 * 3. 響應格式：
 *    - 成功：success(data, meta)
 *    - 創建：created(data, message)
 *    - 分頁：paginated(data, total, page, pageSize)
 *    - 無內容：noContent()
 *    - 錯誤：error(message, code, status, details)
 * 
 * 4. 錯誤處理：
 *    - 使用自定義錯誤類（ValidationError, NotFoundError 等）
 *    - 錯誤中間件會自動轉換為正確的 HTTP 響應
 * 
 * 5. 資料庫操作：
 *    - 統一使用 Repository 層
 *    - 使用 TABLES 和 FIELDS 常量（避免字符串硬編碼）
 *    - 複雜查詢放在 Repository 中
 */

