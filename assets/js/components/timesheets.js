// timesheets.js — 全面重寫版（模組化、單一來源、抗競態）

const onProdHost = location.hostname.endsWith('horgoscpa.com');
const apiBase = onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1';

// ---- Utility ----
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function showToast(message, isSuccess) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'message-toast show ' + (isSuccess ? 'success' : 'error');
  setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

async function safeJson(res) {
  try { return await res.json(); } catch (_) { return {}; }
}

// ---- State ----
const state = {
  currentWeekStart: getMonday(new Date()),
  clients: [],
  services: [
    { id: 1, name: '記帳服務' },
    { id: 2, name: '稅務申報' },
    { id: 3, name: '諮詢服務' },
  ],
  workTypes: [
    { id: 1, name: '正常工時', multiplier: 1.0, isOvertime: false, allowedOn: ['workday', 'makeup'] },
    { id: 2, name: '平日加班（前2小時）', multiplier: 1.34, isOvertime: true,  maxHours: 2, allowedOn: ['workday','makeup'] },
    { id: 3, name: '平日加班（後2小時）', multiplier: 1.67, isOvertime: true,  maxHours: 2, requiresTypes: [2], allowedOn: ['workday','makeup'] },
    { id: 4, name: '休息日加班（前2小時）', multiplier: 1.34, isOvertime: true,  maxHours: 2, allowedOn: ['restday'] },
    { id: 5, name: '休息日加班（第3-8小時）', multiplier: 1.67, isOvertime: true,  maxHours: 6, requiresTypes: [4], allowedOn: ['restday'] },
    { id: 6, name: '休息日加班（第9-12小時）', multiplier: 2.67, isOvertime: true, maxHours: 4, requiresTypes: [4,5], allowedOn: ['restday'] },
    { id: 7, name: '國定假日加班（8小時內）', multiplier: 2.0, isOvertime: true, maxHours: 8, allowedOn: ['national_holiday'] },
    { id: 8, name: '國定假日加班（第9-10小時）', multiplier: 1.34, isOvertime: true, maxHours: 2, requiresTypes: [7], allowedOn: ['national_holiday'] },
    { id: 9, name: '國定假日加班（第11-12小時）', multiplier: 1.67, isOvertime: true, maxHours: 2, requiresTypes: [7,8], allowedOn: ['national_holiday'] },
    { id: 10, name: '例假日加班（8小時內）', multiplier: 2.0, isOvertime: true, maxHours: 8, allowedOn: ['weekly_restday'] },
    { id: 11, name: '例假日加班（第9-12小時）', multiplier: 2.0, isOvertime: true, maxHours: 4, requiresTypes: [10], allowedOn: ['weekly_restday'] },
  ],
  holidays: new Map(),       // Map<iso, {is_national_holiday, is_makeup_workday, is_weekly_restday}>
  leaves: new Map(),         // Map<iso, {hours:number, types:[{type,hours}] }>
  rows: [],                  // [{ client_id, service_id, work_type_id, hours: [h0..h6] }]
  pending: new Map(),        // Map<`${rowIdx}_${dayIdx}`, {rowIndex, dayIndex, value}>
  weekDateTypes: new Map(),  // Map<iso, type>
  weekDays: [],              // [{index, iso, dow, type, mustWork}]
  dailyNormalHours: new Map(), // Map<iso, hours>
  token: 0,
  ready: false,
};

// ---- Week Model ----
function buildWeekDays() {
  state.weekDateTypes.clear();
  state.weekDays = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(state.currentWeekStart);
    d.setDate(d.getDate() + i);
    const iso = formatDate(d);
    const h = state.holidays.get(iso);
    const dow = d.getDay();
    const type = h && h.is_national_holiday ? 'national_holiday'
               : h && h.is_makeup_workday ? 'makeup'
               : dow === 0 ? 'weekly_restday'
               : dow === 6 ? 'restday'
               : 'workday';
    const mustWork = (type === 'workday' || type === 'makeup');
    state.weekDateTypes.set(iso, type);
    state.weekDays.push({ index: i, iso, dow, type, mustWork });
  }
}

// ---- API ----
async function loadClients() {
  const res = await fetch(`${apiBase}/clients?perPage=100`, { credentials: 'include' });
  if (res.ok) {
    const json = await safeJson(res);
    state.clients = json.data || [];
  }
}

