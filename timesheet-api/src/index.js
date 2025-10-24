/* * 這是您【最終版】的 src/index.js 檔案
 * 它 100% 複製了您 VBA 中的核心業務邏輯
 */

export default {
  async fetch(request, env, ctx) {
    // env.DB 就是我們在 wrangler.jsonc 中綁定的 "DB"
    const url = new URL(request.url);
    const method = request.method;

    if (method === "OPTIONS") {
      return handleOptions(request);
    }

    try {
      // ----------------------------------------------------
      // API 路由 (Router)
      // ----------------------------------------------------

      // --- 讀取 API (與之前相同) ---
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
      
      // --- 【全新】讀取 API：取得所有工時類型 ---
      if (url.pathname === "/api/work-types" && method === "GET") {
        // 我們直接從 VBA 常數中複製
        const workTypes = [
          "正常工時", "平日加班(1.34)", "平日加班(1.67)", "休息日加班(1.34)", 
          "休息日加班(1.67)", "休息日加班(2.67)", "本月例假日加班", "本月例假日加班(2)",
          "本月國定假日加班", "本月國定假日加班(1.34)", "本月國定假日加班(1.67)"
        ];
        return jsonResponse(workTypes.map(t => ({ type_name: t })));
      }

      // --- 【全新】儲存 API (取代舊的) ---
      // POST /api/save-timesheet
      // (完美複製 VBA 的 Save_Timesheet_Data 邏輯)
      if (url.pathname === "/api/save-timesheet" && method === "POST") {
        return await handleSaveTimesheet(request, env.DB);
      }
      // ----------------------------------------------------

      return jsonResponse({ error: "API Not Found" }, 404);

    } catch (e) {
      console.error(e);
      return jsonResponse({ error: e.message }, 500);
    }
  },
};

