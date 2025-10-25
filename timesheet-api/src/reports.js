// =================================================================
// 報表 API 模組 - 包含聚合查詢和智能快取
// =================================================================

import { canAccessEmployee } from './auth.js';

// =================================================================
// 工具函數
// =================================================================

function getRows(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.results && Array.isArray(result.results)) return result.results;
  return [];
}

// 生成快取鍵
function generateCacheKey(type, params) {
  const parts = [type];
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      parts.push(`${key}_${value}`);
    }
  }
  return parts.join('_');
}

// 獲取最新的 timesheet ID（用於偵測變動）
async function getLatestTimesheetId(db, params) {
  const conditions = [];
  const bindings = [];
  
  if (params.employee) {
    conditions.push('employee_name = ?');
    bindings.push(params.employee);
  }
  if (params.year) {
    conditions.push('work_year = ?');
    bindings.push(params.year);
  }
  if (params.month) {
    conditions.push('work_month = ?');
    bindings.push(params.month);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  const result = await db.prepare(`
    SELECT MAX(id) as max_id FROM timesheets ${whereClause}
  `).bind(...bindings).first();
  
  return result?.max_id || 0;
}

// 檢查並返回快取
async function checkCache(db, cacheKey, latestTimesheetId) {
  try {
    const cache = await db.prepare(`
      SELECT data, last_timesheet_id, updated_at
      FROM report_cache 
      WHERE cache_key = ?
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).bind(cacheKey).first();
    
    if (cache && cache.last_timesheet_id >= latestTimesheetId) {
      // 快取命中
      return {
        hit: true,
        data: JSON.parse(cache.data),
        cached_at: cache.updated_at
      };
    }
    
    return { hit: false };
  } catch (err) {
    console.error('快取檢查失敗:', err);
    return { hit: false };
  }
}

// 儲存快取
async function saveCache(db, reportType, cacheKey, data, latestTimesheetId, expiresInHours = 24) {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    
    await db.prepare(`
      INSERT OR REPLACE INTO report_cache 
      (report_type, cache_key, data, last_timesheet_id, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      reportType,
      cacheKey,
      JSON.stringify(data),
      latestTimesheetId,
      expiresAt.toISOString()
    ).run();
  } catch (err) {
    console.error('快取儲存失敗:', err);
  }
}

// 記錄報表統計
async function logReportStats(db, reportType, executionTimeMs, cacheHit, employeeName = null) {
  try {
    await db.prepare(`
      INSERT INTO report_stats (report_type, execution_time_ms, cache_hit, employee_name)
      VALUES (?, ?, ?, ?)
    `).bind(reportType, executionTimeMs, cacheHit ? 1 : 0, employeeName).run();
  } catch (err) {
    console.error('統計記錄失敗:', err);
  }
}

// =================================================================
// 報表處理器
// =================================================================

// 年度請假總覽報表
export async function handleAnnualLeaveReport(db, params, user) {
  const startTime = Date.now();
  const employee = params.get('employee');
  const year = params.get('year');
  
  if (!employee || !year) {
    return jsonResponse({ error: '缺少必要參數：employee, year' }, 400);
  }
  
  // 權限檢查
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: '無權限存取此員工資料' }, 403);
  }
  
  try {
    // 生成快取鍵
    const cacheKey = generateCacheKey('annual_leave', { employee, year });
    
    // 檢查是否有新資料
    const latestId = await getLatestTimesheetId(db, { employee, year });
    
    // 檢查快取
    const cacheResult = await checkCache(db, cacheKey, latestId);
    if (cacheResult.hit) {
      const executionTime = Date.now() - startTime;
      await logReportStats(db, 'annual_leave', executionTime, true, employee);
      
      return jsonResponse({
        ...cacheResult.data,
        cached: true,
        cached_at: cacheResult.cached_at,
        execution_time_ms: executionTime
      });
    }
    
    // 重新計算報表（一次查詢）
    const result = await db.prepare(`
      SELECT 
        leave_type,
        SUM(leave_hours) as total_hours
      FROM timesheets
      WHERE employee_name = ? 
        AND work_year = ?
        AND leave_type IS NOT NULL
      GROUP BY leave_type
    `).bind(employee, year).all();
    
    const rows = getRows(result);
    
    // 處理資料
    const leaveStats = {};
    rows.forEach(row => {
      leaveStats[row.leave_type] = parseFloat(row.total_hours || 0);
    });
    
    // 計算總請假時數
    const totalUsed = Object.values(leaveStats).reduce((sum, hours) => sum + hours, 0);
    
    const reportData = {
      employee,
      year,
      leave_stats: leaveStats,
      total_used_hours: totalUsed,
      total_used_days: totalUsed / 8,
      generated_at: new Date().toISOString()
    };
    
    // 儲存快取
    await saveCache(db, 'annual_leave', cacheKey, reportData, latestId, 24);
    
    const executionTime = Date.now() - startTime;
    await logReportStats(db, 'annual_leave', executionTime, false, employee);
    
    return jsonResponse({
      ...reportData,
      cached: false,
      execution_time_ms: executionTime
    });
    
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 工時分析報表
export async function handleWorkAnalysisReport(db, params, user) {
  const startTime = Date.now();
  const employee = params.get('employee');
  const year = params.get('year');
  const month = params.get('month');
  
  if (!employee || !year || !month) {
    return jsonResponse({ error: '缺少必要參數：employee, year, month' }, 400);
  }
  
  // 權限檢查
  if (!canAccessEmployee(user, employee)) {
    return jsonResponse({ error: '無權限存取此員工資料' }, 403);
  }
  
  try {
    // 生成快取鍵
    const cacheKey = generateCacheKey('work_analysis', { employee, year, month });
    
    // 檢查是否有新資料
    const latestId = await getLatestTimesheetId(db, { employee, year, month });
    
    // 檢查快取
    const cacheResult = await checkCache(db, cacheKey, latestId);
    if (cacheResult.hit) {
      const executionTime = Date.now() - startTime;
      await logReportStats(db, 'work_analysis', executionTime, true, employee);
      
      return jsonResponse({
        ...cacheResult.data,
        cached: true,
        cached_at: cacheResult.cached_at,
        execution_time_ms: executionTime
      });
    }
    
    // 重新計算（一次聚合查詢）
    const result = await db.prepare(`
      SELECT 
        client_name,
        business_type,
        SUM(hours_normal) as normal_hours,
        SUM(hours_ot_weekday_134 + hours_ot_weekday_167 + 
            hours_ot_rest_134 + hours_ot_rest_167 + hours_ot_rest_267 +
            hours_ot_offday_100 + hours_ot_offday_200 +
            hours_ot_holiday_100 + hours_ot_holiday_134 + hours_ot_holiday_167) as overtime_hours,
        SUM(weighted_hours) as weighted_hours
      FROM timesheets
      WHERE employee_name = ? 
        AND work_year = ?
        AND work_month = ?
        AND client_name IS NOT NULL
      GROUP BY client_name, business_type
      ORDER BY weighted_hours DESC
    `).bind(employee, year, month).all();
    
    const rows = getRows(result);
    
    // 計算總計
    const totals = rows.reduce((acc, row) => ({
      normal_hours: acc.normal_hours + (parseFloat(row.normal_hours) || 0),
      overtime_hours: acc.overtime_hours + (parseFloat(row.overtime_hours) || 0),
      weighted_hours: acc.weighted_hours + (parseFloat(row.weighted_hours) || 0)
    }), { normal_hours: 0, overtime_hours: 0, weighted_hours: 0 });
    
    const reportData = {
      employee,
      year,
      month,
      data: rows,
      totals: totals,
      generated_at: new Date().toISOString()
    };
    
    // 儲存快取
    await saveCache(db, 'work_analysis', cacheKey, reportData, latestId, 24);
    
    const executionTime = Date.now() - startTime;
    await logReportStats(db, 'work_analysis', executionTime, false, employee);
    
    return jsonResponse({
      ...reportData,
      cached: false,
      execution_time_ms: executionTime
    });
    
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 樞紐分析報表
export async function handlePivotReport(db, params, user) {
  const startTime = Date.now();
  const year = params.get('year');
  const month = params.get('month');
  const groupBy = params.get('groupBy') || 'employee';
  
  if (!year) {
    return jsonResponse({ error: '缺少必要參數：year' }, 400);
  }
  
  // 管理員可以看全部，員工只能看自己
  const isAdmin = user.role === 'admin';
  
  try {
    // 生成快取鍵
    const cacheKey = generateCacheKey('pivot', { year, month, groupBy });
    
    // 檢查是否有新資料
    const latestId = await getLatestTimesheetId(db, { year, month });
    
    // 檢查快取
    const cacheResult = await checkCache(db, cacheKey, latestId);
    if (cacheResult.hit) {
      const executionTime = Date.now() - startTime;
      await logReportStats(db, 'pivot', executionTime, true);
      
      // 如果是員工，只返回自己的資料
      let data = cacheResult.data.data;
      if (!isAdmin && user.employee_name) {
        data = data.filter(row => row.group_name === user.employee_name);
      }
      
      return jsonResponse({
        ...cacheResult.data,
        data: data,
        cached: true,
        cached_at: cacheResult.cached_at,
        execution_time_ms: executionTime
      });
    }
    
    // 決定分組欄位
    let groupColumn;
    switch (groupBy) {
      case 'employee': groupColumn = 'employee_name'; break;
      case 'client': groupColumn = 'client_name'; break;
      case 'business_type': groupColumn = 'business_type'; break;
      default: groupColumn = 'employee_name';
    }
    
    // 建立查詢條件
    let whereClause = `work_year = ?`;
    const bindings = [year];
    
    if (month) {
      whereClause += ` AND work_month = ?`;
      bindings.push(month);
    }
    
    // 一次性聚合查詢
    const result = await db.prepare(`
      SELECT 
        ${groupColumn} as group_name,
        SUM(hours_normal) as normal_hours,
        SUM(hours_ot_weekday_134 + hours_ot_weekday_167 + 
            hours_ot_rest_134 + hours_ot_rest_167 + hours_ot_rest_267 +
            hours_ot_offday_100 + hours_ot_offday_200 +
            hours_ot_holiday_100 + hours_ot_holiday_134 + hours_ot_holiday_167) as overtime_hours,
        SUM(weighted_hours) as weighted_hours,
        SUM(leave_hours) as leave_hours,
        SUM(hours_ot_weekday_134) as ot_weekday_134,
        SUM(hours_ot_weekday_167) as ot_weekday_167,
        SUM(hours_ot_rest_134) as ot_rest_134,
        SUM(hours_ot_rest_167) as ot_rest_167,
        SUM(hours_ot_rest_267) as ot_rest_267,
        SUM(hours_ot_offday_200) as ot_offday_200,
        SUM(hours_ot_holiday_134) as ot_holiday_134,
        SUM(hours_ot_holiday_167) as ot_holiday_167
      FROM timesheets
      WHERE ${whereClause}
      GROUP BY ${groupColumn}
      ORDER BY weighted_hours DESC
    `).bind(...bindings).all();
    
    let rows = getRows(result);
    
    // 計算總計
    const totals = rows.reduce((acc, row) => ({
      normal_hours: acc.normal_hours + (parseFloat(row.normal_hours) || 0),
      overtime_hours: acc.overtime_hours + (parseFloat(row.overtime_hours) || 0),
      weighted_hours: acc.weighted_hours + (parseFloat(row.weighted_hours) || 0),
      leave_hours: acc.leave_hours + (parseFloat(row.leave_hours) || 0)
    }), { normal_hours: 0, overtime_hours: 0, weighted_hours: 0, leave_hours: 0 });
    
    const reportData = {
      year,
      month,
      groupBy,
      data: rows,
      totals: totals,
      generated_at: new Date().toISOString()
    };
    
    // 儲存快取
    await saveCache(db, 'pivot', cacheKey, reportData, latestId, 24);
    
    const executionTime = Date.now() - startTime;
    await logReportStats(db, 'pivot', executionTime, false);
    
    // 如果是員工，只返回自己的資料
    if (!isAdmin && user.employee_name) {
      rows = rows.filter(row => row.group_name === user.employee_name);
    }
    
    return jsonResponse({
      ...reportData,
      data: rows,
      cached: false,
      execution_time_ms: executionTime
    });
    
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 清除快取 API（管理員專用）
export async function handleClearCache(db, params) {
  try {
    const reportType = params.get('type');
    const cacheKey = params.get('key');
    
    if (cacheKey) {
      // 清除特定快取
      await db.prepare(`DELETE FROM report_cache WHERE cache_key = ?`).bind(cacheKey).run();
      return jsonResponse({ success: true, message: `已清除快取：${cacheKey}` });
    } else if (reportType) {
      // 清除特定類型的所有快取
      await db.prepare(`DELETE FROM report_cache WHERE report_type = ?`).bind(reportType).run();
      return jsonResponse({ success: true, message: `已清除所有 ${reportType} 快取` });
    } else {
      // 清除所有快取
      await db.prepare(`DELETE FROM report_cache`).run();
      return jsonResponse({ success: true, message: '已清除所有快取' });
    }
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// 獲取快取統計 API（管理員專用）
export async function handleCacheStats(db) {
  try {
    // 快取命中率
    const statsResult = await db.prepare(`
      SELECT 
        report_type,
        COUNT(*) as total_requests,
        SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
        AVG(execution_time_ms) as avg_execution_time,
        AVG(CASE WHEN cache_hit = 1 THEN execution_time_ms ELSE NULL END) as avg_cache_time,
        AVG(CASE WHEN cache_hit = 0 THEN execution_time_ms ELSE NULL END) as avg_compute_time
      FROM report_stats
      WHERE generated_at > datetime('now', '-7 days')
      GROUP BY report_type
    `).all();
    
    const stats = getRows(statsResult);
    
    // 計算命中率
    const statsWithHitRate = stats.map(stat => ({
      ...stat,
      hit_rate: stat.total_requests > 0 ? (stat.cache_hits / stat.total_requests * 100).toFixed(2) + '%' : '0%',
      avg_execution_time: stat.avg_execution_time ? Math.round(stat.avg_execution_time) + 'ms' : 'N/A',
      avg_cache_time: stat.avg_cache_time ? Math.round(stat.avg_cache_time) + 'ms' : 'N/A',
      avg_compute_time: stat.avg_compute_time ? Math.round(stat.avg_compute_time) + 'ms' : 'N/A'
    }));
    
    // 快取大小
    const cacheCountResult = await db.prepare(`
      SELECT 
        report_type,
        COUNT(*) as cache_count,
        SUM(LENGTH(data)) as total_size
      FROM report_cache
      GROUP BY report_type
    `).all();
    
    const cacheCounts = getRows(cacheCountResult);
    
    return jsonResponse({
      performance_stats: statsWithHitRate,
      cache_storage: cacheCounts,
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// JSON 響應輔助函數
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