async function loadHolidays() {
  const weekEnd = new Date(state.currentWeekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const params = new URLSearchParams({ start_date: formatDate(state.currentWeekStart), end_date: formatDate(weekEnd) });
  const res = await fetch(`${apiBase}/holidays?${params}`, { credentials: 'include' });
  if (res.ok) {
    const json = await safeJson(res);
    state.holidays.clear();
    (json.data || []).forEach(h => state.holidays.set(h.date, h));
  }
}

async function loadLeaves() {
  const weekEnd = new Date(state.currentWeekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const params = new URLSearchParams({ dateFrom: formatDate(state.currentWeekStart), dateTo: formatDate(weekEnd), status: 'approved' });
  const res = await fetch(`${apiBase}/leaves?${params}`, { credentials: 'include' });
  if (!res.ok) return;
  const json = await safeJson(res);
  state.leaves.clear();
  (json.data || []).forEach(leave => {
    const startStr = leave.start || '';
    const endStr = leave.end || '';
    const amount = leave.amount || 0;
    const unit = leave.unit || 'day';
    const leaveType = leave.type || leave.leave_type || 'other';
    if (!startStr || !endStr) return;
    let hoursPerDay = unit === 'hour' ? amount : amount * 8;
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const cur = new Date(start);
    while (cur <= end) {
      const iso = formatDate(cur);
      const info = state.leaves.get(iso) || { hours: 0, types: [] };
      info.hours += hoursPerDay;
      info.types.push({ type: leaveType, hours: hoursPerDay });
      state.leaves.set(iso, info);
      cur.setDate(cur.getDate() + 1);
    }
  });
}

async function loadTimesheets() {
  const weekEnd = new Date(state.currentWeekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const params = new URLSearchParams({ start_date: formatDate(state.currentWeekStart), end_date: formatDate(weekEnd) });
  const res = await fetch(`${apiBase}/timelogs?${params}`, { credentials: 'include' });
  if (res.status === 401) { location.assign('/login?redirect=/internal/timesheets'); return; }
  const json = await safeJson(res);
  organizeRows(json.ok ? (json.data || []) : []);
}

function organizeRows(data) {
  const rowMap = new Map();
  state.dailyNormalHours = new Map();
  data.forEach(log => {
    const key = `${log.client_id}_${log.service_id}_${log.work_type_id}`;
    if (!rowMap.has(key)) {
      rowMap.set(key, { client_id: log.client_id, service_id: log.service_id, work_type_id: log.work_type_id, hours: Array(7).fill(null) });
    }
    const row = rowMap.get(key);
    const logDate = new Date(String(log.work_date) + 'T00:00:00');
    const weekStart = new Date(state.currentWeekStart); weekStart.setHours(0,0,0,0);
    const dayIndex = Math.floor((logDate - weekStart) / 86400000);
    if (dayIndex >= 0 && dayIndex < 7) row.hours[dayIndex] = log.hours;
    const iso = formatDate(logDate);
    if (String(log.work_type_id) === '1' || log.work_type_id === 1) {
      state.dailyNormalHours.set(iso, (state.dailyNormalHours.get(iso) || 0) + Number(log.hours || 0));
    }
  });
  state.rows = Array.from(rowMap.values());
  if (state.rows.length === 0) state.rows.push({ client_id:'', service_id:'', work_type_id:'', hours: Array(7).fill(null) });
}

// ---- Rendering ----
function renderWeekHeader() {
  const weekStart = new Date(state.currentWeekStart);
  const weekEnd = new Date(state.currentWeekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const title = document.getElementById('weekTitle');
  if (title) title.textContent = `${weekStart.getFullYear()}年${weekStart.getMonth()+1}月${weekStart.getDate()}日 - ${weekEnd.getMonth()+1}月${weekEnd.getDate()}日`;
  state.weekDays.forEach(day => {
    const d = new Date(state.currentWeekStart); d.setDate(d.getDate() + day.index);
    const label = document.getElementById(`dateLabel${day.index}`);
    if (!label) return;
    let text = `${d.getMonth()+1}/${d.getDate()}`;
    let cls = 'date-badge';
    if (day.type === 'national_holiday') { cls = 'date-badge badge-holiday'; text += ' 國定'; }
    else if (day.type === 'makeup') { cls = 'date-badge badge-makeup'; text += ' 補班'; }
    else if (day.dow === 0) { cls = 'date-badge badge-weekend'; text += ' 例假'; }
    else if (day.dow === 6) { cls = 'date-badge badge-weekend'; text += ' 休息'; }
    label.textContent = text; label.className = cls;
  });
}

function renderTable() {
  const tbody = document.getElementById('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  state.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');

    // 客戶
    const tdClient = document.createElement('td');
    const selClient = document.createElement('select');
    selClient.className = 'cell-select';
    selClient.innerHTML = '<option value="">請選擇客戶...</option>';
    state.clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.clientId || c.client_id;
      opt.textContent = c.companyName || c.company_name || c.name || '';
      if ((c.clientId || c.client_id) == row.client_id) opt.selected = true;
      selClient.appendChild(opt);
    });
    selClient.addEventListener('change', e => { state.rows[rowIndex].client_id = e.target.value; });
    tdClient.appendChild(selClient); tr.appendChild(tdClient);

    // 業務類型
    const tdService = document.createElement('td');
    const selService = document.createElement('select');
    selService.className = 'cell-select'; selService.innerHTML = '<option value="">請選擇業務...</option>';
    state.services.forEach(s => {
      const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.name; if (s.id == row.service_id) opt.selected = true; selService.appendChild(opt);
    });
    selService.addEventListener('change', e => { state.rows[rowIndex].service_id = e.target.value; });
    tdService.appendChild(selService); tr.appendChild(tdService);

    // 工時類型
    const tdType = document.createElement('td');
    const selType = document.createElement('select');
    selType.className = 'cell-select'; selType.innerHTML = '<option value="">請選擇工時類型...</option>';
    state.workTypes.forEach(wt => {
      const opt = document.createElement('option'); opt.value = wt.id; opt.textContent = wt.name; if (wt.id == row.work_type_id) opt.selected = true; selType.appendChild(opt);
    });
    selType.addEventListener('change', e => {
      state.rows[rowIndex].work_type_id = e.target.value;
      // 變更後清理不合法的已有輸入
      for (let i = 0; i < 7; i++) {
        const hours = state.rows[rowIndex].hours[i];
        if (!hours) continue;
        const date = new Date(state.currentWeekStart); date.setDate(date.getDate() + i);
        const allowed = getAvailableWorkTypes(date).some(x => x.id == e.target.value);
        if (!allowed) { state.rows[rowIndex].hours[i] = null; const cell = tr.children[i+3]?.querySelector('input'); if (cell) { cell.value=''; cell.classList.remove('has-value'); } }
      }
    });
    tdType.appendChild(selType); tr.appendChild(tdType);

    // 7 天輸入
    for (let i = 0; i < 7; i++) {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number'; input.step = '0.5'; input.min = '0'; input.max = '12'; input.className = 'cell-input';
      input.value = row.hours[i] || ''; input.placeholder = '-';
      if (row.hours[i]) input.classList.add('has-value');
      input.addEventListener('focus', function(){ this.classList.add('editing'); });
      input.addEventListener('blur', async function(){ this.classList.remove('editing'); await saveCell(rowIndex, i, this.value); });
      input.addEventListener('input', function(){
        const key = `${rowIndex}_${i}`; state.pending.set(key, { rowIndex, dayIndex: i, value: this.value }); updateSaveButton();
      });
      td.appendChild(input); tr.appendChild(td);
    }

    // 操作欄
    const tdAct = document.createElement('td'); tdAct.className = 'row-actions';
    const btn = document.createElement('button'); btn.className = 'btn-delete-row'; btn.textContent = '×'; btn.addEventListener('click', () => deleteRow(rowIndex));
    tdAct.appendChild(btn); tr.appendChild(tdAct);

    tbody.appendChild(tr);
  });

  updateSummary();
  renderLeaveRow();
  renderCompleteness();
}

