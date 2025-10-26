/**
 * 统一任务管理系统
 * 整合所有任务类型到一个界面
 */

// 使用共用模組的全局變量
let currentTab = 'all';

/**
 * 初始化
 */
async function initUnifiedTasks() {
  console.log('初始化统一任务管理系统...');
  
  // 等待 currentUser 設定完成
  let retries = 0;
  while (!window.currentUser && retries < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }
  
  if (!window.currentUser) {
    console.error('無法取得使用者資料，請重新整理頁面');
    showNotification('無法取得使用者資料，請重新整理頁面', 'error');
    return;
  }
  
  // 加载任务列表
  await loadTasks();
  
  // 设置事件监听器
  setupEventListeners();
}

// 移除重複的 loadCurrentUser 函數，使用 auth-common.js 提供的 checkAuth

/**
 * 切换标签
 */
function switchTab(tabName) {
  currentTab = tabName;
  updateActiveTab(tabName);

  if (tabName === 'config') {
    loadServiceConfig();
  } else {
    loadTasks(tabName);
  }
}

/**
 * 加载任务列表
 */
async function loadTasks(tabName) {
  const containerId = `${tabName}TasksContainer`;
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Container not found for tab: ${tabName} (expected ID: ${containerId})`);
    return;
  }

  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">載入任務中...</div>
    </div>
  `;

  try {
    let tasks = [];
    
    switch (tabName) {
      case 'all':
        tasks = await fetchAllTasks();
        break;
      case 'my-tasks':
        tasks = await fetchMyTasks();
        break;
      case 'recurring':
        tasks = await fetchRecurringTasks();
        break;
      case 'business':
        tasks = await fetchBusinessTasks();
        break;
      case 'finance':
        tasks = await fetchFinanceTasks();
        break;
      case 'client-service':
        tasks = await fetchClientServiceTasks();
        break;
      case 'config':
        await loadServiceConfig();
        return;
    }
    
    renderTasks(tasks, container);
  } catch (error) {
    console.error(`Error loading tasks for tab ${tabName}:`, error);
    container.innerHTML = '<div class="error-message">載入任務失敗，請稍後再試。</div>';
  }
}

/**
 * 获取所有任务（使用共用的 apiRequest）
 */
async function fetchAllTasks() {
  const data = await apiRequest('/api/tasks/multi-stage');
  return data.tasks || data.data || data || [];
}

/**
 * 获取我的任务
 */
async function fetchMyTasks() {
  const tasks = await fetchAllTasks();
  const user = window.currentUser;
  if (!user) return [];
  return tasks.filter(task => 
    task.assigned_user === user.id || 
    task.assigned_user === user.username ||
    task.assigned_to === user.username ||
    task.assigned_to === user.employee_name
  );
}

/**
 * 获取周期任务
 */
async function fetchRecurringTasks() {
  const tasks = await fetchAllTasks();
  return tasks.filter(task => task.category === 'recurring');
}

/**
 * 获取工商任务
 */
async function fetchBusinessTasks() {
  const tasks = await fetchAllTasks();
  return tasks.filter(task => task.category === 'business');
}

/**
 * 获取财税任务
 */
async function fetchFinanceTasks() {
  const tasks = await fetchAllTasks();
  return tasks.filter(task => task.category === 'finance');
}

/**
 * 获取客户服务任务
 */
async function fetchClientServiceTasks() {
  const tasks = await fetchAllTasks();
  return tasks.filter(task => task.category === 'client_service');
}

/**
 * 任務範本市場功能
 */

// 打開範本市場
async function openTemplateMarket() {
  try {
    const data = await apiRequest('/api/multi-stage-templates');
    const templates = data.templates || data || [];
    
    // 創建模態框
    const modal = createTemplateMarketModal(templates);
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('打開範本市場失敗:', error);
    alert('無法載入範本市場');
  }
}

