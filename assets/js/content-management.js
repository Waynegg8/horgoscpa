// =====================================
// 內容管理系統 JavaScript
// =====================================

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let allPosts = [];
let currentEditingPost = null;
let autoSaveTimer = null;
let selectedPosts = new Set();
let isPreviewMode = false;

// =====================================
// 初始化
// =====================================
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    initMobileMenu();
    loadPosts();
});

// =====================================
// 認證相關
// =====================================
async function initAuth() {
    const token = localStorage.getItem('session_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Unauthorized');
        
        const data = await response.json();
        document.getElementById('userName').textContent = data.user.username;
        document.getElementById('userRole').textContent = data.user.role === 'admin' ? '管理員' : '員工';
        
        // 非管理員隱藏某些功能
        if (data.user.role !== 'admin') {
            // 可以添加權限限制
        }
    } catch (error) {
        localStorage.removeItem('session_token');
        window.location.href = 'login.html';
    }
}

function initMobileMenu() {
    const toggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    
    if (toggle && navLinks) {
        toggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
});

// =====================================
// 分頁切換
// =====================================
function switchContentTab(tab) {
    document.querySelectorAll('.content-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    
    event.target.closest('.content-tab-btn').classList.add('active');
    document.getElementById(`${tab}-section`).classList.add('active');
    
    // 載入對應數據
    if (tab === 'posts') {
        loadPosts();
    } else if (tab === 'resources') {
        loadResources();
    } else if (tab === 'media') {
        loadMediaLibrary();
    }
}

// =====================================
// 文章管理
// =====================================
async function loadPosts() {
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/posts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load posts');
        
        const data = await response.json();
        allPosts = data.posts || [];
        
        renderPostsList(allPosts);
    } catch (error) {
        console.error('載入文章失敗:', error);
        document.getElementById('posts-list').innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                <span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.3;">error</span>
                <p>載入失敗: ${error.message}</p>
            </div>
        `;
    }
}

function renderPostsList(posts) {
    const container = document.getElementById('posts-list');
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3;">article</span>
                <h3>尚無文章</h3>
                <p>點擊「新增文章」開始創建內容</p>
            </div>
        `;
        return;
    }
    
    // 添加批量操作工具列
    const bulkActionsBar = `
        <div id="bulkActions" style="display: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 20px; border-radius: 10px; margin-bottom: 20px; align-items: center; gap: 15px;">
            <span><strong id="selectedCount">0</strong> 篇已選</span>
            <button class="btn btn-sm" style="background: white; color: #667eea;" onclick="bulkChangeStatus('published')">
                <span class="material-symbols-outlined">publish</span> 發布
            </button>
            <button class="btn btn-sm" style="background: white; color: #667eea;" onclick="bulkChangeStatus('draft')">
                <span class="material-symbols-outlined">drafts</span> 設為草稿
            </button>
            <button class="btn btn-sm" style="background: white; color: #667eea;" onclick="bulkChangeStatus('archived')">
                <span class="material-symbols-outlined">archive</span> 封存
            </button>
            <button class="btn btn-sm" style="background: #f44336; color: white;" onclick="bulkDelete()">
                <span class="material-symbols-outlined">delete</span> 刪除
            </button>
        </div>
    `;
    
    const postCards = posts.map(post => {
        const statusLabels = {
            'draft': '草稿',
            'published': '已發布',
            'archived': '已封存'
        };
        
        const statusColors = {
            'draft': '#9E9E9E',
            'published': '#4CAF50',
            'archived': '#FF9800'
        };
        
        return `
            <div class="post-card" style="background: white; border: 1px solid var(--border-color); border-radius: 10px; padding: 20px; margin-bottom: 15px; transition: all 0.3s;">
                <div style="display: flex; gap: 15px; align-items: start;">
                    <input type="checkbox" class="post-checkbox" ${selectedPosts.has(post.id) ? 'checked' : ''} 
                           onclick="togglePostSelection(${post.id})" 
                           style="width: 18px; height: 18px; cursor: pointer; margin-top: 4px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <h3 style="margin: 0; font-size: 18px; cursor: pointer;" onclick="editPost(${post.id})">${escapeHtml(post.title)}</h3>
                            <span class="badge" style="background: ${statusColors[post.status]}15; color: ${statusColors[post.status]}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                ${statusLabels[post.status]}
                            </span>
                        </div>
                        ${post.summary ? `<p style="color: var(--text-secondary); margin: 8px 0; font-size: 14px;">${escapeHtml(post.summary)}</p>` : ''}
                        <div style="display: flex; gap: 15px; font-size: 13px; color: var(--text-secondary); margin-top: 10px;">
                            ${post.category ? `<span>📁 ${escapeHtml(post.category)}</span>` : ''}
                            <span>👁️ ${post.views_count || 0} 次瀏覽</span>
                            ${post.published_at ? `<span>📅 ${new Date(post.published_at).toLocaleDateString('zh-TW')}</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary" onclick="editPost(${post.id}); event.stopPropagation();" title="編輯">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id}); event.stopPropagation();" title="刪除">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = bulkActionsBar + postCards;
    
    // 添加hover效果
    document.querySelectorAll('.post-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
            this.style.transform = 'translateY(-2px)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
            this.style.transform = 'translateY(0)';
        });
    });
    
    updateBulkActions();
}

