/* * 修正版：Cloudflare Worker 兼容 D1 回傳格式
 * 修正錯誤：Cannot read properties of undefined (reading 'forEach')
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "OPTIONS") {
      return handleOptions(request);
    }

    try {
      // ----------------------------------------------------
      // API 路由 (Router)
      // ----------------------------------------------------
      if (url.pathname === "/api/employees" && method === "GET") {
        return await handleGetEmployees(env.DB);
      }
      if (url.pathname === "/api/clients" && method === "GET") {
        return await handleGetClients(env.DB, url.searchParams);
      }
      if (url.pathname === "/api/business-types" && method === "GET") {
        return await handleGetBusinessTypes(env.DB);
      }
      if (url.pathname === "/api/leave-types" && method === "GET") {
        return await handleGetLeaveTypes(env.DB);
      }
      if (url.pathname === "/api/holidays" && method === "GET") {
        return await handleGetHolidays(env.DB, url.searchParams);
      }
      if (url.pathname === "/api/timesheet-data" && method === "GET") {
        return await handleGetTimesheetData(env.DB, url.searchParams);
      }

      // 讀取工時類型
      if (url.pathname === "/api/work-types" && method === "GET") {
        const workTypes = [
          "正常工時", "平日加班(1.34)", "平日加班(1.67)", "休息日加班(1.34)",
          "休息日加班(1.67)", "休息日加班(2.67)", "本月例假日加班", "本月例假日加班(2)",
          "本月國定假日加班", "本月國定假日加班(1.34)", "本月國定假日加班(1.67)"
        ];
        return jsonResponse(workTypes);
      }

      // 寫入工時資料
      if (url.pathname === "/api/save-timesheet" && method === "POST") {
        const payload = await request.json();
        return await handleSaveTimesheet(env.DB, payload);
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
// 讀取 API
// =================================================================
async function handleGetEmployees(db) {
  const res = await db.prepare("SELECT name, hire_date FROM employees ORDER BY name").all();
  const rows = getRows(res);
  return jsonResponse(rows);
}

async function handleGetClients(db, params) {
  const employee = params.get("employee");
  if (!employee) return jsonResponse({ error: "Missing employee parameter" }, 400);
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
  return jsonResponse(rows.map(r => r.type_name));
}

async function handleGetLeaveTypes(db) {
  const res = await db.prepare("SELECT type_name FROM leave_types ORDER BY type_name").all();
  const rows = getRows(res);
  return jsonResponse(rows.map(r => r.type_name));
}

async function handleGetHolidays(db, params) {
  const year = params.get("year");
  if (!year) return jsonResponse({ error: "Missing year parameter" }, 400);
  const res = await db.prepare("SELECT holiday_date FROM holidays WHERE holiday_date LIKE ? ORDER BY holiday_date")
    .bind(`${year}-%`).all();
  const rows = getRows(res);
  return jsonResponse(rows.map(r => r.holiday_date));
}

async function handleGetTimesheetData(db, params) {
  const employee = params.get("employee");
  const year = params.get("year");
  const month = params.get("month");
  if (!employee || !year || !month) return jsonResponse({ error: "Missing parameters" }, 400);

  const res = await db.prepare(`
    SELECT *
    FROM timesheets
    WHERE employee_name = ? AND work_year = ? AND work_month = ?
    ORDER BY work_date
  `).bind(employee, year, month).all();
  const rows = getRows(res);
  return jsonResponse(aggregateTimesheetData(rows));
}

// =================================================================
// 寫入 API
// =================================================================
async function handleSaveTimesheet(db, payload) {
  const { employee, year, month, workEntries = [], leaveEntries = [] } = payload;

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
// CORS & JSON
// =================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
