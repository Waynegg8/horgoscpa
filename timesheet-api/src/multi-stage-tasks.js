/**
 * 多階段任務管理 API
 * 處理工商登記等複雜多階段工作流程
 */

// =========================================
// 任務模板管理
// =========================================

/**
 * 獲取多階段任務模板列表
 */
export async function getMultiStageTemplates(env, category) {
  const { DB } = env;
  
  let query = `
    SELECT * FROM task_templates
    WHERE is_active = 1
  `;
  
  if (category) {
    query += ` AND category = ?`;
  }
  
  query += ` ORDER BY category, name`;
  
  const stmt = DB.prepare(query);
  const result = await (category ? stmt.bind(category).all() : stmt.all());
  
  return new Response(JSON.stringify({ templates: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 獲取模板的階段列表
 */
export async function getTemplateStages(env, templateId) {
  const { DB } = env;
  
  const stmt = DB.prepare(`
    SELECT * FROM task_template_stages
    WHERE template_id = ?
    ORDER BY stage_number
  `);
  
  const result = await stmt.bind(templateId).all();
  
  const stages = result.results.map(stage => ({
    ...stage,
    required_documents: stage.required_documents ? JSON.parse(stage.required_documents) : [],
    checklist_items: stage.checklist_items ? JSON.parse(stage.checklist_items) : []
  }));
  
  return new Response(JSON.stringify({ stages }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// =========================================
// 客戶多階段任務實例
// =========================================

/**
 * 創建多階段任務實例
 */
export async function createMultiStageTask(env, data, username) {
  const { DB } = env;
  const {
    client_name,
    template_id,
    task_name,
    priority = 'medium',
    start_date,
    due_date,
    assigned_to,
    notes
  } = data;
  
  // 獲取模板信息
  const templateStmt = DB.prepare(`
    SELECT * FROM task_templates WHERE id = ?
  `);
  const template = await templateStmt.bind(template_id).first();
  
  if (!template) {
    return new Response(JSON.stringify({ error: '模板不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 創建任務實例
  const insertTaskStmt = DB.prepare(`
    INSERT INTO client_multi_stage_tasks (
      client_name, template_id, task_name, status, priority,
      current_stage, total_stages, start_date, due_date,
      assigned_to, created_by, notes
    ) VALUES (?, ?, ?, 'not_started', ?, 1, ?, ?, ?, ?, ?, ?)
  `);
  
  const taskResult = await insertTaskStmt.bind(
    client_name, template_id, task_name, priority,
    template.total_stages, start_date, due_date,
    assigned_to, username, notes
  ).run();
  
  const taskId = taskResult.meta.last_row_id;
  
  // 獲取模板階段並創建進度記錄
  const stagesStmt = DB.prepare(`
    SELECT * FROM task_template_stages
    WHERE template_id = ?
    ORDER BY stage_number
  `);
  const stagesResult = await stagesStmt.bind(template_id).all();
  
  for (const stage of stagesResult.results) {
    const checklistData = stage.checklist_items ? JSON.stringify({
      items: JSON.parse(stage.checklist_items).map(item => ({
        text: item,
        completed: false
      }))
    }) : null;
    
    const insertProgressStmt = DB.prepare(`
      INSERT INTO client_task_stage_progress (
        task_id, stage_number, stage_name, status, checklist_data
      ) VALUES (?, ?, ?, ?, ?)
    `);
    
    await insertProgressStmt.bind(
      taskId,
      stage.stage_number,
      stage.stage_name,
      stage.stage_number === 1 ? 'pending' : 'pending',
      checklistData
    ).run();
  }
  
  // 記錄歷史
  const historyStmt = DB.prepare(`
    INSERT INTO multi_stage_task_history (
      task_id, action, notes, created_by
    ) VALUES (?, 'created', ?, ?)
  `);
  await historyStmt.bind(taskId, `創建任務：${task_name}`, username).run();
  
  return new Response(JSON.stringify({ 
    success: true,
    task_id: taskId
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 獲取多階段任務列表
 */
export async function getMultiStageTasks(env, searchParams) {
  const { DB } = env;
  
  const clientName = searchParams.get('client_name');
  const status = searchParams.get('status');
  const assignedTo = searchParams.get('assigned_to');
  
  let query = `
    SELECT 
      cmst.*,
      tt.name as template_name,
      tt.category as task_category
    FROM client_multi_stage_tasks cmst
    LEFT JOIN task_templates tt ON cmst.template_id = tt.id
    WHERE 1=1
  `;
  const params = [];
  
  if (clientName) {
    query += ` AND cmst.client_name = ?`;
    params.push(clientName);
  }
  
  if (status) {
    query += ` AND cmst.status = ?`;
    params.push(status);
  }
  
  if (assignedTo) {
    query += ` AND cmst.assigned_to = ?`;
    params.push(assignedTo);
  }
  
  query += ` ORDER BY cmst.created_at DESC`;
  
  const stmt = DB.prepare(query);
  const result = await (params.length > 0 ? stmt.bind(...params).all() : stmt.all());
  
  return new Response(JSON.stringify({ tasks: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 獲取單個多階段任務詳情
 */
export async function getMultiStageTask(env, taskId) {
  const { DB } = env;
  
  // 獲取任務基本信息
  const taskStmt = DB.prepare(`
    SELECT 
      cmst.*,
      tt.name as template_name,
      tt.category as task_category,
      tt.description as template_description
    FROM client_multi_stage_tasks cmst
    LEFT JOIN task_templates tt ON cmst.template_id = tt.id
    WHERE cmst.id = ?
  `);
  const task = await taskStmt.bind(taskId).first();
  
  if (!task) {
    return new Response(JSON.stringify({ error: '任務不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 獲取階段進度
  const progressStmt = DB.prepare(`
    SELECT * FROM client_task_stage_progress
    WHERE task_id = ?
    ORDER BY stage_number
  `);
  const progressResult = await progressStmt.bind(taskId).all();
  
  const stages = progressResult.results.map(stage => ({
    ...stage,
    checklist_data: stage.checklist_data ? JSON.parse(stage.checklist_data) : { items: [] }
  }));
  
  // 獲取歷史記錄
  const historyStmt = DB.prepare(`
    SELECT * FROM multi_stage_task_history
    WHERE task_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `);
  const historyResult = await historyStmt.bind(taskId).all();
  
  return new Response(JSON.stringify({ 
    task,
    stages,
    history: historyResult.results
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 更新多階段任務
 */
export async function updateMultiStageTask(env, taskId, data, username) {
  const { DB } = env;
  const {
    status,
    priority,
    assigned_to,
    notes,
    due_date
  } = data;
  
  let updates = [];
  let params = [];
  
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
    
    if (status === 'in_progress' && !data.start_date) {
      updates.push('start_date = CURRENT_TIMESTAMP');
    }
    
    if (status === 'completed') {
      updates.push('completed_date = CURRENT_TIMESTAMP');
    }
  }
  
  if (priority !== undefined) {
    updates.push('priority = ?');
    params.push(priority);
  }
  
  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to);
  }
  
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  
  if (due_date !== undefined) {
    updates.push('due_date = ?');
    params.push(due_date);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(taskId);
  
  const stmt = DB.prepare(`
    UPDATE client_multi_stage_tasks
    SET ${updates.join(', ')}
    WHERE id = ?
  `);
  
  await stmt.bind(...params).run();
  
  // 記錄歷史
  const historyStmt = DB.prepare(`
    INSERT INTO multi_stage_task_history (
      task_id, action, old_value, new_value, notes, created_by
    ) VALUES (?, 'updated', ?, ?, ?, ?)
  `);
  await historyStmt.bind(
    taskId, 'task_updated', '', JSON.stringify(data), 
    `更新任務`, username
  ).run();
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 更新階段進度
 */
export async function updateStageProgress(env, taskId, stageNumber, data, username) {
  const { DB } = env;
  const {
    status,
    checklist_data,
    actual_documents,
    completion_notes
  } = data;
  
  let updates = [];
  let params = [];
  
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
    
    if (status === 'in_progress') {
      updates.push('started_at = CURRENT_TIMESTAMP');
    }
    
    if (status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
      updates.push('completed_by = ?');
      params.push(username);
    }
  }
  
  if (checklist_data !== undefined) {
    updates.push('checklist_data = ?');
    params.push(JSON.stringify(checklist_data));
  }
  
  if (actual_documents !== undefined) {
    updates.push('actual_documents = ?');
    params.push(actual_documents);
  }
  
  if (completion_notes !== undefined) {
    updates.push('completion_notes = ?');
    params.push(completion_notes);
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(taskId, stageNumber);
  
  const stmt = DB.prepare(`
    UPDATE client_task_stage_progress
    SET ${updates.join(', ')}
    WHERE task_id = ? AND stage_number = ?
  `);
  
  await stmt.bind(...params).run();
  
  // 如果階段完成，更新任務的當前階段
  if (status === 'completed') {
    const taskStmt = DB.prepare(`
      UPDATE client_multi_stage_tasks
      SET current_stage = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    await taskStmt.bind(stageNumber + 1, taskId).run();
    
    // 檢查是否所有階段都完成
    const checkStmt = DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM client_task_stage_progress
      WHERE task_id = ?
    `);
    const checkResult = await checkStmt.bind(taskId).first();
    
    if (checkResult.total === checkResult.completed) {
      // 所有階段完成，更新任務狀態
      const updateTaskStmt = DB.prepare(`
        UPDATE client_multi_stage_tasks
        SET status = 'completed',
            completed_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      await updateTaskStmt.bind(taskId).run();
    }
  }
  
  // 記錄歷史
  const historyStmt = DB.prepare(`
    INSERT INTO multi_stage_task_history (
      task_id, action, stage_number, new_value, notes, created_by
    ) VALUES (?, 'stage_updated', ?, ?, ?, ?)
  `);
  await historyStmt.bind(
    taskId, stageNumber, status || '', 
    completion_notes || `更新階段 ${stageNumber}`, username
  ).run();
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * 獲取多階段任務統計
 */
export async function getMultiStageTaskStats(env, searchParams) {
  const { DB } = env;
  
  const stmt = DB.prepare(`
    SELECT 
      tt.category,
      cmst.status,
      COUNT(*) as count,
      AVG(cmst.current_stage * 100.0 / cmst.total_stages) as avg_progress
    FROM client_multi_stage_tasks cmst
    LEFT JOIN task_templates tt ON cmst.template_id = tt.id
    GROUP BY tt.category, cmst.status
  `);
  
  const result = await stmt.all();
  
  return new Response(JSON.stringify({ stats: result.results }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

