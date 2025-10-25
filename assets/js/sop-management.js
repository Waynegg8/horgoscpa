/*
 * SOP 文件管理系統
 * 與業務類型整合，支援版本控制
 */

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let currentUser = null;
let categories = [];
let businessTypes = [];
let sops = [];
let currentSopId = null;
let currentTags = [];

// =========================================
// 初始化
// =========================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    await loadInitialData();
    initEventListeners();
});

async function initAuth() {
    const token = localStorage.getItem('session_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await apiRequest('/api/auth/me');
        currentUser = response.user;
        updateUserInfo(currentUser);
    } catch (error) {
        console.error('驗證錯誤:', error);
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
    }
}

async function apiRequest(url, options = {}) {
    const token = localStorage.getItem('session_token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const finalOptions = { ...options };
    if (finalOptions.body && typeof finalOptions.body === 'object') {
        finalOptions.body = JSON.stringify(finalOptions.body);
    }

    const response = await fetch(`${API_BASE}${url}`, {
        ...defaultOptions,
        ...finalOptions,
        headers: {
            ...defaultOptions.headers,
            ...finalOptions.headers
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('session_token');
            window.location.href = 'login.html';
            throw new Error('未授權');
        }
        const error = await response.json();
        throw new Error(error.error || '請求失敗');
    }

    return await response.json();
}

function updateUserInfo(user) {
    document.getElementById('userName').textContent = user.username;
    document.getElementById('userRole').textContent = user.role === 'admin' ? '管理員' : '員工';
}

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const menu = document.getElementById('navMenu');
    
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
        });
    }
}

// =========================================
// 載入初始資料
// =========================================
async function loadInitialData() {
    try {
        await Promise.all([
            loadCategories(),
            loadBusinessTypes(),
            loadSops()
        ]);
    } catch (error) {
        showNotification('載入資料失敗: ' + error.message, 'error');
    }
}

async function loadCategories() {
    try {
        const response = await apiRequest('/api/sop/categories');
        categories = response.data || [];
        renderCategoryTree();
    } catch (error) {
        console.error('載入分類失敗:', error);
    }
}

async function loadBusinessTypes() {
    try {
        const response = await apiRequest('/api/business-types');
        businessTypes = response.data || [];
        renderBusinessTypeFilters();
    } catch (error) {
        console.error('載入業務類型失敗:', error);
    }
}

async function loadSops(filters = {}) {
    try {
        const container = document.getElementById('sopList');
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                載入中...
            </div>
        `;

        let url = '/api/sops?';
        const params = new URLSearchParams();
        
        if (filters.category) params.append('category', filters.category);
        if (filters.business_type) params.append('business_type', filters.business_type);
        if (filters.status) params.append('status', filters.status);
        
        const response = await apiRequest(url + params.toString());
        sops = response.data || [];
        renderSopList(sops);
    } catch (error) {
        document.getElementById('sopList').innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <p>載入失敗</p>
            </div>
        `;
        showNotification('載入 SOP 失敗: ' + error.message, 'error');
    }
}

// =========================================
// 渲染UI
// =========================================
function renderCategoryTree() {
    const tree = document.getElementById('categoryTree');
    
    const allItem = `
        <li class="category-item active" data-category-id="all" onclick="selectCategory('all')">
            <span class="material-symbols-outlined">folder</span>
            <span>全部 SOP</span>
        </li>
    `;
    
    const categoryItems = categories.map(cat => `
        <li class="category-item" data-category-id="${cat.id}" onclick="selectCategory(${cat.id})">
            <span class="material-symbols-outlined">${cat.icon || 'folder'}</span>
            <span>${escapeHtml(cat.name)}</span>
        </li>
    `).join('');
    
    tree.innerHTML = allItem + categoryItems;
}