function renderLeaveRow() {
  const row = document.getElementById('leave-records-row'); if (!row) return;
  while (row.children.length > 3) row.removeChild(row.lastChild);
  const names = { annual:'特休', sick:'病假', personal:'事假', compensatory:'補休', maternity:'產假', paternity:'陪產假', menstrual:'生理假', marriage:'婚假', bereavement:'喪假', official:'公假', other:'其他' };
  for (let i = 0; i < 7; i++) {
    const d = new Date(state.currentWeekStart); d.setDate(d.getDate() + i); const iso = formatDate(d);
    const info = state.leaves.get(iso);
    const td = document.createElement('td'); td.style.backgroundColor = '#e7f3ff'; td.style.color = '#0066cc'; td.style.fontSize='12px'; td.style.fontWeight='600'; td.style.padding='8px'; td.style.textAlign='center';
    if (info && info.hours > 0) {
      const first = info.types[0]; const nm = names[first.type] || '請假'; td.textContent = `${nm} ${info.hours}h`;
      td.title = info.types.map(t => `${names[t.type]||'請假'} ${t.hours}h`).join(' + ');
    } else { td.style.color='#999'; td.textContent='-'; }
    row.appendChild(td);
  }
  const tail = document.createElement('td'); tail.style.backgroundColor='#e7f3ff'; row.appendChild(tail);
}

