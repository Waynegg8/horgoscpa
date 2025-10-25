/* * ä¿®æ­£?ˆï?Cloudflare Worker ?¼å®¹ D1 ?å‚³?¼å?
 * ä¿®æ­£?¯èª¤ï¼šCannot read properties of undefined (reading 'forEach')
 * ?°å?ï¼šä½¿?¨è€…è?è­‰å?æ¬Šé?ç®¡ç?
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

// æ·»å? CORS headers ?°å???
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
      // èªè??¸é? API
      // ----------------------------------------------------
      
      // ?»å…¥
      if (url.pathname === "/api/login" && method === "POST") {
        return await handleLogin(env.DB, request);
      }
      
      // ?»å‡º
      if (url.pathname === "/api/logout" && method === "POST") {
        return await handleLogout(env.DB, request);
      }
      
      // é©—è??¶å? session
      if (url.pathname === "/api/verify" && method === "GET") {
        return await handleVerifySession(env.DB, request);
      }
      
      // é©—è??¶å? session (?¥å?)
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return await handleVerifySession(env.DB, request);
      }
      
      // ä¿®æ”¹å¯†ç¢¼
      if (url.pathname === "/api/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // ä¿®æ”¹å¯†ç¢¼ (?¥å?)
      if (url.pathname === "/api/auth/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // ç®¡ç??¡é?è¨­ç”¨?¶å?ç¢?
      if (url.pathname.match(/^\/api\/admin\/users\/[^\/]+\/reset-password$/) && method === "POST") {
        const username = decodeURIComponent(url.pathname.split("/")[4]);
        return await handleAdminResetPassword(env.DB, request, username);
      }
      
      // ?»å‡º (?¥å?)
      if (url.pathname === "/api/auth/logout" && method === "POST") {
        return await handleLogout(env.DB, request);
      }

      // ----------------------------------------------------
      // è³‡æ? APIï¼ˆé?è¦è?è­‰ï?
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

      // è®€?–å·¥?‚é???
      if (url.pathname === "/api/work-types" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const workTypes = [
          "æ­?¸¸å·¥æ?", "å¹³æ—¥? ç­(1.34)", "å¹³æ—¥? ç­(1.67)", "ä¼‘æ¯?¥å???1.34)",
          "ä¼‘æ¯?¥å???1.67)", "ä¼‘æ¯?¥å???2.67)", "?¬æ?ä¾‹å??¥å???, "?¬æ?ä¾‹å??¥å???2)",
          "?¬æ??‹å??‡æ—¥? ç­", "?¬æ??‹å??‡æ—¥? ç­(1.34)", "?¬æ??‹å??‡æ—¥? ç­(1.67)"
        ];
        return jsonResponse(workTypes);
      }

      // å¯«å…¥å·¥æ?è³‡æ?
      if (url.pathname === "/api/save-timesheet" && method === "POST") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const payload = await request.json();
        return await handleSaveTimesheet(env.DB, payload, auth.user);
      }
      
      // ç®¡ç??¡å???API
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
      // å®¢æˆ¶ç®¡ç? CRUD (?€?‰å“¡å·¥å¯??
      // ========================================
      if (url.pathname === "/api/clients" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        
        // å¦‚æ???employee ?ƒæ•¸ï¼Œè??è©²?¡å·¥?„å®¢?¶å?è¡¨ï??¨æ–¼å·¥æ?è¡¨ï?
        if (url.searchParams.has('employee')) {
          return await handleGetClients(env.DB, url.searchParams, auth.user);
        }
        
        // ?¦å?è¿”å??€?‰å®¢?¶ï??¨æ–¼è¨­å??é¢ï¼?
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
      // å®¢æˆ¶?´å?è³‡æ? API (?€èªè?)
      // ========================================
      
      // ?²å??€?‰å®¢?¶è©³ç´°è???
      if (url.pathname === "/api/clients/extended" && method === "GET") {
        return await addCorsHeaders(await getClientsExtended(request, env));
      }
      
      // ?²å??®ä?å®¢æˆ¶è©³ç´°è³‡æ?
      if (url.pathname.match(/^\/api\/clients\/[^\/]+\/extended$/) && method === "GET") {
        const clientName = decodeURIComponent(url.pathname.split("/")[3]);
        return await addCorsHeaders(await getClientExtended(request, env, clientName));
      }
      
      // ?µå»º?–æ›´?°å®¢?¶è©³ç´°è???
      if (url.pathname.match(/^\/api\/clients\/[^\/]+\/extended$/) && (method === "POST" || method === "PUT")) {
        const clientName = decodeURIComponent(url.pathname.split("/")[3]);
        return await addCorsHeaders(await upsertClientExtended(request, env, clientName));
      }
      
      // ?å??’ç?ç®¡ç?
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
      
      // å®¢æˆ¶äº’å?è¨˜é?
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
      
      // CSV ?¯å…¥
      if (url.pathname === "/api/import/clients" && method === "POST") {
        return await importClients(request, env);
      }

      // ========================================
      // SOP ?‡ä»¶ç®¡ç? API (?€èªè?)
      // ========================================
      
      // SOP ?†é?
      if (url.pathname === "/api/sop/categories" && method === "GET") {
        return await addCorsHeaders(await getSopCategories(request, env));
      }
      
      if (url.pathname === "/api/sop/categories" && method === "POST") {
        return await addCorsHeaders(await createSopCategory(request, env));
      }
      
      // SOP ?‡æ?
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
      
      // SOP ?ˆæœ¬æ­·å²
      if (url.pathname.match(/^\/api\/sops\/\d+\/versions$/) && method === "GET") {
        const sopId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getSopVersions(request, env, sopId));
      }
      
      // SOP ?œå?
      if (url.pathname === "/api/sops/search" && method === "GET") {
        return await addCorsHeaders(await searchSops(request, env));
      }

      // ========================================
      // åª’é?ç®¡ç? API (?€èªè?)
      // ========================================
      
      // ä¸Šå‚³?–ç?
      if (url.pathname === "/api/upload/image" && method === "POST") {
        return await uploadImage(request, env);
      }
      
      // ?²å?åª’é??—è¡¨
      if (url.pathname === "/api/media" && method === "GET") {
        return await addCorsHeaders(await getMediaList(request, env));
      }
      
      // ?ªé™¤åª’é?
      if (url.pathname.match(/^\/api\/media\/\d+$/) && method === "DELETE") {
        const mediaId = url.pathname.split("/")[3];
        return await addCorsHeaders(await deleteMedia(request, env, mediaId));
      }

      // ========================================
      // å°ˆæ??‡ä»»?™ç®¡??API (?€èªè?)
      // ========================================
      
      // å°ˆæ?
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
      
      // å°ˆæ?ä»»å?
      if (url.pathname.match(/^\/api\/projects\/\d+\/tasks$/) && method === "GET") {
        const projectId = url.pathname.split("/")[3];
        return await addCorsHeaders(await getProjectTasks(request, env, projectId));
      }
      
      // ä»»å?
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
      
      // ä»»å?æª¢æ ¸æ¸…å–®
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
      // CMS - ?‡ç?ç®¡ç? API (?€èªè?)
      // ========================================
      
      // å¾Œå°?‡ç?ç®¡ç?
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
      
      // ?å°?¬é? APIï¼ˆç„¡?€èªè?ï¼?
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
      // å®¢æˆ¶?‡æ´¾ CRUD (?€?‰å“¡å·¥å¯??
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
      // æ¥­å?é¡å? CRUD (?€?‰å“¡å·¥å¯??
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
      // ?‡æ?äº‹ä»¶ CRUD (?€?‰å“¡å·¥å¯??
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
      // ?‹å??‡æ—¥ CRUD (?€?‰å“¡å·¥å¯??
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
      // ?‡åˆ¥é¡å? CRUD (?…ç®¡?†å“¡)
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
      // ç³»çµ±?ƒæ•¸ (?…ç®¡?†å“¡)
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
      // ?¡å·¥ç®¡ç? CRUD (?…ç®¡?†å“¡)
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
      // ?¨æˆ¶ç®¡ç? CRUD (?…ç®¡?†å“¡)
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
      // ?±è¡¨ APIï¼ˆå„ª?–ç?ï¼Œå«å¿«å?ï¼?
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

      // å¿«å?ç®¡ç?ï¼ˆç®¡?†å“¡å°ˆç”¨ï¼?
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
// å·¥å…·ï¼šçµ±ä¸€?“å‡º rows
// =================================================================
function getRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.results && Array.isArray(result.results)) return result.results;
  return [];
}

// =================================================================
// ?¶ä?è®€??API (ä¸é?è¦ç‰¹æ®Šæ??é?è¼¯ç?)
// =================================================================

// ?²å??€?‰å®¢?¶ï??¨æ–¼è¨­å??é¢ï¼?
async function handleGetAllClients(db) {
  try {
    const res = await db.prepare(`
      SELECT name
      FROM clients
      ORDER BY name
    `).all();
    const rows = getRows(res);
    // è½‰æ??ºå?ç«¯æ??›ç??¼å?
    return jsonResponse(rows.map((r, index) => ({
      id: index + 1,
      name: r.name,
      created_at: '1970-01-01T00:00:00.000Z'
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?²å??‡å??¡å·¥?„å®¢?¶å?è¡¨ï??¨æ–¼å·¥æ?è¡¨ï?
async function handleGetClients(db, params, user) {
  const employee = params.get("employee");
  if (!employee) return jsonResponse({ error: "Missing employee parameter" }, 400);
  
  // æª¢æŸ¥æ¬Šé?
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "?¡æ??å??–æ­¤?¡å·¥è³‡æ?" }, 403);
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
  // è½‰æ??ºå?ç«¯æ??›ç??¼å?
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    name: r.type_name
  })));
}

async function handleGetLeaveTypes(db) {
  const res = await db.prepare("SELECT type_name FROM leave_types ORDER BY type_name").all();
  const rows = getRows(res);
  // è½‰æ??ºå?ç«¯æ??›ç??¼å?
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    type_name: r.type_name
  })));
}

async function handleGetHolidays(db, params) {
  const year = params.get("year");
  
  // å¦‚æ??‰å¹´ä»½å??¸ï?è¿”å?è©²å¹´ä»½ç??‡æ—¥?¥æ??—è¡¨ï¼ˆç”¨?¼å·¥?‚è¡¨æ¨™ç¤ºï¼?
  if (year) {
    const res = await db.prepare("SELECT holiday_date FROM holidays WHERE holiday_date LIKE ? ORDER BY holiday_date")
      .bind(`${year}-%`).all();
    const rows = getRows(res);
    return jsonResponse(rows.map(r => r.holiday_date));
  }
  
  // ?¦å?è¿”å??€?‰å??¥ç?å®Œæ•´è³‡æ?ï¼ˆç”¨?¼è¨­å®šé??¢ï?
  const res = await db.prepare("SELECT holiday_date, holiday_name FROM holidays ORDER BY holiday_date DESC").all();
  const rows = getRows(res);
  // è½‰æ??ºå?ç«¯æ??›ç??¼å?ï¼ˆä½¿??holiday_date ä½œç‚º idï¼?
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    holiday_date: r.holiday_date,
    holiday_name: r.holiday_name
  })));
}

// ä¾æ?è³‡æ?åº«è??‡å??³å¹´åº¦å??¥é?é¡?
async function handleGetLeaveQuota(db, params) {
  const employee = params.get('employee');
  const year = parseInt(params.get('year'));
  if (!employee || !year) return jsonResponse({ error: 'Missing parameters' }, 400);

  // ?–å??¡å·¥?°è·?¥è??§åˆ¥
  const emp = await db.prepare(`SELECT hire_date, gender FROM employees WHERE name = ?`).bind(employee).first();
  const hireDate = emp?.hire_date || null;
  const gender = emp?.gender || null;

  // ?¹ä?è¦å?
  const annualRules = await db.prepare(`SELECT seniority_years, leave_days FROM annual_leave_rules ORDER BY seniority_years`).all();
  const annualRows = getRows(annualRules);

  function computeAnnualDays(hire) {
    if (!hire) return 0;
    const h = new Date(hire);
    const y = year;
    if (h.getFullYear() === y) {
      // ?¥è·å¹´ï?æ»¿å?å¹´çµ¦ 3 å¤?
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

  // ?¶ä??‡åˆ¥è¦å?ï¼ˆç??‡ã€ä??‡ã€ç??†å??å??‡ã€å–ª??..ï¼?
  const otherRulesRes = await db.prepare(`SELECT leave_type, leave_days, grant_type FROM other_leave_rules`).all();
  const otherRules = getRows(otherRulesRes);

  // ?¹ä?çµè?
  let carryoverHours = 0;
  try {
    const carry = await db.prepare(`SELECT carryover_days FROM annual_leave_carryover WHERE employee_name = ?`).bind(employee).first();
    if (carry) carryoverHours = (carry.carryover_days || 0) * 8;
  } catch (_) {}

  const quota = [];
  const annualDays = computeAnnualDays(hireDate);
  quota.push({ type: '?¹ä?', quota_hours: (annualDays * 8) + carryoverHours });

  // ?ˆå??¥å…¶ä»–å??¥é?é¡ï?ä¸¦è??„ç??‡å¹´åº¦ä??ï?ä»¥å??‚ï?
  let sickCapHours = 0;
  for (const r of otherRules) {
    let hours = 0;
    if (r.grant_type === 'å¹´åº¦çµ¦å?') {
      hours = (r.leave_days * 8);
    } else if (r.grant_type === 'äº‹ä»¶çµ¦å?') {
      // äº‹ä»¶çµ¦å?ï¼šé???leave_events ä¸­å‡º?¾ç›¸ç¬¦ä?ä»¶æ?çµ¦é?é¡?
      const eventCount = await db.prepare(`
        SELECT COUNT(*) AS cnt
        FROM leave_events
        WHERE employee_name = ? AND strftime('%Y', event_date) = ? AND event_type = ?
      `).bind(employee, String(year), r.leave_type).first();
      const hasEvent = eventCount && eventCount.cnt > 0;
      hours = hasEvent ? (r.leave_days * 8) : 0;
    }
    quota.push({ type: r.leave_type, quota_hours: hours, grant_type: r.grant_type });
    if (r.leave_type === '?…å?') sickCapHours = hours;
  }

  // ?Ÿç??‡è??‡ï?å¥³æ€§æ??ˆä???1 å¤©ï?8 å°æ?ï¼‰ï?ä¸é€æ?ç´¯ç?ï¼›è??…å??ˆä½µå¹´åº¦ä¸Šé?
  if (gender && (gender === 'female' || gender === 'å¥? || gender === 'F')) {
    quota.push({ 
      type: '?Ÿç???, 
      quota_hours: 8,                 // é¡¯ç¤ºæ¯æ?ä¸Šé???
      grant_type: 'æ¯æ?ä¸Šé?',
      per_month_cap_hours: 8,
      non_carryover: true,
      combined_with: '?…å?', 
      combined_cap_hours: sickCapHours || (30 * 8) 
    });
  }

  return jsonResponse({ employee, year, quota });
}

// =================================================================
// ? æ?å°æ?è¨ˆç?
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
  if (wt.includes("å¹³æ—¥? ç­")) return "å¹³æ—¥? ç­";
  if (wt.includes("ä¼‘æ¯?¥å???)) return "ä¼‘æ¯?¥å???;
  if (wt.includes("ä¾‹å??¥å???)) return "ä¾‹å??¥å???;
  if (wt.includes("?‹å??‡æ—¥? ç­")) return "?‹å??‡æ—¥? ç­";
  return null;
}

// =================================================================
// ?šå? Timesheet Data
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
  if (row.hours_normal > 0) return "æ­?¸¸å·¥æ?";
  if (row.hours_ot_weekday_134 > 0) return "å¹³æ—¥? ç­(1.34)";
  if (row.hours_ot_weekday_167 > 0) return "å¹³æ—¥? ç­(1.67)";
  if (row.hours_ot_rest_134 > 0) return "ä¼‘æ¯?¥å???1.34)";
  if (row.hours_ot_rest_167 > 0) return "ä¼‘æ¯?¥å???1.67)";
  if (row.hours_ot_rest_267 > 0) return "ä¼‘æ¯?¥å???2.67)";
  if (row.hours_ot_offday_100 > 0) return "?¬æ?ä¾‹å??¥å???;
  if (row.hours_ot_offday_200 > 0) return "?¬æ?ä¾‹å??¥å???2)";
  if (row.hours_ot_holiday_100 > 0) return "?¬æ??‹å??‡æ—¥? ç­";
  if (row.hours_ot_holiday_134 > 0) return "?¬æ??‹å??‡æ—¥? ç­(1.34)";
  if (row.hours_ot_holiday_167 > 0) return "?¬æ??‹å??‡æ—¥? ç­(1.67)";
  return "æ­?¸¸å·¥æ?";
}

// =================================================================
// èªè??¸é? Handler
// =================================================================

// ?»å…¥
async function handleLogin(db, request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return jsonResponse({ error: 'è«‹æ?ä¾›ä½¿?¨è€…å?ç¨±å?å¯†ç¢¼' }, 400);
    }
    
    // ?¥è©¢ä½¿ç”¨??
    const user = await db.prepare(`
      SELECT id, username, password_hash, role, employee_name, is_active
      FROM users
      WHERE username = ? AND is_active = 1
    `).bind(username).first();
    
    if (!user) {
      return jsonResponse({ error: 'ä½¿ç”¨?…å?ç¨±æ?å¯†ç¢¼?¯èª¤' }, 401);
    }
    
    // é©—è?å¯†ç¢¼
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: 'ä½¿ç”¨?…å?ç¨±æ?å¯†ç¢¼?¯èª¤' }, 401);
    }
    
    // ?µå»º session
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

// ?»å‡º
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

// é©—è? session
async function handleVerifySession(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    const user = await verifySession(db, sessionToken);
    
    if (!user) {
      return jsonResponse({ error: '?ªæ?æ¬? }, 401);
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

// ä¿®æ”¹å¯†ç¢¼
async function handleChangePassword(db, request) {
  try {
    const auth = await requireAuth(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 401);
    }
    
    const body = await request.json();
    // ?¯æ??©ç¨®?½å??¹å?
    const oldPassword = body.old_password || body.currentPassword;
    const newPassword = body.new_password || body.newPassword;
    
    if (!oldPassword || !newPassword) {
      return jsonResponse({ error: 'è«‹æ?ä¾›ç›®?å?ç¢¼å??°å?ç¢? }, 400);
    }
    
    if (newPassword.length < 6) {
      return jsonResponse({ error: '?°å?ç¢¼è‡³å°‘é?è¦?6 ?‹å??? }, 400);
    }
    
    // é©—è??Šå?ç¢?
    const user = await db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).bind(auth.user.id).first();
    
    if (!user) {
      return jsonResponse({ error: 'ä½¿ç”¨?…ä?å­˜åœ¨' }, 404);
    }
    
    const isValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: '?®å?å¯†ç¢¼?¯èª¤' }, 401);
    }
    
    // ?´æ–°å¯†ç¢¼
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newHash, auth.user.id).run();
    
    return jsonResponse({ success: true, message: 'å¯†ç¢¼å·²æ??Ÿæ›´?? });
  } catch (err) {
    console.error('Change password error:', err);
    return jsonResponse({ error: err.message || 'å¯†ç¢¼?´æ–°å¤±æ?' }, 500);
  }
}

// ç®¡ç??¡é?è¨­ç”¨?¶å?ç¢?
async function handleAdminResetPassword(db, request, username) {
  try {
    const auth = await requireAdmin(db, request);
    if (!auth.authorized) {
      return jsonResponse({ error: auth.error }, 403);
    }
    
    const body = await request.json();
    const newPassword = body.new_password || body.newPassword;
    
    if (!newPassword) {
      return jsonResponse({ error: 'è«‹æ?ä¾›æ–°å¯†ç¢¼' }, 400);
    }
    
    if (newPassword.length < 6) {
      return jsonResponse({ error: '?°å?ç¢¼è‡³å°‘é?è¦?6 ?‹å??? }, 400);
    }
    
    // æª¢æŸ¥?¨æˆ¶?¯å¦å­˜åœ¨
    const user = await db.prepare(`
      SELECT id FROM users WHERE username = ?
    `).bind(username).first();
    
    if (!user) {
      return jsonResponse({ error: 'ä½¿ç”¨?…ä?å­˜åœ¨' }, 404);
    }
    
    // ?´æ–°å¯†ç¢¼
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?
    `).bind(newHash, username).run();
    
    return jsonResponse({ success: true, message: `å·²æ??Ÿé?è¨?${username} ?„å?ç¢¼` });
  } catch (err) {
    console.error('Admin reset password error:', err);
    return jsonResponse({ error: err.message || 'å¯†ç¢¼?è¨­å¤±æ?' }, 500);
  }
}

// ?–å??€?‰ä½¿?¨è€…ï?ç®¡ç??¡ï?
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

// ?µå»ºä½¿ç”¨?…ï?ç®¡ç??¡ï?
async function handleCreateUser(db, payload) {
  try {
    const { username, password, role, employee_name } = payload;
    
    if (!username || !password || !role) {
      return jsonResponse({ error: 'è«‹æ?ä¾›å??´è?è¨? }, 400);
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

// ?µå»ºå®¢æˆ¶ï¼ˆç®¡?†å“¡ï¼?
async function handleCreateClient(db, payload) {
  try {
    const { name } = payload;
    
    if (!name) {
      return jsonResponse({ error: 'è«‹æ?ä¾›å®¢?¶å?ç¨? }, 400);
    }
    
    await db.prepare(`
      INSERT INTO clients (name) VALUES (?)
    `).bind(name).run();
    
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?µå»º?¡å·¥å®¢æˆ¶å°æ?ï¼ˆç®¡?†å“¡ï¼?
async function handleCreateAssignment(db, payload) {
  try {
    const { employee_name, client_name } = payload;
    
    if (!employee_name || !client_name) {
      return jsonResponse({ error: 'è«‹æ?ä¾›å??´è?è¨? }, 400);
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
// ä¿®æ”¹?¾æ? Handler ä»¥æ”¯?´æ??æª¢??
// =================================================================

// ä¿®æ”¹ handleGetEmployees ä»¥æ”¯?´æ???
async function handleGetEmployees(db, user) {
  // ?¡å·¥?ªèƒ½?‹åˆ°?ªå·±
  if (user.role === 'employee') {
    if (!user.employee_name) {
      return jsonResponse({ error: '?¡æ??? }, 403);
    }
    const res = await db.prepare(
      "SELECT name, hire_date, gender FROM employees WHERE name = ?"
    ).bind(user.employee_name).all();
    const rows = getRows(res);
    return jsonResponse(rows);
  }
  
  // ç®¡ç??¡å¯ä»¥ç??¨éƒ¨
  const res = await db.prepare("SELECT name, hire_date, gender FROM employees ORDER BY name").all();
  const rows = getRows(res);
  return jsonResponse(rows);
}

// ä¿®æ”¹ handleGetTimesheetData ä»¥æ”¯?´æ???
async function handleGetTimesheetData(db, params, user) {
  const employee = params.get("employee");
  const year = params.get("year");
  const month = params.get("month");
  
  if (!employee || !year || !month) {
    return jsonResponse({ error: "Missing parameters" }, 400);
  }
  
  // æª¢æŸ¥æ¬Šé?
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "?¡æ??å??–æ­¤?¡å·¥è³‡æ?" }, 403);
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

// ä¿®æ”¹ handleSaveTimesheet ä»¥æ”¯?´æ???
async function handleSaveTimesheet(db, payload, user) {
  const { employee, year, month, workEntries = [], leaveEntries = [] } = payload;
  
  // æª¢æŸ¥æ¬Šé?
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "?¡æ??ä¿®?¹æ­¤?¡å·¥è³‡æ?" }, 403);
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
            "æ­?¸¸å·¥æ?": "hours_normal",
            "å¹³æ—¥? ç­(1.34)": "hours_ot_weekday_134",
            "å¹³æ—¥? ç­(1.67)": "hours_ot_weekday_167",
            "ä¼‘æ¯?¥å???1.34)": "hours_ot_rest_134",
            "ä¼‘æ¯?¥å???1.67)": "hours_ot_rest_167",
            "ä¼‘æ¯?¥å???2.67)": "hours_ot_rest_267",
            "?¬æ?ä¾‹å??¥å???: "hours_ot_offday_100",
            "?¬æ?ä¾‹å??¥å???2)": "hours_ot_offday_200",
            "?¬æ??‹å??‡æ—¥? ç­": "hours_ot_holiday_100",
            "?¬æ??‹å??‡æ—¥? ç­(1.34)": "hours_ot_holiday_134",
            "?¬æ??‹å??‡æ—¥? ç­(1.67)": "hours_ot_holiday_167",
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
// å®¢æˆ¶ç®¡ç? CRUD
// =================================================================
async function handleUpdateClient(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: 'å®¢æˆ¶?ç¨±?ºå?å¡? }, 400);
    }

    // ? ç‚º name ?¯ä¸»?µï??€è¦æ›´?°æ??‰é??¯è¡¨
    const res = await db.prepare(`
      UPDATE clients SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?
    `).bind(name, oldName).run();

    // å¦‚æ?æ²’æ?ä»»ä??—è¢«?´æ–°ï¼Œä»£è¡¨è??ç¨±ä¸å??¨æ??ªè???
    if (!res?.meta || res.meta.changes === 0) {
      // ?æª¢?¥æ˜¯?¦å¯¦?›ä??ç¨±?ªè??´ï??Šå?ç­‰æ–¼?°å?ï¼‰ï?å¦‚æ??¯å?è¦–ç‚º?å?
      if (oldName === name) {
        return jsonResponse({ success: true, message: 'å®¢æˆ¶å·²æ›´?? });
      }
      // æª¢æŸ¥?Šå?ç¨±æ˜¯?¦å???
      const exists = await db.prepare(`SELECT 1 FROM clients WHERE name = ?`).bind(oldName).first();
      if (!exists) {
        return jsonResponse({ error: '?¾ä??°è??´æ–°?„å®¢?? }, 404);
      }
    }

    // ?´æ–°?œè¯è¡¨ï??¥è??™åº«?ªé???ON UPDATE CASCADEï¼Œæ??•å?æ­¥ï?
    await db.prepare(`
      UPDATE client_assignments SET client_name = ?, updated_at = CURRENT_TIMESTAMP WHERE client_name = ?
    `).bind(name, oldName).run();
    await db.prepare(`
      UPDATE timesheets SET client_name = ? WHERE client_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: 'å®¢æˆ¶å·²æ›´?? });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return jsonResponse({ error: 'æ­¤å®¢?¶å?ç¨±å·²å­˜åœ¨' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteClient(db, clientName) {
  try {
    // æª¢æŸ¥?¯å¦?‰é??¯ç?å®¢æˆ¶?‡æ´¾
    const assignments = await db.prepare(`
      SELECT COUNT(*) as count FROM client_assignments WHERE client_name = ?
    `).bind(clientName).first();

    if (assignments && assignments.count > 0) {
      return jsonResponse({ error: '?¡æ??ªé™¤ï¼šæ­¤å®¢æˆ¶ä»æ??‡æ´¾è¨˜é?' }, 400);
    }

    await db.prepare(`DELETE FROM clients WHERE name = ?`).bind(clientName).run();
    return jsonResponse({ success: true, message: 'å®¢æˆ¶å·²åˆª?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// å®¢æˆ¶?‡æ´¾ CRUD
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
      // è½‰æ??ºå?ç«¯æ??›ç??¼å?
      return jsonResponse(rows.map((r, index) => ({
        id: index + 1,
        employee_name: r.employee_name,
        client_name: r.client_name,
        created_at: '1970-01-01T00:00:00.000Z'
      })));
    }

    const res = await db.prepare(query).all();
    const rows = getRows(res);
    // è½‰æ??ºå?ç«¯æ??›ç??¼å?
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
    // assignmentId ?¼å???"employee_name|client_name"
    const decoded = decodeURIComponent(assignmentId.toString());
    const [employeeName, clientName] = decoded.split('|');
    
    if (!employeeName || !clientName) {
      return jsonResponse({ error: '?¡æ??„æ?æ´?ID' }, 400);
    }
    
    const res = await db.prepare(`
      DELETE FROM client_assignments 
      WHERE employee_name = ? AND client_name = ?
    `).bind(employeeName, clientName).run();
    
    // D1 å¤±æ???meta.changes ?¯èƒ½??0ï¼Œæ??•æª¢?¥æ˜¯?¦ä?å­˜åœ¨
    if (res?.meta?.changes === 0) {
      const check = await db.prepare(`SELECT 1 FROM client_assignments WHERE employee_name = ? AND client_name = ?`)
        .bind(employeeName, clientName).first();
      if (check) return jsonResponse({ error: '?ªé™¤å¤±æ?ï¼šæ?æ´¾ä?å­˜åœ¨' }, 400);
    }
    
    return jsonResponse({ success: true, message: '?‡æ´¾å·²åˆª?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// æ¥­å?é¡å? CRUD
// =================================================================
async function handleCreateBusinessType(db, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: 'æ¥­å?é¡å??ç¨±?ºå?å¡? }, 400);
    }

    await db.prepare(`
      INSERT INTO business_types (type_name) VALUES (?)
    `).bind(name).run();

    return jsonResponse({ 
      success: true, 
      message: 'æ¥­å?é¡å?å·²æ–°å¢?
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: 'æ­¤æ¥­?™é??‹å·²å­˜åœ¨' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateBusinessType(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: 'æ¥­å?é¡å??ç¨±?ºå?å¡? }, 400);
    }

    await db.prepare(`
      UPDATE business_types SET type_name = ?, updated_at = CURRENT_TIMESTAMP WHERE type_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: 'æ¥­å?é¡å?å·²æ›´?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteBusinessType(db, typeName) {
  try {
    await db.prepare(`DELETE FROM business_types WHERE type_name = ?`).bind(typeName).run();
    return jsonResponse({ success: true, message: 'æ¥­å?é¡å?å·²åˆª?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?‡æ?äº‹ä»¶ CRUD
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
    // æ·»å? notes æ¬„ä?ï¼ˆå³ä½¿è??™åº«ä¸­æ??‰ï?
    return jsonResponse(rows);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleCreateLeaveEvent(db, payload) {
  try {
    const { employee_name, event_date, event_type } = payload;
    
    if (!employee_name || !event_date || !event_type) {
      return jsonResponse({ error: '?¡å·¥å§“å??ä?ä»¶æ—¥?Ÿå?äº‹ä»¶é¡å??ºå?å¡? }, 400);
    }

    const result = await db.prepare(`
      INSERT INTO leave_events (employee_name, event_date, event_type)
      VALUES (?, ?, ?)
    `).bind(employee_name, event_date, event_type).run();

    return jsonResponse({ 
      success: true, 
      message: '?‡æ?äº‹ä»¶å·²æ–°å¢?,
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
      return jsonResponse({ error: '?¡å·¥å§“å??ä?ä»¶æ—¥?Ÿå?äº‹ä»¶é¡å??ºå?å¡? }, 400);
    }

    await db.prepare(`
      UPDATE leave_events 
      SET employee_name = ?, event_date = ?, event_type = ?
      WHERE id = ?
    `).bind(employee_name, event_date, event_type, id).run();

    return jsonResponse({ success: true, message: '?‡æ?äº‹ä»¶å·²æ›´?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteLeaveEvent(db, id) {
  try {
    await db.prepare(`DELETE FROM leave_events WHERE id = ?`).bind(id).run();
    return jsonResponse({ success: true, message: '?‡æ?äº‹ä»¶å·²åˆª?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?‹å??‡æ—¥ CRUD
// =================================================================
async function handleCreateHoliday(db, payload) {
  try {
    const { holiday_date, holiday_name } = payload;
    
    if (!holiday_date || !holiday_name) {
      return jsonResponse({ error: '?‡æ—¥?¥æ??Œå?ç¨±ç‚ºå¿…å¡«' }, 400);
    }

    await db.prepare(`
      INSERT INTO holidays (holiday_date, holiday_name)
      VALUES (?, ?)
    `).bind(holiday_date, holiday_name).run();

    return jsonResponse({ 
      success: true, 
      message: '?‹å??‡æ—¥å·²æ–°å¢?
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: 'æ­¤æ—¥?Ÿå·²å­˜åœ¨?‡æ—¥' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateHoliday(db, oldDate, payload) {
  try {
    const { holiday_date, holiday_name } = payload;
    
    if (!holiday_date || !holiday_name) {
      return jsonResponse({ error: '?‡æ—¥?¥æ??Œå?ç¨±ç‚ºå¿…å¡«' }, 400);
    }

    // ? ç‚º holiday_date ?¯ä¸»?µï??€è¦å??ªé™¤?æ???
    await db.prepare(`DELETE FROM holidays WHERE holiday_date = ?`).bind(oldDate).run();
    await db.prepare(`
      INSERT INTO holidays (holiday_date, holiday_name)
      VALUES (?, ?)
    `).bind(holiday_date, holiday_name).run();

    return jsonResponse({ success: true, message: '?‹å??‡æ—¥å·²æ›´?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteHoliday(db, holidayDate) {
  try {
    await db.prepare(`DELETE FROM holidays WHERE holiday_date = ?`).bind(holidayDate).run();
    return jsonResponse({ success: true, message: '?‹å??‡æ—¥å·²åˆª?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?‡åˆ¥é¡å? CRUD (?…ç®¡?†å“¡)
// =================================================================
async function handleCreateLeaveType(db, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '?‡åˆ¥?ç¨±?ºå?å¡? }, 400);
    }

    await db.prepare(`
      INSERT INTO leave_types (type_name) VALUES (?)
    `).bind(name).run();

    return jsonResponse({ 
      success: true, 
      message: '?‡åˆ¥å·²æ–°å¢?
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: 'æ­¤å??¥å·²å­˜åœ¨' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateLeaveType(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '?‡åˆ¥?ç¨±?ºå?å¡? }, 400);
    }

    await db.prepare(`
      UPDATE leave_types SET type_name = ? WHERE type_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '?‡åˆ¥å·²æ›´?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteLeaveType(db, typeName) {
  try {
    await db.prepare(`DELETE FROM leave_types WHERE type_name = ?`).bind(typeName).run();
    return jsonResponse({ success: true, message: '?‡åˆ¥å·²åˆª?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ç³»çµ±?ƒæ•¸ CRUD (?…ç®¡?†å“¡)
// =================================================================
async function handleGetSystemParams(db) {
  try {
    const res = await db.prepare(`
      SELECT param_name, param_value
      FROM system_parameters
      ORDER BY param_name
    `).all();
    
    const rows = getRows(res);
    // æ·»å? description æ¬„ä?ï¼ˆå³ä½¿è??™åº«ä¸­æ??‰ï?
    return jsonResponse(rows.map(r => ({
      param_name: r.param_name,
      param_value: r.param_value,
      description: getParamDescription(r.param_name)
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ?ƒæ•¸èªªæ?å°ç…§è¡?
function getParamDescription(paramName) {
  const descriptions = {
    'max_work_hours': 'æ¯æ—¥?€å¤§å·¥??,
    'min_work_hours': 'æ¯æ—¥?€å°å·¥??,
    'overtime_threshold': '? ç­?‚æ•¸?€æª?,
    'default_work_hours': '?è¨­å·¥ä??‚æ•¸'
  };
  return descriptions[paramName] || '';
}

async function handleUpdateSystemParams(db, payload) {
  try {
    const { params } = payload;
    
    if (!params || !Array.isArray(params)) {
      return jsonResponse({ error: '?ƒæ•¸?¼å??¯èª¤' }, 400);
    }

    // ?¹æ¬¡?´æ–°?ƒæ•¸
    for (const param of params) {
      await db.prepare(`
        UPDATE system_parameters 
        SET param_value = ?
        WHERE param_name = ?
      `).bind(param.value, param.name).run();
    }

    return jsonResponse({ success: true, message: 'ç³»çµ±?ƒæ•¸å·²æ›´?? });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?¨æˆ¶ç®¡ç? CRUD (?…ç®¡?†å“¡)
// =================================================================
async function handleUpdateUser(db, id, payload) {
  try {
    const { username, role, employee_name, is_active } = payload;
    
    if (!username || !role) {
      return jsonResponse({ error: 'ä½¿ç”¨?…å?ç¨±å?è§’è‰²?ºå?å¡? }, 400);
    }

    await db.prepare(`
      UPDATE users 
      SET username = ?, role = ?, employee_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(username, role, employee_name || null, is_active ? 1 : 0, id).run();

    return jsonResponse({ success: true, message: 'ä½¿ç”¨?…å·²?´æ–°' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: 'ä½¿ç”¨?…å?ç¨±å·²å­˜åœ¨' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteUser(db, id) {
  try {
    // æª¢æŸ¥?¯å¦?ºå”¯ä¸€?„ç®¡?†å“¡
    const adminCount = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1
    `).first();

    const user = await db.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(id).first();

    if (user && user.role === 'admin' && adminCount.count <= 1) {
      return jsonResponse({ error: '?¡æ??ªé™¤ï¼šè‡³å°‘é?è¦ä??™ä??‹ç®¡?†å“¡å¸³è?' }, 400);
    }

    await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
    await db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(id).run();

    return jsonResponse({ success: true, message: 'ä½¿ç”¨?…å·²?ªé™¤' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// ?¡å·¥ç®¡ç? CRUD (?…ç®¡?†å“¡)
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
      return jsonResponse({ error: '?¡å·¥å§“å??ºå?å¡? }, 400);
    }
    
    await db.prepare(`
      INSERT INTO employees (name, hire_date, gender)
      VALUES (?, ?, ?)
    `).bind(name, hire_date || null, gender || null).run();
    
    return jsonResponse({ success: true, message: '?¡å·¥å·²æ–°å¢? });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: 'æ­¤å“¡å·¥å??å·²å­˜åœ¨' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateEmployee(db, oldName, payload) {
  try {
    const { name, hire_date, gender } = payload;
    
    if (!name) {
      return jsonResponse({ error: '?¡å·¥å§“å??ºå?å¡? }, 400);
    }
    
    // ? ç‚º name ?¯ä¸»?µï??€è¦æ›´?°æ??‰é??¯è¡¨
    await db.prepare(`
      UPDATE employees SET name = ?, hire_date = ?, gender = ? WHERE name = ?
    `).bind(name, hire_date || null, gender || null, oldName).run();
    
    return jsonResponse({ success: true, message: '?¡å·¥å·²æ›´?? });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: 'æ­¤å“¡å·¥å??å·²å­˜åœ¨' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteEmployee(db, employeeName) {
  try {
    // æª¢æŸ¥?¯å¦?‰é??¯ç?å®¢æˆ¶?‡æ´¾
    const assignments = await db.prepare(`
      SELECT COUNT(*) as count FROM client_assignments WHERE employee_name = ?
    `).bind(employeeName).first();
    
    if (assignments && assignments.count > 0) {
      return jsonResponse({ error: '?¡æ??ªé™¤ï¼šæ­¤?¡å·¥ä»æ?å®¢æˆ¶?‡æ´¾è¨˜é?' }, 400);
    }
    
    // æª¢æŸ¥?¯å¦?‰é??¯ç?ä½¿ç”¨?…å¸³??
    const users = await db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE employee_name = ?
    `).bind(employeeName).first();
    
    if (users && users.count > 0) {
      return jsonResponse({ error: '?¡æ??ªé™¤ï¼šæ­¤?¡å·¥å·²ç?å®šä½¿?¨è€…å¸³?? }, 400);
    }
    
    await db.prepare(`DELETE FROM employees WHERE name = ?`).bind(employeeName).run();
    return jsonResponse({ success: true, message: '?¡å·¥å·²åˆª?? });
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
