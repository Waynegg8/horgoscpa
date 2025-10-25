// =====================================
// 內容管理系統 JavaScript
// =====================================

const API_BASE = 'https://timesheet-api.hergscpa.workers.dev';
let allPosts = [];
let currentEditingPost = null;

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
    const menu = document.getElementById('navMenu');
    
    if (toggle && menu) {
        toggle.addEventListener('click', () => {
            menu.classList.toggle('active');
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
    
    container.innerHTML = posts.map(post => {
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
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <h3 style="margin: 0; font-size: 18px;">${escapeHtml(post.title)}</h3>
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
                        <button class="btn btn-sm btn-secondary" onclick="editPost(${post.id})" title="編輯">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})" title="刪除">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
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
    }
    
    // 切換視圖
    document.getElementById('posts-list-view').style.display = 'none';
    document.getElementById('post-editor-view').style.display = 'block';
    
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
    document.getElementById('posts-list-view').style.display = 'block';
    document.getElementById('post-editor-view').style.display = 'none';
    currentEditingPost = null;
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
}

// =====================================
// 資源管理（待實現）
// =====================================
function loadResources() {
    console.log('載入資源...');
}

// =====================================
// 媒體庫（待實現）
// =====================================
function loadMediaLibrary() {
    console.log('載入媒體庫...');
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

