/**
 * Cloudflare Worker API with D1 Database
 * 用戶認證和授權管理
 */

import {
  hashPassword,
  verifyPassword,
  createSession,
  deleteSession,
  getSessionToken,
  verifySession,
  requireAuth,
  requireAdmin,
  canAccessEmployee,
  handleLogin,
  handleLogout,
  handleVerifySession,
  handleChangePassword,
  handleAdminResetPassword
} from './auth.js';

import {
  handleAnnualLeaveReport,
  handleWorkAnalysisReport,
  handlePivotReport,
  handleClearCache,
  handleCacheStats
} from './reports.js';

import {
  getClientsExtended,
  getClientExtended,
  upsertClientExtended,
  getServiceSchedule,
  createServiceSchedule,
  updateServiceSchedule,
  deleteServiceSchedule,
  getClientInteractions,
  createClientInteraction,
  updateClientInteraction,
  deleteClientInteraction,
  importClients,
  importServiceSchedule,
  getClientServices,
  createClientService,
  updateClientService,
  toggleClientService,
  deleteClientService
} from './clients.js';

import {
  getSopCategories,
  createSopCategory,
  getSops,
  getSop,
  createSop,
  updateSop,
  deleteSop,
  getSopVersions,
  searchSops
} from './sop.js';

import {
  uploadImage,
  getMediaList,
  deleteMedia
} from './media.js';

import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  getTaskChecklist,
  addChecklistItem,
  updateChecklistItem
} from './projects.js';

import {
  getConfigCategories,
  getConfigByCategory,
  updateConfig,
  batchUpdateConfig,
  resetConfig
} from './system-config.js';

import {
  getWorkloadOverview,
  reassignTask,
  updateWorkloadStats
} from './workload.js';

import {
  getReminders,
  createReminder,
  markReminderAsRead,
  markAllRemindersAsRead,
  deleteReminder,
  autoGenerateReminders
} from './reminders.js';

import {
  getPosts,
  createPost,
  updatePost,
  deletePost,
  getPublicPosts,
  getPublicPost,
  getPublicResources
} from './cms.js';

import {
  getClientServices,
  getClientServicesByClient,
  upsertClientService,
  deleteClientService,
  getRecurringTemplates,
  generateRecurringTasks,
  getRecurringTaskInstances,
  updateRecurringTaskInstance,
  getRecurringTaskStats
} from './recurring-tasks.js';

import {
  getMultiStageTemplates,
  getTemplateStages,
  createMultiStageTask,
  getMultiStageTasks,
  getMultiStageTask,
  updateMultiStageTask,
  updateStageProgress,
  getMultiStageTaskStats
} from './multi-stage-tasks.js';

import {
  handleGenerateAutomatedTasks,
  handleGenerateForService,
  handlePreviewAutomatedTasks
} from './automated-tasks.js';