function filterPosts() {
    const search = document.getElementById('postSearch').value.toLowerCase();
    const filtered = allPosts.filter(post => 
        post.title.toLowerCase().includes(search) ||
        (post.summary && post.summary.toLowerCase().includes(search))
    );
    renderPostsList(filtered);
}

function showPostEditor(postId) {
    if (postId) {
        // 編輯模式
        const post = allPosts.find(p => p.id === postId);
        if (!post) return;
        
        document.getElementById('post-editor-title').textContent = '編輯文章';
        document.getElementById('postId').value = post.id;
        document.getElementById('postTitle').value = post.title;
        document.getElementById('postSlug').value = post.slug;
        document.getElementById('postCategory').value = post.category || '';
        document.getElementById('postSummary').value = post.summary || '';
        document.getElementById('postContent').value = post.content || '';
        document.getElementById('postMetaTitle').value = post.meta_title || '';
        document.getElementById('postMetaDescription').value = post.meta_description || '';
        document.getElementById('postStatus').value = post.status;
        
        if (post.published_at) {
            const date = new Date(post.published_at);
            document.getElementById('postPublishedAt').value = date.toISOString().slice(0, 16);
        }
        
        currentEditingPost = post;
    } else {
        // 新增模式
        document.getElementById('post-editor-title').textContent = '新增文章';
        document.getElementById('postId').value = '';
        document.getElementById('postTitle').value = '';
        document.getElementById('postSlug').value = '';
        document.getElementById('postCategory').value = '';
        document.getElementById('postSummary').value = '';
        document.getElementById('postContent').value = '';
        document.getElementById('postMetaTitle').value = '';
        document.getElementById('postMetaDescription').value = '';
        document.getElementById('postStatus').value = 'draft';
        document.getElementById('postPublishedAt').value = '';
        
        currentEditingPost = null;
        
        // 檢查是否有草稿
        loadDraft(null);
    }
    
    // 切換視圖
    document.getElementById('posts-list-view').style.display = 'none';
    document.getElementById('post-editor-view').style.display = 'block';
    
    // 重置預覽模式
    isPreviewMode = false;
    document.getElementById('postContent').style.display = 'block';
    document.getElementById('markdownPreview').style.display = 'none';
    
    // 啟用自動保存
    enableAutoSave();
    
    // 自動生成slug
    document.getElementById('postTitle').addEventListener('input', function() {
        if (!currentEditingPost) { // 只在新增時自動生成
            const slug = this.value.toLowerCase()
                .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
                .replace(/^-|-$/g, '');
            document.getElementById('postSlug').value = slug;
        }
    });
}

function closePostEditor() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    document.getElementById('posts-list-view').style.display = 'block';
    document.getElementById('post-editor-view').style.display = 'none';
    currentEditingPost = null;
    isPreviewMode = false;
}

async function savePost() {
    try {
        const postId = document.getElementById('postId').value;
        const token = localStorage.getItem('session_token');
        
        const data = {
            title: document.getElementById('postTitle').value,
            slug: document.getElementById('postSlug').value,
            category: document.getElementById('postCategory').value,
            summary: document.getElementById('postSummary').value,
            content: document.getElementById('postContent').value,
            meta_title: document.getElementById('postMetaTitle').value,
            meta_description: document.getElementById('postMetaDescription').value,
            status: document.getElementById('postStatus').value,
            published_at: document.getElementById('postPublishedAt').value || null
        };
        
        if (!data.title || !data.slug) {
            showNotification('請填寫標題和 URL 代稱', 'error');
            return;
        }
        
        const url = postId ? `${API_BASE}/api/posts/${postId}` : `${API_BASE}/api/posts`;
        const method = postId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save post');
        }
        
        showNotification('儲存成功！', 'success');
        clearDraft(postId);
        closePostEditor();
        loadPosts();
    } catch (error) {
        showNotification('儲存失敗: ' + error.message, 'error');
    }
}

