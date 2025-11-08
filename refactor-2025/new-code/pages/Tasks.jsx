import React, { useState, useEffect, useMemo } from 'react';

/**
 * Tasks页面主组件
 * 功能：任务管理，按客户和服务分组显示任务
 */
export function Tasks() {
  // API基础URL配置
  const apiBase = window.location.hostname.endsWith('horgoscpa.com')
    ? '/internal/api/v1'
    : 'https://www.horgoscpa.com/internal/api/v1';

  // 状态管理
  const [allTasks, setAllTasks] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [allServiceItems, setAllServiceItems] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());
  const [error, setError] = useState('');
  
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterTags, setFilterTags] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDue, setFilterDue] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(true);
  
  // 折叠状态
  const [collapsedClients, setCollapsedClients] = useState(new Set());
  const [collapsedServices, setCollapsedServices] = useState(new Set());
  
  // 批量分配弹窗状态
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchAssignee, setBatchAssignee] = useState('');
  
  // 快速新增任务弹窗状态
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddContext, setQuickAddContext] = useState(null);
  const [quickTaskName, setQuickTaskName] = useState('');
  const [quickAssignee, setQuickAssignee] = useState('');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickPrerequisite, setQuickPrerequisite] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [quickAdjustSubsequent, setQuickAdjustSubsequent] = useState(true);
  const [quickDelayDays, setQuickDelayDays] = useState(1);

  // 状态中文映射
  const zhStatus = { 
    in_progress: '進行中', 
    completed: '已完成', 
    cancelled: '已取消' 
  };

  // 初始化：设置默认年份（当前年）
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    setFilterYear(String(currentYear));
  }, []);

  // 初始化：加载数据
  useEffect(() => {
    Promise.all([
      loadEmployees(),
      loadAllClients(),
      loadAllTags(),
      loadServiceItems(),
    ]).then(() => {
      loadAllTasks();
    });
  }, []);

  // 当年月筛选变化时重新加载任务
  useEffect(() => {
    if (filterYear) {
      loadAllTasks();
    }
  }, [filterYear, filterMonth]);

  // 加载员工
  async function loadEmployees() {
    try {
      const res = await fetch(`${apiBase}/users`, { credentials: 'include' });
      if (res.status === 401) {
        location.href = '/login?redirect=/internal/tasks';
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setEmployeesList(json.data || []);
      }
    } catch (e) {
      console.error('載入員工失敗', e);
    }
  }

  // 加载客户
  async function loadAllClients() {
    try {
      const res = await fetch(`${apiBase}/clients?perPage=1000`, { 
        credentials: 'include' 
      });
      if (res.status === 401) {
        location.href = '/login?redirect=/internal/tasks';
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setAllClients(json.data || []);
      }
    } catch (e) {
      console.error('載入客戶失敗', e);
    }
  }

  // 加载标签
  async function loadAllTags() {
    try {
      const res = await fetch(`${apiBase}/tags`, { credentials: 'include' });
      if (res.status === 401) {
        location.href = '/login?redirect=/internal/tasks';
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setAllTags(json.data || []);
      }
    } catch (e) {
      console.error('載入標籤失敗', e);
    }
  }

  // 加载服务项目
  async function loadServiceItems() {
    try {
      const res = await fetch(`${apiBase}/settings/service-items`, { 
        credentials: 'include' 
      });
      if (res.status === 401) {
        location.href = '/login?redirect=/internal/tasks';
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setAllServiceItems(json.data || []);
      }
    } catch (e) {
      console.error('載入服務項目失敗', e);
    }
  }

  // 加载任务
  async function loadAllTasks() {
    try {
      const params = new URLSearchParams({ perPage: '1000' });
      
      // 年月筛选
      if (filterYear !== 'all') params.append('service_year', filterYear);
      if (filterMonth !== 'all') params.append('service_month', filterMonth);
      
      const res = await fetch(`${apiBase}/tasks?${params}`, { 
        credentials: 'include' 
      });
      if (res.status === 401) {
        location.href = '/login?redirect=/internal/tasks';
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setAllTasks(json.data || []);
        setError('');
      }
    } catch (e) {
      console.error('載入任務失敗', e);
      setError('載入失敗');
    }
  }

  // 筛选任务
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      // 搜索
      const q = searchQuery.toLowerCase();
      if (q) {
        const matchName = task.taskName?.toLowerCase().includes(q);
        const matchClient = task.clientName?.toLowerCase().includes(q);
        const matchTaxId = task.clientTaxId?.includes(q);
        if (!matchName && !matchClient && !matchTaxId) return false;
      }
      
      // 负责人
      if (filterAssignee !== 'all' && 
          String(task.assigneeUserId) !== filterAssignee) {
        return false;
      }
      
      // 状态
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      
      // 到期
      if (filterDue === 'soon') {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (diff > 3 || diff < 0) return false;
      } else if (filterDue === 'overdue') {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        if (dueDate >= today || task.status === 'completed') return false;
      }
      
      return true;
    });
  }, [allTasks, searchQuery, filterAssignee, filterStatus, filterDue]);

  // 按客户和服务+月份分组
  const groupedTasks = useMemo(() => {
    const grouped = new Map();
    
    // 先添加所有客户（按公司名排序）
    const sortedClients = [...allClients].sort((a, b) => 
      a.companyName.localeCompare(b.companyName, 'zh-TW')
    );
    
    sortedClients.forEach(client => {
      grouped.set(client.clientId, {
        clientId: client.clientId,
        clientName: client.companyName,
        clientTaxId: client.taxRegistrationNumber || '—',
        serviceGroups: new Map()
      });
    });
    
    // 添加任务（按服务+月份分组）
    filteredTasks.forEach(task => {
      const clientId = task.clientId;
      if (!grouped.has(clientId)) {
        grouped.set(clientId, {
          clientId,
          clientName: task.clientName,
          clientTaxId: task.clientTaxId || '—',
          serviceGroups: new Map()
        });
      }
      
      const client = grouped.get(clientId);
      const serviceName = task.serviceName || '未分类';
      const serviceMonth = task.serviceMonth || '';
      const groupKey = serviceMonth ? `${serviceName}|||${serviceMonth}` : serviceName;
      
      if (!client.serviceGroups.has(groupKey)) {
        client.serviceGroups.set(groupKey, {
          serviceName,
          serviceMonth,
          clientServiceId: task.clientServiceId,
          serviceId: task.serviceId,
          clientId,
          tasks: []
        });
      }
      
      client.serviceGroups.get(groupKey).tasks.push(task);
    });
    
    // 如果勾选"隐藏已完成"，过滤掉全部完成的组
    if (hideCompleted) {
      grouped.forEach(client => {
        const filteredGroups = new Map();
        
        client.serviceGroups.forEach((group, key) => {
          const hasIncomplete = group.tasks.some(t => t.status !== 'completed');
          if (hasIncomplete) {
            filteredGroups.set(key, group);
          }
        });
        
        client.serviceGroups = filteredGroups;
      });
    }
    
    // 排序服务组
    grouped.forEach(client => {
      const sortedGroups = new Map(
        [...client.serviceGroups.entries()].sort((a, b) => {
          // 先按服务名排序
          const serviceCompare = a[1].serviceName.localeCompare(
            b[1].serviceName, 
            'zh-TW'
          );
          if (serviceCompare !== 0) return serviceCompare;
          
          // 再按月份降序排序（最新月份在前）
          return (b[1].serviceMonth || '').localeCompare(
            a[1].serviceMonth || ''
          );
        })
      );
      
      client.serviceGroups = sortedGroups;
    });
    
    return grouped;
  }, [allClients, filteredTasks, hideCompleted]);

  // 切换客户折叠状态
  function toggleClient(clientId) {
    setCollapsedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  // 切换服务折叠状态
  function toggleService(groupId) {
    setCollapsedServices(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  // 切换任务选择
  function toggleTaskSelection(taskId, checked) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  }

  // 打开快速新增任务
  function openQuickAddTask(clientId, clientServiceId, serviceId, serviceName, serviceMonth, event) {
    event.stopPropagation();
    
    // 找出该服务组下的所有任务（用于前置任务选择）
    const sameServiceTasks = allTasks.filter(t => 
      t.clientId === clientId && 
      t.serviceName === serviceName && 
      t.serviceMonth === serviceMonth &&
      t.status !== 'cancelled'
    );
    
    // 构建任务依赖关系图（用于检测后续任务）
    const taskDependencyMap = new Map(); // taskId -> [依赖它的任务列表]
    sameServiceTasks.forEach(task => {
      if (task.prerequisiteTaskId) {
        if (!taskDependencyMap.has(task.prerequisiteTaskId)) {
          taskDependencyMap.set(task.prerequisiteTaskId, []);
        }
        taskDependencyMap.get(task.prerequisiteTaskId).push(task);
      }
    });
    
    // 设置上下文
    setQuickAddContext({ 
      clientId, 
      clientServiceId, 
      serviceId, 
      serviceName, 
      serviceMonth,
      sameServiceTasks,
      taskDependencyMap,
      selectedSOPs: [],
      affectedTasks: []
    });
    
    // 清空表单
    setQuickTaskName('');
    setQuickAssignee('');
    setQuickDueDate('');
    setQuickPrerequisite('');
    setQuickNotes('');
    setQuickAdjustSubsequent(true);
    setQuickDelayDays(1);
    
    setShowQuickAddModal(true);
  }

  // 关闭快速新增任务弹窗
  function closeQuickAddModal() {
    setShowQuickAddModal(false);
    setQuickAddContext(null);
  }

  // 检查受影响的后续任务
  const affectedTasksInfo = useMemo(() => {
    if (!quickAddContext || !quickPrerequisite || !quickDueDate) {
      return { conflictTasks: [], allAffectedTasks: [] };
    }
    
    // 找出所有依赖选中的前置任务的后续任务
    const affectedTasks = quickAddContext.taskDependencyMap.get(quickPrerequisite) || [];
    
    // 检查哪些后续任务的到期日早于或等于新任务的到期日
    const conflictTasks = affectedTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) <= new Date(quickDueDate);
    });
    
    return { conflictTasks, allAffectedTasks: affectedTasks };
  }, [quickAddContext, quickPrerequisite, quickDueDate]);

  // 提交快速新增任务
  async function submitQuickTask() {
    if (!quickAddContext) return;
    
    const taskName = quickTaskName.trim();
    if (!taskName) {
      alert('請輸入任務名稱');
      return;
    }
    
    const assigneeUserId = quickAssignee || null;
    const dueDate = quickDueDate || null;
    const prerequisiteTaskId = quickPrerequisite || null;
    const notes = quickNotes.trim() || null;
    
    // TODO: 继续实现提交逻辑（下一段）
    console.log('提交快速新增任务', {
      taskName,
      assigneeUserId,
      dueDate,
      prerequisiteTaskId,
      notes,
      adjustSubsequent: quickAdjustSubsequent,
      delayDays: quickDelayDays,
      conflictTasks: affectedTasksInfo.conflictTasks
    });
  }

  // 获取状态样式
  function getStatusStyle(status) {
    const styles = {
      'in_progress': 'background:#fef3c7;color:#d97706;',
      'completed': 'background:#d1fae5;color:#059669;',
      'cancelled': 'background:#fee2e2;color:#dc2626;'
    };
    return styles[status] || styles['in_progress'];
  }

  // 生成年份选项（最近5年）
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, []);

  // 批量分配处理
  async function handleBatchAssign() {
    if (!batchAssignee) {
      alert('請選擇負責人');
      return;
    }
    
    try {
      const tasks = Array.from(selectedTaskIds);
      await Promise.all(tasks.map(taskId =>
        fetch(`${apiBase}/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ assignee_user_id: parseInt(batchAssignee) })
        })
      ));
      
      alert('已成功分配');
      setSelectedTaskIds(new Set());
      setShowBatchModal(false);
      setBatchAssignee('');
      await loadAllTasks();
    } catch (e) {
      alert('分配失敗');
    }
  }

  // 渲染客户列表
  function renderClients() {
    const clients = Array.from(groupedTasks.entries());
    
    if (clients.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#9ca3af'
        }}>
          沒有符合條件的任務
        </div>
      );
    }
    
    return clients.map(([clientId, client]) => {
      const hasGroups = client.serviceGroups.size > 0;
      const clientIdSafe = clientId.replace(/[^a-zA-Z0-9]/g, '_');
      const isCollapsed = !collapsedClients.has(clientIdSafe);
      
      return (
        <div key={clientId} className="client-group">
          <div 
            className="client-header" 
            onClick={() => toggleClient(clientIdSafe)}
          >
            <span style={{ fontSize: '16px' }}>
              {isCollapsed ? '▶' : '▼'}
            </span>
            <strong style={{ fontSize: '16px', color: '#1f2937' }}>
              {client.clientName} {client.clientTaxId !== '—' ? `(${client.clientTaxId})` : ''}
            </strong>
          </div>
          
          <div style={{ display: isCollapsed ? 'none' : 'block' }}>
            {!hasGroups ? (
              <div style={{
                padding: '16px',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '14px'
              }}>
                此客戶目前沒有任務
              </div>
            ) : (
              Array.from(client.serviceGroups.entries()).map(([groupKey, group]) => 
                renderServiceGroup(clientIdSafe, groupKey, group)
              )
            )}
          </div>
        </div>
      );
    });
  }

  // 渲染服务组
  function renderServiceGroup(clientIdSafe, groupKey, group) {
    const tasks = group.tasks;
    if (tasks.length === 0) return null;
    
    // 计算完成情况
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    
    // 格式化服务+月份标题
    const monthText = group.serviceMonth 
      ? ` - ${group.serviceMonth.slice(0, 4)}年${parseInt(group.serviceMonth.slice(5))}月` 
      : '';
    const serviceTitle = `${group.serviceName}${monthText}`;
    
    // 生成唯一ID
    const groupIdSafe = `${clientIdSafe}_${btoa(encodeURIComponent(groupKey)).replace(/[^a-zA-Z0-9]/g, '_')}`;
    const isCollapsed = !collapsedServices.has(groupIdSafe);
    
    return (
      <div key={groupKey} className="service-group">
        <div 
          className="service-header" 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div 
            onClick={() => toggleService(groupIdSafe)}
            style={{
              flex: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '14px' }}>
              {isCollapsed ? '▶' : '▼'}
            </span>
            <strong style={{ fontSize: '14px', color: '#374151' }}>
              {serviceTitle}
            </strong>
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>
              ({total}個任務: {completed}已完成, {total - completed}未完成)
            </span>
          </div>
          <button
            onClick={(e) => openQuickAddTask(
              group.clientId,
              group.clientServiceId,
              group.serviceId,
              group.serviceName,
              group.serviceMonth,
              e
            )}
            style={{
              padding: '4px 12px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="為此服務新增任務"
          >
            <span style={{ fontSize: '14px' }}>➕</span> 新增任務
          </button>
        </div>
        
        <div style={{ display: isCollapsed ? 'none' : 'block' }}>
          {tasks.map(task => renderTaskRow(task))}
        </div>
      </div>
    );
  }

  // 渲染任务行
  function renderTaskRow(task) {
    const checked = selectedTaskIds.has(task.taskId);
    
    return (
      <div key={task.taskId} className="task-row">
        <div>
          <input 
            type="checkbox" 
            checked={checked}
            onChange={(e) => toggleTaskSelection(task.taskId, e.target.checked)}
          />
        </div>
        <div>
          <div style={{ 
            fontWeight: 500, 
            color: '#1f2937', 
            marginBottom: '4px' 
          }}>
            {task.taskName}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            進度：{task.progress?.completed || 0}/{task.progress?.total || 0}
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          {task.assigneeName || '未分配'}
        </div>
        <div style={{ fontSize: '13px', color: '#4b5563' }}>
          {task.dueDate ? task.dueDate.slice(5) : '—'}
        </div>
        <div>
          <span style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 500,
            ...parseStyleString(getStatusStyle(task.status))
          }}>
            {zhStatus[task.status]}
          </span>
        </div>
        <div>
          <a 
            href={`/internal/task-detail?id=${task.taskId}`}
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            查看詳情
          </a>
        </div>
      </div>
    );
  }

  // 解析样式字符串为对象
  function parseStyleString(styleStr) {
    const styles = {};
    styleStr.split(';').forEach(rule => {
      const [key, value] = rule.split(':');
      if (key && value) {
        const camelKey = key.trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styles[camelKey] = value.trim();
      }
    });
    return styles;
  }

  return (
    <main className="clients-content" style={{ padding: '24px' }}>
      <section className="clients-card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div className="toolbar">
            <input
              id="q"
              type="search"
              placeholder="搜尋任務/客戶/統編…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              id="f_year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">全部年份</option>
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
            <select
              id="f_month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">全部月份</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
            <select
              id="f_assignee"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="all">全部負責人</option>
              {employeesList.map(emp => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.name}
                </option>
              ))}
            </select>
            <select
              id="f_tags"
              value={filterTags}
              onChange={(e) => setFilterTags(e.target.value)}
            >
              <option value="all">全部標籤</option>
              {allTags.map(tag => (
                <option key={tag.tagId} value={tag.tagId}>
                  {tag.tagName}
                </option>
              ))}
            </select>
            <select
              id="f_status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">全部狀態</option>
              <option value="in_progress">進行中</option>
              <option value="completed">已完成</option>
            </select>
            <select
              id="f_due"
              value={filterDue}
              onChange={(e) => setFilterDue(e.target.value)}
            >
              <option value="all">全部到期狀態</option>
              <option value="soon">即將到期（≤3天）</option>
              <option value="overdue">已逾期</option>
            </select>
            <label>
              <input
                type="checkbox"
                id="f_hide_completed"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
              />
              <span>隐藏已完成</span>
            </label>
            <button 
              id="btn-batch-assign"
              onClick={() => setShowBatchModal(true)}
              style={{
                display: selectedTaskIds.size > 0 ? 'inline-block' : 'none'
              }}
            >
              批量分配 ({selectedTaskIds.size})
            </button>
            <button 
              id="btn-new-task"
              onClick={() => window.location.href = '/internal/tasks-new'}
            >
              新增任務
            </button>
          </div>
        </div>

        {error && <p id="tasks-error" style={{ color: 'red' }}>{error}</p>}
        <div id="tasks-list">
          {renderClients()}
        </div>
      </section>

      {/* 批量分配弹窗 */}
      {showBatchModal && (
        <div 
          className="modal-overlay" 
          id="batchModal"
          style={{ display: 'flex' }}
        >
          <div className="modal">
            <div className="modal__header">
              <h2>批量分配負責人</h2>
              <button 
                id="batch-close"
                onClick={() => setShowBatchModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal__body">
              <p>
                已選擇 <strong id="selected-count">{selectedTaskIds.size}</strong> 個任務
              </p>
              <div className="field">
                <label htmlFor="batch_assignee">選擇負責人</label>
                <select 
                  id="batch_assignee"
                  value={batchAssignee}
                  onChange={(e) => setBatchAssignee(e.target.value)}
                >
                  <option value="">請選擇負責人</option>
                  {employeesList.map(emp => (
                    <option key={emp.userId} value={emp.userId}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal__actions">
                <button 
                  id="batch-cancel"
                  onClick={() => setShowBatchModal(false)}
                >
                  取消
                </button>
                <button 
                  id="batch-submit"
                  onClick={handleBatchAssign}
                >
                  確認分配
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 快速新增任务弹窗 */}
      {showQuickAddModal && quickAddContext && (
        <div 
          className="modal-overlay" 
          id="quickAddModal"
          style={{ display: 'flex' }}
        >
          <div className="modal">
            <div className="modal__header">
              <h2 id="quick-modal-title">
                新增任務：{quickAddContext.serviceName}
                {quickAddContext.serviceMonth && 
                  ` - ${quickAddContext.serviceMonth.slice(0, 4)}年${parseInt(quickAddContext.serviceMonth.slice(5))}月`
                }
              </h2>
              <button onClick={closeQuickAddModal}>✕</button>
            </div>
            <div className="modal__body">
              <div className="field">
                <label htmlFor="quick-task-name">任務類型</label>
                <select 
                  id="quick-task-name"
                  value={quickTaskName}
                  onChange={(e) => setQuickTaskName(e.target.value)}
                >
                  {allServiceItems
                    .filter(item => 
                      String(item.service_id) === String(quickAddContext.serviceId) && 
                      item.is_active !== false
                    )
                    .length > 0 ? (
                      <>
                        <option value="">請選擇任務類型</option>
                        {allServiceItems
                          .filter(item => 
                            String(item.service_id) === String(quickAddContext.serviceId) && 
                            item.is_active !== false
                          )
                          .map(item => (
                            <option key={item.item_id} value={item.item_name}>
                              {item.item_name}
                            </option>
                          ))
                        }
                      </>
                    ) : (
                      <option value="">請先在系統設定中為此服務新增任務類型</option>
                    )
                  }
                </select>
              </div>
              
              <div className="field">
                <label htmlFor="quick-assignee">負責人</label>
                <select 
                  id="quick-assignee"
                  value={quickAssignee}
                  onChange={(e) => setQuickAssignee(e.target.value)}
                >
                  <option value="">請選擇負責人</option>
                  {employeesList.map(emp => (
                    <option key={emp.userId} value={emp.userId}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="field">
                <label htmlFor="quick-due-date">到期日</label>
                <input 
                  type="date" 
                  id="quick-due-date"
                  value={quickDueDate}
                  onChange={(e) => setQuickDueDate(e.target.value)}
                />
              </div>
              
              {quickAddContext.sameServiceTasks.length > 0 && (
                <div className="field" id="quick-prerequisite-group">
                  <label htmlFor="quick-prerequisite">前置任務</label>
                  <select 
                    id="quick-prerequisite"
                    value={quickPrerequisite}
                    onChange={(e) => setQuickPrerequisite(e.target.value)}
                  >
                  <option value="">無前置任務</option>
                  {quickAddContext.sameServiceTasks.map(t => (
                    <option key={t.taskId} value={t.taskId}>
                      {t.taskName}
                      {t.dueDate && ` (到期：${t.dueDate})`}
                    </option>
                  ))}
                  </select>
                </div>
              )}
              
              <div className="field">
                <label htmlFor="quick-notes">備註</label>
                <textarea 
                  id="quick-notes" 
                  rows="3"
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                ></textarea>
              </div>
              
              <div id="quick-selected-sops"></div>
              
              {/* 受影响的后续任务提示 */}
              {affectedTasksInfo.conflictTasks.length > 0 && (
                <div 
                  id="quick-affected-tasks"
                  style={{
                    padding: '12px',
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '6px',
                    marginTop: '12px'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>
                    ⚠️ 檢測到後續任務到期日衝突
                  </div>
                  <div style={{ fontSize: '13px', color: '#78350f', marginBottom: '8px' }}>
                    以下後續任務的到期日需要延後：
                  </div>
                  
                  {affectedTasksInfo.conflictTasks.map(t => (
                    <div 
                      key={t.taskId}
                      style={{
                        padding: '4px 8px',
                        background: 'white',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        fontSize: '13px'
                      }}
                    >
                      📌 {t.taskName} <span style={{ color: '#dc2626' }}>（當前：{t.dueDate}）</span>
                    </div>
                  ))}
                  
                  <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    background: 'white',
                    borderRadius: '4px'
                  }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="checkbox" 
                        id="quick-adjust-subsequent"
                        checked={quickAdjustSubsequent}
                        onChange={(e) => setQuickAdjustSubsequent(e.target.checked)}
                        style={{ marginRight: '6px' }}
                      />
                      <span style={{
                        fontSize: '13px',
                        color: '#78350f',
                        fontWeight: 500
                      }}>
                        自動延後後續任務到期日
                      </span>
                    </label>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingLeft: '24px'
                    }}>
                      <label style={{ fontSize: '13px', color: '#78350f' }}>延後</label>
                      <input 
                        type="number" 
                        id="quick-delay-days"
                        value={quickDelayDays}
                        onChange={(e) => setQuickDelayDays(parseInt(e.target.value) || 1)}
                        min="1"
                        max="30"
                        style={{
                          width: '60px',
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          textAlign: 'center'
                        }}
                      />
                      <label style={{ fontSize: '13px', color: '#78350f' }}>天</label>
                    </div>
                  </div>
                </div>
              )}
              
              {affectedTasksInfo.allAffectedTasks.length > 0 && 
               affectedTasksInfo.conflictTasks.length === 0 && (
                <div style={{
                  padding: '12px',
                  background: '#dbeafe',
                  border: '1px solid #3b82f6',
                  borderRadius: '6px',
                  marginTop: '12px'
                }}>
                  <div style={{ fontSize: '13px', color: '#1e40af' }}>
                    ℹ️ 此前置任務有 {affectedTasksInfo.allAffectedTasks.length} 個後續任務，到期日無衝突
                  </div>
                </div>
              )}
              
              <div className="modal__actions">
                <button onClick={closeQuickAddModal}>取消</button>
                <button onClick={submitQuickTask}>確認新增</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Tasks;


