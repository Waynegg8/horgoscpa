import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

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
          `SELECT task_id, task_name, due_date, status, related_sop_id, client_specific_sop_id
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
          return { id: r.task_id, name: r.task_name, dueDate: due, status: r.status, urgency, daysUntilDue, daysOverdue, hasSop: !!(r.related_sop_id || r.client_specific_sop_id) };
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
        const rows = await env.DATABASE.prepare(
          `SELECT leave_type AS type, remain AS remaining, total, used FROM LeaveBalances WHERE user_id = ?`
        ).bind(String(me.user_id)).all();
        const bal = { annual: 0, sick: 0, compHours: 0 };
        for (const r of (rows?.results || [])) {
          const t = (r.type || '').toLowerCase();
          if (t === 'annual') bal.annual = Number(r.remaining || 0);
          else if (t === 'sick') bal.sick = Number(r.remaining || 0);
          else if (t === 'comp') bal.compHours = Number(r.remaining || 0);
        }
        const recentRows = await env.DATABASE.prepare(
          `SELECT leave_type AS type, start_date, end_date, amount, status FROM LeaveRequests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 3`
        ).bind(String(me.user_id)).all();
        const recent = (recentRows?.results || []).map(r => ({ type: r.type, startDate: r.start_date, days: Number(r.amount || 0), status: r.status }));
        res.myLeaves = { balances: bal, recent };
      } catch (_) {}

      return res;
    }

    // Admin metrics
    async function getAdminMetrics(targetYm, finYm, finMode) {
      const res = { employeeHours: [], employeeTasks: [], financialStatus: null, revenueTrend: [] };
      
      // Employee hours (各员工分别工时 - 按指定月份查询)
      try {
        const rows = await env.DATABASE.prepare(
          `SELECT u.user_id, u.name, u.username,
                  SUM(t.hours) AS total,
                  SUM(CASE WHEN wt.isOvertime = 0 THEN t.hours ELSE 0 END) AS normal,
                  SUM(CASE WHEN wt.isOvertime = 1 THEN t.hours ELSE 0 END) AS overtime
           FROM Users u
           LEFT JOIN Timesheets t ON t.user_id = u.user_id AND t.is_deleted = 0 AND substr(t.work_date, 1, 7) = ?
           LEFT JOIN (
             SELECT 1 as work_type_id, 0 as isOvertime
             UNION SELECT 2, 1 UNION SELECT 3, 1 UNION SELECT 4, 1 UNION SELECT 5, 1 
             UNION SELECT 6, 1 UNION SELECT 7, 1 UNION SELECT 8, 1 UNION SELECT 9, 1 
             UNION SELECT 10, 1 UNION SELECT 11, 1
           ) wt ON CAST(t.work_type AS INTEGER) = wt.work_type_id
           WHERE u.is_deleted = 0
           GROUP BY u.user_id, u.name, u.username
           ORDER BY total DESC`
        ).bind(targetYm).all();
        
        res.employeeHours = (rows?.results || []).map(r => ({
          userId: r.user_id,
          name: r.name || r.username,
          total: Number(r.total || 0),
          normal: Number(r.normal || 0),
          overtime: Number(r.overtime || 0)
        }));
      } catch (_) {}

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
      try {
        const rows = await env.DATABASE.prepare(
          `SELECT u.user_id, u.name, u.username,
                  COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed,
                  COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) AS inProgress,
                  COUNT(CASE WHEN t.status NOT IN ('completed','cancelled') AND t.due_date < ? THEN 1 END) AS overdue,
                  COUNT(CASE WHEN t.status = 'pending' THEN 1 END) AS pending
           FROM Users u
           LEFT JOIN ActiveTasks t ON t.assignee_user_id = u.user_id AND t.is_deleted = 0
           WHERE u.is_deleted = 0
           GROUP BY u.user_id, u.name, u.username
           ORDER BY overdue DESC, inProgress DESC`
        ).bind(today).all();
        
        res.employeeTasks = (rows?.results || []).map(r => ({
          userId: r.user_id,
          name: r.name || r.username,
          completed: Number(r.completed || 0),
          inProgress: Number(r.inProgress || 0),
          overdue: Number(r.overdue || 0),
          pending: Number(r.pending || 0)
        }));
      } catch (_) {}

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

      return res;
    }

    const data = { role: me.is_admin ? 'admin' : 'employee' };
    if (me.is_admin) {
      data.admin = await getAdminMetrics(ym, financeYm, financeMode);
    } else {
      data.employee = await getEmployeeMetrics();
    }

    return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, month: ym, financeYm, financeMode, today } }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
    return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
  }
}


