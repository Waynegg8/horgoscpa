/**
 * 用戶提醒 API
 * 提供提醒的創建、查詢、標記已讀等功能
 */

/**
 * 取得用戶提醒列表
 * GET /api/reminders?user_id=1&is_read=0
 */
export async function getReminders(request, env) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const isRead = url.searchParams.get('is_read');
    const db = env.DB;
    
    let query = `
      SELECT * FROM user_reminders
      WHERE 1=1
    `;
    const bindings = [];
    
    if (userId) {
      query += ` AND user_id = ?`;
      bindings.push(userId);
    }
    
    if (isRead !== null && isRead !== undefined) {
      query += ` AND is_read = ?`;
      bindings.push(isRead === '1' || isRead === 'true' ? 1 : 0);
    }
    
    // 排除過期的提醒
    query += ` AND (expires_at IS NULL OR expires_at > datetime('now'))`;
    
    query += ` ORDER BY priority DESC, created_at DESC LIMIT 50`;
    
    const stmt = db.prepare(query);
    const reminders = await stmt.bind(...bindings).all();
    
    return new Response(JSON.stringify({
      success: true,
      reminders: reminders.results || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 創建提醒
 * POST /api/reminders
 */
export async function createReminder(request, env) {
  try {
    const db = env.DB;
    const body = await request.json();
    const { user_id, reminder_type, message, related_id, priority, expires_at } = body;
    
    if (!user_id || !reminder_type || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少必要參數'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await db.prepare(`
      INSERT INTO user_reminders 
      (user_id, reminder_type, message, related_id, priority, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      user_id,
      reminder_type,
      message,
      related_id || null,
      priority || 'normal',
      expires_at || null
    ).run();
    
    return new Response(JSON.stringify({
      success: true,
      reminder_id: result.meta.last_row_id
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 標記提醒為已讀
 * PUT /api/reminders/:id/read
 */
export async function markReminderAsRead(request, env, reminderId) {
  try {
    const db = env.DB;
    
    await db.prepare(`
      UPDATE user_reminders 
      SET is_read = 1 
      WHERE id = ?
    `).bind(reminderId).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: '提醒已標記為已讀'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 批量標記提醒為已讀
 * PUT /api/reminders/mark-all-read
 */
export async function markAllRemindersAsRead(request, env) {
  try {
    const db = env.DB;
    const body = await request.json();
    const { user_id } = body;
    
    if (!user_id) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少用戶 ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await db.prepare(`
      UPDATE user_reminders 
      SET is_read = 1 
      WHERE user_id = ? AND is_read = 0
    `).bind(user_id).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: '所有提醒已標記為已讀',
      updated_count: result.meta.changes
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 刪除提醒
 * DELETE /api/reminders/:id
 */
export async function deleteReminder(request, env, reminderId) {
  try {
    const db = env.DB;
    
    await db.prepare(`
      DELETE FROM user_reminders WHERE id = ?
    `).bind(reminderId).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: '提醒已刪除'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 自動生成提醒
 * POST /api/reminders/auto-generate
 */
export async function autoGenerateReminders(request, env) {
  try {
    const db = env.DB;
    const generatedCount = 0;
    
    // 1. 年假即將到期提醒
    const annualLeaveExpiring = await db.prepare(`
      SELECT 
        e.id as employee_id,
        u.id as user_id,
        alc.remaining_days,
        alc.year
      FROM employees e
      JOIN users u ON e.name = u.employee_name
      LEFT JOIN annual_leave_carryover alc ON e.id = alc.employee_id
      WHERE alc.remaining_days > 0
        AND alc.year = strftime('%Y', 'now')
        AND date('now') > date(alc.year || '-11-01')
    `).all();
    
    for (const item of annualLeaveExpiring.results || []) {
      await db.prepare(`
        INSERT OR IGNORE INTO user_reminders 
        (user_id, reminder_type, message, priority, expires_at)
        VALUES (?, 'annual_leave_expiry', ?, 'high', ?)
      `).bind(
        item.user_id,
        `您的年假將於年底到期，剩餘 ${item.remaining_days} 天未休`,
        `${item.year}-12-31`
      ).run();
    }
    
    // 2. 任務即將到期提醒
    const tasksDueSoon = await db.prepare(`
      SELECT 
        t.id as task_id,
        t.title,
        t.due_date,
        u.id as user_id
      FROM tasks t
      JOIN users u ON (t.assigned_user = u.username OR t.assigned_user = u.employee_name)
      WHERE t.status IN ('pending', 'in_progress')
        AND t.due_date BETWEEN date('now') AND date('now', '+3 days')
    `).all();
    
    for (const task of tasksDueSoon.results || []) {
      await db.prepare(`
        INSERT OR IGNORE INTO user_reminders 
        (user_id, reminder_type, message, related_id, priority, expires_at)
        VALUES (?, 'task_due', ?, ?, 'high', ?)
      `).bind(
        task.user_id,
        `任務「${task.title}」即將於 ${task.due_date} 到期`,
        task.task_id,
        task.due_date
      ).run();
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: '提醒已自動生成'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