// 添加 CORS headers 支持
async function addCorsHeaders(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*");
  newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "OPTIONS") {
      return handleOptions(request);
    }

    try {
      // ----------------------------------------------------
      // 認證相關 API
      // ----------------------------------------------------
      
      // 登入
      if (url.pathname === "/api/login" && method === "POST") {
        return await handleLogin(env.DB, request);
      }
      
      // 登出
      if (url.pathname === "/api/logout" && method === "POST") {
        return await handleLogout(env.DB, request);
      }
      
      // 驗證當前 session
      if (url.pathname === "/api/verify" && method === "GET") {
        return await handleVerifySession(env.DB, request);
      }
      
      // 驗證當前 session (提供)
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return await handleVerifySession(env.DB, request);
      }
      
      // 修改密碼
      if (url.pathname === "/api/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // 修改密碼 (需認證)
      if (url.pathname === "/api/auth/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // 管理員重設用戶密碼
      if (url.pathname.match(/^\/api\/admin\/users\/[^\/]+\/reset-password$/) && method === "POST") {
        const username = decodeURIComponent(url.pathname.split("/")[4]);
        return await handleAdminResetPassword(env.DB, request, username);
      }
      
      // 登出 (需認證)
      if (url.pathname === "/api/auth/logout" && method === "POST") {
        return await handleLogout(env.DB, request);
      }

      // ----------------------------------------------------
      // 資料 API（需要認證）
      // ----------------------------------------------------
      if (url.pathname === "/api/employees" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetEmployees(env.DB, auth.user);
      }
      if (url.pathname === "/api/business-types" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetBusinessTypes(env.DB);
      }
      if (url.pathname === "/api/leave-types" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetLeaveTypes(env.DB);
      }
      if (url.pathname === "/api/holidays" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetHolidays(env.DB, url.searchParams);
      }
      if (url.pathname === "/api/leave-quota" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetLeaveQuota(env.DB, url.searchParams);
      }
      if (url.pathname === "/api/timesheet-data" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetTimesheetData(env.DB, url.searchParams, auth.user);
      }

      // 讀取工作類型
      if (url.pathname === "/api/work-types" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const workTypes = [
          "正常工時", "平日加班(1.34)", "平日加班(1.67)", "休息日加班(1.34)",
          "休息日加班(1.67)", "休息日加班(2.67)", "國定例假日加班", "國定例假日加班(2)",
          "國定假日加班", "國定假日加班(1.34)", "國定假日加班(1.67)"
        ];
        return jsonResponse(workTypes);
      }

      // 寫入工時資料
      if (url.pathname === "/api/save-timesheet" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleSaveTimesheet(env.DB, payload, auth.user);
      }
      
      // 管理相關 API
      if (url.pathname === "/api/admin/users" && method === "GET") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetUsers(env.DB);
      }
      
      if (url.pathname === "/api/admin/users" && method === "POST") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateUser(env.DB, payload);
      }
      
      if (url.pathname === "/api/admin/clients" && method === "POST") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateClient(env.DB, payload);
      }
      
      if (url.pathname === "/api/admin/assignments" && method === "POST") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateAssignment(env.DB, payload);
      }

      // ========================================
      // 客戶管理 CRUD (所有員工可讀)
      // ========================================
      if (url.pathname === "/api/clients" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        
        // 如果有employee參數，查詢該員工的客戶列表（用於工時表）
        if (url.searchParams.has('employee')) {
          return await handleGetClients(env.DB, url.searchParams, auth.user);
        }
        
        // 否則返回所有客戶（用於設定頁面）
        return await handleGetAllClients(env.DB);
      }
      
      if (url.pathname === "/api/clients" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateClient(env.DB, payload);
      }

      if (url.pathname.startsWith("/api/clients/") && method === "PUT") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = decodeURIComponent(url.pathname.split("/")[3]);
        const payload = await request.json();
        return await handleUpdateClient(env.DB, id, payload);
      }

      if (url.pathname.startsWith("/api/clients/") && method === "DELETE") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = decodeURIComponent(url.pathname.split("/")[3]);
        return await handleDeleteClient(env.DB, id);
      }

      // ========================================
      // 客戶擴充資料 API (需認證)
      // ========================================
      
      // 查詢所有客戶詳細資料
      if (url.pathname === "/api/clients/extended" && method === "GET") {
        return await addCorsHeaders(await getClientsExtended(request, env));
      }
      
      // 查詢單一客戶詳細資料
      if (url.pathname.match(/^\/api\/clients\/[^\/]+\/extended$/) && method === "GET") {
        const clientName = decodeURIComponent(url.pathname.split("/")[3]);
        return await addCorsHeaders(await getClientExtended(request, env, clientName));
      }
      
      // 創建或更新客戶詳細資料
      if (url.pathname.match(/^\/api\/clients\/[^\/]+\/extended$/) && (method === "POST" || method === "PUT")) {
        const clientName = decodeURIComponent(url.pathname.split("/")[3]);
        return await addCorsHeaders(await upsertClientExtended(request, env, clientName));
      }
      
      // 查詢排程管理
      if (url.pathname === "/api/service-schedule" && method === "GET") {
        return await addCorsHeaders(await getServiceSchedule(request, env));
      }
      
      if (url.pathname === "/api/service-schedule" && method === "POST") {
        return await addCorsHeaders(await createServiceSchedule(request, env));
      }
      
      if (url.pathname.match(/^\/api\/service-schedule\/\d+$/) && method === "PUT") {
        const scheduleId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateServiceSchedule(request, env, scheduleId));
      }
      
      if (url.pathname.match(/^\/api\/service-schedule\/\d+$/) && method === "DELETE") {
        const scheduleId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteServiceSchedule(request, env, scheduleId));
      }
      
      // 客戶互動記錄
      if (url.pathname === "/api/client-interactions" && method === "GET") {
        return await addCorsHeaders(await getClientInteractions(request, env));
      }
      
      if (url.pathname === "/api/client-interactions" && method === "POST") {
        return await addCorsHeaders(await createClientInteraction(request, env));
      }
      
      if (url.pathname.match(/^\/api\/client-interactions\/\d+$/) && method === "PUT") {
        const interactionId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateClientInteraction(request, env, interactionId));
      }
      
      if (url.pathname.match(/^\/api\/client-interactions\/\d+$/) && method === "DELETE") {
        const interactionId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteClientInteraction(request, env, interactionId));
      }
      
      // CSV 導入
      if (url.pathname === "/api/import/clients" && method === "POST") {
        return await importClients(request, env);
      }

      // 批次匯入服務排程（從活頁簿2/CSV 解析結果）
      if (url.pathname === "/api/import/service-schedule" && method === "POST") {
        return await addCorsHeaders(await importServiceSchedule(request, env));
      }

      // ========================================
      // 客戶服務配置 API (需認證)
      // ========================================
      
      if (url.pathname === "/api/client-services" && method === "GET") {
        return await addCorsHeaders(await getClientServices(request, env));
      }
      
      if (url.pathname === "/api/client-services" && method === "POST") {
        return await addCorsHeaders(await createClientService(request, env));
      }
      
      if (url.pathname.match(/^\/api\/client-services\/\d+$/) && method === "PUT") {
        const serviceId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateClientService(request, env, serviceId));
      }
      
      if (url.pathname.match(/^\/api\/client-services\/\d+\/toggle$/) && method === "POST") {
        const serviceId = url.pathname.split("/")[3];
        return await addCorsHeaders(await toggleClientService(request, env, serviceId));
      }
      
      if (url.pathname.match(/^\/api\/client-services\/\d+$/) && method === "DELETE") {
        const serviceId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteClientService(request, env, serviceId));
      }

      // ========================================
      // 系統配置管理 API (需認證)
      // ========================================
      
      if (url.pathname === "/api/system-config/categories" && method === "GET") {
        return await addCorsHeaders(await getConfigCategories(request, env));
      }
      
      if (url.pathname.match(/^\/api\/system-config\/[^\/]+$/) && method === "GET") {
        const category = url.pathname.split("/")[3];
        return await addCorsHeaders(await getConfigByCategory(request, env, category));
      }
      
      if (url.pathname.match(/^\/api\/system-config\/[^\/]+$/) && method === "PUT") {
        const paramKey = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateConfig(request, env, paramKey));
      }
      
      if (url.pathname === "/api/system-config/batch" && method === "PUT") {
        return await addCorsHeaders(await batchUpdateConfig(request, env));
      }
      
      if (url.pathname.match(/^\/api\/system-config\/[^\/]+\/reset$/) && method === "POST") {
        const paramKey = url.pathname.split("/")[3];
        return await addCorsHeaders(await resetConfig(request, env, paramKey));
      }

      // ========================================
      // 工作量管理 API (需認證)
      // ========================================
      
      if (url.pathname === "/api/workload/overview" && method === "GET") {
        return await addCorsHeaders(await getWorkloadOverview(request, env));
      }
      
      if (url.pathname === "/api/workload/reassign" && method === "POST") {
        return await addCorsHeaders(await reassignTask(request, env));
      }
      
      if (url.pathname === "/api/workload/update-stats" && method === "POST") {
        return await addCorsHeaders(await updateWorkloadStats(request, env));
      }

      // ========================================
      // 用戶提醒 API (需認證)
      // ========================================
      
      if (url.pathname === "/api/reminders" && method === "GET") {
        return await addCorsHeaders(await getReminders(request, env));
      }
      
      if (url.pathname === "/api/reminders" && method === "POST") {
        return await addCorsHeaders(await createReminder(request, env));
      }
      
      if (url.pathname.match(/^\/api\/reminders\/\d+\/read$/) && method === "PUT") {
        const reminderId = url.pathname.split("/")[3];
        return await addCorsHeaders(await markReminderAsRead(request, env, reminderId));
      }
      
      if (url.pathname === "/api/reminders/mark-all-read" && method === "PUT") {
        return await addCorsHeaders(await markAllRemindersAsRead(request, env));
      }
      
      if (url.pathname.match(/^\/api\/reminders\/\d+$/) && method === "DELETE") {
        const reminderId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteReminder(request, env, reminderId));
      }
      
      if (url.pathname === "/api/reminders/auto-generate" && method === "POST") {
        return await addCorsHeaders(await autoGenerateReminders(request, env));
      }

      // ========================================
      // SOP 文件管理 API (需認證)
      // ========================================
      
      // SOP 分類
      if (url.pathname === "/api/sop/categories" && method === "GET") {
        return await addCorsHeaders(await getSopCategories(request, env));
      }
      
      if (url.pathname === "/api/sop/categories" && method === "POST") {
        return await addCorsHeaders(await createSopCategory(request, env));
      }
      
      // SOP 文件列表
      if (url.pathname === "/api/sops" && method === "GET") {
        return await addCorsHeaders(await getSops(request, env));
      }
      
      if (url.pathname.match(/^\/api\/sops\/\d+$/) && method === "GET") {
        const sopId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getSop(request, env, sopId));
      }
      
      if (url.pathname === "/api/sops" && method === "POST") {
        return await addCorsHeaders(await createSop(request, env));
      }
      
      if (url.pathname.match(/^\/api\/sops\/\d+$/) && method === "PUT") {
        const sopId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateSop(request, env, sopId));
      }
      
      if (url.pathname.match(/^\/api\/sops\/\d+$/) && method === "DELETE") {
        const sopId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteSop(request, env, sopId));
      }
      
      // SOP 版本歷史
      if (url.pathname.match(/^\/api\/sops\/\d+\/versions$/) && method === "GET") {
        const sopId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getSopVersions(request, env, sopId));
      }
      
      // SOP 搜尋
      if (url.pathname === "/api/sops/search" && method === "GET") {
        return await addCorsHeaders(await searchSops(request, env));
      }

      // ========================================
      // 媒體管理 API (需認證)
      // ========================================
      
      // 上傳圖片
      if (url.pathname === "/api/upload/image" && method === "POST") {
        return await uploadImage(request, env);
      }
      
      // 查詢媒體列表
      if (url.pathname === "/api/media" && method === "GET") {
        return await addCorsHeaders(await getMediaList(request, env));
      }
      
      // 刪除媒體
      if (url.pathname.match(/^\/api\/media\/\d+$/) && method === "DELETE") {
        const mediaId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteMedia(request, env, mediaId));
      }

      // ========================================
      // 專案與任務管理 API (需認證)
      // ========================================
      
      // 專案列表
      if (url.pathname === "/api/projects" && method === "GET") {
        return await addCorsHeaders(await getProjects(request, env));
      }
      
      if (url.pathname.match(/^\/api\/projects\/\d+$/) && method === "GET") {
        const projectId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getProject(request, env, projectId));
      }
      
      if (url.pathname === "/api/projects" && method === "POST") {
        return await addCorsHeaders(await createProject(request, env));
      }
      
      if (url.pathname.match(/^\/api\/projects\/\d+$/) && method === "PUT") {
        const projectId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateProject(request, env, projectId));
      }
      
      if (url.pathname.match(/^\/api\/projects\/\d+$/) && method === "DELETE") {
        const projectId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteProject(request, env, projectId));
      }
      
      // 專案任務列表
      if (url.pathname.match(/^\/api\/projects\/\d+\/tasks$/) && method === "GET") {
        const projectId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getProjectTasks(request, env, projectId));
      }
      
      // 任務操作
      if (url.pathname === "/api/tasks" && method === "POST") {
        return await addCorsHeaders(await createTask(request, env));
      }
      
      if (url.pathname.match(/^\/api\/tasks\/\d+$/) && method === "PUT") {
        const taskId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateTask(request, env, taskId));
      }
      
      if (url.pathname.match(/^\/api\/tasks\/\d+$/) && method === "DELETE") {
        const taskId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteTask(request, env, taskId));
      }
      
      // 任務檢核清單
      if (url.pathname.match(/^\/api\/tasks\/\d+\/checklist$/) && method === "GET") {
        const taskId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getTaskChecklist(request, env, taskId));
      }
      
      if (url.pathname === "/api/checklist" && method === "POST") {
        return await addCorsHeaders(await addChecklistItem(request, env));
      }
      
      if (url.pathname.match(/^\/api\/checklist\/\d+$/) && method === "PUT") {
        const itemId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updateChecklistItem(request, env, itemId));
      }

      // ========================================
      // CMS - 內容管理 API (需認證)
      // ========================================
      
      // 後台內容管理
      if (url.pathname === "/api/posts" && method === "GET") {
        return await addCorsHeaders(await getPosts(request, env));
      }
      
      if (url.pathname === "/api/posts" && method === "POST") {
        return await addCorsHeaders(await createPost(request, env));
      }
      
      if (url.pathname.match(/^\/api\/posts\/\d+$/) && method === "PUT") {
        const postId = url.pathname.split("/")[3];
        return await addCorsHeaders(await updatePost(request, env, postId));
      }
      
      if (url.pathname.match(/^\/api\/posts\/\d+$/) && method === "DELETE") {
        const postId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deletePost(request, env, postId));
      }
      
      // 前台公開 API（無需認證）
      if (url.pathname === "/api/public/posts" && method === "GET") {
        return await addCorsHeaders(await getPublicPosts(request, env));
      }
      
      if (url.pathname.match(/^\/api\/public\/posts\/[^\/]+$/) && method === "GET") {
        const slug = decodeURIComponent(url.pathname.split("/")[4]);
        return await addCorsHeaders(await getPublicPost(request, env, slug));
      }
      
      if (url.pathname === "/api/public/resources" && method === "GET") {
        return await addCorsHeaders(await getPublicResources(request, env));
      }

      // ========================================
      // 週期性任務 API
      // ========================================
      
      // 獲取客戶服務配置
      if (url.pathname === "/api/services/clients" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await addCorsHeaders(await getClientServices(env, url.searchParams));
      }
      
      // 獲取單個客戶的服務配置
      if (url.pathname.match(/^\/api\/services\/client\/[^\/]+$/) && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const clientName = decodeURIComponent(url.pathname.split("/")[4]);
        return await addCorsHeaders(await getClientServicesByClient(env, clientName));
      }
      
      // 創建或更新客戶服務配置（所有員工可用）
      if (url.pathname === "/api/services" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const data = await request.json();
        return await addCorsHeaders(await upsertClientService(request, env, data));
      }
      
      // 刪除客戶服務配置（僅管理員）
      if (url.pathname.match(/^\/api\/services\/\d+$/) && method === "DELETE") {
        const serviceId = parseInt(url.pathname.split("/")[3]);
        return await addCorsHeaders(await deleteClientService(request, env, serviceId));
      }
      
      // 獲取週期性任務模板
      if (url.pathname === "/api/recurring-templates" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const category = url.searchParams.get('category');
        return await addCorsHeaders(await getRecurringTemplates(env, category));
      }
      
      // 生成週期性任務
      if (url.pathname === "/api/tasks/recurring/generate" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const data = await request.json();
        return await addCorsHeaders(await generateRecurringTasks(env, data, auth.user.username));
      }
      
      // 獲取週期性任務實例
      if (url.pathname === "/api/tasks/recurring" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await addCorsHeaders(await getRecurringTaskInstances(env, url.searchParams));
      }
      
      // 更新週期性任務實例
      if (url.pathname.match(/^\/api\/tasks\/recurring\/\d+$/) && method === "PUT") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const instanceId = parseInt(url.pathname.split("/")[4]);
        const data = await request.json();
        return await addCorsHeaders(await updateRecurringTaskInstance(env, instanceId, data, auth.user.username));
      }
      
      // 獲取週期性任務統計
      if (url.pathname === "/api/tasks/recurring/stats" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const year = parseInt(url.searchParams.get('year'));
        const month = parseInt(url.searchParams.get('month'));
        return await addCorsHeaders(await getRecurringTaskStats(env, year, month));
      }

      // ========================================
      // 多階段任務 API
      // ========================================
      
      // 獲取多階段任務模板
      if (url.pathname === "/api/multi-stage-templates" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const category = url.searchParams.get('category');
        return await addCorsHeaders(await getMultiStageTemplates(env, category));
      }
      
      // 獲取模板階段
      if (url.pathname.match(/^\/api\/multi-stage-templates\/\d+\/stages$/) && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const templateId = parseInt(url.pathname.split("/")[3]);
        return await addCorsHeaders(await getTemplateStages(env, templateId));
      }
      
      // 創建多階段任務
      if (url.pathname === "/api/tasks/multi-stage" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const data = await request.json();
        return await addCorsHeaders(await createMultiStageTask(env, data, auth.user.username));
      }
      
      // 獲取多階段任務列表
      if (url.pathname === "/api/tasks/multi-stage" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const result = await getMultiStageTasks(env, url.searchParams);
        // 確保統一格式
        return await addCorsHeaders(result);
      }
      
      // 獲取單個多階段任務詳情
      if (url.pathname.match(/^\/api\/tasks\/multi-stage\/\d+$/) && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const taskId = parseInt(url.pathname.split("/")[4]);
        return await addCorsHeaders(await getMultiStageTask(env, taskId));
      }
      
      // 更新多階段任務
      if (url.pathname.match(/^\/api\/tasks\/multi-stage\/\d+$/) && method === "PUT") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const taskId = parseInt(url.pathname.split("/")[4]);
        const data = await request.json();
        return await addCorsHeaders(await updateMultiStageTask(env, taskId, data, auth.user.username));
      }
      
      // 更新階段進度
      if (url.pathname.match(/^\/api\/tasks\/multi-stage\/\d+\/stage\/\d+$/) && method === "PUT") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const parts = url.pathname.split("/");
        const taskId = parseInt(parts[4]);
        const stageNumber = parseInt(parts[6]);
        const data = await request.json();
        return await addCorsHeaders(await updateStageProgress(env, taskId, stageNumber, data, auth.user.username));
      }
      
      // 獲取多階段任務統計
      if (url.pathname === "/api/tasks/multi-stage/stats" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await addCorsHeaders(await getMultiStageTaskStats(env, url.searchParams));
      }

      // ========================================
      // 客戶指派 CRUD (所有員工可讀)
      // ========================================
      if (url.pathname === "/api/assignments" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetAssignments(env.DB, url.searchParams);
      }

      if (url.pathname === "/api/assignments" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateAssignment(env.DB, payload);
      }

      if (url.pathname.startsWith("/api/assignments/") && method === "DELETE") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        return await handleDeleteAssignment(env.DB, id);
      }

      // ========================================
      // 業務類別 CRUD (所有員工可讀)
      // ========================================
      if (url.pathname === "/api/business-types" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateBusinessType(env.DB, payload);
      }

      if (url.pathname.startsWith("/api/business-types/") && method === "PUT") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        const payload = await request.json();
        return await handleUpdateBusinessType(env.DB, id, payload);
      }

      if (url.pathname.startsWith("/api/business-types/") && method === "DELETE") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        return await handleDeleteBusinessType(env.DB, id);
      }

      // ========================================
      // 查詢事件 CRUD
      // ========================================
      if (url.pathname === "/api/leave-events" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetLeaveEvents(env.DB, url.searchParams);
      }

      if (url.pathname === "/api/leave-events" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateLeaveEvent(env.DB, payload);
      }

      if (url.pathname.startsWith("/api/leave-events/") && method === "PUT") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        const payload = await request.json();
        return await handleUpdateLeaveEvent(env.DB, id, payload);
      }

      if (url.pathname.startsWith("/api/leave-events/") && method === "DELETE") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        return await handleDeleteLeaveEvent(env.DB, id);
      }

      // ========================================
      // 國定假日 CRUD
      // ========================================
      if (url.pathname === "/api/holidays" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateHoliday(env.DB, payload);
      }

      if (url.pathname.startsWith("/api/holidays/") && method === "PUT") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        const payload = await request.json();
        return await handleUpdateHoliday(env.DB, id, payload);
      }

      if (url.pathname.startsWith("/api/holidays/") && method === "DELETE") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        return await handleDeleteHoliday(env.DB, id);
      }

      // ========================================
      // 假別類型 CRUD (僅管理員)
      // ========================================
      if (url.pathname === "/api/admin/leave-types" && method === "POST") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateLeaveType(env.DB, payload);
      }

      if (url.pathname.startsWith("/api/admin/leave-types/") && method === "PUT") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[4];
        const payload = await request.json();
        return await handleUpdateLeaveType(env.DB, id, payload);
      }

      if (url.pathname.startsWith("/api/admin/leave-types/") && method === "DELETE") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[4];
        return await handleDeleteLeaveType(env.DB, id);
      }

      // ========================================
      // 系統參數 CRUD (僅管理員)
      // ========================================
      if (url.pathname === "/api/admin/system-params" && method === "GET") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetSystemParams(env.DB);
      }

      if (url.pathname === "/api/admin/system-params" && method === "PUT") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleUpdateSystemParams(env.DB, payload);
      }

      // ========================================
      // 員工管理 CRUD (僅管理員)
      // ========================================
      if (url.pathname === "/api/admin/employees" && method === "GET") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGetAllEmployees(env.DB);
      }
      
      if (url.pathname === "/api/admin/employees" && method === "POST") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleCreateEmployee(env.DB, payload);
      }
      
      if (url.pathname.startsWith("/api/admin/employees/") && method === "PUT") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const oldName = decodeURIComponent(url.pathname.split("/")[4]);
        const payload = await request.json();
        return await handleUpdateEmployee(env.DB, oldName, payload);
      }
      
      if (url.pathname.startsWith("/api/admin/employees/") && method === "DELETE") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const name = decodeURIComponent(url.pathname.split("/")[4]);
        return await handleDeleteEmployee(env.DB, name);
      }
      
      // ========================================
      // 用戶管理 CRUD (僅管理員)
      // ========================================
      if (url.pathname.startsWith("/api/admin/users/") && method === "PUT") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[4];
        const payload = await request.json();
        return await handleUpdateUser(env.DB, id, payload);
      }

      if (url.pathname.startsWith("/api/admin/users/") && method === "DELETE") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[4];
        return await handleDeleteUser(env.DB, id);
      }

      // ========================================
      // 自動化任務生成 API
      // ========================================
      
      // 批量生成任務
      if (url.pathname === "/api/automated-tasks/generate" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleGenerateAutomatedTasks(env, request);
      }
      
      // 為特定服務生成任務
      if (url.pathname.match(/^\/api\/automated-tasks\/generate\/\d+$/) && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const serviceId = parseInt(url.pathname.split("/")[4]);
        return await handleGenerateForService(env, serviceId);
      }
      
      // 預覽待生成任務
      if (url.pathname === "/api/automated-tasks/preview" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handlePreviewAutomatedTasks(env, request);
      }

      // ========================================
      // 報表 API（優化版，含快取）
      // ========================================
      if (url.pathname === "/api/reports/annual-leave" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleAnnualLeaveReport(env.DB, url.searchParams, auth.user);
      }

      if (url.pathname === "/api/reports/work-analysis" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleWorkAnalysisReport(env.DB, url.searchParams, auth.user);
      }

      if (url.pathname === "/api/reports/pivot" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handlePivotReport(env.DB, url.searchParams, auth.user);
      }

      // 快取管理（管理員專用）
      if (url.pathname === "/api/admin/cache/clear" && method === "POST") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleClearCache(env.DB, url.searchParams);
      }

      if (url.pathname === "/api/admin/cache/stats" && method === "GET") {
        const auth = await requireAdmin(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        return await handleCacheStats(env.DB);
      }

      // 保證 404 也帶有 CORS 標頭
      return await addCorsHeaders(new Response("Not Found", { status: 404 }));
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

// =================================================================
// 工具：統一輸出 rows
// =================================================================
function getRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.results && Array.isArray(result.results)) return result.results;
  return [];
}

