document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('resourcesList');
  const searchEl = document.getElementById('resSearch');
  const typeEl = document.getElementById('resType');

  let all = [];
  try {
    const res = await fetch('/assets/data/resources.json');
    all = await res.json();
  } catch (_) {
    all = [];
  }

  function render(items) {
    if (!items || items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:32px; text-align:center; color:#777;">
          目前尚無資源，稍後再回來看看。
        </div>`;
      return;
    }
    const html = items.map(item => `
      <div class="report-content" style="background:#fff; border-radius:8px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <div class="report-body" style="padding:16px; display:flex; justify-content:space-between; gap:16px; align-items:center;">
          <div>
            <div style="font-weight:600; font-size:16px;">${item.title || '未命名資源'}</div>
            <div style="font-size:13px; color:#666; margin-top:4px;">${item.summary || ''}</div>
            <div style="font-size:12px; color:#999; margin-top:6px;">${item.type || ''} · ${item.updated_at || ''}</div>
          </div>
          <div style="display:flex; gap:8px;">
            ${item.download_url ? `<a class="btn btn-secondary" href="${item.download_url}" target="_blank">下載</a>` : ''}
            ${Array.isArray(item.calculator_urls) ? item.calculator_urls.map(u => `<a class="btn btn-primary" href="${u}" target="_blank">開啟計算機</a>`).join('') : ''}
          </div>
        </div>
      </div>
    `).join('');
    listEl.innerHTML = html;
  }

  function applyFilter() {
    const q = (searchEl.value || '').trim().toLowerCase();
    const t = typeEl.value;
    const filtered = all.filter(x => {
      const hitQ = !q || `${x.title} ${x.summary} ${x.tags}`.toLowerCase().includes(q);
      const hitT = !t || x.type === t;
      return hitQ && hitT;
    });
    render(filtered);
  }

  searchEl?.addEventListener('input', applyFilter);
  typeEl?.addEventListener('change', applyFilter);

  render(all);
});