async function editPost(postId) {
    showPostEditor(postId);
}

async function deletePost(postId) {
    if (!confirm('確定要刪除此文章嗎？')) return;
    
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to delete post');
        
        showNotification('刪除成功', 'success');
        loadPosts();
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

// =====================================
// Markdown 輔助功能
// =====================================
function insertMarkdown(prefix, suffix, placeholder) {
    const textarea = document.getElementById('postContent');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const textToInsert = selectedText || placeholder;
    const newText = prefix + textToInsert + suffix;
    
    textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    
    // 設置游標位置
    if (selectedText) {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + textToInsert.length;
    } else {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + placeholder.length;
    }
    
    textarea.focus();
    updatePreview();
}

// =====================================
// Markdown 預覽功能
// =====================================
function togglePreview() {
    isPreviewMode = !isPreviewMode;
    const editor = document.getElementById('postContent');
    const preview = document.getElementById('markdownPreview');
    const toggleBtn = document.querySelector('[onclick="togglePreview()"]');
    
    if (isPreviewMode) {
        editor.style.display = 'none';
        preview.style.display = 'block';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined">edit</span> 編輯模式';
        updatePreview();
    } else {
        editor.style.display = 'block';
        preview.style.display = 'none';
        toggleBtn.innerHTML = '<span class="material-symbols-outlined">visibility</span> 預覽';
    }
}

function updatePreview() {
    if (!isPreviewMode) return;
    
    const content = document.getElementById('postContent').value;
    const preview = document.getElementById('markdownPreview');
    
    // 簡單的 Markdown 轉 HTML（生產環境建議使用 marked.js 等專業庫）
    let html = content
        // 標題
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 粗體
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // 斜體
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // 連結
        .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank">$1</a>')
        // 圖片
        .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;">')
        // 列表
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>')
        // 段落
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    html = '<p>' + html + '</p>';
    
    preview.innerHTML = html;
}

// =====================================
// 自動保存功能
// =====================================
function enableAutoSave() {
    const fields = ['postTitle', 'postSlug', 'postCategory', 'postSummary', 'postContent', 
                    'postMetaTitle', 'postMetaDescription', 'postStatus', 'postPublishedAt'];
    
    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', scheduleAutoSave);
        }
    });
}

function scheduleAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    autoSaveTimer = setTimeout(() => {
        autoSaveDraft();
    }, 3000); // 3秒後自動保存
}

function autoSaveDraft() {
    const postId = document.getElementById('postId').value;
    const title = document.getElementById('postTitle').value.trim();
    
    if (!title) return; // 沒有標題不保存
    
    const draftData = {
        id: postId,
        title: title,
        slug: document.getElementById('postSlug').value,
        category: document.getElementById('postCategory').value,
        summary: document.getElementById('postSummary').value,
        content: document.getElementById('postContent').value,
        meta_title: document.getElementById('postMetaTitle').value,
        meta_description: document.getElementById('postMetaDescription').value,
        status: document.getElementById('postStatus').value,
        published_at: document.getElementById('postPublishedAt').value
    };
    
    localStorage.setItem('post_draft_' + (postId || 'new'), JSON.stringify(draftData));
    
    // 顯示自動保存提示
    const indicator = document.getElementById('autoSaveIndicator');
    if (indicator) {
        indicator.textContent = '✓ 已自動儲存';
        indicator.style.color = '#4CAF50';
        setTimeout(() => {
            indicator.textContent = '';
        }, 2000);
    }
}