// =================================================================
// 基本讀取API (不需要特殊邏輯)
// =================================================================

// 查詢所有客戶（用於設定頁面）
async function handleGetAllClients(db) {
  try {
    const res = await db.prepare(`
      SELECT name
      FROM clients
      ORDER BY name
    `).all();
    const rows = getRows(res);
    // 轉換為前端格式
    return jsonResponse(rows.map((r, index) => ({
      id: index + 1,
      name: r.name,
      created_at: '1970-01-01T00:00:00.000Z'
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 查詢單一員工的客戶列表（用於工時表）
async function handleGetClients(db, params, user) {
  const employee = params.get("employee");
  if (!employee) return jsonResponse({ error: "Missing employee parameter" }, 400);
  
  // 檢查權限
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "無權查看此員工資料" }, 403);
  }
  
  const res = await db.prepare(`
    SELECT c.name
    FROM clients c
    JOIN client_assignments ca ON c.name = ca.client_name
    WHERE ca.employee_name = ?
    ORDER BY c.name
  `).bind(employee).all();
  const rows = getRows(res);
  return jsonResponse(rows.map(r => r.name));
}

async function handleGetBusinessTypes(db) {
  const res = await db.prepare("SELECT type_name FROM business_types ORDER BY type_name").all();
  const rows = getRows(res);
  // 轉換為前端格式
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    name: r.type_name
  })));
}