// =================================================================
// 儲存邏輯 (VBA: Save_Timesheet_Data)
// =================================================================
async function handleSaveTimesheet(request, db) {
  const data = await request.json();
  const { employeeName, year, month, workEntries, leaveEntries } = data;

  if (!employeeName || !year || !month || !Array.isArray(workEntries) || !Array.isArray(leaveEntries)) {
    return jsonResponse({ error: "傳入的資料格式不正確" }, 400);
  }
  
  // 1. 讀取所有「加班費率規則」，我們將在後端計算加權工時
  const { results: rateRules } = await db.prepare("SELECT * FROM overtime_rates").all();

  // 2. 準備 SQL 交易 (Transaction)
  const statements = [];

  // 3. (VBA 邏輯) 刪除該員工該月的舊資料
  statements.push(
    db.prepare("DELETE FROM timesheets WHERE employee_name = ? AND work_year = ? AND work_month = ?")
      .bind(employeeName, year, month)
  );
  
  const insertStmt = db.prepare(
    "INSERT INTO timesheets (employee_name, client_name, work_date, day_of_week, work_year, work_month, " +
    "hours_normal, hours_ot_weekday_134, hours_ot_weekday_167, hours_ot_rest_134, hours_ot_rest_167, " +
    "hours_ot_rest_267, hours_ot_offday_100, hours_ot_offday_200, hours_ot_holiday_100, hours_ot_holiday_134, " +
    "hours_ot_holiday_167, leave_type, leave_hours, business_type, weighted_hours) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  // 4. (VBA 邏輯) 遍歷 1 到 31 天
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const workDate = new Date(Date.UTC(year, month - 1, i));
    const workDateStr = workDate.toISOString().split('T')[0];
    const dayOfWeekStr = "週" + ["日", "一", "二", "三", "四", "五", "六"][workDate.getUTCDay()];

    // 5. (VBA 邏輯) 處理請假資料
    // (前端傳來的格式: [{ leave_type: '特休', hours: [0,0,8,...] }, ...])
    for (const entry of leaveEntries) {
      const leaveHours = parseFloat(entry.hours[i - 1] || 0);
      if (leaveHours > 0) {
        statements.push(
          insertStmt.bind(
            employeeName, null, workDateStr, dayOfWeekStr, year, month,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // No work hours
            entry.leave_type, // 請假類型
            leaveHours,       // 請假時數
            '請假',           // 業務類型
            0                 // 請假沒有加權工時
          )
        );
      }
    }
    
    // 6. (VBA 邏輯) 處理工時資料
    // (前端傳來的格式: [{ client: 'A', business: '記帳', work_type: '正常', hours: [8,8,0,...] }, ...])
    for (const entry of workEntries) {
      const hours = parseFloat(entry.hours[i - 1] || 0);
      if (hours > 0) {
        // 建立一個空的 SQL 紀錄
        let record = {
          employee_name: employeeName,
          client_name: entry.client,
          work_date: workDateStr,
          day_of_week: dayOfWeekStr,
          work_year: year,
          work_month: month,
          hours_normal: 0,
          hours_ot_weekday_134: 0,
          hours_ot_weekday_167: 0,
          hours_ot_rest_134: 0,
          hours_ot_rest_167: 0,
          hours_ot_rest_267: 0,
          hours_ot_offday_100: 0,
          hours_ot_offday_200: 0,
          hours_ot_holiday_100: 0,
          hours_ot_holiday_134: 0,
          hours_ot_holiday_167: 0,
          leave_type: null,
          leave_hours: 0,
          business_type: entry.business,
          weighted_hours: 0,
        };
        
        // 7. (VBA 邏輯) 根據 "工時類型" 填入正確的欄位
        // (VBA: Save_Timesheet_Data 中的 Select Case)
        processWorkType(record, entry.work_type, hours);
        
        // 8. (VBA 邏輯) 計算加權工時
        // (VBA: Get_Weighted_Hours)
        calculateWeightedHours(record, rateRules);
        
        // 9. 將這筆處理好的紀錄加入交易
        statements.push(
          insertStmt.bind(
            record.employee_name, record.client_name, record.work_date, record.day_of_week, 
            record.work_year, record.work_month, record.hours_normal, record.hours_ot_weekday_134,
            record.hours_ot_weekday_167, record.hours_ot_rest_134, record.hours_ot_rest_167,
            record.hours_ot_rest_267, record.hours_ot_offday_100, record.hours_ot_offday_200,
            record.hours_ot_holiday_100, record.hours_ot_holiday_134, record.hours_ot_holiday_167,
            record.leave_type, record.leave_hours, record.business_type, record.weighted_hours
          )
        );
      }
    }
  }

  // 10. 執行 D1 的批次交易
  await db.batch(statements);
  return jsonResponse({ success: true, message: `已成功儲存 ${employeeName} ${year}-${month} 的資料` });
}

// =================================================================
// 輔助函數 (VBA 邏輯)
// =================================================================

/**
 * 複製 VBA: Save_Timesheet_Data 中的 Select Case 邏輯
 * 根據工時類型，將時數填入 record 物件的正確欄位
 */
function processWorkType(record, workType, hours) {
  switch (workType) {
    case "正常工時":
      record.hours_normal = hours;
      break;
    case "平日加班(1.34)":
      record.hours_ot_weekday_134 = hours;
      break;
    case "平日加班(1.67)":
      record.hours_ot_weekday_167 = hours;
      break;
    case "休息日加班(1.34)":
      record.hours_ot_rest_134 = hours;
      break;
    case "休息日加班(1.67)":
      record.hours_ot_rest_167 = hours;
      break;
    case "休息日加班(2.67)":
      record.hours_ot_rest_267 = hours;
      break;
    case "本月例假日加班":
      record.hours_ot_offday_100 = hours;
      break;
    case "本月例假日加班(2)":
      record.hours_ot_offday_200 = hours;
      break;
    case "本月國定假日加班":
      record.hours_ot_holiday_100 = hours;
      break;
    case "本月國定假日加班(1.34)":
      record.hours_ot_holiday_134 = hours;
      break;
    case "本月國定假日加班(1.67)":
      record.hours_ot_holiday_167 = hours;
      break;
  }
}

/**
 * 複製 VBA: Get_Weighted_Hours 邏輯
 * 根據 D1 中的費率規則，計算加權工時
 */