function renderCompleteness() {
  const row = document.getElementById('completeness-row'); if (!row) return; if (!state.ready) return;
  while (row.children.length > 3) row.removeChild(row.lastChild);
  for (let i = 0; i < 7; i++) {
    const d = new Date(state.currentWeekStart); d.setDate(d.getDate() + i); const iso = formatDate(d);
    const meta = state.weekDays[i];
    const td = document.createElement('td'); td.style.textAlign='center'; td.style.fontSize='12px'; td.style.padding='8px';
    if (!meta.mustWork) { td.textContent = ''; row.appendChild(td); continue; }
    const normal = Number(state.dailyNormalHours.get(iso) || 0);
    const leaveHours = Number((state.leaves.get(iso)?.hours) || 0);
    const total = normal + leaveHours; const missing = Math.max(0, 8 - total);
    td.style.fontWeight='600';
    if (total >= 8) { td.style.backgroundColor='#d4edda'; td.style.color='#155724'; td.textContent='✓ 完整'; td.title = leaveHours>0 ? `工時 ${normal}h + 請假 ${leaveHours}h = ${total}h` : `工時 ${normal}h`; }
    else if (total >= 6) { td.style.backgroundColor='#fff3cd'; td.style.color='#856404'; td.textContent=`⚠ 缺${missing}h`; td.title = `工時 ${normal}h + 請假 ${leaveHours}h = ${total}h，還缺 ${missing}h`; }
    else { td.style.backgroundColor='#f8d7da'; td.style.color='#721c24'; td.textContent=`✗ 缺${missing}h`; td.title = `工時 ${normal}h + 請假 ${leaveHours}h = ${total}h，還缺 ${missing}h`; }
    row.appendChild(td);
  }
  row.appendChild(document.createElement('td'));
}

function updateSummary() {
  let total = 0, overtime = 0, weighted = 0;
  state.rows.forEach(r => {
    const wt = state.workTypes.find(x => x.id == r.work_type_id); if (!wt) return;
    r.hours.forEach(h => { if (h && h > 0) { total += h; if (wt.isOvertime) overtime += h; weighted += h * wt.multiplier; } });
  });
  const toEl = document.getElementById('sumTotal'); if (toEl) toEl.textContent = total.toFixed(1);
  const otEl = document.getElementById('sumOvertime'); if (otEl) otEl.textContent = overtime.toFixed(1);
  const wgEl = document.getElementById('sumWeighted'); if (wgEl) wgEl.textContent = weighted.toFixed(1);
}

function updateSaveButton() {
  const btn = document.getElementById('btnSaveAll'); if (!btn) return;
  if (state.pending.size > 0) { btn.disabled = false; btn.textContent = `儲存所有變更 (${state.pending.size})`; }
  else { btn.disabled = true; btn.textContent = '儲存所有變更'; }
}

function getAvailableWorkTypes(date) {
  const type = state.weekDateTypes.get(formatDate(date));
  return state.workTypes.filter(wt => !wt.allowedOn || wt.allowedOn.includes(type));
}

