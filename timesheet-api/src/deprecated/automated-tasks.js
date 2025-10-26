/**
 * 自動任務生成模組
 * 功能：根據客戶服務配置自動生成周期性任務
 */

import { jsonResponse } from './utils.js';

/**
 * 計算下次執行日期
 */
function calculateNextExecutionDate(service, referenceDate = new Date()) {
  const { frequency, execution_day, start_month } = service;
  const result = new Date(referenceDate);
  
  switch (frequency) {
    case 'monthly':
      // 每月執行
      result.setDate(execution_day);
      if (result <= referenceDate) {
        result.setMonth(result.getMonth() + 1);
      }
      break;
      
    case 'bimonthly':
      // 雙月執行（奇數月或偶數月）
      const currentMonth = result.getMonth() + 1;
      const isStartMonthOdd = start_month % 2 === 1;
      const isCurrentMonthMatch = (currentMonth % 2 === 1) === isStartMonthOdd;
      
      result.setDate(execution_day);
      if (!isCurrentMonthMatch || result <= referenceDate) {
        // 找下一個符合的月份
        let nextMonth = currentMonth + 1;
        while ((nextMonth % 2 === 1) !== isStartMonthOdd) {
          nextMonth++;
        }
        result.setMonth(nextMonth - 1);
      }
      break;
      
    case 'quarterly':
      // 季度執行（每3個月）
      const quarterMonths = [start_month, start_month + 3, start_month + 6, start_month + 9]
        .map(m => m > 12 ? m - 12 : m);
      const currentQuarterMonth = result.getMonth() + 1;
      
      result.setDate(execution_day);
      const nextQuarterMonth = quarterMonths.find(m => {
        const testDate = new Date(result);
        testDate.setMonth(m - 1);
        return testDate > referenceDate;
      });
      
      if (nextQuarterMonth) {
        result.setMonth(nextQuarterMonth - 1);
      } else {
        result.setFullYear(result.getFullYear() + 1);
        result.setMonth(quarterMonths[0] - 1);
      }
      break;
      
    case 'biannual':
      // 半年執行
      const biannualMonths = [start_month, start_month + 6]
        .map(m => m > 12 ? m - 12 : m);
      const currentBiannualMonth = result.getMonth() + 1;
      
      result.setDate(execution_day);
      const nextBiannualMonth = biannualMonths.find(m => {
        const testDate = new Date(result);
        testDate.setMonth(m - 1);
        return testDate > referenceDate;
      });
      
      if (nextBiannualMonth) {
        result.setMonth(nextBiannualMonth - 1);
      } else {
        result.setFullYear(result.getFullYear() + 1);
        result.setMonth(biannualMonths[0] - 1);
      }
      break;
      
    case 'annual':
      // 年度執行
      result.setMonth(start_month - 1);
      result.setDate(execution_day);
      if (result <= referenceDate) {
        result.setFullYear(result.getFullYear() + 1);
      }
      break;
  }
  
  return result;
}

/**
 * 計算任務期間標識（用於防止重複生成）
 */
function calculateExecutionPeriod(service, executionDate) {
  const year = executionDate.getFullYear();
  const month = executionDate.getMonth() + 1;
  
  switch (service.frequency) {
    case 'monthly':
    case 'bimonthly':
      return `${year}-${String(month).padStart(2, '0')}`;
      
    case 'quarterly':
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
      
    case 'biannual':
      const half = month <= 6 ? 'H1' : 'H2';
      return `${year}-${half}`;
      
    case 'annual':
      return `${year}`;
      
    default:
      return `${year}-${String(month).padStart(2, '0')}`;
  }
}

/**
 * 獲取服務檢查清單模板
 */
async function getChecklistTemplate(db, serviceType) {
  const template = await db.get(
    `SELECT * FROM service_checklist_templates 
     WHERE service_type = ? AND is_active = 1 AND is_default = 1
     LIMIT 1`,
    [serviceType]
  );
  
  if (!template) {
    return null;
  }
  
  try {
    return JSON.parse(template.checklist_data);
  } catch (e) {
    console.error('解析檢查清單模板失敗:', e);
    return null;
  }
}

/**
 * 創建多階段任務
 */