async function handleGetLeaveTypes(db) {
  const res = await db.prepare("SELECT type_name FROM leave_types ORDER BY type_name").all();
  const rows = getRows(res);
  // 轉換為前端格式
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    type_name: r.type_name
  })));
}

async function handleGetHolidays(db, params) {
  const year = params.get("year");
  
  // 如果有年份參數，返回該年份的假日列表（用於工時表標示）
  if (year) {
    const res = await db.prepare("SELECT holiday_date FROM holidays WHERE holiday_date LIKE ? ORDER BY holiday_date")
      .bind(`${year}-%`).all();
    const rows = getRows(res);
    return jsonResponse(rows.map(r => r.holiday_date));
  }
  
  // 否則返回所有完整資料（用於設定頁面）
  const res = await db.prepare("SELECT holiday_date, holiday_name FROM holidays ORDER BY holiday_date DESC").all();
  const rows = getRows(res);
  // 轉換為前端格式（使用holiday_date作為id）
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    holiday_date: r.holiday_date,
    holiday_name: r.holiday_name
  })));
}

// 依照資料庫計算年度假別配額
async function handleGetLeaveQuota(db, params) {
  const employee = params.get('employee');
  const year = parseInt(params.get('year'));
  if (!employee || !year) return jsonResponse({ error: 'Missing parameters' }, 400);

  // 查詢員工的職務和性別
  const emp = await db.prepare(`SELECT hire_date, gender FROM employees WHERE name = ?`).bind(employee).first();
  const hireDate = emp?.hire_date || null;
  const gender = emp?.gender || null;

  // 查詢規則
  const annualRules = await db.prepare(`SELECT seniority_years, leave_days FROM annual_leave_rules ORDER BY seniority_years`).all();
  const annualRows = getRows(annualRules);

  function computeAnnualDays(hire) {
    if (!hire) return 0;
    const h = new Date(hire);
    const y = year;
    if (h.getFullYear() === y) {
      // 在職年資滿該年給天數
      const months = 12 - h.getMonth();
      return months >= 6 ? 3 : 0;
    }
    const seniority = Math.max(0, y - h.getFullYear());
    let days = 0;
    for (const r of annualRows) {
      if (seniority >= r.seniority_years) days = r.leave_days;
    }
    return days;
  }

  // 查詢假別規則（病假、事假、婚假、喪假等）
  const otherRulesRes = await db.prepare(`SELECT leave_type, leave_days, grant_type FROM other_leave_rules`).all();
  const otherRules = getRows(otherRulesRes);

  // 查詢結轉
  let carryoverHours = 0;
  try {
    const carry = await db.prepare(`SELECT carryover_days FROM annual_leave_carryover WHERE employee_name = ?`).bind(employee).first();
    if (carry) carryoverHours = (carry.carryover_days || 0) * 8;
  } catch (_) {}

  const quota = [];
  const annualDays = computeAnnualDays(hireDate);
  quota.push({ type: '特休', quota_hours: (annualDays * 8) + carryoverHours });

  // 查詢其他假別配額並計入年度假別清單
  let sickCapHours = 0;
  for (const r of otherRules) {
    let hours = 0;
    if (r.grant_type === '年度給假') {
      hours = (r.leave_days * 8);
    } else if (r.grant_type === '事件給假') {
      // 事件給假：查詢leave_events中出現相符事件才給假
      const eventCount = await db.prepare(`
        SELECT COUNT(*) AS cnt
        FROM leave_events
        WHERE employee_name = ? AND strftime('%Y', event_date) = ? AND event_type = ?
      `).bind(employee, String(year), r.leave_type).first();
      const hasEvent = eventCount && eventCount.cnt > 0;
      hours = hasEvent ? (r.leave_days * 8) : 0;
    }
    quota.push({ type: r.leave_type, quota_hours: hours, grant_type: r.grant_type });
    if (r.leave_type === '病假') sickCapHours = hours;
  }

  // 生理假（女性專用，每月1天8小時），不逐月累計，可併入年度上限
  if (gender && (gender === 'female' || gender === '女' || gender === 'F')) {
    quota.push({ 
      type: '生理假', 
      quota_hours: 8,                 // 每月上限
      grant_type: '每月上限',
      per_month_cap_hours: 8,
      non_carryover: true,
      combined_with: '病假', 
      combined_cap_hours: sickCapHours || (30 * 8) 
    });
  }

  return jsonResponse({ employee, year, quota });
}

