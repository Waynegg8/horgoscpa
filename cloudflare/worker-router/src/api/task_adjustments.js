/**
 * 任务期限调整辅助函数
 */

/**
 * 计算日期差（天数）
 */
function daysBetween(date1Str, date2Str) {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * 添加天数到日期
 */
function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * 检查任务是否逾期
 */
function isTaskOverdue(dueDate, status) {
  if (status === 'completed' || status === 'cancelled') {
    return false;
  }
  const today = new Date().toISOString().split('T')[0];
  return dueDate && dueDate < today;
}

/**
 * 自动调整后续任务的到期日（当前置任务完成延迟时）
 * @param {*} env 
 * @param {*} taskId 完成的任务ID
 * @param {*} userId 操作用户ID
 */
export async function autoAdjustDependentTasks(env, taskId, userId) {
  try {
    // 获取刚完成的任务信息
    const completedTask = await env.DATABASE.prepare(`
      SELECT task_id, due_date, completed_at, original_due_date
      FROM ActiveTasks
      WHERE task_id = ? AND status = 'completed'
    `).bind(taskId).first();
    
    if (!completedTask || !completedTask.due_date || !completedTask.completed_at) {
      return { adjusted: 0, errors: [] };
    }
    
    // 计算延迟天数
    const completedDate = completedTask.completed_at.split('T')[0];
    const dueDate = completedTask.due_date;
    const delayDays = daysBetween(dueDate, completedDate);
    
    if (delayDays <= 0) {
      // 没有延迟，不需要调整
      return { adjusted: 0, errors: [] };
    }
    
    console.log(`[任务调整] 任务 ${taskId} 延迟了 ${delayDays} 天`);
    
    // 查找所有依赖此任务的后续任务
    const dependentTasks = await env.DATABASE.prepare(`
      SELECT task_id, task_name, due_date, status
      FROM ActiveTasks
      WHERE prerequisite_task_id = ?
        AND is_deleted = 0
        AND status NOT IN ('completed', 'cancelled')
    `).bind(taskId).all();
    
    const results = { adjusted: 0, errors: [] };
    
    for (const task of (dependentTasks.results || [])) {
      try {
        // 最多延长7天（可配置的限制）
        const adjustDays = Math.min(delayDays, 7);
        const newDueDate = addDays(task.due_date, adjustDays);
        
        // 更新任务到期日
        await env.DATABASE.prepare(`
          UPDATE ActiveTasks
          SET due_date = ?,
              due_date_adjusted = 1,
              adjustment_count = adjustment_count + 1,
              last_adjustment_date = datetime('now'),
              can_start_date = ?
          WHERE task_id = ?
        `).bind(newDueDate, completedDate, task.task_id).run();
        
        // 记录调整历史
        await env.DATABASE.prepare(`
          INSERT INTO TaskDueDateAdjustments (
            task_id, old_due_date, new_due_date, days_changed,
            adjustment_reason, adjustment_type,
            requested_by, is_system_auto
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(
          task.task_id,
          task.due_date,
          newDueDate,
          adjustDays,
          `系统自动调整：前置任务 ${completedTask.task_id} 延迟 ${delayDays} 天完成`,
          'system_auto',
          userId
        ).run();
        
        results.adjusted++;
        console.log(`[任务调整] 已自动调整任务 ${task.task_id} 的到期日：${task.due_date} → ${newDueDate}`);
        
      } catch (err) {
        console.error(`[任务调整] 调整任务 ${task.task_id} 失败:`, err);
        results.errors.push({
          task_id: task.task_id,
          error: String(err)
        });
      }
    }
    
    return results;
    
  } catch (err) {
    console.error('[任务调整] autoAdjustDependentTasks 失败:', err);
    throw err;
  }
}

/**
 * 记录任务状态更新
 */
export async function recordStatusUpdate(env, taskId, status, userId, notes = {}) {
  try {
    await env.DATABASE.prepare(`
      INSERT INTO TaskStatusUpdates (
        task_id, status, updated_by,
        progress_note, blocker_reason, overdue_reason,
        expected_completion_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      status,
      userId,
      notes.progress_note || null,
      notes.blocker_reason || null,
      notes.overdue_reason || null,
      notes.expected_completion_date || null
    ).run();
    
    // 同时更新任务表的快照字段
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks
      SET status_note = ?,
          blocker_reason = ?,
          overdue_reason = ?,
          expected_completion_date = ?,
          last_status_update = datetime('now')
      WHERE task_id = ?
    `).bind(
      notes.progress_note || null,
      notes.blocker_reason || null,
      notes.overdue_reason || null,
      notes.expected_completion_date || null,
      taskId
    ).run();
    
    return { success: true };
  } catch (err) {
    console.error('[任务调整] recordStatusUpdate 失败:', err);
    throw err;
  }
}

/**
 * 记录到期日调整
 */
export async function recordDueDateAdjustment(env, taskId, oldDueDate, newDueDate, reason, adjustmentType, userId, isOverdue = false, isInitial = false) {
  try {
    const daysChanged = daysBetween(oldDueDate, newDueDate);
    
    await env.DATABASE.prepare(`
      INSERT INTO TaskDueDateAdjustments (
        task_id, old_due_date, new_due_date, days_changed,
        adjustment_reason, adjustment_type,
        requested_by, is_overdue_adjustment, is_initial_creation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      oldDueDate,
      newDueDate,
      daysChanged,
      reason,
      adjustmentType,
      userId,
      isOverdue ? 1 : 0,
      isInitial ? 1 : 0
    ).run();
    
    // 更新任务表
    await env.DATABASE.prepare(`
      UPDATE ActiveTasks
      SET due_date = ?,
          due_date_adjusted = 1,
          adjustment_count = adjustment_count + 1,
          last_adjustment_date = datetime('now'),
          adjustment_reason = ?
      WHERE task_id = ?
    `).bind(newDueDate, reason, taskId).run();
    
    return { success: true };
  } catch (err) {
    console.error('[任务调整] recordDueDateAdjustment 失败:', err);
    throw err;
  }
}

/**
 * 获取任务调整历史
 */
export async function getAdjustmentHistory(env, taskId) {
  try {
    const adjustments = await env.DATABASE.prepare(`
      SELECT 
        adjustment_id,
        old_due_date,
        new_due_date,
        days_changed,
        adjustment_reason,
        adjustment_type,
        is_overdue_adjustment,
        is_initial_creation,
        is_system_auto,
        requested_at,
        u.name as requested_by_name
      FROM TaskDueDateAdjustments tda
      LEFT JOIN Users u ON u.user_id = tda.requested_by
      WHERE tda.task_id = ?
        AND tda.old_due_date IS NOT NULL
        AND tda.new_due_date IS NOT NULL
        AND tda.adjustment_type IS NOT NULL
      ORDER BY tda.requested_at DESC
    `).bind(taskId).all();
    
    return (adjustments.results || []).map(adj => ({
      adjustment_id: adj.adjustment_id,
      old_due_date: adj.old_due_date,
      new_due_date: adj.new_due_date,
      days_changed: adj.days_changed,
      adjustment_reason: adj.adjustment_reason || '',
      adjustment_type: adj.adjustment_type,
      is_overdue_adjustment: adj.is_overdue_adjustment === 1,
      is_initial_creation: adj.is_initial_creation === 1,
      is_system_auto: adj.is_system_auto === 1,
      requested_at: adj.requested_at,
      requested_by_name: adj.requested_by_name || ''
    }));
  } catch (err) {
    console.error('[任务调整] getAdjustmentHistory 失败:', err);
    throw err;
  }
}