async function saveCell(rowIndex, dayIndex, value) {
  const row = state.rows[rowIndex]; if (!row) return;
  if (!row.client_id || !row.service_id || !row.work_type_id) { if (value) showToast('請先選擇客戶、業務類型與工時類型', false); return; }
  const hours = parseFloat(value);
  if (!value || !Number.isFinite(hours) || hours <= 0) { row.hours[dayIndex] = null; return; }
  const rounded = Math.round(hours * 2) / 2; if (Math.abs(hours - rounded) > 0.01) { showToast('工時必須為0.5的倍數', false); return; }
  const wt = state.workTypes.find(x => x.id == row.work_type_id); if (!wt) { showToast('請選擇有效的工時類型', false); return; }
  const date = new Date(state.currentWeekStart); date.setDate(date.getDate() + dayIndex);
  const allowed = getAvailableWorkTypes(date).some(x => x.id == row.work_type_id); if (!allowed) { showToast('該日期不可使用此工時類型', false); return; }
  if (wt.maxHours && rounded > wt.maxHours) { showToast(`${wt.name}最多只能填 ${wt.maxHours} 小時`, false); return; }
  if (wt.requiresTypes && wt.requiresTypes.length) {
    const existing = new Set();
    state.rows.forEach(r => { if (r.hours[dayIndex] && r.hours[dayIndex] > 0) existing.add(r.work_type_id); });
    if (wt.requiresTypes.some(req => !existing.has(req))) { showToast('請先填寫前置加班類型', false); return; }
  }

  const payload = { work_date: formatDate(date), client_id: row.client_id, service_id: row.service_id, work_type_id: row.work_type_id, hours: rounded, notes: '' };
  try {
    const res = await fetch(`${apiBase}/timelogs`, { method: 'POST', headers: { 'Content-Type':'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
    if (res.status === 401) { location.assign('/login?redirect=/internal/timesheets'); return; }
    const json = await safeJson(res);
    if (res.ok && json.ok) {
      row.hours[dayIndex] = rounded; showToast('已儲存', true);
      // 局部重算
      await loadTimesheets();
      renderCompleteness(); updateSummary();
    } else { row.hours[dayIndex] = null; showToast(json.message || '儲存失敗', false); renderTable(); }
  } catch (e) { row.hours[dayIndex] = null; showToast('無法連接伺服器', false); renderTable(); }
}

async function deleteRow(rowIndex) {
  if (!confirm('刪除此列將清除本週該組合的所有工時，確定刪除？')) return;
  const row = state.rows[rowIndex];
  if (!row.client_id || !row.service_id || !row.work_type_id) {
    state.rows.splice(rowIndex, 1); renderTable(); updateSummary(); showToast('已刪除列', true); return;
  }
  const weekEnd = new Date(state.currentWeekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const payload = { start_date: formatDate(state.currentWeekStart), end_date: formatDate(weekEnd), client_id: row.client_id, service_id: String(row.service_id), work_type_id: String(row.work_type_id) };
  try {
    const res = await fetch(`${apiBase}/timelogs/batch`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
    const json = await safeJson(res);
    if (res.ok && json.ok) { showToast('已刪除列', true); await loadTimesheets(); renderTable(); }
    else showToast(json.message || '刪除失敗', false);
  } catch (e) { showToast('無法連接伺服器', false); }
}

function addRow() {
  state.rows.push({ client_id:'', service_id:'', work_type_id:'', hours: Array(7).fill(null) });
  renderTable(); updateSummary();
}

function resetWeekView() {
  state.rows = []; state.holidays.clear(); state.leaves.clear(); state.weekDateTypes.clear(); state.weekDays = []; state.pending.clear(); state.ready = false; state.token++;
  const tbody = document.getElementById('tbody'); if (tbody) tbody.innerHTML='';
  const leaveRow = document.getElementById('leave-records-row'); if (leaveRow) while (leaveRow.children.length > 3) leaveRow.removeChild(leaveRow.lastChild);
  const compRow = document.getElementById('completeness-row'); if (compRow) while (compRow.children.length > 3) compRow.removeChild(compRow.lastChild);
  updateSaveButton();
}

async function loadWeek() {
  const token = ++state.token; state.ready = false;
  await Promise.all([loadHolidays(), loadLeaves()]); if (token !== state.token) return;
  buildWeekDays(); renderWeekHeader(); if (token !== state.token) return;
  await loadTimesheets(); if (token !== state.token) return;
  state.ready = true; renderTable();
  requestAnimationFrame(() => { renderLeaveRow(); renderCompleteness(); });
}

async function init() {
  try { await loadClients(); } catch (_) {}
  await loadWeek();
  // events
  document.getElementById('btnPrevWeek')?.addEventListener('click', async () => { resetWeekView(); state.currentWeekStart.setDate(state.currentWeekStart.getDate() - 7); await loadWeek(); });
  document.getElementById('btnNextWeek')?.addEventListener('click', async () => { resetWeekView(); state.currentWeekStart.setDate(state.currentWeekStart.getDate() + 7); await loadWeek(); });
  document.getElementById('btnThisWeek')?.addEventListener('click', async () => { resetWeekView(); state.currentWeekStart = getMonday(new Date()); await loadWeek(); });
  document.getElementById('btnAddRow')?.addEventListener('click', addRow);
  document.getElementById('btnSaveAll')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnSaveAll'); if (!btn) return; btn.disabled = true; btn.textContent = '儲存中...';
    let ok = 0, fail = 0; for (const [, change] of state.pending) { try { await saveCell(change.rowIndex, change.dayIndex, change.value); ok++; } catch { fail++; } }
    state.pending.clear(); updateSaveButton(); showToast(`已儲存 ${ok} 筆${fail?`，${fail} 筆失敗`:''}`, fail===0);
  });
}

// 模組載入後自動初始化（defer）
init();