// =================================================================
// 查詢時數計算
// =================================================================
async function calculateWeightedHours(db, workType, hours) {
  const rateType = getRateTypeFromWorkType(workType);
  if (!rateType) return hours;

  const res = await db.prepare(`
    SELECT hour_start, hour_end, rate_multiplier
    FROM overtime_rates
    WHERE rate_type = ?
    ORDER BY hour_start
  `).bind(rateType).all();

  const rates = getRows(res);
  let weighted = 0;
  let remaining = hours;

  for (const r of rates) {
    const tierHours = Math.min(remaining, r.hour_end - r.hour_start);
    if (tierHours > 0) {
      weighted += tierHours * r.rate_multiplier;
      remaining -= tierHours;
    }
    if (remaining <= 0) break;
  }

  if (remaining > 0 && rates.length > 0) {
    weighted += remaining * rates[rates.length - 1].rate_multiplier;
  }
  return weighted;
}

function getRateTypeFromWorkType(wt) {
  if (wt.includes("平日加班")) return "平日加班";
  if (wt.includes("休息日加班")) return "休息日加班";
  if (wt.includes("例假日加班")) return "例假日加班";
  if (wt.includes("國定假日加班")) return "國定假日加班";
  return null;
}

// =================================================================
// 查詢 Timesheet Data
// =================================================================
function aggregateTimesheetData(rows = []) {
  const workMap = new Map();
  const leaveMap = new Map();

  for (const row of rows) {
    if (row.leave_hours > 0) {
      const key = row.leave_type;
      if (!leaveMap.has(key)) {
        leaveMap.set(key, { leaveType: key, hours: {} });
      }
      const d = new Date(row.work_date).getDate();
      leaveMap.get(key).hours[d] = row.leave_hours;
    } else {
      const clientName = row.client_name || '';
      const businessType = row.business_type || '';
      const workType = getWorkTypeFromRow(row);
      const key = `${clientName}|${businessType}|${workType}`;
      if (!workMap.has(key)) {
        workMap.set(key, { clientName, businessType, workType, hours: {} });
      }
      const d = new Date(row.work_date).getDate();
      const h = row.hours_normal || row.hours_ot_weekday_134 || row.hours_ot_weekday_167 ||
        row.hours_ot_rest_134 || row.hours_ot_rest_167 || row.hours_ot_rest_267 ||
        row.hours_ot_offday_100 || row.hours_ot_offday_200 ||
        row.hours_ot_holiday_100 || row.hours_ot_holiday_134 || row.hours_ot_holiday_167 || 0;
      workMap.get(key).hours[d] = h;
    }
  }

  return {
    workEntries: Array.from(workMap.values()),
    leaveEntries: Array.from(leaveMap.values()),
  };
}