function loadDraft(postId) {
    const draftKey = 'post_draft_' + (postId || 'new');
    const draft = localStorage.getItem(draftKey);
    
    if (draft && confirm('發現未儲存的草稿，是否載入？')) {
        const data = JSON.parse(draft);
        document.getElementById('postTitle').value = data.title || '';
        document.getElementById('postSlug').value = data.slug || '';
        document.getElementById('postCategory').value = data.category || '';
        document.getElementById('postSummary').value = data.summary || '';
        document.getElementById('postContent').value = data.content || '';
        document.getElementById('postMetaTitle').value = data.meta_title || '';
        document.getElementById('postMetaDescription').value = data.meta_description || '';
        document.getElementById('postStatus').value = data.status || 'draft';
        document.getElementById('postPublishedAt').value = data.published_at || '';
    }
}

function clearDraft(postId) {
    const draftKey = 'post_draft_' + (postId || 'new');
    localStorage.removeItem(draftKey);
}

// =====================================
// 批量操作功能
// =====================================
function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.post-checkbox');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    if (selectedPosts.size === allPosts.length) {
        // 全部取消選擇
        selectedPosts.clear();
        checkboxes.forEach(cb => cb.checked = false);
        selectAllBtn.textContent = '全選';
    } else {
        // 全部選擇
        selectedPosts.clear();
        allPosts.forEach(post => selectedPosts.add(post.id));
        checkboxes.forEach(cb => cb.checked = true);
        selectAllBtn.textContent = '取消全選';
    }
    
    updateBulkActions();
}

function togglePostSelection(postId) {
    if (selectedPosts.has(postId)) {
        selectedPosts.delete(postId);
    } else {
        selectedPosts.add(postId);
    }
    updateBulkActions();
}

function updateBulkActions() {
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedPosts.size > 0) {
        bulkActions.style.display = 'flex';
        selectedCount.textContent = selectedPosts.size;
    } else {
        bulkActions.style.display = 'none';
    }
}

async function bulkDelete() {
    if (selectedPosts.size === 0) return;
    
    if (!confirm(`確定要刪除選中的 ${selectedPosts.size} 篇文章嗎？`)) return;
    
    try {
        const token = localStorage.getItem('session_token');
        const deletePromises = Array.from(selectedPosts).map(postId => 
            fetch(`${API_BASE}/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
        );
        
        await Promise.all(deletePromises);
        
        showNotification(`成功刪除 ${selectedPosts.size} 篇文章`, 'success');
        selectedPosts.clear();
        updateBulkActions();
        loadPosts();
    } catch (error) {
        showNotification('批量刪除失敗: ' + error.message, 'error');
    }
}

async function bulkChangeStatus(newStatus) {
    if (selectedPosts.size === 0) return;
    
    const statusLabels = {
        'draft': '草稿',
        'published': '已發布',
        'archived': '已封存'
    };
    
    try {
        const token = localStorage.getItem('session_token');
        const updatePromises = Array.from(selectedPosts).map(postId => {
            const post = allPosts.find(p => p.id === postId);
            return fetch(`${API_BASE}/api/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ...post, status: newStatus })
            });
        });
        
        await Promise.all(updatePromises);
        
        showNotification(`成功將 ${selectedPosts.size} 篇文章改為${statusLabels[newStatus]}`, 'success');
        selectedPosts.clear();
        updateBulkActions();
        loadPosts();
    } catch (error) {
        showNotification('批量更新失敗: ' + error.message, 'error');
    }
}

// =====================================
// 資源管理
// =====================================
let allResources = [];

