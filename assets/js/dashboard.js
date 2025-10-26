/**
 * 工作台（Dashboard）
 * 顯示待辦任務及相關SOP和注意事項
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    updateGreeting();
    await loadPendingTasks();
});

async function initAuth() {
    const token = localStorage.getItem('session_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await apiRequest('/api/verify');
        currentUser = response.user;
        const displayName = currentUser.employee_name || currentUser.username;
        document.getElementById('userName').textContent = displayName;
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? '管理員' : '員工';
        document.getElementById('greetingUser').textContent = displayName;
    } catch (error) {
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
    }
}

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    }
}

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('session_token');
    const response = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers
        },
        ...options
    });

    if (response.status === 401) {
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
        throw new Error('未授權');
    }

    if (!response.ok) throw new Error('請求失敗');
    return await response.json();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
});

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '早安';
    if (hour >= 12 && hour < 18) greeting = '午安';
    else if (hour >= 18) greeting = '晚安';
    
    document.getElementById('greetingTime').textContent = greeting;
    
    const today = new Date();
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    document.getElementById('todayDate').textContent = 
        `今天是 ${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()} ${weekdays[today.getDay()]}`;
}

async function loadPendingTasks() {
    const container = document.getElementById('tasksList');
    
    try {
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;
        
        // 載入所有類型的未完成任務
        const [recurringRes, multiStageRes] = await Promise.all([
            apiRequest(`/api/tasks/recurring?year=${year}&month=${month}`).catch(() => ({ tasks: [] })),
            apiRequest(`/api/multi-stage-tasks`).catch(() => [])
        ]);
        
        const allTasks = [];
        
        // 處理週期任務
        const recurringTasks = (recurringRes.tasks || []).filter(task => 
            task.status !== 'completed' && 
            (!task.assigned_to || task.assigned_to === currentUser.employee_name || currentUser.role === 'admin')
        );
        
        recurringTasks.forEach(task => {
            allTasks.push({
                id: task.id,
                title: task.task_name || '未命名任務',
                type: 'recurring',
                category: task.category || '其他',
                client: task.client_name,
                status: task.status || 'pending',
                dueDate: task.due_date,
                assignedTo: task.assigned_to,
                sop: getSopForTask('recurring', task.category),
                notes: getNotesForTask('recurring', task.category, task)
            });
        });
        
        // 處理多階段任務（工商、財稅）
        const multiStageTasks = (Array.isArray(multiStageRes) ? multiStageRes : []).filter(task =>
            task.status !== 'completed' &&
            (!task.assigned_to || task.assigned_to === currentUser.employee_name || currentUser.role === 'admin')
        );
        
        multiStageTasks.forEach(task => {
            const category = task.template_name || '其他';
            allTasks.push({
                id: task.id,
                title: task.task_name || task.client_name || '未命名任務',
                type: 'multistage',
                category: category,
                client: task.client_name,
                status: task.status || 'not_started',
                dueDate: task.due_date,
                assignedTo: task.assigned_to,
                currentStage: task.current_stage,
                sop: getSopForTask('multistage', category),
                notes: getNotesForTask('multistage', category, task)
            });
        });
        
        // 按優先級和到期日期排序
        allTasks.sort((a, b) => {
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate) - new Date(b.dueDate);
            }
            return 0;
        });
        
        if (allTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">task_alt</span>
                    <p style="font-weight: 600; font-size: 18px; margin: 10px 0;">沒有待辦任務</p>
                    <p style="font-size: 14px;">所有工作都已完成！</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = allTasks.map(task => renderTaskItem(task)).join('');
    } catch (error) {
        console.error('載入任務失敗:', error);
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error_outline</span>
                <p style="font-weight: 600; font-size: 18px; margin: 10px 0; color: #f44336;">載入失敗</p>
            </div>
        `;
    }
}

function renderTaskItem(task) {
    const priorityClass = task.dueDate && isPastDue(task.dueDate) ? 'high-priority' : 
                          task.status === 'in_progress' ? 'medium-priority' : '';
    
    const statusBadge = getStatusBadge(task.status);
    const dueDateText = task.dueDate ? formatDueDate(task.dueDate) : '無截止日期';
    
    return `
        <div class="task-item ${priorityClass}">
            <div class="task-header">
                <div>
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        ${task.client ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">person</span>
                                <span>${escapeHtml(task.client)}</span>
                            </div>
                        ` : ''}
                        ${task.category ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">category</span>
                                <span>${escapeHtml(task.category)}</span>
                            </div>
                        ` : ''}
                        <div class="task-meta-item">
                            <span class="material-symbols-outlined">event</span>
                            <span>${dueDateText}</span>
                        </div>
                        ${task.currentStage ? `
                            <div class="task-meta-item">
                                <span class="material-symbols-outlined">timeline</span>
                                <span>${escapeHtml(task.currentStage)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${statusBadge}
            </div>
            
            ${task.sop || task.notes ? `
                <div class="task-info-section">
                    ${task.sop ? `
                        <div style="margin-bottom: 10px;">
                            ${task.sop.map(sop => `
                                <a href="${sop.link}" class="sop-link" target="_blank">
                                    <span class="material-symbols-outlined">description</span>
                                    ${escapeHtml(sop.name)}
                                </a>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${task.notes ? `
                        <div class="task-notes">
                            <div class="task-notes-title">
                                <span class="material-symbols-outlined">lightbulb</span>
                                注意事項
                            </div>
                            <div>${escapeHtml(task.notes)}</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="task-actions">
                <button class="btn-task btn-details" onclick="goToTaskDetail('${task.type}', ${task.id})">
                    <span class="material-symbols-outlined">visibility</span>
                    查看詳情
                </button>
                ${task.status !== 'completed' ? `
                    <button class="btn-task btn-complete" onclick="markTaskComplete('${task.type}', ${task.id})">
                        <span class="material-symbols-outlined">check_circle</span>
                        標記完成
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function getSopForTask(type, category) {
    const sopMap = {
        'recurring': {
            '記帳': [
                { name: '記帳作業流程', link: 'knowledge.html?tab=sop&doc=bookkeeping' },
                { name: '憑證整理規範', link: 'knowledge.html?tab=sop&doc=voucher' }
            ],
            '工商': [
                { name: '工商變更登記流程', link: 'knowledge.html?tab=sop&doc=business-change' }
            ],
            '財簽': [
                { name: '財務報表編製SOP', link: 'knowledge.html?tab=sop&doc=financial-report' }
            ],
            '稅簽': [
                { name: '稅務申報作業流程', link: 'knowledge.html?tab=sop&doc=tax-filing' }
            ]
        },
        'multistage': {
            '公司設立': [
                { name: '公司設立完整流程', link: 'knowledge.html?tab=sop&doc=company-setup' }
            ],
            '工商變更': [
                { name: '工商變更登記流程', link: 'knowledge.html?tab=sop&doc=business-change' }
            ],
            '財務簽證': [
                { name: '財務簽證作業規範', link: 'knowledge.html?tab=sop&doc=financial-audit' }
            ],
            '稅務簽證': [
                { name: '稅務簽證查核流程', link: 'knowledge.html?tab=sop&doc=tax-audit' }
            ]
        }
    };
    
    return sopMap[type]?.[category] || null;
}

function getNotesForTask(type, category, task) {
    const notesMap = {
        'recurring': {
            '記帳': '請確認所有憑證已齊全，並注意會計科目的正確性。月底前需完成審核。',
            '工商': '需準備相關證明文件，注意申請期限。部分變更需股東會決議。',
            '財簽': '注意查核基準日，確保所有財務資料完整。需與客戶確認特殊交易事項。',
            '稅簽': '確認申報期限，準備相關扣繳憑單。注意稅法最新修正條文。'
        },
        'multistage': {
            '公司設立': '需按階段完成各項文件準備，注意公司名稱預查有效期限為3個月。',
            '工商變更': '變更登記需於決議後15日內申請，準備齊全文件可加速審查。',
            '財務簽證': '查核過程中保持與客戶溝通，重大異常需及時報告。',
            '稅務簽證': '注意稅務法規遵循，確保所有計算正確無誤。'
        }
    };
    
    return notesMap[type]?.[category] || null;
}

function getStatusBadge(status) {
    const statusMap = {
        'pending': { text: '待處理', class: 'status-pending' },
        'in_progress': { text: '進行中', class: 'status-in_progress' },
        'completed': { text: '已完成', class: 'status-completed' },
        'not_started': { text: '未開始', class: 'status-pending' },
        'on_hold': { text: '暫停', class: 'status-pending' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'status-pending' };
    return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function formatDueDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `已逾期 ${Math.abs(diffDays)} 天`;
    if (diffDays === 0) return '今天截止';
    if (diffDays === 1) return '明天截止';
    if (diffDays <= 7) return `${diffDays} 天後截止`;
    
    return date.toLocaleDateString('zh-TW');
}

function isPastDue(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    return date < today;
}

function goToTaskDetail(type, id) {
    if (type === 'recurring') {
        window.location.href = `tasks.html?tab=recurring#task-${id}`;
    } else if (type === 'multistage') {
        window.location.href = `multi-stage-tasks.html?id=${id}`;
    }
}

async function markTaskComplete(type, id) {
    if (!confirm('確定要標記此任務為已完成嗎？')) {
        return;
    }
    
    try {
        if (type === 'recurring') {
            await apiRequest(`/api/tasks/recurring/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() })
            });
        } else if (type === 'multistage') {
            await apiRequest(`/api/multi-stage-tasks/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'completed' })
            });
        }
        
        // 重新載入任務列表
        await loadPendingTasks();
        
        alert('任務已標記為完成！');
    } catch (error) {
        alert('更新失敗：' + error.message);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