function getWorkTypeFromRow(row) {
  if (row.hours_normal > 0) return "正常工時";
  if (row.hours_ot_weekday_134 > 0) return "平日加班(1.34)";
  if (row.hours_ot_weekday_167 > 0) return "平日加班(1.67)";
  if (row.hours_ot_rest_134 > 0) return "休息日加班(1.34)";
  if (row.hours_ot_rest_167 > 0) return "休息日加班(1.67)";
  if (row.hours_ot_rest_267 > 0) return "休息日加班(2.67)";
  if (row.hours_ot_offday_100 > 0) return "國定例假日加班";
  if (row.hours_ot_offday_200 > 0) return "國定例假日加班(2)";
  if (row.hours_ot_holiday_100 > 0) return "國定假日加班";
  if (row.hours_ot_holiday_134 > 0) return "國定假日加班(1.34)";
  if (row.hours_ot_holiday_167 > 0) return "國定假日加班(1.67)";
  return "正常工時";
}

// =================================================================
// 認證相關 Handler
// =================================================================

// 修改 handleGetEmployees 以支持權限檢查
async function handleGetEmployees(db, user) {
  // 員工只能查到自己
  if (user.role === 'employee') {
    if (!user.employee_name) {
      return jsonResponse({ error: '未授權' }, 403);
    }
    const res = await db.prepare(
      "SELECT name, hire_date, gender FROM employees WHERE name = ?"
    ).bind(user.employee_name).all();
    const rows = getRows(res);
    return jsonResponse(rows);
  }
  
  // 管理員可以查詢全部
  const res = await db.prepare("SELECT name, hire_date, gender FROM employees ORDER BY name").all();
  const rows = getRows(res);
  return jsonResponse(rows);
}

// 修改 handleGetTimesheetData 以支持權限檢查
async function handleGetTimesheetData(db, params, user) {
  const employee = params.get("employee");
  const year = params.get("year");
  const month = params.get("month");
  
  if (!employee || !year || !month) {
    return jsonResponse({ error: "Missing parameters" }, 400);
  }
  
  // 檢查權限
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "無權查看此員工資料" }, 403);
  }
  
  const res = await db.prepare(`
    SELECT *
    FROM timesheets
    WHERE employee_name = ? AND work_year = ? AND work_month = ?
    ORDER BY work_date
  `).bind(employee, year, month).all();
  
  const rows = getRows(res);
  return jsonResponse(aggregateTimesheetData(rows));
}