async function createMultiStageTask(db, service, client, checklistData, executionDate) {
  const dueDate = new Date(executionDate);
  dueDate.setDate(dueDate.getDate() + (service.due_days || 15));
  
  // 服務類型名稱映射
  const serviceTypeNames = {
    accounting: '記帳服務',
    vat: '營業稅申報',
    income_tax: '營所稅申報',
    withholding: '扣繳申報',
    prepayment: '暫繳申報',
    dividend: '盈餘分配',
    nhi: '二代健保補充保費',
    shareholder_tax: '股東可扣抵稅額',
    audit: '財務簽證',
    company_setup: '公司設立登記'
  };
  
  const taskTitle = `${client.name} - ${serviceTypeNames[service.service_type] || service.service_type}`;
  const executionPeriod = calculateExecutionPeriod(service, executionDate);
  
  // 1. 創建主任務
  const taskResult = await db.run(
    `INSERT INTO tasks (
      title, description, status, priority, due_date, 
      assigned_user, created_by, category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      taskTitle,
      `${executionPeriod} - ${taskTitle}`,
      'pending',
      'medium',
      dueDate.toISOString(),
      service.assigned_to,
      service.assigned_to, // 假設由負責人創建
      'client_service'
    ]
  );
  
  const taskId = taskResult.lastID;
  
  // 2. 創建多階段任務
  const totalEstimatedHours = checklistData.reduce(
    (sum, stage) => sum + (stage.estimated_hours || 0), 
    0
  );
  
  const multiStageResult = await db.run(
    `INSERT INTO multi_stage_tasks (
      task_id, total_stages, completed_stages, overall_progress
    ) VALUES (?, ?, 0, 0)`,
    [taskId, checklistData.length]
  );
  
  const multiStageTaskId = multiStageResult.lastID;
  
  // 3. 創建各階段
  for (const stage of checklistData) {
    await db.run(
      `INSERT INTO task_stages (
        multi_stage_task_id, stage_order, stage_name, 
        stage_description, status, checklist, estimated_hours,
        requires_approval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        multiStageTaskId,
        stage.order,
        stage.name,
        stage.description || '',
        'pending',
        JSON.stringify(stage.checklist_items || []),
        stage.estimated_hours || 0,
        stage.requires_approval ? 1 : 0
      ]
    );
  }
  
  // 4. 創建任務執行記錄
  await db.run(
    `INSERT INTO task_execution_log (
      task_id, multi_stage_task_id, client_service_id, 
      execution_period, status, executor_id, actual_hours
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      multiStageTaskId,
      service.id,
      executionPeriod,
      'pending',
      service.assigned_to,
      totalEstimatedHours
    ]
  );
  
  // 5. 記錄生成日誌（防止重複生成）
  await db.run(
    `INSERT INTO task_generation_log (
      client_service_id, execution_period, generated_task_id, generation_method
    ) VALUES (?, ?, ?, ?)`,
    [service.id, executionPeriod, taskId, 'auto']
  );
  
  // 6. 更新服務配置的最後生成時間
  await db.run(
    `UPDATE client_services 
     SET last_generated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [service.id]
  );
  
  return {
    task_id: taskId,
    multi_stage_task_id: multiStageTaskId,
    execution_period: executionPeriod,
    due_date: dueDate
  };
}

/**
 * 檢查是否應該生成任務
 */
async function shouldGenerateTask(db, service, targetDate = new Date()) {
  // 1. 檢查服務是否啟用
  if (!service.is_active) {
    return { should: false, reason: '服務未啟用' };
  }
  
  // 2. 計算下次執行日期
  const nextExecutionDate = calculateNextExecutionDate(service, new Date());
  const executionPeriod = calculateExecutionPeriod(service, nextExecutionDate);
  
  // 3. 檢查是否在提前生成期間內
  const advanceDays = service.advance_days || 7;
  const generateDate = new Date(nextExecutionDate);
  generateDate.setDate(generateDate.getDate() - advanceDays);
  
  if (targetDate < generateDate) {
    return { 
      should: false, 
      reason: `尚未到生成時間（將於 ${generateDate.toISOString().split('T')[0]} 生成）` 
    };
  }
  
  // 4. 檢查該期間是否已生成任務
  const existingTask = await db.get(
    `SELECT * FROM task_generation_log 
     WHERE client_service_id = ? AND execution_period = ?`,
    [service.id, executionPeriod]
  );
  
  if (existingTask) {
    return { 
      should: false, 
      reason: `該期間任務已生成 (${executionPeriod})` 
    };
  }
  
  return { 
    should: true, 
    execution_date: nextExecutionDate,
    execution_period: executionPeriod
  };
}

/**
 * 為單一服務生成任務
 */
async function generateTaskForService(db, serviceId) {
  // 1. 獲取服務配置
  const service = await db.get(
    `SELECT cs.*, u.employee_name as assignee_name
     FROM client_services cs
     LEFT JOIN users u ON cs.assigned_to = u.id
     WHERE cs.id = ?`,
    [serviceId]
  );
  
  if (!service) {
    throw new Error(`找不到服務配置 ID: ${serviceId}`);
  }
  
  // 2. 檢查是否應該生成任務
  const check = await shouldGenerateTask(db, service);
  if (!check.should) {
    return {
      success: false,
      service_id: serviceId,
      reason: check.reason
    };
  }
  
  // 3. 獲取檢查清單模板
  const checklistData = await getChecklistTemplate(db, service.service_type);
  if (!checklistData) {
    throw new Error(`找不到服務類型 ${service.service_type} 的檢查清單模板`);
  }
  
  // 4. 創建多階段任務
  const client = {
    id: service.client_id,
    name: `客戶${service.client_id}` // 簡化：使用 client_id 作為名稱
  };
  
  const taskInfo = await createMultiStageTask(
    db, 
    service, 
    client, 
    checklistData, 
    check.execution_date
  );
  
  return {
    success: true,
    service_id: serviceId,
    task_id: taskInfo.task_id,
    multi_stage_task_id: taskInfo.multi_stage_task_id,
    client_name: client.name,
    service_type: service.service_type,
    assigned_to: service.assignee_name,
    execution_period: taskInfo.execution_period,
    due_date: taskInfo.due_date
  };
}