function calculateWeightedHours(record, rateRules) {
  let totalWeighted = 0;
  
  // 正常工時
  totalWeighted += record.hours_normal; // 權重為 1
  
  // 平日加班 (合併 1.34 和 1.67)
  const weekdayHours = record.hours_ot_weekday_134 + record.hours_ot_weekday_167;
  totalWeighted += getWeightedSum('平日加班', weekdayHours, rateRules);

  // 休息日加班 (合併 1.34, 1.67, 2.67)
  const restDayHours = record.hours_ot_rest_134 + record.hours_ot_rest_167 + record.hours_ot_rest_267;
  totalWeighted += getWeightedSum('休息日加班', restDayHours, rateRules);

  // 國定假日加班 (合併 1, 1.34, 1.67)
  const holidayHours = record.hours_ot_holiday_100 + record.hours_ot_holiday_134 + record.hours_ot_holiday_167;
  totalWeighted += getWeightedSum('國定假日加班', holidayHours, rateRules);
  
  // 例假日加班 (合併 1, 2)
  const offDayHours = record.hours_ot_offday_100 + record.hours_ot_offday_200;
  totalWeighted += getWeightedSum('例假日加班', offDayHours, rateRules);

  record.weighted_hours = totalWeighted;
}

/**
 * 複製 VBA: Get_Weighted_Hours 內部的迴圈邏輯
 * 根據單一加班類型 (如 '平日加班') 及其總時數，計算加權後的時數
 */
function getWeightedSum(rateType, totalHours, allRateRules) {
  if (totalHours <= 0) return 0;
  
  let weightedTotal = 0;
  let hoursRemaining = totalHours;
  
  // 1. 篩選出此類型的規則，並排序
  const rules = allRateRules
    .filter(r => r.rate_type === rateType)
    .sort((a, b) => a.hour_start - b.hour_start);

  // 2. 遍歷費率規則 (VBA: For Each r In ratesTbl.ListRows)
  for (const rule of rules) {
    if (hoursRemaining <= 0) break;
    
    // (VBA: hoursInTier = Application.WorksheetFunction.Min(hoursToCalculate, endTier) - startTier)
    // 我們的邏輯稍有不同：計算此級距 "能處理" 的時數
    const tierCapacity = rule.hour_end - rule.hour_start;
    const hoursInThisTier = Math.min(hoursRemaining, tierCapacity);
    
    if (hoursInThisTier > 0) {
      weightedTotal += hoursInThisTier * rule.rate_multiplier;
      hoursRemaining -= hoursInThisTier;
    }
  }
  
  // 如果遍歷完規則後還有剩餘時數 (例如 超過 12 小時)，
  // 則使用最後一個級距的費率
  if (hoursRemaining > 0 && rules.length > 0) {
    const lastRule = rules[rules.length - 1];
    weightedTotal += hoursRemaining * lastRule.rate_multiplier;
  }
  
  return weightedTotal;
}

// =================================================================
// 讀取 API (與之前相同)
// =================================================================

async function handleGetEmployees(db) {
  const { results } = await db.prepare("SELECT name, hire_date FROM employees ORDER BY name").all();
  return jsonResponse(results);
}

async function handleGetClients(db, params) {
  const employeeName = params.get('employee_name');
  if (!employeeName) {
    return jsonResponse({ error: "缺少 employee_name 參數" }, 400);
  }
  
  const stmt = db.prepare("SELECT T1.client_name FROM client_assignments AS T1 " +
                          "INNER JOIN clients AS T2 ON T1.client_name = T2.name " +
                          "WHERE T1.employee_name = ? " +
                          "ORDER BY T1.client_name");
  const { results } = await stmt.bind(employeeName).all();
  
  const clientList = [{ client_name: "無指定客戶" }];
  results.forEach(row => clientList.push(row));
  
  return jsonResponse(clientList);
}

async function handleGetBusinessTypes(db) {
  const { results } = await db.prepare("SELECT type_name FROM business_types ORDER BY type_name").all();
  return jsonResponse(results);
}

async function handleGetLeaveTypes(db) {
  const { results } = await db.prepare("SELECT type_name FROM leave_types WHERE type_name != '喪假' ORDER BY type_name").all();
  return jsonResponse(results);
}