async function loadResources() {
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/public/resources`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load resources');
        
        const data = await response.json();
        allResources = data.data || [];
        
        renderResourcesUI();
    } catch (error) {
        console.error('載入資源失敗:', error);
        const section = document.getElementById('resources-section');
        section.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; color: var(--text-secondary);">
                    <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3; color: #f44336;">error</span>
                    <h3>載入失敗</h3>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

function renderResourcesUI() {
    const section = document.getElementById('resources-section');
    section.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="margin: 0;">資源管理</h2>
                <button class="btn btn-primary" onclick="showResourceUploadDialog()">
                    <span class="material-symbols-outlined">upload_file</span>
                    上傳資源
                </button>
            </div>
            
            <div id="resourcesList">
                ${allResources.length === 0 ? `
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                        <span class="material-symbols-outlined" style="font-size: 80px; opacity: 0.3;">folder_open</span>
                        <h3>尚無資源</h3>
                        <p>點擊「上傳資源」開始新增可下載的資源檔案</p>
                    </div>
                ` : allResources.map(resource => `
                    <div class="resource-item" style="border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0;">${escapeHtml(resource.title)}</h4>
                            <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">${escapeHtml(resource.description || '')}</p>
                            <div style="margin-top: 8px; font-size: 13px; color: var(--text-secondary);">
                                <span>📁 ${escapeHtml(resource.type || '其他')}</span>
                                <span style="margin-left: 15px;">📂 ${escapeHtml(resource.category || '未分類')}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <a href="${resource.file_url}" target="_blank" class="btn btn-sm btn-secondary" title="下載">
                                <span class="material-symbols-outlined">download</span>
                            </a>
                            <button class="btn btn-sm btn-danger" onclick="deleteResource(${resource.id})" title="刪除">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- 上傳對話框 -->
        <div id="resourceUploadDialog" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
                <h3>上傳資源檔案</h3>
                <div class="form-group">
                    <label>資源標題 *</label>
                    <input type="text" id="resourceTitle" placeholder="輸入資源標題">
                </div>
                <div class="form-group">
                    <label>資源描述</label>
                    <textarea id="resourceDescription" rows="3" placeholder="簡短描述此資源"></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>類型</label>
                        <select id="resourceType">
                            <option value="模板">模板</option>
                            <option value="指南">指南</option>
                            <option value="表單">表單</option>
                            <option value="文件">文件</option>
                            <option value="其他">其他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>分類</label>
                        <select id="resourceCategory">
                            <option value="稅務">稅務</option>
                            <option value="會計">會計</option>
                            <option value="創業">創業</option>
                            <option value="營運">營運</option>
                            <option value="其他">其他</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>選擇檔案 * (PDF, DOC, DOCX, XLS, XLSX)</label>
                    <input type="file" id="resourceFile" accept=".pdf,.doc,.docx,.xls,.xlsx">
                </div>
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="uploadResource()">上傳</button>
                    <button class="btn btn-secondary" onclick="closeResourceUploadDialog()">取消</button>
                </div>
            </div>
        </div>
    `;
}

function showResourceUploadDialog() {
    const dialog = document.getElementById('resourceUploadDialog');
    dialog.style.display = 'flex';
}

function closeResourceUploadDialog() {
    const dialog = document.getElementById('resourceUploadDialog');
    dialog.style.display = 'none';
    document.getElementById('resourceTitle').value = '';
    document.getElementById('resourceDescription').value = '';
    document.getElementById('resourceFile').value = '';
}

async function uploadResource() {
    const title = document.getElementById('resourceTitle').value.trim();
    const description = document.getElementById('resourceDescription').value.trim();
    const type = document.getElementById('resourceType').value;
    const category = document.getElementById('resourceCategory').value;
    const file = document.getElementById('resourceFile').files[0];
    
    if (!title || !file) {
        showNotification('請填寫標題並選擇檔案', 'error');
        return;
    }
    
    try {
        showNotification('上傳中...', 'info');
        
        // 這裡需要實作資源上傳 API
        // 目前使用圖片上傳 API 作為示範，實際應該要有專門的資源上傳 API
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('type', type);
        formData.append('category', category);
        
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/upload/resource`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        showNotification('上傳成功！', 'success');
        closeResourceUploadDialog();
        loadResources();
    } catch (error) {
        showNotification('上傳失敗: ' + error.message, 'error');
    }
}