/**
 * 批量生成任務（主要函數）
 */
export async function generateAutomatedTasks(options = {}) {
  const db = await getDB();
  const {
    targetDate = new Date(),
    serviceType = null,
    clientId = null,
    assignedTo = null
  } = options;
  
  try {
    // 1. 查詢需要生成任務的服務配置
    let query = `
      SELECT cs.*, u.employee_name as assignee_name
      FROM client_services cs
      LEFT JOIN users u ON cs.assigned_to = u.id
      WHERE cs.is_active = 1
    `;
    
    const params = [];
    
    if (serviceType) {
      query += ` AND cs.service_type = ?`;
      params.push(serviceType);
    }
    
    if (clientId) {
      query += ` AND cs.client_id = ?`;
      params.push(clientId);
    }
    
    if (assignedTo) {
      query += ` AND cs.assigned_to = ?`;
      params.push(assignedTo);
    }
    
    const services = await db.all(query, params);
    
    // 2. 為每個服務檢查並生成任務
    const results = {
      total: services.length,
      generated: [],
      skipped: [],
      errors: []
    };
    
    for (const service of services) {
      try {
        const check = await shouldGenerateTask(db, service, targetDate);
        
        if (!check.should) {
          results.skipped.push({
            service_id: service.id,
            client_name: service.client_name,
            service_type: service.service_type,
            reason: check.reason
          });
          continue;
        }
        
        // 獲取檢查清單模板
        const checklistData = await getChecklistTemplate(db, service.service_type);
        if (!checklistData) {
          results.errors.push({
            service_id: service.id,
            error: `找不到服務類型 ${service.service_type} 的檢查清單模板`
          });
          continue;
        }
        
        // 創建任務
        const client = {
          id: service.client_id,
          name: `客戶${service.client_id}` // 簡化：使用 client_id 作為名稱
        };
        
        const taskInfo = await createMultiStageTask(
          db,
          service,
          client,
          checklistData,
          check.execution_date
        );
        
        results.generated.push({
          service_id: service.id,
          task_id: taskInfo.task_id,
          client_name: client.name,
          service_type: service.service_type,
          assigned_to: service.assignee_name,
          execution_period: taskInfo.execution_period,
          due_date: taskInfo.due_date
        });
        
      } catch (error) {
        results.errors.push({
          service_id: service.id,
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    throw new Error(`批量生成任務失敗: ${error.message}`);
  }
}

/**
 * Handler: 批量生成任務
 * POST /api/automated-tasks/generate
 */
export async function handleGenerateAutomatedTasks(env, request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      date = new Date().toISOString(),
      service_type = null,
      client_id = null,
      assigned_to = null
    } = body;
    
    const targetDate = new Date(date);
    
    const results = await generateAutomatedTasks({
      targetDate,
      serviceType: service_type,
      clientId: client_id,
      assignedTo: assigned_to
    });
    
    // 統一使用 jsonResponse 格式
    return jsonResponse({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
    
  } catch (error) {
    console.error('自動任務生成失敗:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Handler: 為特定服務生成任務
 * POST /api/automated-tasks/generate/:service_id
 */
export async function handleGenerateForService(env, serviceId) {
  try {
    const result = await generateTaskForService(env.DB, serviceId);
    
    return jsonResponse({
      success: true,
      result
    });
    
  } catch (error) {
    console.error(`為服務 ${serviceId} 生成任務失敗:`, error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

/**
 * Handler: 預覽待生成任務
 * GET /api/automated-tasks/preview
 */
export async function handlePreviewAutomatedTasks(env, request) {
  try {
    const url = new URL(request.url);
    const targetDate = new Date(url.searchParams.get('date') || new Date());
    
    const services = await env.DB.prepare(
      `SELECT cs.*, u.employee_name as assignee_name
       FROM client_services cs
       LEFT JOIN users u ON cs.assigned_to = u.id
       WHERE cs.is_active = 1`
    ).all();
    
    const serviceList = services.results || [];
    
    const preview = [];
    for (const service of serviceList) {
      const check = await shouldGenerateTask(env.DB, service, targetDate);
      if (check.should) {
        preview.push({
          service_id: service.id,
          client_name: service.client_name,
          service_type: service.service_type,
          assigned_to: service.assignee_name,
          execution_date: check.execution_date,
          execution_period: check.execution_period
        });
      }
    }
    
    return jsonResponse({
      success: true,
      preview_date: targetDate.toISOString(),
      tasks_to_generate: preview.length,
      tasks: preview
    });
    
  } catch (error) {
    console.error('預覽待生成任務失敗:', error);
    return jsonResponse({
      success: false,
      error: error.message
    }, 500);
  }
}

