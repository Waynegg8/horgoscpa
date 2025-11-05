import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { getKVCache, saveKVCache } from "../kv-cache-helper.js";

function ymToday() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function todayYmd() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export async function handleDashboard(request, env, me, requestId, url, path) {
  const corsHeaders = getCorsHeadersForRequest(request, env);
  const method = request.method.toUpperCase();
  if (path !== "/internal/api/v1/dashboard" || method !== "GET") {
    return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
  }

  try {
    // 从查询参数获取月份，如果没有则使用当前月份
    const searchParams = new URL(url).searchParams;
    const requestedYm = searchParams.get('ym');
    const ym = requestedYm && /^\d{4}-\d{2}$/.test(requestedYm) ? requestedYm : ymToday();
    
    // 财务状况的月份和模式
    const financeYm = searchParams.get('financeYm') && /^\d{4}-\d{2}$/.test(searchParams.get('financeYm')) ? searchParams.get('financeYm') : ym;
    const financeMode = searchParams.get('financeMode') || 'month'; // 'month' 或 'ytd'
    
    const today = todayYmd();
    
    // ⚡⚡⚡ 添加KV缓存（仪表板数据变化不频繁，缓存5分钟）
    const cacheKey = `dashboard:userId=${me.user_id}&ym=${ym}&financeYm=${financeYm}&financeMode=${financeMode}&role=${me.is_admin ? 'admin' : 'employee'}`;
    
    // 1. 尝试从KV缓存读取
    const kvCached = await getKVCache(env, cacheKey);
    if (kvCached && kvCached.data) {
      console.log('[Dashboard] ✓ KV缓存命中');
      return jsonResponse(200, {
        ok: true,
        code: "SUCCESS",
        message: "查詢成功（KV缓存）⚡",
        data: kvCached.data,
        meta: { requestId, month: ym, financeYm, financeMode, today, ...kvCached.meta, cache_source: 'kv' }
      }, corsHeaders);
    }

    // Employee metrics
    async function getEmployeeMetrics() {
      const res = { myHours: null, myTasks: { items: [], counts: { pending: 0, inProgress: 0, overdue: 0, dueSoon: 0 } }, myLeaves: null, recentActivities: [], notifications: [] };
      // Hours
      try {
        const h = await env.DATABASE.prepare(
          `SELECT 
              SUM(hours) AS total,
              SUM(CASE WHEN work_type = 'normal' THEN hours ELSE 0 END) AS normal,
              SUM(CASE WHEN work_type LIKE 'ot-%' THEN hours ELSE 0 END) AS overtime
           FROM Timesheets WHERE is_deleted = 0 AND user_id = ? AND substr(work_date,1,7) = ?`
        ).bind(String(me.user_id), ym).first();
        const total = Number(h?.total || 0), normal = Number(h?.normal || 0), overtime = Number(h?.overtime || 0);
        const target = 160; const completionRate = target ? Math.round((total / target) * 1000) / 10 : 0;
        res.myHours = { month: ym, total, normal, overtime, targetHours: target, completionRate };
      } catch (_) {}

      // Tasks (pending/in_progress)
      try {
        const rows = await env.DATABASE.prepare(
          `SELECT task_id, task_name, due_date, status, related_sop_id, client_specific_sop_id,
                  status_note, blocker_reason, overdue_reason
           FROM ActiveTasks
           WHERE is_deleted = 0 AND assignee_user_id = ? AND status IN ('pending','in_progress')
           ORDER BY COALESCE(due_date, '9999-12-31') ASC LIMIT 10`
        ).bind(String(me.user_id)).all();
        const items = (rows?.results || []).map(r => {
          const due = r.due_date || null;
          let urgency = 'normal';
          let daysUntilDue = null; let daysOverdue = null; const now = new Date();
          if (due) {
            const d = new Date(due); const delta = Math.floor((d.getTime() - now.getTime()) / 86400000);
            daysUntilDue = delta;
            if (delta < 0) { urgency = 'overdue'; daysOverdue = -delta; }
            else if (delta <= 3) urgency = 'urgent';
          }
          return { 
            id: r.task_id, 
            name: r.task_name, 
            dueDate: due, 
            status: r.status, 
            urgency, 
            daysUntilDue, 
            daysOverdue, 
            hasSop: !!(r.related_sop_id || r.client_specific_sop_id),
            statusNote: r.status_note || null,
            blockerReason: r.blocker_reason || null,
            overdueReason: r.overdue_reason || null
          };
        });
        const counts = { pending: 0, inProgress: 0, overdue: 0, dueSoon: 0 };
        for (const it of items) {
          if (it.status === 'pending') counts.pending++;
          if (it.status === 'in_progress') counts.inProgress++;
          if (it.urgency === 'overdue') counts.overdue++;
          if (typeof it.daysUntilDue === 'number' && it.daysUntilDue >= 0 && it.daysUntilDue <= 3) counts.dueSoon++;
        }
        res.myTasks = { items, counts };
      } catch (_) {}

      // Leaves (balances and recent)
      try {
        // 排除補休類型（補休由 CompensatoryLeaveGrants 計算）
        const rows = await env.DATABASE.prepare(
          `SELECT leave_type AS type, remain AS remaining, total, used FROM LeaveBalances WHERE user_id = ? AND leave_type != 'comp'`
        ).bind(String(me.user_id)).all();
        const bal = { annual: 0, sick: 0, compHours: 0 };
        for (const r of (rows?.results || [])) {
          const t = (r.type || '').toLowerCase();
          if (t === 'annual') bal.annual = Number(r.remaining || 0);
          else if (t === 'sick') bal.sick = Number(r.remaining || 0);
        }
        
        // 補休餘額從 CompensatoryLeaveGrants 計算
        const compRow = await env.DATABASE.prepare(
          `SELECT SUM(hours_remaining) as total FROM CompensatoryLeaveGrants 
           WHERE user_id = ? AND status = 'active' AND hours_remaining > 0`
        ).bind(String(me.user_id)).first();
        bal.compHours = Number(compRow?.total || 0);
        const recentRows = await env.DATABASE.prepare(
          `SELECT leave_type AS type, start_date, end_date, amount, status FROM LeaveRequests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 3`
        ).bind(String(me.user_id)).all();
        const recent = (recentRows?.results || []).map(r => ({ type: r.type, startDate: r.start_date, days: Number(r.amount || 0), status: r.status }));
        res.myLeaves = { balances: bal, recent };
      } catch (_) {}

      return res;
    }

    // Admin metrics
    async function getAdminMetrics(targetYm, finYm, finMode, params) {
      const res = { employeeHours: [], employeeTasks: [], financialStatus: null, revenueTrend: [], recentActivities: [], teamMembers: [] };
      
      // Employee hours (各员工分别工时 - 按指定月份查询)
      // work_type: 1=正常工时，2-11=各种加班类型
      try {
        const result = await env.DATABASE.prepare(
          `SELECT u.user_id, u.name, u.username,
                  COALESCE(SUM(t.hours), 0) AS total,
                  COALESCE(SUM(CASE WHEN CAST(t.work_type AS INTEGER) = 1 THEN t.hours ELSE 0 END), 0) AS normal,
                  COALESCE(SUM(CASE WHEN CAST(t.work_type AS INTEGER) >= 2 THEN t.hours ELSE 0 END), 0) AS overtime
           FROM Users u
           LEFT JOIN Timesheets t ON t.user_id = u.user_id AND t.is_deleted = 0 AND substr(t.work_date, 1, 7) = ?
           WHERE u.is_deleted = 0
           GROUP BY u.user_id, u.name, u.username
           ORDER BY total DESC, u.name ASC`
        ).bind(targetYm).all();
        
        // D1 returns { results: [...], success: true }
        const rows = result?.results || [];
        res.employeeHours = rows.map(r => ({
          userId: r.user_id,
          name: r.name || r.username || '未命名',
          total: Number(r.total || 0),
          normal: Number(r.normal || 0),
          overtime: Number(r.overtime || 0)
        }));
      } catch (e) {
        console.error('[Dashboard] Employee hours query error:', e);
      }

      // Financial status - 根据finMode返回对应数据
      try {
        const currentYear = finYm.split('-')[0]; // 从finYm获取年份
        
        // 现金流数据（实时，不分月份）
        const arRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS ar FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial')`
        ).first();
        const overdueRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS od FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial') AND due_date < ?`
        ).bind(today).first();
        const ar = Math.round(Number(arRow?.ar || 0));
        const overdue = Math.round(Number(overdueRow?.od || 0));
        
        let monthData = null;
        let ytdData = null;
        
        if (finMode === 'month') {
          // 月度数据
          const monthPaidRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS paid FROM Receipts WHERE is_deleted = 0 AND status = 'paid' AND substr(receipt_date,1,7) = ?`
          ).bind(finYm).first();
          const monthRevRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS revenue FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled' AND substr(receipt_date,1,7) = ?`
          ).bind(finYm).first();
          let monthCost = 0;
          try {
            const pr = await env.DATABASE.prepare(`SELECT SUM(total_cents) AS c FROM MonthlyPayroll mp JOIN PayrollRuns pr ON pr.run_id = mp.run_id WHERE pr.month = ?`).bind(finYm).first();
            monthCost = Math.round(Number(pr?.c || 0) / 100);
          } catch (_) {}
          
          const monthRevenue = Math.round(Number(monthRevRow?.revenue || 0));
          const monthPaid = Math.round(Number(monthPaidRow?.paid || 0));
          const monthProfit = monthRevenue - monthCost;
          const monthMargin = monthRevenue > 0 ? Math.round((monthProfit / monthRevenue) * 1000) / 10 : 0;
          const monthCollectionRate = monthRevenue > 0 ? Math.round((monthPaid / monthRevenue) * 1000) / 10 : 0;
          
          monthData = {
            period: finYm,
            revenue: monthRevenue,
            cost: monthCost,
            profit: monthProfit,
            margin: monthMargin,
            ar,
            paid: monthPaid,
            overdue,
            collectionRate: monthCollectionRate
          };
        } else {
          // 年度累计数据（截至今日）
          const ytdPaidRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS paid FROM Receipts WHERE is_deleted = 0 AND status = 'paid' AND substr(receipt_date,1,4) = ? AND receipt_date <= ?`
          ).bind(currentYear, today).first();
          const ytdRevRow = await env.DATABASE.prepare(
            `SELECT SUM(total_amount) AS revenue FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled' AND substr(receipt_date,1,4) = ? AND receipt_date <= ?`
          ).bind(currentYear, today).first();
          let ytdCost = 0;
          try {
            const pr = await env.DATABASE.prepare(`SELECT SUM(total_cents) AS c FROM MonthlyPayroll mp JOIN PayrollRuns pr ON pr.run_id = mp.run_id WHERE substr(pr.month,1,4) = ?`).bind(currentYear).first();
            ytdCost = Math.round(Number(pr?.c || 0) / 100);
          } catch (_) {}
          
          const ytdRevenue = Math.round(Number(ytdRevRow?.revenue || 0));
          const ytdPaid = Math.round(Number(ytdPaidRow?.paid || 0));
          const ytdProfit = ytdRevenue - ytdCost;
          const ytdMargin = ytdRevenue > 0 ? Math.round((ytdProfit / ytdRevenue) * 1000) / 10 : 0;
          const ytdCollectionRate = ytdRevenue > 0 ? Math.round((ytdPaid / ytdRevenue) * 1000) / 10 : 0;
          
          ytdData = {
            period: `${currentYear}年累計`,
            revenue: ytdRevenue,
            cost: ytdCost,
            profit: ytdProfit,
            margin: ytdMargin,
            ar,
            paid: ytdPaid,
            overdue,
            collectionRate: ytdCollectionRate
          };
        }
        
        res.financialStatus = { 
          month: monthData,
          ytd: ytdData
        };
      } catch (_) {}

      // Employee tasks (各员工任务状态：已完成/进行中/逾期)
      // 智能筛选逻辑：
      // - 已完成的任务：只显示指定月份的（避免无限累积）
      // - 未完成的任务：显示所有月份的（避免遗漏需要处理的任务）
      try {
        // 先获取基本统计
        const summaryRows = await env.DATABASE.prepare(
          `SELECT u.user_id, u.name, u.username,
                  COUNT(CASE WHEN t.status = 'completed' AND t.service_month = ? THEN 1 END) AS completed
           FROM Users u
           LEFT JOIN ActiveTasks t ON t.assignee_user_id = u.user_id AND t.is_deleted = 0
           WHERE u.is_deleted = 0
           GROUP BY u.user_id, u.name, u.username`
        ).bind(targetYm).all();
        
        // 获取未完成任务的月份分布详情
        const detailRows = await env.DATABASE.prepare(
          `SELECT u.user_id, 
                  t.service_month,
                  t.status,
                  CASE WHEN t.status NOT IN ('completed','cancelled') AND t.due_date < ? THEN 1 ELSE 0 END as is_overdue,
                  COUNT(*) as count
           FROM Users u
           LEFT JOIN ActiveTasks t ON t.assignee_user_id = u.user_id 
                  AND t.is_deleted = 0 
                  AND t.status NOT IN ('completed', 'cancelled')
           WHERE u.is_deleted = 0 AND t.task_id IS NOT NULL
           GROUP BY u.user_id, t.service_month, t.status, is_overdue`
        ).bind(today).all();
        
        // 构建用户任务映射
        const userTasksMap = {};
        (summaryRows?.results || []).forEach(r => {
          userTasksMap[r.user_id] = {
            userId: r.user_id,
            name: r.name || r.username,
            completed: Number(r.completed || 0),
            inProgress: {},
            overdue: {}
          };
        });
        
        // 填充月份分布详情
        (detailRows?.results || []).forEach(r => {
          const user = userTasksMap[r.user_id];
          if (!user) return;
          
          const month = r.service_month || '未知';
          const count = Number(r.count || 0);
          
          if (r.is_overdue === 1) {
            user.overdue[month] = (user.overdue[month] || 0) + count;
          } else if (r.status === 'in_progress') {
            user.inProgress[month] = (user.inProgress[month] || 0) + count;
          }
          // 注意：已移除 pending 状态，所有任务默认为 in_progress
        });
        
        res.employeeTasks = Object.values(userTasksMap).sort((a, b) => {
          const aOverdue = Object.values(a.overdue).reduce((sum, n) => sum + n, 0);
          const bOverdue = Object.values(b.overdue).reduce((sum, n) => sum + n, 0);
          const aInProgress = Object.values(a.inProgress).reduce((sum, n) => sum + n, 0);
          const bInProgress = Object.values(b.inProgress).reduce((sum, n) => sum + n, 0);
          return (bOverdue - aOverdue) || (bInProgress - aInProgress);
        });
      } catch (err) {
        console.error('[Dashboard] Employee tasks query error:', err);
      }

      // Revenue trend (last 6 months)
      try {
        const rows = await env.DATABASE.prepare(
          `SELECT strftime('%Y-%m', receipt_date) AS ym, SUM(total_amount) AS revenue,
                  SUM(CASE WHEN status='paid' THEN total_amount ELSE 0 END) AS paid
           FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled'
           GROUP BY ym ORDER BY ym DESC LIMIT 6`
        ).all();
        const list = (rows?.results || []).map(r => ({ month: r.ym, revenue: Number(r.revenue || 0), paid: Number(r.paid || 0) }));
        res.revenueTrend = list.sort((a,b)=> a.month.localeCompare(b.month));
      } catch (_) {}

      // Recent Activities (任务调整、状态更新、假期申请、工时提醒)
      // 工时侦测说明：工时提醒是每次请求仪表板时实时计算的，检查用户选择的天数内（排除周末和国定假日）
      // 哪些员工没有填写工时记录。这个逻辑在下方的 timesheetReminders 部分实现。
      console.log('========================================');
      console.log('[仪表板] 开始处理 Recent Activities');
      console.log('========================================');
      try {
        // 从查询参数获取筛选条件（默认3天）
        const days = parseInt(params.get('activity_days') || '3', 10);
        const filterUserId = params.get('activity_user_id');
        const filterType = params.get('activity_type'); // 类型筛选：status_update, due_date_adjustment, leave_application, timesheet_reminder
        console.log('[仪表板] 筛选参数 - days:', days, 'filterUserId:', filterUserId, 'filterType:', filterType);
        
        // 不再使用 JavaScript 生成时间字符串，直接在 SQL 中使用 SQLite 的 datetime 函数
        // 这样可以避免时间格式不匹配的问题
        
        // 构建用户筛选条件
        const userFilter = filterUserId ? `AND adj.requested_by = ${filterUserId}` : '';
        const userFilter2 = filterUserId ? `AND su.updated_by = ${filterUserId}` : '';
        const userFilter3 = filterUserId ? `AND l.user_id = ${filterUserId}` : '';
        
        // 查询任务期限调整
        const adjustments = await env.DATABASE.prepare(`
          SELECT 
            adj.adjustment_id,
            adj.requested_at as activity_time,
            adj.old_due_date,
            adj.new_due_date,
            adj.adjustment_reason as reason,
            adj.requested_by,
            u.name as user_name,
            t.task_name,
            t.task_id,
            t.status as current_status,
            t.due_date as current_due_date,
            t.assignee_user_id,
            assignee.name as assignee_name,
            c.company_name as client_name,
            s.service_name
          FROM TaskDueDateAdjustments adj
          JOIN Users u ON u.user_id = adj.requested_by
          JOIN ActiveTasks t ON t.task_id = adj.task_id
          LEFT JOIN Users assignee ON assignee.user_id = t.assignee_user_id
          LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
          LEFT JOIN Clients c ON c.client_id = cs.client_id
          LEFT JOIN Services s ON s.service_id = cs.service_id
          WHERE adj.requested_at >= datetime('now', '-${days} days')
            AND adj.old_due_date IS NOT NULL 
            AND adj.new_due_date IS NOT NULL
            AND adj.adjustment_type IS NOT NULL
            ${userFilter}
          ORDER BY adj.requested_at DESC
          LIMIT 30
        `).all();
        
        // 查询任务状态更新
        console.log('[仪表板] 查询状态更新，天数:', days);
        const statusUpdates = await env.DATABASE.prepare(`
          SELECT 
            su.update_id,
            su.updated_at as activity_time,
            su.old_status,
            su.new_status,
            su.progress_note,
            su.blocker_reason,
            su.overdue_reason,
            su.updated_by,
            u.name as user_name,
            t.task_name,
            t.task_id,
            t.status as current_status,
            t.due_date as current_due_date,
            t.assignee_user_id,
            assignee.name as assignee_name,
            c.company_name as client_name,
            s.service_name
          FROM TaskStatusUpdates su
          LEFT JOIN Users u ON u.user_id = su.updated_by
          LEFT JOIN ActiveTasks t ON t.task_id = su.task_id
          LEFT JOIN Users assignee ON assignee.user_id = t.assignee_user_id
          LEFT JOIN ClientServices cs ON cs.client_service_id = t.client_service_id
          LEFT JOIN Clients c ON c.client_id = cs.client_id
          LEFT JOIN Services s ON s.service_id = cs.service_id
          WHERE su.updated_at >= datetime('now', '-${days} days')
            AND su.old_status IS NOT NULL
            AND su.new_status IS NOT NULL
            ${userFilter2}
          ORDER BY su.updated_at DESC
          LIMIT 30
        `).all();
        console.log('[仪表板] 状态更新查询结果:', statusUpdates?.results?.length || 0, '条');
        if (statusUpdates?.results?.length > 0) {
          console.log('[仪表板] 第一条状态更新:', JSON.stringify(statusUpdates.results[0], null, 2));
        }
        
        // 查询假期申请
        const leaveApplications = await env.DATABASE.prepare(`
          SELECT 
            l.leave_id,
            l.submitted_at as activity_time,
            l.leave_type,
            l.start_date,
            l.end_date,
            l.unit as leave_unit,
            l.amount as leave_days,
            l.status as leave_status,
            l.reason,
            l.user_id,
            u.name as user_name
          FROM LeaveRequests l
          LEFT JOIN Users u ON u.user_id = l.user_id
          WHERE l.submitted_at >= datetime('now', '-${days} days')
            ${userFilter3}
          ORDER BY l.submitted_at DESC
          LIMIT 30
        `).all();
        
        // 查询工时缺失提醒（根据用户选择的天数检查未填写工时的员工）
        let timesheetReminders = [];
        try {
          // ⚡ 限制天数为最多7天（避免SQL太复杂）
          const checkDays = Math.min(days, 7);
          
          // 获取指定天数内的日期列表（排除周末和国定假日）
          const today = new Date();
          const dates = [];
          
          // 先获取国定假日列表
          const holidaysResult = await env.DATABASE.prepare(`
            SELECT holiday_date 
            FROM Holidays 
            WHERE holiday_date >= date('now', '-${checkDays} days') 
              AND holiday_date <= date('now')
          `).all();
          const holidays = new Set((holidaysResult?.results || []).map(h => h.holiday_date));
          
          for (let i = 1; i <= checkDays; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayOfWeek = d.getDay();
            const dateStr = d.toISOString().slice(0, 10);
            
            // 排除周末和国定假日
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
              dates.push(dateStr);
            }
          }
          
          // ⚡ 优化：直接在SQL中检查每个用户，避免UNION ALL
          if (dates.length > 0) {
            const datesList = dates.map(d => `'${d}'`).join(',');
            const userFilterForTimesheet = filterUserId ? `AND u.user_id = ${filterUserId}` : '';
            
            const missingTimesheets = await env.DATABASE.prepare(`
              SELECT 
                u.user_id,
                u.name as user_name,
                d.work_date
              FROM Users u
              JOIN (${dates.map(d => `SELECT '${d}' as work_date`).join(' UNION ALL ')}) d
              LEFT JOIN Timesheets t ON t.user_id = u.user_id AND t.work_date = d.work_date AND t.is_deleted = 0
              WHERE u.is_deleted = 0 
                AND d.work_date >= u.start_date
                AND t.timesheet_id IS NULL
                ${userFilterForTimesheet}
              ORDER BY d.work_date DESC, u.name ASC
              LIMIT 30
            `).all();
            
            // 按用户分组，生成提醒记录
            const groupedByUser = {};
            (missingTimesheets?.results || []).forEach(r => {
              if (!groupedByUser[r.user_id]) {
                groupedByUser[r.user_id] = {
                  user_id: r.user_id,
                  user_name: r.user_name,
                  missing_dates: []
                };
              }
              groupedByUser[r.user_id].missing_dates.push(r.work_date);
            });
            
            // 转换为活动记录格式
            timesheetReminders = Object.values(groupedByUser).map(item => ({
              activity_type: 'timesheet_reminder',
              user_id: item.user_id,
              user_name: item.user_name,
              missing_dates: item.missing_dates,
              missing_count: item.missing_dates.length,
              activity_time: today.toISOString() // 使用当前时间作为活动时间
            }));
          }
        } catch (err) {
          console.error('[仪表板] 获取工时提醒失败:', err);
        }
        
        // 合并并排序（添加 activity_type 标识）
        console.log('[仪表板] 合并活动前:');
        console.log('  - adjustments.results:', adjustments?.results?.length || 0);
        console.log('  - statusUpdates.results:', statusUpdates?.results?.length || 0);
        console.log('  - leaveApplications.results:', leaveApplications?.results?.length || 0);
        console.log('  - timesheetReminders:', timesheetReminders?.length || 0);
        
        const allActivities = [
          ...(adjustments?.results || []).map(a => ({...a, activity_type: 'due_date_adjustment'})),
          ...(statusUpdates?.results || []).map(s => ({...s, activity_type: 'status_update'})),
          ...(leaveApplications?.results || []).map(l => ({...l, activity_type: 'leave_application'})),
          ...timesheetReminders
        ].sort((a, b) => (b.activity_time || '').localeCompare(a.activity_time || ''));
        
        console.log('[仪表板] 合并后总活动数:', allActivities.length);
        if (allActivities.length > 0) {
          console.log('[仪表板] 第一条活动示例:', allActivities[0]);
        }
        
        // 根据类型筛选
        let filteredActivities = allActivities;
        if (filterType) {
          filteredActivities = allActivities.filter(act => act.activity_type === filterType);
          console.log('[仪表板] 类型筛选后活动数:', filteredActivities.length, '(筛选类型:', filterType, ')');
        }
        
        // 格式化活动记录
        res.recentActivities = filteredActivities.slice(0, 15).map(act => {
          // 处理时区转换：SQLite 返回的时间是 UTC 时间（格式：YYYY-MM-DD HH:MM:SS）
          // 需要明确添加 'Z' 标识为 UTC，然后转换为台湾时区（UTC+8）
          let time = '';
          if (act.activity_time) {
            let dateStr = act.activity_time;
            // 如果是 SQLite 格式（YYYY-MM-DD HH:MM:SS），添加 'Z' 标识为 UTC
            if (dateStr.includes(' ') && !dateStr.includes('T')) {
              dateStr = dateStr.replace(' ', 'T') + 'Z';
            }
            time = new Date(dateStr).toLocaleString('zh-TW', { 
              timeZone: 'Asia/Taipei',
              month: '2-digit', 
              day: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
          }
          
          const statusMap = {
            'pending': '待開始',
            'in_progress': '進行中',
            'completed': '已完成',
            'cancelled': '已取消'
          };
          
          const currentStatus = statusMap[act.current_status] || act.current_status || '—';
          const currentDueDate = act.current_due_date ? act.current_due_date.slice(5) : '—';
          const assigneeName = act.assignee_name || '未分配';
          const serviceName = act.service_name || '—';
          
          if (act.activity_type === 'due_date_adjustment') {
            const oldDate = act.old_due_date ? act.old_due_date.slice(5) : '';
            const newDate = act.new_due_date ? act.new_due_date.slice(5) : '';
            return {
              activity_type: 'due_date_adjustment',
              text: `${act.user_name} 調整了任務期限`,
              taskName: act.task_name,
              clientName: act.client_name || '—',
              serviceName: serviceName,
              change: `${oldDate} → ${newDate}`,
              reason: act.reason || '',
              currentStatus: currentStatus,
              currentDueDate: currentDueDate,
              assigneeName: assigneeName,
              time: time,
              link: `/internal/task-detail?id=${act.task_id}`
            };
          } else if (act.activity_type === 'status_update') {
            const oldStatus = statusMap[act.old_status] || act.old_status;
            const newStatus = statusMap[act.new_status] || act.new_status;
            
            let note = '';
            if (act.blocker_reason) note = `🚫 ${act.blocker_reason}`;
            else if (act.overdue_reason) note = `⏰ ${act.overdue_reason}`;
            else if (act.progress_note) note = `💬 ${act.progress_note}`;
            
            return {
              activity_type: 'status_update',
              text: `${act.user_name} 更新了任務狀態`,
              taskName: act.task_name,
              clientName: act.client_name || '—',
              serviceName: serviceName,
              change: `${oldStatus} → ${newStatus}`,
              note: note,
              currentStatus: currentStatus,
              currentDueDate: currentDueDate,
              assigneeName: assigneeName,
              time: time,
              link: `/internal/task-detail?id=${act.task_id}`
            };
          } else if (act.activity_type === 'leave_application') {
            const leaveTypeMap = {
              'annual': '特休',
              'sick': '病假',
              'personal': '事假',
              'comp': '補休',
              'maternity': '產假',
              'paternity': '陪產假',
              'marriage': '婚假',
              'bereavement': '喪假',
              'unpaid': '無薪假'
            };
            const leaveType = leaveTypeMap[act.leave_type] || act.leave_type;
            
            const startDate = act.start_date ? act.start_date.slice(5) : '';
            const endDate = act.end_date ? act.end_date.slice(5) : '';
            const leaveDays = act.leave_days || 0;
            const leaveUnit = act.leave_unit || 'day'; // 默认为天
            
            return {
              activity_type: 'leave_application',
              text: `${act.user_name} 申請${leaveType}`,
              leaveType: leaveType,
              leaveDays: leaveDays,
              leaveUnit: leaveUnit,
              period: `${startDate} ~ ${endDate}`,
              reason: act.reason || '',
              userName: act.user_name,
              time: time,
              link: `/internal/leaves`
            };
          } else if (act.activity_type === 'timesheet_reminder') {
            const missingDates = (act.missing_dates || []).map(d => d.slice(5)).join(', ');
            return {
              activity_type: 'timesheet_reminder',
              text: `${act.user_name} 尚未填寫工時`,
              userName: act.user_name,
              missingCount: act.missing_count || 0,
              missingDates: missingDates,
              time: time,
              link: `/internal/timesheets`
            };
          }
          return null;
        }).filter(Boolean);
        
      } catch (err) {
        console.error('[仪表板] 获取最近动态失败:', err);
        console.error('[仪表板] 错误堆栈:', err.stack);
        console.error('[仪表板] 错误详情:', JSON.stringify(err, null, 2));
        res.recentActivities = [];
      }

      // Team Members (所有用户列表，用于筛选)
      try {
        const usersResult = await env.DATABASE.prepare(`
          SELECT user_id, name, email
          FROM Users
          WHERE is_deleted = 0
          ORDER BY name ASC
        `).all();
        res.teamMembers = (usersResult?.results || []).map(u => ({
          userId: u.user_id,
          name: u.name,
          email: u.email
        }));
      } catch (err) {
        console.error('[仪表板] 获取团队成员失败:', err);
        res.teamMembers = [];
      }

      console.log('[仪表板] 最终返回数据:');
      console.log('  - recentActivities.length:', res.recentActivities?.length || 0);
      console.log('  - teamMembers.length:', res.teamMembers?.length || 0);
      console.log('  - employeeHours.length:', res.employeeHours?.length || 0);
      console.log('  - employeeTasks.length:', res.employeeTasks?.length || 0);
      
      return res;
    }

    // 获取收据已开但任务未完成的提醒
    async function getReceiptsPendingTasks() {
      try {
        const receipts = await env.DATABASE.prepare(`
          SELECT 
            r.receipt_id,
            r.receipt_id as receipt_number,
            r.due_date as receipt_due_date,
            r.status as receipt_status,
            c.client_id,
            c.company_name,
            cs.client_service_id,
            s.service_name,
            COUNT(DISTINCT t.task_id) as total_tasks,
            COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.task_id END) as completed_tasks
          FROM Receipts r
          JOIN ClientServices cs ON cs.client_service_id = r.client_service_id
          JOIN Clients c ON c.client_id = cs.client_id
          LEFT JOIN Services s ON s.service_id = cs.service_id
          LEFT JOIN ActiveTasks t ON t.client_service_id = cs.client_service_id 
            AND t.service_month = r.service_month
            AND t.is_deleted = 0
          WHERE r.is_deleted = 0
            AND r.status IN ('pending', 'partial')
          GROUP BY r.receipt_id
          HAVING completed_tasks < total_tasks AND total_tasks > 0
          ORDER BY r.due_date ASC
          LIMIT 10
        `).all();
        
        return (receipts.results || []).map(r => ({
          receipt_id: r.receipt_id,
          receipt_number: r.receipt_number,
          receipt_due_date: r.receipt_due_date,
          receipt_status: r.receipt_status,
          client_id: r.client_id,
          client_name: r.company_name,
          service_name: r.service_name || '',
          total_tasks: Number(r.total_tasks || 0),
          completed_tasks: Number(r.completed_tasks || 0),
          pending_tasks: Number(r.total_tasks || 0) - Number(r.completed_tasks || 0)
        }));
      } catch (err) {
        console.error('[Dashboard] getReceiptsPendingTasks 失败:', err);
        return [];
      }
    }

    const data = { role: me.is_admin ? 'admin' : 'employee' };
    if (me.is_admin) {
      data.admin = await getAdminMetrics(ym, financeYm, financeMode, searchParams);
      data.admin.receiptsPendingTasks = await getReceiptsPendingTasks();
    } else {
      data.employee = await getEmployeeMetrics();
      data.employee.receiptsPendingTasks = await getReceiptsPendingTasks();
    }
    
    // ⚡ 保存到KV缓存（5分钟TTL）
    await saveKVCache(env, cacheKey, 'dashboard', data, {
      userId: String(me.user_id),
      ttl: 300 // 5分钟
    }).catch(err => console.error('[Dashboard] KV缓存保存失败:', err));

    return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, month: ym, financeYm, financeMode, today } }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
    return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
  }
}


