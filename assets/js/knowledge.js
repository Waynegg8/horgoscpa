// 知識庫頁面腳本（抽離自 knowledge.html）

// 使用 auth-common.js 提供的 sessionToken 與 currentUser

document.addEventListener('DOMContentLoaded', async () => {
  await initPage(async () => {
    await loadSopCategories();
    await loadSops();
  });
});

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
}

window.loadSops = loadSops;