function renderBusinessTypeFilters() {
    const filterSelect = document.getElementById('businessTypeFilter');
    const editorSelect = document.getElementById('sopBusinessType');
    
    const options = businessTypes.map(bt => 
        `<option value="${escapeHtml(bt.type_name)}">${escapeHtml(bt.type_name)}</option>`
    ).join('');
    
    filterSelect.innerHTML = '<option value="">所有業務類型</option>' + options;
    editorSelect.innerHTML = '<option value="">無</option>' + options;
    
    // 載入分類到編輯器
    const categorySelect = document.getElementById('sopCategory');
    const categoryOptions = categories.map(cat =>
        `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
    ).join('');
    categorySelect.innerHTML = '<option value="">無</option>' + categoryOptions;
}

function renderSopList(sopList) {
    const container = document.getElementById('sopList');
    
    if (!sopList || sopList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">description</span>
                <p>尚無 SOP 文件</p>
                <p style="font-size: 14px; margin-top: 10px;">點擊「新增 SOP」開始建立標準作業程序</p>
            </div>
        `;
        return;
    }
    
    const html = sopList.map(sop => {
        const statusBadge = {
            'draft': '<span class="badge badge-secondary">草稿</span>',
            'published': '<span class="badge badge-success">已發布</span>',
            'archived': '<span class="badge badge-warning">已封存</span>'
        }[sop.status] || '';
        
        return `
            <div class="sop-card" onclick="editSop(${sop.id})">
                <h3>${escapeHtml(sop.title)} ${statusBadge}</h3>
                <p style="color: var(--text-secondary); margin: 8px 0;">
                    ${sop.content ? sop.content.substring(0, 150) + '...' : ''}
                </p>
                <div class="sop-meta">
                    ${sop.category_name ? `<span><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">folder</span> ${escapeHtml(sop.category_name)}</span>` : ''}
                    ${sop.business_type ? `<span><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">business</span> ${escapeHtml(sop.business_type)}</span>` : ''}
                    <span><span class="material-symbols-outlined" style="font-size: 16px; vertical-align: middle;">account_circle</span> ${escapeHtml(sop.created_by)}</span>
                    <span>v${escapeHtml(sop.version)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// =========================================
// 分類選擇
// =========================================
function selectCategory(categoryId) {
    // 更新 UI
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-category-id="${categoryId}"]`)?.classList.add('active');
    
    // 載入該分類的 SOP
    const filters = {};
    if (categoryId !== 'all') {
        filters.category = categoryId;
    }
    
    // 保留其他篩選
    const businessType = document.getElementById('businessTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    if (businessType) filters.business_type = businessType;
    if (status) filters.status = status;
    
    loadSops(filters);
}

// =========================================
// 編輯器
// =========================================
function showNewSopEditor() {
    currentSopId = null;
    currentTags = [];
    
    document.getElementById('editorTitle').textContent = '新增 SOP';
    document.getElementById('sopId').value = '';
    document.getElementById('sopTitle').value = '';
    document.getElementById('sopVersion').value = '1.0';
    document.getElementById('sopCategory').value = '';
    document.getElementById('sopBusinessType').value = '';
    document.getElementById('sopStatus').value = 'draft';
    document.getElementById('sopContent').value = '';
    document.getElementById('versionBtn').style.display = 'none';
    document.getElementById('versionHistory').style.display = 'none';
    
    renderTags();
    
    // 顯示編輯器，隱藏列表
    document.getElementById('sopListView').style.display = 'none';
    document.getElementById('sopEditorView').style.display = 'block';
}

async function editSop(sopId) {
    try {
        const response = await apiRequest(`/api/sops/${sopId}`);
        const sop = response.data;
        
        currentSopId = sopId;
        currentTags = sop.tags || [];
        
        document.getElementById('editorTitle').textContent = '編輯 SOP';
        document.getElementById('sopId').value = sopId;
        document.getElementById('sopTitle').value = sop.title || '';
        document.getElementById('sopVersion').value = sop.version || '1.0';
        document.getElementById('sopCategory').value = sop.category_id || '';
        document.getElementById('sopBusinessType').value = sop.business_type || '';
        document.getElementById('sopStatus').value = sop.status || 'draft';
        document.getElementById('sopContent').value = sop.content || '';
        document.getElementById('versionBtn').style.display = 'inline-flex';
        
        renderTags();
        
        // 顯示編輯器，隱藏列表
        document.getElementById('sopListView').style.display = 'none';
        document.getElementById('sopEditorView').style.display = 'block';
    } catch (error) {
        showNotification('載入 SOP 失敗: ' + error.message, 'error');
    }
}

function closeSopEditor() {
    document.getElementById('sopListView').style.display = 'block';
    document.getElementById('sopEditorView').style.display = 'none';
}

async function saveSop() {
    const title = document.getElementById('sopTitle').value.trim();
    const content = document.getElementById('sopContent').value.trim();
    
    if (!title || !content) {
        showNotification('請填寫標題和內容', 'error');
        return;
    }
    
    try {
        const data = {
            title,
            content,
            version: document.getElementById('sopVersion').value || '1.0',
            category_id: document.getElementById('sopCategory').value || null,
            business_type: document.getElementById('sopBusinessType').value || null,
            status: document.getElementById('sopStatus').value || 'draft',
            tags: currentTags
        };
        
        if (currentSopId) {
            // 更新
            await apiRequest(`/api/sops/${currentSopId}`, {
                method: 'PUT',
                body: data
            });
            showNotification('SOP 更新成功', 'success');
        } else {
            // 新增
            const response = await apiRequest('/api/sops', {
                method: 'POST',
                body: data
            });
            currentSopId = response.id;
            showNotification('SOP 建立成功', 'success');
        }
        
        await loadSops();
        closeSopEditor();
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    }
}

// =========================================
// 標籤管理
// =========================================
function initEventListeners() {
    // 搜尋
    document.getElementById('sopSearch').addEventListener('input', handleSearch);
    
    // 篩選
    document.getElementById('businessTypeFilter').addEventListener('change', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    
    // 標籤輸入
    const tagInput = document.getElementById('tagInput');
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = tagInput.value.trim();
            if (tag && !currentTags.includes(tag)) {
                currentTags.push(tag);
                renderTags();
                tagInput.value = '';
            }
        }
    });
    
    // 登出
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function renderTags() {
    const container = document.getElementById('tagContainer');
    const input = document.getElementById('tagInput');
    
    const tagsHtml = currentTags.map(tag => `
        <div class="tag">
            <span>${escapeHtml(tag)}</span>
            <span class="remove-tag" onclick="removeTag('${escapeHtml(tag)}')">×</span>
        </div>
    `).join('');
    
    container.innerHTML = tagsHtml + input.outerHTML;
    
    // 重新綁定事件
    const newInput = document.getElementById('tagInput');
    newInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const tag = newInput.value.trim();
            if (tag && !currentTags.includes(tag)) {
                currentTags.push(tag);
                renderTags();
                newInput.value = '';
            }
        }
    });
}

function removeTag(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags();
}

// =========================================
// 版本歷史
// =========================================
async function viewVersionHistory() {
    if (!currentSopId) return;
    
    try {
        const response = await apiRequest(`/api/sops/${currentSopId}/versions`);
        const versions = response.data || [];
        
        const container = document.getElementById('versionHistory');
        
        if (versions.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">尚無版本歷史</p>';
        } else {
            const html = versions.map(v => `
                <div class="version-item">
                    <strong>版本 ${escapeHtml(v.version)}</strong> - ${v.changed_at}
                    <p style="margin: 5px 0 0 0; font-size: 14px;">
                        ${escapeHtml(v.change_notes || '無變更說明')}
                        <span style="color: var(--text-secondary);"> by ${escapeHtml(v.changed_by)}</span>
                    </p>
                </div>
            `).join('');
            container.innerHTML = html;
        }
        
        container.style.display = 'block';
    } catch (error) {
        showNotification('載入版本歷史失敗: ' + error.message, 'error');
    }
}

// =========================================
// 搜尋與篩選
// =========================================
function handleSearch() {
    const searchTerm = document.getElementById('sopSearch').value.toLowerCase();
    
    if (!searchTerm) {
        renderSopList(sops);
        return;
    }
    
    const filtered = sops.filter(sop => {
        return sop.title.toLowerCase().includes(searchTerm) ||
               (sop.content && sop.content.toLowerCase().includes(searchTerm)) ||
               (sop.business_type && sop.business_type.toLowerCase().includes(searchTerm));
    });
    
    renderSopList(filtered);
}

function applyFilters() {
    const filters = {};
    const businessType = document.getElementById('businessTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    if (businessType) filters.business_type = businessType;
    if (status) filters.status = status;
    
    loadSops(filters);
}

// =========================================
// 工具函數
// =========================================
function showNotification(message, type = 'info') {
    // 簡單的通知實現
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    div.textContent = message;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function logout() {
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
}

// =========================================
// 圖片上傳
// =========================================
function triggerImageUpload() {
    document.getElementById('imageUpload').click();
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusEl = document.getElementById('uploadStatus');
    statusEl.textContent = '上傳中...';
    statusEl.className = 'uploading';
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE}/api/upload/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('session_token')}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('上傳失敗');
        }
        
        const result = await response.json();
        
        if (result.success) {
            // 插入 Markdown 圖片語法
            const textarea = document.getElementById('sopContent');
            const imageMarkdown = `\n![圖片說明](${result.url})\n`;
            const cursorPos = textarea.selectionStart;
            const textBefore = textarea.value.substring(0, cursorPos);
            const textAfter = textarea.value.substring(cursorPos);
            textarea.value = textBefore + imageMarkdown + textAfter;
            textarea.selectionStart = textarea.selectionEnd = cursorPos + imageMarkdown.length;
            textarea.focus();
            
            statusEl.textContent = '✓ 上傳成功';
            statusEl.className = 'success';
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = '';
            }, 3000);
        } else {
            throw new Error(result.error || '上傳失敗');
        }
    } catch (error) {
        statusEl.textContent = `✗ ${error.message}`;
        statusEl.className = 'error';
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = '';
        }, 5000);
    }
    
    // 清空 input
    event.target.value = '';
}

// 全域函數供 HTML 使用
window.showNewSopEditor = showNewSopEditor;
window.editSop = editSop;
window.closeSopEditor = closeSopEditor;
window.saveSop = saveSop;
window.selectCategory = selectCategory;
window.removeTag = removeTag;
window.viewVersionHistory = viewVersionHistory;
window.triggerImageUpload = triggerImageUpload;
window.handleImageUpload = handleImageUpload;

