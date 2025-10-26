// 知識庫頁面腳本（抽離自 knowledge.html）

// 使用 auth-common.js 提供的 sessionToken 與 currentUser
let currentTab = 'sop';

document.addEventListener('DOMContentLoaded', async () => {
  await initPage(async () => {
    // 初始化標籤切換
    initKnowledgeTabs();
    
    // 載入初始資料
    await loadSopCategories();
    await loadSops();
  });
});

// 初始化標籤切換
function initKnowledgeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button[data-tab]');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchKnowledgeTab(tabName);
    });
  });
}

// 切換標籤
function switchKnowledgeTab(tabName) {
  currentTab = tabName;
  
  // 更新按鈕狀態
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`.tab-button[data-tab="${tabName}"]`)?.classList.add('active');
  
  // 更新內容區域
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`)?.classList.add('active');
  
  // 載入對應資料
  switch(tabName) {
    case 'sop':
      loadSops();
      break;
    case 'docs':
      loadDocs();
      break;
    case 'faq':
      loadFaqs();
      break;
  }
}

// 載入內部文檔
async function loadDocs() {
  try {
    const res = await apiRequest('/api/sops?document_type=INTERNAL');
    const docs = res.data || res.sops || [];
    renderSopList(docs, 'internalDocsContainer');
  } catch (error) {
    console.error('載入內部文檔失敗:', error);
    showNotification('載入內部文檔失敗', 'error');
  }
}

// 載入常見問答
async function loadFaqs() {
  try {
    const res = await apiRequest('/api/sops?document_type=FAQ');
    const faqs = res.data || res.sops || [];
    renderFaqList(faqs);
  } catch (error) {
    console.error('載入FAQ失敗:', error);
    showNotification('載入FAQ失敗', 'error');
  }
}

// 渲染FAQ列表
function renderFaqList(faqs) {
  const container = document.getElementById('faqContainer');
  if (!container) return;
  
  if (!faqs || faqs.length === 0) {
    container.innerHTML = '<div class="empty-state">暫無常見問答</div>';
    return;
  }
  
  let html = '<div class="faq-list">';
  faqs.forEach(faq => {
    html += `
      <div class="faq-item" onclick="viewSop(${faq.id})">
        <h3>${escapeHtml(faq.title)}</h3>
        <p>${escapeHtml(faq.content || '').substring(0, 150)}...</p>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

// 渲染SOP列表（通用）
function renderSopList(sops, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!sops || sops.length === 0) {
    container.innerHTML = '<div class="empty-state">暫無文件</div>';
    return;
  }
  
  let html = '<div class="sop-list">';
  sops.forEach(sop => {
    html += `
      <div class="sop-item" onclick="viewSop(${sop.id})">
        <h3>${escapeHtml(sop.title)}</h3>
        <p>${escapeHtml(sop.content || '').substring(0, 150)}...</p>
      </div>
    `;
  });
  html += '</div>';
  container.innerHTML = html;
}

async function loadSopCategories() {
  try {
    const res = await apiRequest('/api/sop/categories');
    const categories = res.data || res.categories || [];
    const categoryFilter = document.getElementById('sopCategoryFilter');
    if (!categoryFilter) return;
    categoryFilter.innerHTML = '<option value="">所有分類</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      categoryFilter.appendChild(option);
    });
  } catch (err) {
    console.error('載入分類失敗:', err);
  }
}

async function loadSops() {
  const container = document.getElementById('sopsList');
  if (!container) return;
  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">載入SOP文件中...</div>
    </div>
  `;
  try {
    const categoryId = document.getElementById('sopCategoryFilter')?.value || '';
    let url = '/api/sops?document_type=SOP&status=published';
    if (categoryId) url += `&category=${encodeURIComponent(categoryId)}`;
    const data = await apiRequest(url);
    const sops = data.data || data.sops || [];
    renderSops(sops);
  } catch (err) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#999;">載入失敗：${err.message}</div>`;
  }
}

function renderSops(sops) {
  const container = document.getElementById('sopsList');
  if (!container) return;
  if (!sops || sops.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:#999;">尚無SOP文件</div>`;
    return;
  }
  const grouped = {};
  sops.forEach(s => { const k = s.category_name || '未分類'; (grouped[k] ||= []).push(s); });
  let html = '';
  Object.entries(grouped).forEach(([cat, arr]) => {
    html += `
      <div style="margin-bottom:30px;">
        <h3 style="color:var(--primary-color);margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid var(--border-color);">${cat} (${arr.length})</h3>
        <div style="display:grid;gap:12px;">
          ${arr.map(s => `
            <div class="doc-card" data-sop-id="${s.id}">
              <div class="doc-title">
                <span class="material-symbols-outlined" style="color:var(--primary-color);margin-right:8px;vertical-align:middle;">description</span>
                ${escapeHtml(s.title)}
              </div>
              <div class="doc-meta">
                <div class="doc-meta-item"><span class="material-symbols-outlined">tag</span><span>版本 ${escapeHtml(s.version)}</span></div>
                <div class="doc-meta-item"><span class="material-symbols-outlined">calendar_today</span><span>${new Date(s.updated_at).toLocaleDateString('zh-TW')}</span></div>
                ${s.business_type ? `<span class="category-badge">${escapeHtml(s.business_type)}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  
  // 為每個 SOP 卡片添加點擊事件
  container.querySelectorAll('.doc-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const sopId = card.getAttribute('data-sop-id');
      if (sopId) viewSop(sopId);
    });
  });
}

// 查看 SOP 詳情
async function viewSop(sopId) {
  try {
    const res = await apiRequest(`/api/sops/${sopId}`);
    const sop = res.data || res.sop || res;
    
    // 顯示 SOP 詳情模態框
    showSopDetailModal(sop);
  } catch (error) {
    console.error('載入SOP詳情失敗:', error);
    showNotification('載入SOP詳情失敗', 'error');
  }
}

// 顯示 SOP 詳情模態框
function showSopDetailModal(sop) {
  const modalHTML = `
    <div class="modal-overlay" id="sopDetailModal">
      <div class="modal" style="max-width: 900px;">
        <div class="modal-header">
          <h2>${escapeHtml(sop.title)}</h2>
          <button class="modal-close" onclick="closeSopDetailModal()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; gap: 15px; flex-wrap: wrap; font-size: 14px; color: var(--text-secondary);">
              <div><strong>版本：</strong>${escapeHtml(sop.version)}</div>
              <div><strong>分類：</strong>${escapeHtml(sop.category_name || '未分類')}</div>
              ${sop.business_type ? `<div><strong>業務類型：</strong>${escapeHtml(sop.business_type)}</div>` : ''}
              <div><strong>狀態：</strong>${sop.status === 'published' ? '已發布' : '草稿'}</div>
              <div><strong>更新日期：</strong>${new Date(sop.updated_at).toLocaleString('zh-TW')}</div>
            </div>
          </div>
          <div class="sop-content" style="line-height: 1.8; color: var(--text-primary);">
            ${sop.content ? sop.content.replace(/\n/g, '<br>') : '<em style="color: var(--text-secondary);">暫無內容</em>'}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeSopDetailModal()">關閉</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 關閉 SOP 詳情模態框
function closeSopDetailModal() {
  const modal = document.getElementById('sopDetailModal');
  if (modal) modal.remove();
}

window.loadSops = loadSops;
window.viewSop = viewSop;
window.closeSopDetailModal = closeSopDetailModal;