async function handleGetHolidays(db, params) {
  const year = params.get('year');
  if (!year) {
    return jsonResponse({ error: "缺少 year 參數" }, 400);
  }
  const { results } = await db.prepare("SELECT holiday_date FROM holidays WHERE holiday_date LIKE ?")
                            .bind(year + '-%')
                            .all();
  // 前端只需要日期陣列
  return jsonResponse(results.map(r => r.holiday_date));
}

async function handleGetTimesheetData(db, params) {
  const employeeName = params.get('employee_name');
  const year = params.get('year');
  const month = params.get('month');

  if (!employeeName || !year || !month) {
    return jsonResponse({ error: "缺少 employee_name, year 或 month 參數" }, 400);
  }
  
  const stmt = db.prepare("SELECT * FROM timesheets WHERE employee_name = ? AND work_year = ? AND work_month = ?");
  const { results } = await stmt.bind(employeeName, parseInt(year), parseInt(month)).all();
  
  // 我們將資料庫的 "扁平" 紀錄，轉換為前端網格需要的 "彙整" 格式
  // (VBA: Refresh_Timesheet_Display 的邏輯)
  const { workEntries, leaveEntries } = reformatDataForFrontend(results);
  
  return jsonResponse({ workEntries, leaveEntries });
}

/**
 * 輔助函數：將資料庫的扁平紀錄，轉換為前端網格需要的格式
 * (VBA: Refresh_Timesheet_Display 的迴圈邏輯)
 */
function reformatDataForFrontend(dbResults) {
  const workEntryMap = new Map();
  const leaveEntryMap = new Map();
  const daysInMonth = 31; // 我們始終回傳 31 天的陣列

  for (const row of dbResults) {
    const date = new Date(row.work_date + 'T00:00:00Z'); // 使用 UTC
    const dayIndex = date.getUTCDate() - 1; // 1號 -> 索引 0

    if (row.leave_hours > 0 && row.leave_type) {
      // 處理請假
      const leaveType = row.leave_type;
      if (!leaveEntryMap.has(leaveType)) {
        leaveEntryMap.set(leaveType, {
          leave_type: leaveType,
          hours: Array(daysInMonth).fill(0),
        });
      }
      leaveEntryMap.get(leaveType).hours[dayIndex] = row.leave_hours;

    } else if (row.client_name) {
      // 處理工時
      // (VBA: clientKey = clientName & "|" & businessType & "|" & otType)
      const workType = getWorkTypeFromRow(row);
      const key = `${row.client_name}|${row.business_type}|${workType}`;
      
      if (!workEntryMap.has(key)) {
        workEntryMap.set(key, {
          client: row.client_name,
          business: row.business_type,
          work_type: workType,
          hours: Array(daysInMonth).fill(0),
        });
      }
      
      // 找出該行是哪個時數
      const hours = 
        row.hours_normal || row.hours_ot_weekday_134 || row.hours_ot_weekday_167 ||
        row.hours_ot_rest_134 || row.hours_ot_rest_167 || row.hours_ot_rest_267 ||
        row.hours_ot_offday_100 || row.hours_ot_offday_200 || row.hours_ot_holiday_100 ||
        row.hours_ot_holiday_134 || row.hours_ot_holiday_167 || 0;
        
      workEntryMap.get(key).hours[dayIndex] = hours;
    }
  }

  return {
    workEntries: Array.from(workEntryMap.values()),
    leaveEntries: Array.from(leaveEntryMap.values()),
  };
}

/**
 * 輔助函數：從資料庫紀錄反向推導 "工時類型"
 * (VBA: GetLoadedOtType 的邏輯)
 */
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
  return "正常工時"; // 預設
}

// =================================================================
// CORS 輔助函數
// =================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization", // 允許 Authorization
};

function handleOptions(request) {
  return new Response(null, { headers: corsHeaders });
}

function jsonResponse(data, status = 200) {
  const init = {
    status: status,
    headers: {
      "content-type": "application/json;charset=UTF-8",
      ...corsHeaders,
    },
  };
  return new Response(JSON.stringify(data), init);
}