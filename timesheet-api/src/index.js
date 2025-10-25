/* * 修正版：Cloudflare Worker 兼容 D1 回傳格式
 * 修正錯誤：Cannot read properties of undefined (reading 'forEach')
 * 新增：使用者認證和權限管理
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
      
      // 驗證當前 session (別名)
      if (url.pathname === "/api/auth/me" && method === "GET") {
        return await handleVerifySession(env.DB, request);
      }
      
      // 修改密碼
      if (url.pathname === "/api/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // 修改密碼 (別名)
      if (url.pathname === "/api/auth/change-password" && method === "POST") {
        return await handleChangePassword(env.DB, request);
      }
      
      // 登出 (別名)
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

      // 讀取工時類型
      if (url.pathname === "/api/work-types" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const workTypes = [
          "正常工時", "平日加班(1.34)", "平日加班(1.67)", "休息日加班(1.34)",
          "休息日加班(1.67)", "休息日加班(2.67)", "本月例假日加班", "本月例假日加班(2)",
          "本月國定假日加班", "本月國定假日加班(1.34)", "本月國定假日加班(1.67)"
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
      
      // 管理員專用 API
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
      // 客戶管理 CRUD (所有員工可用)
      // ========================================
      if (url.pathname === "/api/clients" && method === "GET") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        
        // 如果有 employee 參數，返回該員工的客戶列表（用於工時表）
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
        const id = url.pathname.split("/")[3];
        const payload = await request.json();
        return await handleUpdateClient(env.DB, id, payload);
      }

      if (url.pathname.startsWith("/api/clients/") && method === "DELETE") {
        const auth = await requireAuth(env.DB, request);
        if (!auth.authorized) return jsonResponse({ error: auth.error }, 401);
        const id = url.pathname.split("/")[3];
        return await handleDeleteClient(env.DB, id);
      }

      // ========================================
      // 客戶指派 CRUD (所有員工可用)
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
      // 業務類型 CRUD (所有員工可用)
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
      // 假期事件 CRUD (所有員工可用)
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
      // 國定假日 CRUD (所有員工可用)
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
      // 系統參數 (僅管理員)
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

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};

// =================================================================
// 工具：統一抓出 rows
// =================================================================
function getRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.results && Array.isArray(result.results)) return result.results;
  return [];
}

// =================================================================
// 其他讀取 API (不需要特殊權限邏輯的)
// =================================================================

// 獲取所有客戶（用於設定頁面）
async function handleGetAllClients(db) {
  try {
    const res = await db.prepare(`
      SELECT name
      FROM clients
      ORDER BY name
    `).all();
    const rows = getRows(res);
    // 轉換為前端期望的格式
    return jsonResponse(rows.map((r, index) => ({
      id: index + 1,
      name: r.name,
      created_at: '1970-01-01T00:00:00.000Z'
    })));
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 獲取指定員工的客戶列表（用於工時表）
async function handleGetClients(db, params, user) {
  const employee = params.get("employee");
  if (!employee) return jsonResponse({ error: "Missing employee parameter" }, 400);
  
  // 檢查權限
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "無權限存取此員工資料" }, 403);
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
  // 轉換為前端期望的格式
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    name: r.type_name
  })));
}

async function handleGetLeaveTypes(db) {
  const res = await db.prepare("SELECT type_name FROM leave_types ORDER BY type_name").all();
  const rows = getRows(res);
  // 轉換為前端期望的格式
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    type_name: r.type_name
  })));
}

async function handleGetHolidays(db, params) {
  const year = params.get("year");
  
  // 如果有年份參數，返回該年份的假日日期列表（用於工時表標示）
  if (year) {
    const res = await db.prepare("SELECT holiday_date FROM holidays WHERE holiday_date LIKE ? ORDER BY holiday_date")
      .bind(`${year}-%`).all();
    const rows = getRows(res);
    return jsonResponse(rows.map(r => r.holiday_date));
  }
  
  // 否則返回所有假日的完整資料（用於設定頁面）
  const res = await db.prepare("SELECT holiday_date, holiday_name FROM holidays ORDER BY holiday_date DESC").all();
  const rows = getRows(res);
  // 轉換為前端期望的格式（使用 holiday_date 作為 id）
  return jsonResponse(rows.map((r, index) => ({
    id: index + 1,
    holiday_date: r.holiday_date,
    holiday_name: r.holiday_name
  })));
}

// 依據資料庫規則回傳年度假別配額
async function handleGetLeaveQuota(db, params) {
  const employee = params.get('employee');
  const year = parseInt(params.get('year'));
  if (!employee || !year) return jsonResponse({ error: 'Missing parameters' }, 400);

  // 取得員工到職日
  const emp = await db.prepare(`SELECT hire_date FROM employees WHERE name = ?`).bind(employee).first();
  const hireDate = emp?.hire_date || null;

  // 特休規則
  const annualRules = await db.prepare(`SELECT seniority_years, leave_days FROM annual_leave_rules ORDER BY seniority_years`).all();
  const annualRows = getRows(annualRules);

  function computeAnnualDays(hire) {
    if (!hire) return 0;
    const h = new Date(hire);
    const y = year;
    if (h.getFullYear() === y) {
      // 入職年，滿半年給 3 天
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

  // 其他假別規則（病假、事假、生理假、婚假、喪假...）
  const otherRulesRes = await db.prepare(`SELECT leave_type, leave_days, grant_type FROM other_leave_rules`).all();
  const otherRules = getRows(otherRulesRes);

  // 特休結轉
  let carryoverHours = 0;
  try {
    const carry = await db.prepare(`SELECT carryover_days FROM annual_leave_carryover WHERE employee_name = ?`).bind(employee).first();
    if (carry) carryoverHours = (carry.carryover_days || 0) * 8;
  } catch (_) {}

  const quota = [];
  const annualDays = computeAnnualDays(hireDate);
  quota.push({ type: '特休', quota_hours: (annualDays * 8) + carryoverHours });

  for (const r of otherRules) {
    // 年度給假以天數換算時數；事件給假留著 0 由前端顯示僅按事件產生
    const hours = r.grant_type === '年度給假' ? (r.leave_days * 8) : 0;
    quota.push({ type: r.leave_type, quota_hours: hours, grant_type: r.grant_type });
  }

  return jsonResponse({ employee, year, quota });
}

// =================================================================
// 加權小時計算
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
// 聚合 Timesheet Data
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
  if (row.hours_ot_offday_100 > 0) return "本月例假日加班";
  if (row.hours_ot_offday_200 > 0) return "本月例假日加班(2)";
  if (row.hours_ot_holiday_100 > 0) return "本月國定假日加班";
  if (row.hours_ot_holiday_134 > 0) return "本月國定假日加班(1.34)";
  if (row.hours_ot_holiday_167 > 0) return "本月國定假日加班(1.67)";
  return "正常工時";
}

// =================================================================
// 認證相關 Handler
// =================================================================

// 登入
async function handleLogin(db, request) {
  try {
    const { username, password } = await request.json();
    
    if (!username || !password) {
      return jsonResponse({ error: '請提供使用者名稱和密碼' }, 400);
    }
    
    // 查詢使用者
    const user = await db.prepare(`
      SELECT id, username, password_hash, role, employee_name, is_active
      FROM users
      WHERE username = ? AND is_active = 1
    `).bind(username).first();
    
    if (!user) {
      return jsonResponse({ error: '使用者名稱或密碼錯誤' }, 401);
    }
    
    // 驗證密碼
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: '使用者名稱或密碼錯誤' }, 401);
    }
    
    // 創建 session
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

// 登出
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

// 驗證 session
async function handleVerifySession(db, request) {
  try {
    const sessionToken = getSessionToken(request);
    const user = await verifySession(db, sessionToken);
    
    if (!user) {
      return jsonResponse({ error: '未授權' }, 401);
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
    // 支持兩種命名方式
    const oldPassword = body.old_password || body.currentPassword;
    const newPassword = body.new_password || body.newPassword;
    
    if (!oldPassword || !newPassword) {
      return jsonResponse({ error: '請提供目前密碼和新密碼' }, 400);
    }
    
    if (newPassword.length < 6) {
      return jsonResponse({ error: '新密碼至少需要 6 個字元' }, 400);
    }
    
    // 驗證舊密碼
    const user = await db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).bind(auth.user.id).first();
    
    if (!user) {
      return jsonResponse({ error: '使用者不存在' }, 404);
    }
    
    const isValid = await verifyPassword(oldPassword, user.password_hash);
    if (!isValid) {
      return jsonResponse({ error: '目前密碼錯誤' }, 401);
    }
    
    // 更新密碼
    const newHash = await hashPassword(newPassword);
    await db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(newHash, auth.user.id).run();
    
    return jsonResponse({ success: true, message: '密碼已成功更新' });
  } catch (err) {
    console.error('Change password error:', err);
    return jsonResponse({ error: err.message || '密碼更新失敗' }, 500);
  }
}

// 取得所有使用者（管理員）
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

// 創建使用者（管理員）
async function handleCreateUser(db, payload) {
  try {
    const { username, password, role, employee_name } = payload;
    
    if (!username || !password || !role) {
      return jsonResponse({ error: '請提供完整資訊' }, 400);
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

// 創建客戶（管理員）
async function handleCreateClient(db, payload) {
  try {
    const { name } = payload;
    
    if (!name) {
      return jsonResponse({ error: '請提供客戶名稱' }, 400);
    }
    
    await db.prepare(`
      INSERT INTO clients (name) VALUES (?)
    `).bind(name).run();
    
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 創建員工客戶對應（管理員）
async function handleCreateAssignment(db, payload) {
  try {
    const { employee_name, client_name } = payload;
    
    if (!employee_name || !client_name) {
      return jsonResponse({ error: '請提供完整資訊' }, 400);
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
// 修改現有 Handler 以支援權限檢查
// =================================================================

// 修改 handleGetEmployees 以支援權限
async function handleGetEmployees(db, user) {
  // 員工只能看到自己
  if (user.role === 'employee') {
    if (!user.employee_name) {
      return jsonResponse({ error: '無權限' }, 403);
    }
    const res = await db.prepare(
      "SELECT name, hire_date FROM employees WHERE name = ?"
    ).bind(user.employee_name).all();
    const rows = getRows(res);
    return jsonResponse(rows);
  }
  
  // 管理員可以看全部
  const res = await db.prepare("SELECT name, hire_date FROM employees ORDER BY name").all();
  const rows = getRows(res);
  return jsonResponse(rows);
}

// 修改 handleGetTimesheetData 以支援權限
async function handleGetTimesheetData(db, params, user) {
  const employee = params.get("employee");
  const year = params.get("year");
  const month = params.get("month");
  
  if (!employee || !year || !month) {
    return jsonResponse({ error: "Missing parameters" }, 400);
  }
  
  // 檢查權限
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "無權限存取此員工資料" }, 403);
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

// 修改 handleSaveTimesheet 以支援權限
async function handleSaveTimesheet(db, payload, user) {
  const { employee, year, month, workEntries = [], leaveEntries = [] } = payload;
  
  // 檢查權限
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: "無權限修改此員工資料" }, 403);
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
            "本月例假日加班": "hours_ot_offday_100",
            "本月例假日加班(2)": "hours_ot_offday_200",
            "本月國定假日加班": "hours_ot_holiday_100",
            "本月國定假日加班(1.34)": "hours_ot_holiday_134",
            "本月國定假日加班(1.67)": "hours_ot_holiday_167",
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
      return jsonResponse({ error: '客戶名稱為必填' }, 400);
    }

    // 因為 name 是主鍵，需要更新所有關聯表
    await db.prepare(`
      UPDATE clients SET name = ? WHERE name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '客戶已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteClient(db, clientName) {
  try {
    // 檢查是否有關聯的客戶指派
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
      // 轉換為前端期望的格式
      return jsonResponse(rows.map((r, index) => ({
        id: index + 1,
        employee_name: r.employee_name,
        client_name: r.client_name,
        created_at: '1970-01-01T00:00:00.000Z'
      })));
    }

    const res = await db.prepare(query).all();
    const rows = getRows(res);
    // 轉換為前端期望的格式
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
      return jsonResponse({ error: '無效的指派 ID' }, 400);
    }
    
    const res = await db.prepare(`
      DELETE FROM client_assignments 
      WHERE employee_name = ? AND client_name = ?
    `).bind(employeeName, clientName).run();
    
    // D1 失敗時 meta.changes 可能為 0，手動檢查是否仍存在
    if (res?.meta?.changes === 0) {
      const check = await db.prepare(`SELECT 1 FROM client_assignments WHERE employee_name = ? AND client_name = ?`)
        .bind(employeeName, clientName).first();
      if (check) return jsonResponse({ error: '刪除失敗：指派仍存在' }, 400);
    }
    
    return jsonResponse({ success: true, message: '指派已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 業務類型 CRUD
// =================================================================
async function handleCreateBusinessType(db, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '業務類型名稱為必填' }, 400);
    }

    await db.prepare(`
      INSERT INTO business_types (type_name) VALUES (?)
    `).bind(name).run();

    return jsonResponse({ 
      success: true, 
      message: '業務類型已新增'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此業務類型已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateBusinessType(db, oldName, payload) {
  try {
    const { name } = payload;
    if (!name) {
      return jsonResponse({ error: '業務類型名稱為必填' }, 400);
    }

    await db.prepare(`
      UPDATE business_types SET type_name = ? WHERE type_name = ?
    `).bind(name, oldName).run();

    return jsonResponse({ success: true, message: '業務類型已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteBusinessType(db, typeName) {
  try {
    await db.prepare(`DELETE FROM business_types WHERE type_name = ?`).bind(typeName).run();
    return jsonResponse({ success: true, message: '業務類型已刪除' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// =================================================================
// 假期事件 CRUD
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
      return jsonResponse({ error: '員工姓名、事件日期和事件類型為必填' }, 400);
    }

    const result = await db.prepare(`
      INSERT INTO leave_events (employee_name, event_date, event_type)
      VALUES (?, ?, ?)
    `).bind(employee_name, event_date, event_type).run();

    return jsonResponse({ 
      success: true, 
      message: '假期事件已新增',
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
      return jsonResponse({ error: '員工姓名、事件日期和事件類型為必填' }, 400);
    }

    await db.prepare(`
      UPDATE leave_events 
      SET employee_name = ?, event_date = ?, event_type = ?
      WHERE id = ?
    `).bind(employee_name, event_date, event_type, id).run();

    return jsonResponse({ success: true, message: '假期事件已更新' });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteLeaveEvent(db, id) {
  try {
    await db.prepare(`DELETE FROM leave_events WHERE id = ?`).bind(id).run();
    return jsonResponse({ success: true, message: '假期事件已刪除' });
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

    // 因為 holiday_date 是主鍵，需要先刪除再插入
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
      return jsonResponse({ error: '假別名稱為必填' }, 400);
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
      return jsonResponse({ error: '假別名稱為必填' }, 400);
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

    // 批次更新參數
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
      return jsonResponse({ error: '使用者名稱和角色為必填' }, 400);
    }

    await db.prepare(`
      UPDATE users 
      SET username = ?, role = ?, employee_name = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(username, role, employee_name || null, is_active ? 1 : 0, id).run();

    return jsonResponse({ success: true, message: '使用者已更新' });
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
      SELECT name, hire_date
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
    const { name, hire_date } = payload;
    
    if (!name) {
      return jsonResponse({ error: '員工姓名為必填' }, 400);
    }
    
    await db.prepare(`
      INSERT INTO employees (name, hire_date)
      VALUES (?, ?)
    `).bind(name, hire_date || null).run();
    
    return jsonResponse({ success: true, message: '員工已新增' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此員工姓名已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleUpdateEmployee(db, oldName, payload) {
  try {
    const { name, hire_date } = payload;
    
    if (!name) {
      return jsonResponse({ error: '員工姓名為必填' }, 400);
    }
    
    // 因為 name 是主鍵，需要更新所有關聯表
    await db.prepare(`
      UPDATE employees SET name = ?, hire_date = ? WHERE name = ?
    `).bind(name, hire_date || null, oldName).run();
    
    return jsonResponse({ success: true, message: '員工已更新' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return jsonResponse({ error: '此員工姓名已存在' }, 400);
    }
    return jsonResponse({ error: err.message }, 500);
  }
}

async function handleDeleteEmployee(db, employeeName) {
  try {
    // 檢查是否有關聯的客戶指派
    const assignments = await db.prepare(`
      SELECT COUNT(*) as count FROM client_assignments WHERE employee_name = ?
    `).bind(employeeName).first();
    
    if (assignments && assignments.count > 0) {
      return jsonResponse({ error: '無法刪除：此員工仍有客戶指派記錄' }, 400);
    }
    
    // 檢查是否有關聯的使用者帳號
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