// 修改 handleSaveTimesheet 以支持權限檢查
async function handleSaveTimesheet(db, payload, user) {
  const { employee, year, month, workEntries = [], leaveEntries = [] } = payload;
  
  // 檢查權限
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "無權修改此員工資料" }, 403);
  }
  
  try {
    await db.prepare(`DELETE FROM timesheets WHERE employee_name = ? AND work_year = ? AND work_month = ?`)
      .bind(employee, year, month).run();

    for (const entry of workEntries) {
      const { clientName, businessType, workType } = entry;
      for (const day in entry.hours) {
        const hours = entry.hours[day];
        if (hours > 0) {
          const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayOfWeek = new Date(workDate).toLocaleString('zh-TW', { weekday: 'long' });
          const weightedHours = await calculateWeightedHours(db, workType, hours);

          let col = {
            hours_normal: 0, hours_ot_weekday_134: 0, hours_ot_weekday_167: 0,
            hours_ot_rest_134: 0, hours_ot_rest_167: 0, hours_ot_rest_267: 0,
            hours_ot_offday_100: 0, hours_ot_offday_200: 0,
            hours_ot_holiday_100: 0, hours_ot_holiday_134: 0, hours_ot_holiday_167: 0
          };

          const match = {
            "正常工時": "hours_normal",
            "平日加班(1.34)": "hours_ot_weekday_134",
            "平日加班(1.67)": "hours_ot_weekday_167",
            "休息日加班(1.34)": "hours_ot_rest_134",
            "休息日加班(1.67)": "hours_ot_rest_167",
            "休息日加班(2.67)": "hours_ot_rest_267",
            "國定例假日加班": "hours_ot_offday_100",
            "國定例假日加班(2)": "hours_ot_offday_200",
            "國定假日加班": "hours_ot_holiday_100",
            "國定假日加班(1.34)": "hours_ot_holiday_134",
            "國定假日加班(1.67)": "hours_ot_holiday_167",
          };
          if (match[workType]) col[match[workType]] = hours;

          await db.prepare(`
            INSERT INTO timesheets (
              employee_name, client_name, work_date, day_of_week, work_year, work_month,
              hours_normal, hours_ot_weekday_134, hours_ot_weekday_167,
              hours_ot_rest_134, hours_ot_rest_167, hours_ot_rest_267,
              hours_ot_offday_100, hours_ot_offday_200,
              hours_ot_holiday_100, hours_ot_holiday_134, hours_ot_holiday_167,
              weighted_hours, business_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            employee, clientName, workDate, dayOfWeek, year, month,
            col.hours_normal, col.hours_ot_weekday_134, col.hours_ot_weekday_167,
            col.hours_ot_rest_134, col.hours_ot_rest_167, col.hours_ot_rest_267,
            col.hours_ot_offday_100, col.hours_ot_offday_200,
            col.hours_ot_holiday_100, col.hours_ot_holiday_134, col.hours_ot_holiday_167,
            weightedHours, businessType
          ).run();
        }
      }
    }

    for (const entry of leaveEntries) {
      const { leaveType, hours } = entry;
      for (const day in hours) {
        const h = hours[day];
        if (h > 0) {
          const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayOfWeek = new Date(workDate).toLocaleString('zh-TW', { weekday: 'long' });
          await db.prepare(`
            INSERT INTO timesheets (
              employee_name, work_date, day_of_week, work_year, work_month,
              leave_type, leave_hours
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(employee, workDate, dayOfWeek, year, month, leaveType, h).run();
        }
      }
    }

    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 客戶管理 CRUD
// =================================================================
async function handleUpdateClient(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '客戶名稱不可為空' }, 400);
    }

    // 因為 name 是主鍵，要更新關聯表
    const res = await db.prepare(`
      UPDATE clients SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?
    `).bind(name, oldName).run();

    // 如果沒有任何被更新，代表名稱不存在或相等
    if (!res?.meta || res.meta.changes === 0) {
      // 再檢查是否實際名稱未改變（等於舊名）如果是則視為成功
      if (oldName === name) {
        return jsonResponse({ success: true, message: '客戶已更新' });
      }
      // 檢查舊名稱是否存在
      const exists = await db.prepare(`SELECT 1 FROM clients WHERE name = ?`).bind(oldName).first();
      if (!exists) {
        return jsonResponse({ error: '找不到要更新的客戶' }, 404);
      }
    }

    // 更新關聯表（數據庫用 ON UPDATE CASCADE，自動同步）
    await db.prepare(`
      UPDATE client_assignments SET client_name = ?, updated_at = CURRENT_TIMESTAMP WHERE client_name = ?
    `).bind(name, oldName).run();
    await db.prepare(`
      UPDATE timesheets SET client_name = ? WHERE client_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '客戶已更新' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此客戶名稱已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteClient(db, clientName) {
  try {
    // 檢查是否有客戶指派
    const assignments = await db.prepare(`
      SELECT COUNT(*) as count FROM client_assignments WHERE client_name = ?
    `).bind(clientName).first();

    if (assignments && assignments.count > 0) {
      return jsonResponse({ error: '無法刪除：此客戶仍有指派記錄' }, 400);
    }

    await db.prepare(`DELETE FROM clients WHERE name = ?`).bind(clientName).run();
    return jsonResponse({ success: true, message: '客戶已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 客戶指派 CRUD
// =================================================================
async function handleGetAssignments(db, searchParams) {
  try {
    let query = `
      SELECT 
        employee_name,
        client_name
      FROM client_assignments
      ORDER BY employee_name, client_name
    `;

    const employeeName = searchParams.get('employee');
    if (employeeName) {
      query = `
        SELECT 
          employee_name,
          client_name
        FROM client_assignments
        WHERE employee_name = ?
        ORDER BY client_name
      `;
      const res = await db.prepare(query).bind(employeeName).all();
      const rows = getRows(res);
      // 轉換為前端格式
      return jsonResponse(rows.map((r, index) => ({
        id: index + 1,
        employee_name: r.employee_name,
        client_name: r.client_name,
        created_at: '1970-01-01T00:00:00.000Z'
      })));
    }

    const res = await db.prepare(query).all();
    const rows = getRows(res);
    // 轉換為前端格式
    return jsonResponse(rows.map((r, index) => ({
      id: index + 1,
      employee_name: r.employee_name,
      client_name: r.client_name,
      created_at: '1970-01-01T00:00:00.000Z'
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteAssignment(db, assignmentId) {
  try {
    // assignmentId 格式為 "employee_name|client_name"
    const decoded = decodeURIComponent(assignmentId.toString());
    const [employeeName, clientName] = decoded.split('|');
    
    if (!employeeName || !clientName) {
      return jsonResponse({ error: '找不到該ID' }, 400);
    }
    
    const res = await db.prepare(`
      DELETE FROM client_assignments 
      WHERE employee_name = ? AND client_name = ?
    `).bind(employeeName, clientName).run();
    
    // D1 失敗時 meta.changes 可能為0，再檢查是否存在
    if (res?.meta?.changes === 0) {
      const check = await db.prepare(`SELECT 1 FROM client_assignments WHERE employee_name = ? AND client_name = ?`)
        .bind(employeeName, clientName).first();
      if (check) return jsonResponse({ error: '刪除失敗：指派不存在' }, 400);
    }
    
    return jsonResponse({ success: true, message: '指派已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 業務類別 CRUD
// =================================================================
async function handleCreateBusinessType(db, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '業務類別名稱不可為空' }, 400);
    }

    await db.prepare(`
      INSERT INTO business_types (type_name) VALUES (?)
    `).bind(name).run();

    return jsonResponse({ 
      success: true, 
      message: '業務類別已新增'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此業務類別已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateBusinessType(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '業務類別名稱不可為空' }, 400);
    }

    await db.prepare(`
      UPDATE business_types SET type_name = ?, updated_at = CURRENT_TIMESTAMP WHERE type_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '業務類別已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteBusinessType(db, typeName) {
  try {
    await db.prepare(`DELETE FROM business_types WHERE type_name = ?`).bind(typeName).run();
    return jsonResponse({ success: true, message: '業務類別已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 查詢事件 CRUD
// =================================================================
async function handleGetLeaveEvents(db, searchParams) {
  try {
    let query = `
      SELECT 
        id,
        employee_name,
        event_date,
        event_type
      FROM leave_events
      ORDER BY event_date DESC, employee_name
    `;

    const params = [];
    const employeeName = searchParams.get('employee');
    const year = searchParams.get('year');

    if (employeeName || year) {
      const conditions = [];
      if (employeeName) {
        conditions.push('employee_name = ?');
        params.push(employeeName);
      }
      if (year) {
        conditions.push('strftime("%Y", event_date) = ?');
        params.push(year);
      }
      query = `
        SELECT 
          id,
          employee_name,
          event_date,
          event_type
        FROM leave_events
        WHERE ${conditions.join(' AND ')}
        ORDER BY event_date DESC
      `;
    }

    const res = params.length > 0 
      ? await db.prepare(query).bind(...params).all()
      : await db.prepare(query).all();

    const rows = getRows(res);
    // 添加 notes 欄位（即使資料庫中沒有）
    return jsonResponse(rows);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleCreateLeaveEvent(db, payload) {
  try {
    const { employee_name, event_date, event_type } = payload;
    
    if (!employee_name || !event_date || !event_type) {
      return jsonResponse({ error: '員工姓名、事件日期、事件類別不可為空' }, 400);
    }

    const result = await db.prepare(`
      INSERT INTO leave_events (employee_name, event_date, event_type)
      VALUES (?, ?, ?)
    `).bind(employee_name, event_date, event_type).run();

    return jsonResponse({ 
      success: true, 
      message: '請假事件已新增',
      id: result.meta.last_row_id 
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateLeaveEvent(db, id, payload) {
  try {
    const { employee_name, event_date, event_type } = payload;
    
    if (!employee_name || !event_date || !event_type) {
      return jsonResponse({ error: '員工姓名、事件日期、事件類別不可為空' }, 400);
    }

    await db.prepare(`
      UPDATE leave_events 
      SET employee_name = ?, event_date = ?, event_type = ?
      WHERE id = ?
    `).bind(employee_name, event_date, event_type, id).run();

    return jsonResponse({ success: true, message: '請假事件已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteLeaveEvent(db, id) {
  try {
    await db.prepare(`DELETE FROM leave_events WHERE id = ?`).bind(id).run();
    return jsonResponse({ success: true, message: '請假事件已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 國定假日 CRUD
// =================================================================
async function handleCreateHoliday(db, payload) {
  try {
    const { holiday_date, holiday_name } = payload;
    
    if (!holiday_date || !holiday_name) {
      return jsonResponse({ error: '假日日期和名稱為必填' }, 400);
    }

    await db.prepare(`
      INSERT INTO holidays (holiday_date, holiday_name)
      VALUES (?, ?)
    `).bind(holiday_date, holiday_name).run();

    return jsonResponse({ 
      success: true, 
      message: '國定假日已新增'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此日期已存在假日' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateHoliday(db, oldDate, payload) {
  try {
    const { holiday_date, holiday_name } = payload;
    
    if (!holiday_date || !holiday_name) {
      return jsonResponse({ error: '假日日期和名稱為必填' }, 400);
    }

    // 因為 holiday_date 是主鍵，要刪除舊記錄
    await db.prepare(`DELETE FROM holidays WHERE holiday_date = ?`).bind(oldDate).run();
    await db.prepare(`
      INSERT INTO holidays (holiday_date, holiday_name)
      VALUES (?, ?)
    `).bind(holiday_date, holiday_name).run();

    return jsonResponse({ success: true, message: '國定假日已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteHoliday(db, holidayDate) {
  try {
    await db.prepare(`DELETE FROM holidays WHERE holiday_date = ?`).bind(holidayDate).run();
    return jsonResponse({ success: true, message: '國定假日已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 假別類型 CRUD (僅管理員)
// =================================================================
async function handleCreateLeaveType(db, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '假別名稱不可為空' }, 400);
    }

    await db.prepare(`
      INSERT INTO leave_types (type_name) VALUES (?)
    `).bind(name).run();

    return jsonResponse({ 
      success: true, 
      message: '假別已新增'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此假別已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateLeaveType(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '假別名稱不可為空' }, 400);
    }

    await db.prepare(`
      UPDATE leave_types SET type_name = ? WHERE type_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '假別已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteLeaveType(db, typeName) {
  try {
    await db.prepare(`DELETE FROM leave_types WHERE type_name = ?`).bind(typeName).run();
    return jsonResponse({ success: true, message: '假別已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 系統參數 CRUD (僅管理員)
// =================================================================
async function handleGetSystemParams(db) {
  try {
    const res = await db.prepare(`
      SELECT param_name, param_value
      FROM system_parameters
      ORDER BY param_name
    `).all();
    
    const rows = getRows(res);
    // 添加 description 欄位（即使資料庫中沒有）
    return jsonResponse(rows.map(r => ({
      param_name: r.param_name,
      param_value: r.param_value,
      description: getParamDescription(r.param_name)
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 參數說明對照表
function getParamDescription(paramName) {
  const descriptions = {
    'max_work_hours': '每日最大工時',
    'min_work_hours': '每日最小工時',
    'overtime_threshold': '加班時數門檻',
    'default_work_hours': '預設工作時數'
  };
  return descriptions[paramName] || '';
}

async function handleUpdateSystemParams(db, payload) {
  try {
    const { params } = payload;
    
    if (!params || !Array.isArray(params)) {
      return jsonResponse({ error: '參數格式錯誤' }, 400);
    }

    // 逐次更新參數
    for (const param of params) {
      await db.prepare(`
        UPDATE system_parameters 
        SET param_value = ?
        WHERE param_name = ?
      `).bind(param.value, param.name).run();
    }

    return jsonResponse({ success: true, message: '系統參數已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 用戶管理 CRUD (僅管理員)
// =================================================================
async function handleUpdateUser(db, id, payload) {
  try {
    const { username, role, employee_name, is_active } = payload;
    
    if (!username || !role) {
      return jsonResponse({ error: '使用者名稱和角色不可為空' }, 400);
    }

    await db.prepare(`
      UPDATE users 
      SET username = ?, role = ?, employee_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(username, role, employee_name || null, is_active ? 1 : 0, id).run();

    return jsonResponse({ success: true, message: '使用者已新增' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '使用者名稱已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteUser(db, id) {
  try {
    // 檢查是否為唯一的管理員
    const adminCount = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1
    `).first();

    const user = await db.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(id).first();

    if (user && user.role === 'admin' && adminCount.count <= 1) {
      return jsonResponse({ error: '無法刪除：至少需要保留一個管理員帳號' }, 400);
    }

    await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
    await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(id).run();

    return jsonResponse({ success: true, message: '使用者已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 員工管理 CRUD (僅管理員)
// =================================================================
async function handleGetAllEmployees(db) {
  try {
    const res = await db.prepare(`
      SELECT name, hire_date, gender
      FROM employees
      ORDER BY name
    `).all();
    const rows = getRows(res);
    return jsonResponse(rows);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleCreateEmployee(db, payload) {
  try {
    const { name, hire_date, gender } = payload;
    
    if (!name) {
      return jsonResponse({ error: '員工姓名不可為空' }, 400);
    }
    
    await db.prepare(`
      INSERT INTO employees (name, hire_date, gender)
      VALUES (?, ?, ?)
    `).bind(name, hire_date || null, gender || null).run();
    
    return jsonResponse({ success: true, message: '員工已新增' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此員工名稱已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateEmployee(db, oldName, payload) {
  try {
    const { name, hire_date, gender } = payload;
    
    if (!name) {
      return jsonResponse({ error: '員工姓名不可為空' }, 400);
    }
    
    // 因為 name 是主鍵，要更新關聯表
    await db.prepare(`
      UPDATE employees SET name = ?, hire_date = ?, gender = ? WHERE name = ?
    `).bind(name, hire_date || null, gender || null, oldName).run();
    
    return jsonResponse({ success: true, message: '員工已更新' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此員工名稱已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteEmployee(db, employeeName) {
  try {
    // 檢查是否有客戶指派
    const assignments = await db.prepare(`
      SELECT COUNT(*) as count FROM client_assignments WHERE employee_name = ?
    `).bind(employeeName).first();
    
    if (assignments && assignments.count > 0) {
      return jsonResponse({ error: '無法刪除：此員工仍有客戶指派記錄' }, 400);
    }
    
    // 檢查是否有使用者帳號
    const users = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE employee_name = ?
    `).bind(employeeName).first();
    
    if (users && users.count > 0) {
      return jsonResponse({ error: '無法刪除：此員工已綁定使用者帳號' }, 400);
    }
    
    await db.prepare(`DELETE FROM employees WHERE name = ?`).bind(employeeName).run();
    return jsonResponse({ success: true, message: '員工已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// CORS & JSON
// =================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function handleOptions() {
  return new Response(null, { headers: corsHeaders });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      ...corsHeaders,
    },
  });
}
