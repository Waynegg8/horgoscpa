/* * 修正?��?Cloudflare Worker ?�容 D1 ?�傳?��?
 * 修正?�誤：Cannot read properties of undefined (reading 'forEach')
 * ?��?：使?�者�?證�?權�?管�?
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
  canAccessEmployee
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
  importClients
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
  getPosts,
  createPost,
  updatePost,
  getPublicPosts,
  getPublicPost,
  getPublicResources
} from './cms.js';

// 添�? CORS headers ?��???
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
      // 認�??��? API
      // ----------------------------------------------------
      
      // ?�入
      if (url.pathname === "/api/login" && method === "POST") {
        return await handleLogin(env.DB, request);
      }
      
      // ?�出
      if (url.pathname === "/api/logout" && method === "POST") {
        return await handleLogout(env.DB, request);
      }
      
      // 驗�??��? session
      if (url.pathname === "/api/verify" && method === "GET") {
        return await handleVerifySession(env.DB, request);
      }
      
      // 驗�??��? session (?��?)
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return await handleVerifySession(env.DB, request);
      }
      
      // 修改密碼
      if (url.pathname === "/api/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // 修改密碼 (?��?)
      if (url.pathname === "/api/auth/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // 管�??��?設用?��?�?
      if (url.pathname.match(/^\/api\/admin\/users\/[^\/]+\/reset-password$/) && method === "POST") {
        const username = decodeURIComponent(url.pathname.split("/")[4]);
        return await handleAdminResetPassword(env.DB, request, username);
      }
      
      // ?�出 (?��?)
      if (url.pathname === "/api/auth/logout" && method === "POST") {
        return await handleLogout(env.DB, request);
      }

      // ----------------------------------------------------
      // 資�? API（�?要�?證�?
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

      // 讀?�工?��???
      if (url.pathname === "/api/work-types" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const workTypes = [
          "�?��工�?", "平日?�班(1.34)", "平日?�班(1.67)", "休息?��???1.34)",
          "休息?��???1.67)", "休息?��???2.67)", "?��?例�??��???, "?��?例�??��???2)",
          "?��??��??�日?�班", "?��??��??�日?�班(1.34)", "?��??��??�日?�班(1.67)"
        ];
        return jsonResponse(workTypes);
      }

      // 寫入工�?資�?
      if (url.pathname === "/api/save-timesheet" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleSaveTimesheet(env.DB, payload, auth.user);
      }
      
      // 管�??��???API
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
      // 客戶管�? CRUD (?�?�員工可??
      // ========================================
      if (url.pathname === "/api/clients" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        
        // 如�???employee ?�數，�??�該?�工?�客?��?表�??�於工�?表�?
        if (url.searchParams.has('employee')) {
          return await handleGetClients(env.DB, url.searchParams, auth.user);
        }
        
        // ?��?返�??�?�客?��??�於設�??�面�?
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
      // 客戶?��?資�? API (?�認�?)
      // ========================================
      
      // ?��??�?�客?�詳細�???
      if (url.pathname === "/api/clients/extended" && method === "GET") {
        return await addCorsHeaders(await getClientsExtended(request, env));
      }
      
      // ?��??��?客戶詳細資�?
      if (url.pathname.match(/^\/api\/clients\/[^\/]+\/extended$/) && method === "GET") {
        const clientName = decodeURIComponent(url.pathname.split("/")[3]);
        return await addCorsHeaders(await getClientExtended(request, env, clientName));
      }
      
      // ?�建?�更?�客?�詳細�???
      if (url.pathname.match(/^\/api\/clients\/[^\/]+\/extended$/) && (method === "POST" || method === "PUT")) {
        const clientName = decodeURIComponent(url.pathname.split("/")[3]);
        return await addCorsHeaders(await upsertClientExtended(request, env, clientName));
      }
      
      // ?��??��?管�?
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
      
      // 客戶互�?記�?
      if (url.pathname === "/api/client-interactions" && method === "GET") {
        return await addCorsHeaders(await getClientInteractions(request, env);
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
      
      // CSV ?�入
      if (url.pathname === "/api/import/clients" && method === "POST") {
        return await importClients(request, env);
      }

      // ========================================
      // SOP ?�件管�? API (?�認�?)
      // ========================================
      
      // SOP ?��?
      if (url.pathname === "/api/sop/categories" && method === "GET") {
        return await addCorsHeaders(await getSopCategories(request, env));
      }
      
      if (url.pathname === "/api/sop/categories" && method === "POST") {
        return await addCorsHeaders(await createSopCategory(request, env));
      }
      
      // SOP ?��?
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
      
      // SOP ?�本歷史
      if (url.pathname.match(/^\/api\/sops\/\d+\/versions$/) && method === "GET") {
        const sopId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getSopVersions(request, env, sopId));
      }
      
      // SOP ?��?
      if (url.pathname === "/api/sops/search" && method === "GET") {
        return await addCorsHeaders(await searchSops(request, env));
      }

      // ========================================
      // 媒�?管�? API (?�認�?)
      // ========================================
      
      // 上傳?��?
      if (url.pathname === "/api/upload/image" && method === "POST") {
        return await uploadImage(request, env);
      }
      
      // ?��?媒�??�表
      if (url.pathname === "/api/media" && method === "GET") {
        return await addCorsHeaders(await getMediaList(request, env));
      }
      
      // ?�除媒�?
      if (url.pathname.match(/^\/api\/media\/\d+$/) && method === "DELETE") {
        const mediaId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteMedia(request, env, mediaId));
      }

      // ========================================
      // 專�??�任?�管??API (?�認�?)
      // ========================================
      
      // 專�?
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
      
      // 專�?任�?
      if (url.pathname.match(/^\/api\/projects\/\d+\/tasks$/) && method === "GET") {
        const projectId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getProjectTasks(request, env, projectId));
      }
      
      // 任�?
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
      
      // 任�?檢核清單
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
      // CMS - ?��?管�? API (?�認�?)
      // ========================================
      
      // 後台?��?管�?
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
      
      // ?�台?��? API（無?�認�?�?
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
      // 客戶?�派 CRUD (?�?�員工可??
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
      // 業�?類�? CRUD (?�?�員工可??
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
      // ?��?事件 CRUD (?�?�員工可??
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
      // ?��??�日 CRUD (?�?�員工可??
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
      // ?�別類�? CRUD (?�管?�員)
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
      // 系統?�數 (?�管?�員)
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
      // ?�工管�? CRUD (?�管?�員)
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
      // ?�戶管�? CRUD (?�管?�員)
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
      // ?�表 API（優?��?，含快�?�?
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

      // 快�?管�?（管?�員專用�?
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

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

// =================================================================
// 工具：統一?�出 rows
// =================================================================
function getRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.results && Array.isArray(result.results)) return result.results;
  return [];
}

// =================================================================
// ?��?讀??API (不�?要特殊�??��?輯�?)
// =================================================================

// ?��??�?�客?��??�於設�??�面�?
async function handleGetAllClients(db) {
  try {
    const res = await db.prepare(`
      SELECT name
      FROM clients
      ORDER BY name
    `).all();
    const rows = getRows(res);
    // 轉�??��?端�??��??��?
    return jsonResponse(rows.map((r, index) => ({
      id: index + 1,
      name: r.name,
      created_at: '1970-01-01T00:00:00.000Z'
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?��??��??�工?�客?��?表�??�於工�?表�?
async function handleGetClients(db, params, user) {
  const employee = params.get("employee");
  if (!employee) return jsonResponse({ error: "Missing employee parameter" }, 400);
  
  // 檢查權�?
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "?��??��??�此?�工資�?" }, 403);
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
  // 轉�??��?端�??��??��?
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    name: r.type_name
  })));
}

async function handleGetLeaveTypes(db) {
  const res = await db.prepare("SELECT type_name FROM leave_types ORDER BY type_name").all();
  const rows = getRows(res);
  // 轉�??��?端�??��??��?
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    type_name: r.type_name
  })));
}

async function handleGetHolidays(db, params) {
  const year = params.get("year");
  
  // 如�??�年份�??��?返�?該年份�??�日?��??�表（用?�工?�表標示�?
  if (year) {
    const res = await db.prepare("SELECT holiday_date FROM holidays WHERE holiday_date LIKE ? ORDER BY holiday_date")
      .bind(`${year}-%`).all();
    const rows = getRows(res);
    return jsonResponse(rows.map(r => r.holiday_date));
  }
  
  // ?��?返�??�?��??��?完整資�?（用?�設定�??��?
  const res = await db.prepare("SELECT holiday_date, holiday_name FROM holidays ORDER BY holiday_date DESC").all();
  const rows = getRows(res);
  // 轉�??��?端�??��??��?（使??holiday_date 作為 id�?
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    holiday_date: r.holiday_date,
    holiday_name: r.holiday_name
  })));
}

// 依�?資�?庫�??��??�年度�??��?�?
async function handleGetLeaveQuota(db, params) {
  const employee = params.get('employee');
  const year = parseInt(params.get('year'));
  if (!employee || !year) return jsonResponse({ error: 'Missing parameters' }, 400);

  // ?��??�工?�職?��??�別
  const emp = await db.prepare(`SELECT hire_date, gender FROM employees WHERE name = ?`).bind(employee).first();
  const hireDate = emp?.hire_date || null;
  const gender = emp?.gender || null;

  // ?��?規�?
  const annualRules = await db.prepare(`SELECT seniority_years, leave_days FROM annual_leave_rules ORDER BY seniority_years`).all();
  const annualRows = getRows(annualRules);

  function computeAnnualDays(hire) {
    if (!hire) return 0;
    const h = new Date(hire);
    const y = year;
    if (h.getFullYear() === y) {
      // ?�職年�?滿�?年給 3 �?
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

  // ?��??�別規�?（�??�、�??�、�??��??��??�、喪??..�?
  const otherRulesRes = await db.prepare(`SELECT leave_type, leave_days, grant_type FROM other_leave_rules`).all();
  const otherRules = getRows(otherRulesRes);

  // ?��?結�?
  let carryoverHours = 0;
  try {
    const carry = await db.prepare(`SELECT carryover_days FROM annual_leave_carryover WHERE employee_name = ?`).bind(employee).first();
    if (carry) carryoverHours = (carry.carryover_days || 0) * 8;
  } catch (_) {}

  const quota = [];
  const annualDays = computeAnnualDays(hireDate);
  quota.push({ type: '?��?', quota_hours: (annualDays * 8) + carryoverHours });

  // ?��??�其他�??��?額�?並�??��??�年度�??��?以�??��?
  let sickCapHours = 0;
  for (const r of otherRules) {
    let hours = 0;
    if (r.grant_type === '年度給�?') {
      hours = (r.leave_days * 8);
    } else if (r.grant_type === '事件給�?') {
      // 事件給�?：�???leave_events 中出?�相符�?件�?給�?�?
      const eventCount = await db.prepare(`
        SELECT COUNT(*) AS cnt
        FROM leave_events
        WHERE employee_name = ? AND strftime('%Y', event_date) = ? AND event_type = ?
      `).bind(employee, String(year), r.leave_type).first();
      const hasEvent = eventCount && eventCount.cnt > 0;
      hours = hasEvent ? (r.leave_days * 8) : 0;
    }
    quota.push({ type: r.leave_type, quota_hours: hours, grant_type: r.grant_type });
    if (r.leave_type === '?��?') sickCapHours = hours;
  }

  // ?��??��??��?女性�??��???1 天�?8 小�?）�?不逐�?累�?；�??��??�併年度上�?
  if (gender && (gender === 'female' || gender === '�? || gender === 'F')) {
    quota.push({ 
      type: '?��???, 
      quota_hours: 8,                 // 顯示每�?上�???
      grant_type: '每�?上�?',
      per_month_cap_hours: 8,
      non_carryover: true,
      combined_with: '?��?', 
      combined_cap_hours: sickCapHours || (30 * 8) 
    });
  }

  return jsonResponse({ employee, year, quota });
}

// =================================================================
// ?��?小�?計�?
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
  if (wt.includes("平日?�班")) return "平日?�班";
  if (wt.includes("休息?��???)) return "休息?��???;
  if (wt.includes("例�??��???)) return "例�??��???;
  if (wt.includes("?��??�日?�班")) return "?��??�日?�班";
  return null;
}

// =================================================================
// ?��? Timesheet Data
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
  if (row.hours_normal > 0) return "�?��工�?";
  if (row.hours_ot_weekday_134 > 0) return "平日?�班(1.34)";
  if (row.hours_ot_weekday_167 > 0) return "平日?�班(1.67)";
  if (row.hours_ot_rest_134 > 0) return "休息?��???1.34)";
  if (row.hours_ot_rest_167 > 0) return "休息?��???1.67)";
  if (row.hours_ot_rest_267 > 0) return "休息?��???2.67)";
  if (row.hours_ot_offday_100 > 0) return "?��?例�??��???;
  if (row.hours_ot_offday_200 > 0) return "?��?例�??��???2)";
  if (row.hours_ot_holiday_100 > 0) return "?��??��??�日?�班";
  if (row.hours_ot_holiday_134 > 0) return "?��??��??�日?�班(1.34)";
  if (row.hours_ot_holiday_167 > 0) return "?��??��??�日?�班(1.67)";
  return "�?��工�?";
}

// =================================================================
// 認�??��? Handler
// =================================================================

// ?�入
async function handleLogin(db, request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return jsonResponse({ error: '請�?供使?�者�?稱�?密碼' }, 400);
    }
    
    // ?�詢使用??
    const user = await db.prepare(`
      SELECT id, username, password_hash, role, employee_name, is_active
      FROM users
      WHERE username = ? AND is_active = 1
    `).bind(username).first();
    
    if (!user) {
      return jsonResponse({ error: '使用?��?稱�?密碼?�誤' }, 401);
    }
    
    // 驗�?密碼
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: '使用?��?稱�?密碼?�誤' }, 401);
    }
    
    // ?�建 session
    const sessionToken = await createSession(db, user.id);
    
    return jsonResponse({
      success: true,
      session_token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_name: user.employee_name
      }
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?�出
async function handleLogout(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    if (sessionToken) {
      await deleteSession(db, sessionToken);
    }
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 驗�? session
async function handleVerifySession(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    const user = await verifySession(db, sessionToken);
    
    if (!user) {
      return jsonResponse({ error: '?��?�? }, 401);
    }
    
    return jsonResponse({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employee_name: user.employee_name
      }
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 修改密碼
async function handleChangePassword(db, request) {
  try {
    const auth = await requireAuth(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 401);
    }
    
    const body = await request.json();
    // ?��??�種?��??��?
    const oldPassword = body.old_password || body.currentPassword;
    const newPassword = body.new_password || body.newPassword;
    
    if (!oldPassword || !newPassword) {
      return jsonResponse({ error: '請�?供目?��?碼�??��?�? }, 400);
    }
    
    if (newPassword.length < 6) {
      return jsonResponse({ error: '?��?碼至少�?�?6 ?��??? }, 400);
    }
    
    // 驗�??��?�?
    const user = await db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).bind(auth.user.id).first();
    
    if (!user) {
      return jsonResponse({ error: '使用?��?存在' }, 404);
    }
    
    const isValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: '?��?密碼?�誤' }, 401);
    }
    
    // ?�新密碼
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newHash, auth.user.id).run();
    
    return jsonResponse({ success: true, message: '密碼已�??�更?? });
  } catch (err) {
    console.error('Change password error:', err);
    return jsonResponse({ error: err.message || '密碼?�新失�?' }, 500);
  }
}

// 管�??��?設用?��?�?
async function handleAdminResetPassword(db, request, username) {
  try {
    const auth = await requireAdmin(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 403);
    }
    
    const body = await request.json();
    const newPassword = body.new_password || body.newPassword;
    
    if (!newPassword) {
      return jsonResponse({ error: '請�?供新密碼' }, 400);
    }
    
    if (newPassword.length < 6) {
      return jsonResponse({ error: '?��?碼至少�?�?6 ?��??? }, 400);
    }
    
    // 檢查?�戶?�否存在
    const user = await db.prepare(`
      SELECT id FROM users WHERE username = ?
    `).bind(username).first();
    
    if (!user) {
      return jsonResponse({ error: '使用?��?存在' }, 404);
    }
    
    // ?�新密碼
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?
    `).bind(newHash, username).run();
    
    return jsonResponse({ success: true, message: `已�??��?�?${username} ?��?碼` });
  } catch (err) {
    console.error('Admin reset password error:', err);
    return jsonResponse({ error: err.message || '密碼?�設失�?' }, 500);
  }
}

// ?��??�?�使?�者�?管�??��?
async function handleGetUsers(db) {
  try {
    const res = await db.prepare(`
      SELECT id, username, role, employee_name, is_active, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();
    const rows = getRows(res);
    return jsonResponse(rows);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?�建使用?��?管�??��?
async function handleCreateUser(db, payload) {
  try {
    const { username, password, role, employee_name } = payload;
    
    if (!username || !password || !role) {
      return jsonResponse({ error: '請�?供�??��?�? }, 400);
    }
    
    const passwordHash = await hashPassword(password);
    
    await db.prepare(`
      INSERT INTO users (username, password_hash, role, employee_name)
      VALUES (?, ?, ?, ?)
    `).bind(username, passwordHash, role, employee_name || null).run();
    
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?�建客戶（管?�員�?
async function handleCreateClient(db, payload) {
  try {
    const { name } = payload;
    
    if (!name) {
      return jsonResponse({ error: '請�?供客?��?�? }, 400);
    }
    
    await db.prepare(`
      INSERT INTO clients (name) VALUES (?)
    `).bind(name).run();
    
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?�建?�工客戶對�?（管?�員�?
async function handleCreateAssignment(db, payload) {
  try {
    const { employee_name, client_name } = payload;
    
    if (!employee_name || !client_name) {
      return jsonResponse({ error: '請�?供�??��?�? }, 400);
    }
    
    await db.prepare(`
      INSERT INTO client_assignments (employee_name, client_name)
      VALUES (?, ?)
    `).bind(employee_name, client_name).run();
    
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 修改?��? Handler 以支?��??�檢??
// =================================================================

// 修改 handleGetEmployees 以支?��???
async function handleGetEmployees(db, user) {
  // ?�工?�能?�到?�己
  if (user.role === 'employee') {
    if (!user.employee_name) {
      return jsonResponse({ error: '?��??? }, 403);
    }
    const res = await db.prepare(
      "SELECT name, hire_date, gender FROM employees WHERE name = ?"
    ).bind(user.employee_name).all();
    const rows = getRows(res);
    return jsonResponse(rows);
  }
  
  // 管�??�可以�??�部
  const res = await db.prepare("SELECT name, hire_date, gender FROM employees ORDER BY name").all();
  const rows = getRows(res);
  return jsonResponse(rows);
}

// 修改 handleGetTimesheetData 以支?��???
async function handleGetTimesheetData(db, params, user) {
  const employee = params.get("employee");
  const year = params.get("year");
  const month = params.get("month");
  
  if (!employee || !year || !month) {
    return jsonResponse({ error: "Missing parameters" }, 400);
  }
  
  // 檢查權�?
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "?��??��??�此?�工資�?" }, 403);
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

// 修改 handleSaveTimesheet 以支?��???
async function handleSaveTimesheet(db, payload, user) {
  const { employee, year, month, workEntries = [], leaveEntries = [] } = payload;
  
  // 檢查權�?
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "?��??�修?�此?�工資�?" }, 403);
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
            "�?��工�?": "hours_normal",
            "平日?�班(1.34)": "hours_ot_weekday_134",
            "平日?�班(1.67)": "hours_ot_weekday_167",
            "休息?��???1.34)": "hours_ot_rest_134",
            "休息?��???1.67)": "hours_ot_rest_167",
            "休息?��???2.67)": "hours_ot_rest_267",
            "?��?例�??��???: "hours_ot_offday_100",
            "?��?例�??��???2)": "hours_ot_offday_200",
            "?��??��??�日?�班": "hours_ot_holiday_100",
            "?��??��??�日?�班(1.34)": "hours_ot_holiday_134",
            "?��??��??�日?�班(1.67)": "hours_ot_holiday_167",
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
// 客戶管�? CRUD
// =================================================================
async function handleUpdateClient(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '客戶?�稱?��?�? }, 400);
    }

    // ?�為 name ?�主?��??�要更?��??��??�表
    const res = await db.prepare(`
      UPDATE clients SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?
    `).bind(name, oldName).run();

    // 如�?沒�?任�??�被?�新，代表�??�稱不�??��??��???
    if (!res?.meta || res.meta.changes === 0) {
      // ?�檢?�是?�實?��??�稱?��??��??��?等於?��?）�?如�??��?視為?��?
      if (oldName === name) {
        return jsonResponse({ success: true, message: '客戶已更?? });
      }
      // 檢查?��?稱是?��???
      const exists = await db.prepare(`SELECT 1 FROM clients WHERE name = ?`).bind(oldName).first();
      if (!exists) {
        return jsonResponse({ error: '?��??��??�新?�客?? }, 404);
      }
    }

    // ?�新?�聯表�??��??�庫?��???ON UPDATE CASCADE，�??��?步�?
    await db.prepare(`
      UPDATE client_assignments SET client_name = ?, updated_at = CURRENT_TIMESTAMP WHERE client_name = ?
    `).bind(name, oldName).run();
    await db.prepare(`
      UPDATE timesheets SET client_name = ? WHERE client_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '客戶已更?? });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此客?��?稱已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteClient(db, clientName) {
  try {
    // 檢查?�否?��??��?客戶?�派
    const assignments = await db.prepare(`
      SELECT COUNT(*) as count FROM client_assignments WHERE client_name = ?
    `).bind(clientName).first();

    if (assignments && assignments.count > 0) {
      return jsonResponse({ error: '?��??�除：此客戶仍�??�派記�?' }, 400);
    }

    await db.prepare(`DELETE FROM clients WHERE name = ?`).bind(clientName).run();
    return jsonResponse({ success: true, message: '客戶已刪?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 客戶?�派 CRUD
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
      // 轉�??��?端�??��??��?
      return jsonResponse(rows.map((r, index) => ({
        id: index + 1,
        employee_name: r.employee_name,
        client_name: r.client_name,
        created_at: '1970-01-01T00:00:00.000Z'
      })));
    }

    const res = await db.prepare(query).all();
    const rows = getRows(res);
    // 轉�??��?端�??��??��?
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
    // assignmentId ?��???"employee_name|client_name"
    const decoded = decodeURIComponent(assignmentId.toString());
    const [employeeName, clientName] = decoded.split('|');
    
    if (!employeeName || !clientName) {
      return jsonResponse({ error: '?��??��?�?ID' }, 400);
    }
    
    const res = await db.prepare(`
      DELETE FROM client_assignments 
      WHERE employee_name = ? AND client_name = ?
    `).bind(employeeName, clientName).run();
    
    // D1 失�???meta.changes ?�能??0，�??�檢?�是?��?存在
    if (res?.meta?.changes === 0) {
      const check = await db.prepare(`SELECT 1 FROM client_assignments WHERE employee_name = ? AND client_name = ?`)
        .bind(employeeName, clientName).first();
      if (check) return jsonResponse({ error: '?�除失�?：�?派�?存在' }, 400);
    }
    
    return jsonResponse({ success: true, message: '?�派已刪?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 業�?類�? CRUD
// =================================================================
async function handleCreateBusinessType(db, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '業�?類�??�稱?��?�? }, 400);
    }

    await db.prepare(`
      INSERT INTO business_types (type_name) VALUES (?)
    `).bind(name).run();

    return jsonResponse({ 
      success: true, 
      message: '業�?類�?已新�?
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此業?��??�已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateBusinessType(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '業�?類�??�稱?��?�? }, 400);
    }

    await db.prepare(`
      UPDATE business_types SET type_name = ?, updated_at = CURRENT_TIMESTAMP WHERE type_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '業�?類�?已更?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteBusinessType(db, typeName) {
  try {
    await db.prepare(`DELETE FROM business_types WHERE type_name = ?`).bind(typeName).run();
    return jsonResponse({ success: true, message: '業�?類�?已刪?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?��?事件 CRUD
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
    // 添�? notes 欄�?（即使�??�庫中�??��?
    return jsonResponse(rows);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleCreateLeaveEvent(db, payload) {
  try {
    const { employee_name, event_date, event_type } = payload;
    
    if (!employee_name || !event_date || !event_type) {
      return jsonResponse({ error: '?�工姓�??��?件日?��?事件類�??��?�? }, 400);
    }

    const result = await db.prepare(`
      INSERT INTO leave_events (employee_name, event_date, event_type)
      VALUES (?, ?, ?)
    `).bind(employee_name, event_date, event_type).run();

    return jsonResponse({ 
      success: true, 
      message: '?��?事件已新�?,
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
      return jsonResponse({ error: '?�工姓�??��?件日?��?事件類�??��?�? }, 400);
    }

    await db.prepare(`
      UPDATE leave_events 
      SET employee_name = ?, event_date = ?, event_type = ?
      WHERE id = ?
    `).bind(employee_name, event_date, event_type, id).run();

    return jsonResponse({ success: true, message: '?��?事件已更?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteLeaveEvent(db, id) {
  try {
    await db.prepare(`DELETE FROM leave_events WHERE id = ?`).bind(id).run();
    return jsonResponse({ success: true, message: '?��?事件已刪?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?��??�日 CRUD
// =================================================================
async function handleCreateHoliday(db, payload) {
  try {
    const { holiday_date, holiday_name } = payload;
    
    if (!holiday_date || !holiday_name) {
      return jsonResponse({ error: '?�日?��??��?稱為必填' }, 400);
    }

    await db.prepare(`
      INSERT INTO holidays (holiday_date, holiday_name)
      VALUES (?, ?)
    `).bind(holiday_date, holiday_name).run();

    return jsonResponse({ 
      success: true, 
      message: '?��??�日已新�?
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此日?�已存在?�日' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateHoliday(db, oldDate, payload) {
  try {
    const { holiday_date, holiday_name } = payload;
    
    if (!holiday_date || !holiday_name) {
      return jsonResponse({ error: '?�日?��??��?稱為必填' }, 400);
    }

    // ?�為 holiday_date ?�主?��??�要�??�除?��???
    await db.prepare(`DELETE FROM holidays WHERE holiday_date = ?`).bind(oldDate).run();
    await db.prepare(`
      INSERT INTO holidays (holiday_date, holiday_name)
      VALUES (?, ?)
    `).bind(holiday_date, holiday_name).run();

    return jsonResponse({ success: true, message: '?��??�日已更?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteHoliday(db, holidayDate) {
  try {
    await db.prepare(`DELETE FROM holidays WHERE holiday_date = ?`).bind(holidayDate).run();
    return jsonResponse({ success: true, message: '?��??�日已刪?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?�別類�? CRUD (?�管?�員)
// =================================================================
async function handleCreateLeaveType(db, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '?�別?�稱?��?�? }, 400);
    }

    await db.prepare(`
      INSERT INTO leave_types (type_name) VALUES (?)
    `).bind(name).run();

    return jsonResponse({ 
      success: true, 
      message: '?�別已新�?
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此�??�已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateLeaveType(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '?�別?�稱?��?�? }, 400);
    }

    await db.prepare(`
      UPDATE leave_types SET type_name = ? WHERE type_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '?�別已更?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteLeaveType(db, typeName) {
  try {
    await db.prepare(`DELETE FROM leave_types WHERE type_name = ?`).bind(typeName).run();
    return jsonResponse({ success: true, message: '?�別已刪?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 系統?�數 CRUD (?�管?�員)
// =================================================================
async function handleGetSystemParams(db) {
  try {
    const res = await db.prepare(`
      SELECT param_name, param_value
      FROM system_parameters
      ORDER BY param_name
    `).all();
    
    const rows = getRows(res);
    // 添�? description 欄�?（即使�??�庫中�??��?
    return jsonResponse(rows.map(r => ({
      param_name: r.param_name,
      param_value: r.param_value,
      description: getParamDescription(r.param_name)
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?�數說�?對照�?
function getParamDescription(paramName) {
  const descriptions = {
    'max_work_hours': '每日?�大工??,
    'min_work_hours': '每日?�小工??,
    'overtime_threshold': '?�班?�數?��?,
    'default_work_hours': '?�設工�??�數'
  };
  return descriptions[paramName] || '';
}

async function handleUpdateSystemParams(db, payload) {
  try {
    const { params } = payload;
    
    if (!params || !Array.isArray(params)) {
      return jsonResponse({ error: '?�數?��??�誤' }, 400);
    }

    // ?�次?�新?�數
    for (const param of params) {
      await db.prepare(`
        UPDATE system_parameters 
        SET param_value = ?
        WHERE param_name = ?
      `).bind(param.value, param.name).run();
    }

    return jsonResponse({ success: true, message: '系統?�數已更?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?�戶管�? CRUD (?�管?�員)
// =================================================================
async function handleUpdateUser(db, id, payload) {
  try {
    const { username, role, employee_name, is_active } = payload;
    
    if (!username || !role) {
      return jsonResponse({ error: '使用?��?稱�?角色?��?�? }, 400);
    }

    await db.prepare(`
      UPDATE users 
      SET username = ?, role = ?, employee_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(username, role, employee_name || null, is_active ? 1 : 0, id).run();

    return jsonResponse({ success: true, message: '使用?�已?�新' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '使用?��?稱已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteUser(db, id) {
  try {
    // 檢查?�否?�唯一?�管?�員
    const adminCount = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1
    `).first();

    const user = await db.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(id).first();

    if (user && user.role === 'admin' && adminCount.count <= 1) {
      return jsonResponse({ error: '?��??�除：至少�?要�??��??�管?�員帳�?' }, 400);
    }

    await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
    await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(id).run();

    return jsonResponse({ success: true, message: '使用?�已?�除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?�工管�? CRUD (?�管?�員)
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
      return jsonResponse({ error: '?�工姓�??��?�? }, 400);
    }
    
    await db.prepare(`
      INSERT INTO employees (name, hire_date, gender)
      VALUES (?, ?, ?)
    `).bind(name, hire_date || null, gender || null).run();
    
    return jsonResponse({ success: true, message: '?�工已新�? });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此員工�??�已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateEmployee(db, oldName, payload) {
  try {
    const { name, hire_date, gender } = payload;
    
    if (!name) {
      return jsonResponse({ error: '?�工姓�??��?�? }, 400);
    }
    
    // ?�為 name ?�主?��??�要更?��??��??�表
    await db.prepare(`
      UPDATE employees SET name = ?, hire_date = ?, gender = ? WHERE name = ?
    `).bind(name, hire_date || null, gender || null, oldName).run();
    
    return jsonResponse({ success: true, message: '?�工已更?? });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此員工�??�已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteEmployee(db, employeeName) {
  try {
    // 檢查?�否?��??��?客戶?�派
    const assignments = await db.prepare(`
      SELECT COUNT(*) as count FROM client_assignments WHERE employee_name = ?
    `).bind(employeeName).first();
    
    if (assignments && assignments.count > 0) {
      return jsonResponse({ error: '?��??�除：此?�工仍�?客戶?�派記�?' }, 400);
    }
    
    // 檢查?�否?��??��?使用?�帳??
    const users = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE employee_name = ?
    `).bind(employeeName).first();
    
    if (users && users.count > 0) {
      return jsonResponse({ error: '?��??�除：此?�工已�?定使?�者帳?? }, 400);
    }
    
    await db.prepare(`DELETE FROM employees WHERE name = ?`).bind(employeeName).run();
    return jsonResponse({ success: true, message: '?�工已刪?? });
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