// 創建範本市場模態框
function createTemplateMarketModal(templates) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'templateMarketModal';
  
  const categoryGroups = {
    business: [],
    finance: [],
    recurring: [],
    general: []
  };
  
  templates.forEach(t => {
    const cat = t.category || 'general';
    if (categoryGroups[cat]) {
      categoryGroups[cat].push(t);
    }
  });
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
      <div class="modal-header">
        <h2>📚 任務範本市場</h2>
        <button class="btn-close" onclick="closeTemplateMarket()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">
        <p style="margin-bottom: 20px; color: #666;">
          選擇範本快速創建標準化任務，或複製範本進行客製化
        </p>
        
        ${Object.entries(categoryGroups).map(([cat, temps]) => {
          if (temps.length === 0) return '';
          
          const categoryNames = {
            business: '工商登記',
            finance: '財稅簽證',
            recurring: '周期任務',
            general: '一般任務'
          };
          
          return `
            <div class="template-category">
              <h3>${categoryNames[cat]}</h3>
              <div class="template-grid">
                ${temps.map(t => `
                  <div class="template-card" data-template-id="${t.id}">
                    <div class="template-header">
                      <h4>${t.template_name}</h4>
                      <span class="badge">${t.total_stages} 階段</span>
                    </div>
                    <p class="template-description">${t.description || '無描述'}</p>
                    <div class="template-footer">
                      <button class="btn btn-sm btn-secondary" onclick="previewTemplate(${t.id})">
                        <span class="material-symbols-outlined">visibility</span>
                        預覽
                      </button>
                      <button class="btn btn-sm btn-primary" onclick="useTemplate(${t.id})">
                        <span class="material-symbols-outlined">add</span>
                        使用
                      </button>
                      <button class="btn btn-sm btn-outline" onclick="copyTemplate(${t.id})">
                        <span class="material-symbols-outlined">content_copy</span>
                        複製編輯
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  return modal;
}

// 關閉範本市場
window.closeTemplateMarket = function() {
  const modal = document.getElementById('templateMarketModal');
  if (modal) {
    modal.remove();
  }
};

// 預覽範本
window.previewTemplate = async function(templateId) {
  try {
    const data = await apiRequest(`/api/multi-stage-templates/${templateId}/stages`);
    const stages = data.stages || [];
    
    // 創建預覽對話框
    const previewModal = document.createElement('div');
    previewModal.className = 'modal-overlay';
    previewModal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h3>範本預覽</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="stage-timeline-preview">
            ${stages.map((stage, index) => `
              <div class="stage-preview-item">
                <div class="stage-number">${index + 1}</div>
                <div class="stage-details">
                  <h4>${stage.stage_name}</h4>
                  <p>${stage.stage_description || ''}</p>
                  <div class="stage-meta">
                    <span>⏱️ ${stage.estimated_hours || 0}h</span>
                    ${stage.requires_approval ? '<span>✓ 需審核</span>' : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <strong>總預估工時:</strong> ${stages.reduce((sum, s) => sum + (s.estimated_hours || 0), 0)}小時
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="useTemplate(${templateId}); this.closest('.modal-overlay').remove();">
            使用此範本
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
            關閉
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(previewModal);
    
  } catch (error) {
    console.error('預覽範本失敗:', error);
    alert('無法預覽範本');
  }
};

// 使用範本創建任務
window.useTemplate = function(templateId) {
  // 關閉市場
  closeTemplateMarket();
  
  // 打開創建任務對話框，預選範本
  openCreateTaskDialog(templateId);
};

// 複製範本進行編輯
window.copyTemplate = function(templateId) {
  // 關閉市場
  closeTemplateMarket();
  
  // 打開編輯器
  openTemplateEditor(templateId, true);
};

/**
 * 拖拽式範本編輯器
 */
async function openTemplateEditor(templateId, isCopy = false) {
  try {
    const data = await apiRequest(`/api/multi-stage-templates/${templateId}/stages`);
    const stages = data.stages || [];
    showTemplateEditor(templateId, stages, isCopy);
  } catch (error) {
    console.error('獲取範本失敗:', error);
    showNotification('無法載入範本', 'error');
  }
}

function showTemplateEditor(templateId, stages, isCopy) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'templateEditorModal';
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 1000px; max-height: 90vh;">
      <div class="modal-header">
        <h2>✏️ 範本編輯器 ${isCopy ? '(複製)' : ''}</h2>
        <button class="btn-close" onclick="closeTemplateEditor()">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body" style="overflow-y: auto; max-height: calc(90vh - 200px);">
        <div class="editor-container">
          <div class="editor-header">
            <div class="form-group">
              <label>範本名稱</label>
              <input type="text" id="templateName" class="form-control" 
                     value="${isCopy ? '複製 - ' : ''}範本名稱" placeholder="輸入範本名稱">
            </div>
            <div class="form-group">
              <label>分類</label>
              <select id="templateCategory" class="form-control">
                <option value="business">工商登記</option>
                <option value="finance">財稅簽證</option>
                <option value="recurring">周期任務</option>
                <option value="general">一般任務</option>
              </select>
            </div>
          </div>
          
          <div class="stages-editor" id="stagesEditor">
            <h3>階段列表 <span style="font-size: 14px; color: #666;">（可拖拽調整順序）</span></h3>
            <div class="stages-list" id="stagesList">
              ${stages.map((stage, index) => createStageEditorItem(stage, index)).join('')}
            </div>
            <button class="btn btn-outline" onclick="addNewStage()">
              <span class="material-symbols-outlined">add</span>
              新增階段
            </button>
          </div>
          
          <div class="editor-help">
            <p><strong>💡 提示：</strong></p>
            <ul>
              <li>拖拽階段卡片左側的 ⋮⋮ 圖示可調整順序</li>
              <li>點擊 ✏️ 可編輯階段詳情和檢查清單</li>
              <li>勾選「需審核」的階段會在完成時要求主管確認</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeTemplateEditor()">取消</button>
        <button class="btn btn-primary" onclick="saveTemplate(${templateId}, ${isCopy})">
          ${isCopy ? '另存新範本' : '儲存範本'}
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 初始化拖拽功能
  initDragAndDrop();
}

// 創建階段編輯項目
function createStageEditorItem(stage, index) {
  return `
    <div class="stage-editor-item" draggable="true" data-stage-index="${index}">
      <div class="drag-handle" title="拖拽調整順序">
        <span class="material-symbols-outlined">drag_indicator</span>
      </div>
      <div class="stage-info">
        <div class="stage-number">${index + 1}</div>
        <input type="text" class="stage-name-input" value="${stage.stage_name || ''}" 
               placeholder="階段名稱">
        <input type="number" class="stage-hours-input" value="${stage.estimated_hours || 0}" 
               min="0" step="0.5" placeholder="工時">
        <label class="checkbox-label">
          <input type="checkbox" class="stage-approval-check" 
                 ${stage.requires_approval ? 'checked' : ''}>
          需審核
        </label>
      </div>
      <div class="stage-actions">
        <button class="btn-icon" onclick="editStageDetail(${index})" title="編輯詳情">
          <span class="material-symbols-outlined">edit_note</span>
        </button>
        <button class="btn-icon" onclick="deleteStage(${index})" title="刪除階段">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  `;
}

// 初始化拖拽功能
function initDragAndDrop() {
  const stagesList = document.getElementById('stagesList');
  if (!stagesList) return;
  
  let draggedElement = null;
  
  stagesList.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('stage-editor-item')) {
      draggedElement = e.target;
      e.target.style.opacity = '0.5';
    }
  });
  
  stagesList.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('stage-editor-item')) {
      e.target.style.opacity = '1';
    }
  });
  
  stagesList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(stagesList, e.clientY);
    if (afterElement == null) {
      stagesList.appendChild(draggedElement);
    } else {
      stagesList.insertBefore(draggedElement, afterElement);
    }
    
    // 重新編號
    updateStageNumbers();
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.stage-editor-item:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function updateStageNumbers() {
  const stageItems = document.querySelectorAll('.stage-editor-item');
  stageItems.forEach((item, index) => {
    const numberEl = item.querySelector('.stage-number');
    if (numberEl) {
      numberEl.textContent = index + 1;
    }
    item.dataset.stageIndex = index;
  });
}

// 新增階段
window.addNewStage = function() {
  const stagesList = document.getElementById('stagesList');
  const currentCount = stagesList.querySelectorAll('.stage-editor-item').length;
  
  const newStage = {
    stage_name: '',
    estimated_hours: 0,
    requires_approval: false
  };
  
  const newItem = document.createElement('div');
  newItem.innerHTML = createStageEditorItem(newStage, currentCount);
  stagesList.appendChild(newItem.firstElementChild);
  
  // 重新初始化拖拽
  initDragAndDrop();
};

// 刪除階段
window.deleteStage = function(index) {
  if (!confirm('確定要刪除此階段？')) return;
  
  const stagesList = document.getElementById('stagesList');
  const items = stagesList.querySelectorAll('.stage-editor-item');
  if (items[index]) {
    items[index].remove();
    updateStageNumbers();
  }
};

// 編輯階段詳情
window.editStageDetail = function(index) {
  // 打開階段詳情編輯對話框
  alert('階段詳情編輯功能開發中');
};

// 儲存範本
window.saveTemplate = async function(templateId, isCopy) {
  try {
    const stagesList = document.getElementById('stagesList');
    const stageItems = stagesList.querySelectorAll('.stage-editor-item');
    
    const stages = Array.from(stageItems).map((item, index) => ({
      stage_order: index + 1,
      stage_name: item.querySelector('.stage-name-input').value,
      estimated_hours: parseFloat(item.querySelector('.stage-hours-input').value) || 0,
      requires_approval: item.querySelector('.stage-approval-check').checked
    }));
    
    const templateData = {
      template_name: document.getElementById('templateName').value,
      category: document.getElementById('templateCategory').value,
      total_stages: stages.length,
      stages: stages
    };
    
    // TODO: 實際保存到後端
    console.log('保存範本:', templateData);
    alert('範本儲存功能開發中');
    
    closeTemplateEditor();
    
  } catch (error) {
    console.error('儲存範本失敗:', error);
    alert('儲存失敗');
  }
};

window.closeTemplateEditor = function() {
  const modal = document.getElementById('templateEditorModal');
  if (modal) {
    modal.remove();
  }
};

/**
 * 渲染任务列表
 */
function renderTasks(tasks, container) {
  if (!container) {
    console.error('Render container is not specified.');
    return;
  }

  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="material-symbols-outlined">inbox</span><p>目前沒有任何任務</p></div>';
    return;
  }

  const tasksHtml = tasks.map(task => renderTaskCard(task)).join('');
  container.innerHTML = tasksHtml;
}

/**
 * 渲染单个任务卡片
 */
function renderTaskCard(task) {
  const categoryNames = {
    'recurring': '周期任务',
    'business': '工商登记',
    'finance': '财税签证',
    'client_service': '客户服务'
  };
  
  const statusNames = {
    'pending': '未开始',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  
  const categoryName = categoryNames[task.category] || task.category;
  const statusName = statusNames[task.status] || task.status;
  
  // 计算进度百分比
  const progress = task.completed_stages && task.total_stages 
    ? Math.round((task.completed_stages / task.total_stages) * 100)
    : 0;
  
  return `
    <div class="task-card" onclick="openTaskDetail(${task.id})">
      <div class="task-header">
        <div>
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <div class="task-meta">
            <span class="category-badge">${categoryName}</span>
            ${task.difficulty_level ? `<span class="difficulty-badge level-${task.difficulty_level}">${'⭐'.repeat(task.difficulty_level)}</span>` : ''}
            ${task.assigned_user ? `<span>负责：${escapeHtml(task.assigned_user)}</span>` : ''}
            ${task.due_date ? `<span>截止：${formatDate(task.due_date)}</span>` : ''}
          </div>
        </div>
        <span class="status-badge ${task.status}">${statusName}</span>
      </div>
      
      ${task.total_stages ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
          <span class="progress-text">${task.completed_stages || 0}/${task.total_stages} 阶段</span>
        </div>
      ` : ''}
      
      ${task.description ? `
        <p class="task-description">${escapeHtml(task.description)}</p>
      ` : ''}
    </div>
  `;
}

/**
 * 打开任务详情
 */
async function openTaskDetail(taskId) {
  const panel = document.getElementById('taskDetailPanel');
  const content = document.getElementById('taskDetailContent');
  if (!panel || !content) { alert('無法顯示詳情'); return; }
  panel.classList.add('active');
  panel.style.right = '0';
  content.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">載入任務詳情中...</div>
    </div>
  `;
  try {
    const data = await apiRequest(`/api/tasks/multi-stage/${taskId}`);
    const task = data.task || data;
    const stages = data.stages || [];
    let html = `
      <div class="task-detail-header">
        <h3>${escapeHtml(task.task_name || task.title || '未命名任務')}</h3>
        <div class="task-detail-meta">
          <span class="category-badge">${escapeHtml(task.category || '一般任務')}</span>
          <span class="status-badge status-${task.status}">${getStatusText(task.status)}</span>
        </div>
      </div>
      ${task.client_name ? `
        <div class="detail-section">
          <label>客戶</label>
          <p>${escapeHtml(task.client_name)}</p>
        </div>` : ''}
      ${task.assigned_to ? `
        <div class="detail-section">
          <label>負責人</label>
          <p>${escapeHtml(task.assigned_to)}</p>
        </div>` : ''}
      ${task.due_date ? `
        <div class="detail-section">
          <label>截止日期</label>
          <p>${formatDate(task.due_date)}</p>
        </div>` : ''}
      ${stages.length > 0 ? `
        <div class="detail-section">
          <label>執行階段 (${task.current_stage || 1}/${task.total_stages || stages.length})</label>
          <div class="stages-timeline">
            ${stages.map((stage, index) => `
              <div class="stage-detail-item ${stage.status}">
                <div class="stage-number">${index + 1}</div>
                <div class="stage-info">
                  <h4>${escapeHtml(stage.stage_name)}</h4>
                  ${stage.stage_description ? `<p>${escapeHtml(stage.stage_description)}</p>` : ''}
                  ${stage.estimated_hours ? `<span>預估: ${stage.estimated_hours}h</span>` : ''}
                  ${stage.status === 'completed' ? `<span class="completed-badge">✓ 已完成</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
      ${task.notes ? `
        <div class="detail-section">
          <label>備註</label>
          <p>${escapeHtml(task.notes)}</p>
        </div>` : ''}
      <div class="detail-actions">
        <button class="btn btn-secondary" onclick="closeTaskDetail()">關閉</button>
      </div>
    `;
    content.innerHTML = html;
  } catch (err) {
    content.innerHTML = `<div style="text-align:center;padding:40px;color:#999;">載入失敗</div>`;
  }
}

function closeTaskDetail() {
  const panel = document.getElementById('taskDetailPanel');
  if (panel) panel.classList.remove('active');
}

/**
 * 加载服务配置
 */
async function loadServiceConfig() {
  const container = document.getElementById('tasksContainer');
  container.innerHTML = '<div class="loading">加载配置中...</div>';
  
  try {
    // TODO: 实现服务配置加载
    container.innerHTML = `
      <div class="config-section">
        <h2>📅 客户服务配置</h2>
        <p>服务配置管理功能开发中...</p>
        <button onclick="previewAutomatedTasks()" class="btn-primary">预览待生成任务</button>
        <button onclick="generateAutomatedTasks()" class="btn-primary">立即生成任务</button>
      </div>
    `;
  } catch (error) {
    console.error('加载配置失败:', error);
    container.innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 预览自动任务
 */
async function previewAutomatedTasks() {
  try {
    const data = await apiRequest('/api/automated-tasks/preview');
    
    alert(`将生成 ${data.tasks_to_generate} 个任务\n\n` + 
          data.tasks.map(t => `- ${t.client_name}: ${t.service_type}`).join('\n'));
  } catch (error) {
    console.error('预览失败:', error);
    alert('预览失败: ' + error.message);
  }
}

/**
 * 生成自动任务
 */
async function generateAutomatedTasks() {
  if (!confirm('确定要生成任务吗？')) return;
  
  try {
    const data = await apiRequest('/api/automated-tasks/generate', { method: 'POST' });
    
    alert(`成功生成 ${data.results.generated.length} 个任务\n` +
          `跳过 ${data.results.skipped.length} 个\n` +
          `错误 ${data.results.errors.length} 个`);
    
    // 刷新任务列表
    loadTasks();
  } catch (error) {
    console.error('生成失败:', error);
    alert('生成失败: ' + error.message);
  }
}

/**
 * 搜索任务
 */
function searchTasks() {
  const searchInput = document.getElementById('searchInput');
  const keyword = searchInput?.value.toLowerCase() || '';
  
  const taskCards = document.querySelectorAll('.task-card');
  taskCards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(keyword) ? 'block' : 'none';
  });
}

/**
 * 筛选任务
 */
function filterTasks() {
  const statusFilter = document.getElementById('statusFilter');
  const status = statusFilter?.value || '';
  
  const taskCards = document.querySelectorAll('.task-card');
  taskCards.forEach(card => {
    if (!status) {
      card.style.display = 'block';
      return;
    }
    
    const statusBadge = card.querySelector('.status-badge');
    const hasStatus = statusBadge?.classList.contains(status);
    card.style.display = hasStatus ? 'block' : 'none';
  });
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 標籤按鈕切換
  const tabButtons = document.querySelectorAll('.tab-button[onclick*="switchTab"]');
  tabButtons.forEach(btn => {
    // 從 onclick 屬性取得標籤名稱
    const onclickAttr = btn.getAttribute('onclick');
    const match = onclickAttr?.match(/switchTab\(['"](.+?)['"]\)/);
    if (match) {
      const tabName = match[1];
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentTab = tabName;
        
        // 更新按鈕狀態
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新標籤內容顯示
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.remove('active');
        });
        
        const contentMap = {
          'all': 'all-tab',
          'my-tasks': 'my-tasks-tab',
          'recurring': 'recurring-tab',
          'business': 'business-tab',
          'finance': 'finance-tab',
          'client-service': 'client-service-tab',
          'config': 'config-tab'
        };
        
        const targetTab = document.getElementById(contentMap[tabName]);
        if (targetTab) {
          targetTab.classList.add('active');
        }
        
        // 載入任務
        loadTasks(tabName);
      });
    }
  });
  
  // 搜索输入
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', searchTasks);
  }
  
  // 状态筛选
  const statusFilter = document.getElementById('statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', filterTasks);
  }
}

// escapeHtml 和 formatDate 已在 common-utils.js 中提供，此處移除重複定義

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUnifiedTasks);
} else {
  initUnifiedTasks();
}

// 导出函数供全局使用
window.switchTab = switchTab;
window.openTaskDetail = openTaskDetail;
window.searchTasks = searchTasks;
window.filterTasks = filterTasks;
window.previewAutomatedTasks = previewAutomatedTasks;
window.generateAutomatedTasks = generateAutomatedTasks;
window.closeTaskDetail = closeTaskDetail;

