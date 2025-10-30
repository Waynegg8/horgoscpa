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
    const ym = ymToday();
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
    async function getAdminMetrics() {
      const res = { companyOverview: null, financialStatus: null, pendingItems: null, revenueTrend: [] };
      // Company overview
      try {
        const hoursRow = await env.DATABASE.prepare(`SELECT SUM(hours) AS total FROM Timesheets WHERE is_deleted = 0 AND substr(work_date,1,7) = ?`).bind(ym).first();
        const empRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS c FROM Users WHERE is_deleted = 0`).first();
        const actRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS c FROM ClientServices WHERE is_deleted = 0 AND status = 'active'`).first();
        res.companyOverview = { month: ym, totalHours: Number(hoursRow?.total || 0), employeeCount: Number(empRow?.c || 0), activeServices: Number(actRow?.c || 0), attendanceRate: null };
      } catch (_) {}

      // Financial status
      try {
        const paidRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS paid FROM Receipts WHERE is_deleted = 0 AND status = 'paid' AND substr(receipt_date,1,7) = ?`
        ).bind(ym).first();
        const revRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS revenue FROM Receipts WHERE is_deleted = 0 AND status != 'cancelled' AND substr(receipt_date,1,7) = ?`
        ).bind(ym).first();
        const arRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS ar FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial')`
        ).first();
        const overdueRow = await env.DATABASE.prepare(
          `SELECT SUM(total_amount) AS od FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial') AND due_date < ?`
        ).bind(today).first();
        let cost = 0;
        try {
          const pr = await env.DATABASE.prepare(`SELECT SUM(total_cents) AS c FROM MonthlyPayroll mp JOIN PayrollRuns pr ON pr.run_id = mp.run_id WHERE pr.month = ?`).bind(ym).first();
          cost = Math.round(Number(pr?.c || 0) / 100);
        } catch (_) {}
        const revenue = Math.round(Number(revRow?.revenue || 0));
        const paid = Math.round(Number(paidRow?.paid || 0));
        const ar = Math.round(Number(arRow?.ar || 0));
        const overdue = Math.round(Number(overdueRow?.od || 0));
        const profit = revenue - cost;
        const margin = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
        const collectionRate = revenue > 0 ? Math.round((paid / revenue) * 1000) / 10 : 0;
        res.financialStatus = { month: ym, ar, paid, overdue, revenue, cost, profit, margin, collectionRate };
      } catch (_) {}

      // Pending items (counts only; short lists optional)
      try {
        let leavePending = 0;
        try {
          const r = await env.DATABASE.prepare(`SELECT COUNT(1) AS c FROM LeaveRequests WHERE status = 'pending'`).first();
          leavePending = Number(r?.c || 0);
        } catch (_) {}
        const tasksOverdueRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS c FROM ActiveTasks WHERE is_deleted = 0 AND status NOT IN ('completed','cancelled') AND due_date < ?`).bind(today).first();
        const recOverdueRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS c FROM Receipts WHERE is_deleted = 0 AND status IN ('unpaid','partial') AND due_date < ?`).bind(today).first();
        res.pendingItems = { leavePending, overdueTasks: Number(tasksOverdueRow?.c || 0), overdueReceipts: Number(recOverdueRow?.c || 0) };
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
      data.admin = await getAdminMetrics();
    } else {
      data.employee = await getEmployeeMetrics();
    }

    return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, month: ym, today } }, corsHeaders);
  } catch (err) {
    console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
    return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
  }
}