async function deleteResource(resourceId) {
    if (!confirm('確定要刪除此資源嗎？')) return;
    
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/resources/${resourceId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Delete failed');
        
        showNotification('刪除成功', 'success');
        loadResources();
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

// =====================================
// 媒體庫
// =====================================
let allMedia = [];

async function loadMediaLibrary() {
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/media?type=image&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load media');
        
        const data = await response.json();
        allMedia = data.data || [];
        
        renderMediaLibraryUI();
    } catch (error) {
        console.error('載入媒體庫失敗:', error);
        const section = document.getElementById('media-section');
        section.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                <div style="text-align: center; color: var(--text-secondary);">
                    <span class="material-symbols-outlined" style="font-size: 64px; opacity: 0.3; color: #f44336;">error</span>
                    <h3>載入失敗</h3>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

function renderMediaLibraryUI() {
    const section = document.getElementById('media-section');
    section.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h2 style="margin: 0;">媒體庫</h2>
                    <p style="color: var(--text-secondary); margin: 5px 0 0;">統一管理網站圖片資源</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <input type="file" id="mediaFileInput" accept="image/*" style="display: none;" onchange="handleMediaUpload()">
                    <button class="btn btn-primary" onclick="document.getElementById('mediaFileInput').click()">
                        <span class="material-symbols-outlined">add_photo_alternate</span>
                        上傳圖片
                    </button>
                </div>
            </div>
            
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 15px; padding: 10px; background: var(--light-bg); border-radius: 6px;">
                <strong>提示：</strong>支援 JPEG、PNG、GIF、WebP 格式，單張圖片不超過 5MB
            </div>
            
            <div id="mediaGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                ${allMedia.length === 0 ? `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                        <span class="material-symbols-outlined" style="font-size: 80px; opacity: 0.3;">photo_library</span>
                        <h3>尚無圖片</h3>
                        <p>點擊「上傳圖片」開始新增媒體資源</p>
                    </div>
                ` : allMedia.map(media => `
                    <div class="media-item" style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; transition: all 0.3s;">
                        <div style="aspect-ratio: 16/9; background: #f5f5f5; position: relative; overflow: hidden;">
                            <img src="${media.file_url}" alt="${escapeHtml(media.filename)}" 
                                 style="width: 100%; height: 100%; object-fit: cover;"
                                 onclick="showMediaPreview('${media.file_url}', '${escapeHtml(media.filename)}')">
                        </div>
                        <div style="padding: 10px;">
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px; word-break: break-all;">
                                ${escapeHtml(media.filename)}
                            </div>
                            <div style="font-size: 11px; color: var(--text-secondary);">
                                ${formatFileSize(media.file_size)}
                            </div>
                            <div style="display: flex; gap: 5px; margin-top: 10px;">
                                <button class="btn btn-sm btn-secondary" onclick="copyMediaUrl('${media.file_url}')" title="複製連結" style="flex: 1;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">content_copy</span>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteMedia(${media.id})" title="刪除" style="flex: 1;">
                                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- 圖片預覽對話框 -->
        <div id="mediaPreviewDialog" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center;" onclick="closeMediaPreview()">
            <div style="max-width: 90%; max-height: 90%; position: relative;">
                <img id="mediaPreviewImage" src="" alt="" style="max-width: 100%; max-height: 90vh; border-radius: 8px;">
                <div id="mediaPreviewFilename" style="color: white; margin-top: 10px; text-align: center;"></div>
            </div>
        </div>
    `;
    
    // 添加 hover 效果
    document.querySelectorAll('.media-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            this.style.transform = 'translateY(-2px)';
        });
        item.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
            this.style.transform = 'translateY(0)';
        });
    });
}

async function handleMediaUpload() {
    const fileInput = document.getElementById('mediaFileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // 檢查檔案類型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('只支援 JPEG、PNG、GIF、WebP 格式的圖片', 'error');
        fileInput.value = '';
        return;
    }
    
    // 檢查檔案大小
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showNotification('圖片大小不能超過 5MB', 'error');
        fileInput.value = '';
        return;
    }
    
    try {
        showNotification('上傳中...', 'info');
        
        const formData = new FormData();
        formData.append('file', file);
        
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/upload/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        showNotification('上傳成功！', 'success');
        fileInput.value = '';
        loadMediaLibrary();
    } catch (error) {
        showNotification('上傳失敗: ' + error.message, 'error');
        fileInput.value = '';
    }
}

async function deleteMedia(mediaId) {
    if (!confirm('確定要刪除此圖片嗎？')) return;
    
    try {
        const token = localStorage.getItem('session_token');
        const response = await fetch(`${API_BASE}/api/media/${mediaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Delete failed');
        
        showNotification('刪除成功', 'success');
        loadMediaLibrary();
    } catch (error) {
        showNotification('刪除失敗: ' + error.message, 'error');
    }
}

function copyMediaUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showNotification('連結已複製到剪貼簿', 'success');
    }).catch(() => {
        showNotification('複製失敗', 'error');
    });
}

function showMediaPreview(url, filename) {
    const dialog = document.getElementById('mediaPreviewDialog');
    const img = document.getElementById('mediaPreviewImage');
    const filenameDiv = document.getElementById('mediaPreviewFilename');
    
    img.src = url;
    filenameDiv.textContent = filename;
    dialog.style.display = 'flex';
}

function closeMediaPreview() {
    const dialog = document.getElementById('mediaPreviewDialog');
    dialog.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// =====================================
// 通知功能
// =====================================
function showNotification(message, type = 'info') {
    // 創建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// =====================================
// 輔助函數
// =====================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

