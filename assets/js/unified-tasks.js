/**
 * 统一任务管理系统
 * 整合所有任务类型到一个界面
 */

// API 基础 URL
const API_BASE = '/api';

// 当前选中的标签
let currentTab = 'all';

// 当前用户信息
let currentUser = null;

/**
 * 初始化
 */
async function initUnifiedTasks() {
  console.log('初始化统一任务管理系统...');
  
  // 获取当前用户信息
  await loadCurrentUser();
  
  // 加载任务列表
  await loadTasks();
  
  // 设置事件监听器
  setupEventListeners();
}

/**
 * 获取当前用户信息
 */
async function loadCurrentUser() {
  try {
    const response = await fetch(`${API_BASE}/verify`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      console.log('当前用户:', currentUser);
    }
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }
}

/**
 * 切换标签
 */
function switchTab(tabName) {
  console.log('切换标签:', tabName);
  currentTab = tabName;
  
  // 更新标签按钮状态
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.closest('.tab-button')?.classList.add('active');
  
  // 加载对应的任务
  loadTasks();
}

/**
 * 加载任务列表
 */
async function loadTasks() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;
  
  container.innerHTML = '<div class="loading">加载中...</div>';
  
  try {
    let tasks = [];
    
    switch (currentTab) {
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
    
    renderTasks(tasks);
  } catch (error) {
    console.error('加载任务失败:', error);
    container.innerHTML = '<div class="error">加载失败，请重试</div>';
  }
}

/**
 * 获取所有任务
 */
async function fetchAllTasks() {
  const response = await fetch(`${API_BASE}/tasks/multi-stage`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  
  if (!response.ok) throw new Error('获取任务失败');
  const data = await response.json();
  return data.tasks || [];
}

/**
 * 获取我的任务
 */
async function fetchMyTasks() {
  const tasks = await fetchAllTasks();
  return tasks.filter(task => 
    task.assigned_user === currentUser?.id || 
    task.assigned_user === currentUser?.username
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
 * 渲染任务列表
 */
function renderTasks(tasks) {
  const container = document.getElementById('tasksContainer');
  
  if (tasks.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无任务</div>';
    return;
  }
  
  container.innerHTML = tasks.map(task => renderTaskCard(task)).join('');
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
function openTaskDetail(taskId) {
  console.log('打开任务详情:', taskId);
  // TODO: 实现侧边面板显示任务详情
  // 暂时使用 alert，未来应实现侧边面板
  alert('任務詳情功能開發中...\n任務 ID: ' + taskId);
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
    const response = await fetch(`${API_BASE}/automated-tasks/preview`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('预览失败');
    const data = await response.json();
    
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
    const response = await fetch(`${API_BASE}/automated-tasks/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) throw new Error('生成失败');
    const data = await response.json();
    
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

/**
 * 工具函数：转义 HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 工具函数：格式化日期
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
}

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

