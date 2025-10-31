# 系統設定頁面 Tab 改造說明

## 修改日期
2025-10-31 (v2 - 完整版)

## 修改目的
將系統設定頁面改造為Tab式結構，將系統中所有資料庫表都囊括在內，每個tab都包含完整的CRUD界面框架（表格、搜索、新增按鈕），方便後續實現具體的API對接。

## 重要修復
✅ **修復Tab切換問題**：移除了settings-content的flex布局，確保tab-panel的display屬性可以正確控制顯示/隱藏
✅ **添加完整UI框架**：每個資料表都有對應的表格、搜索欄、操作按鈕
✅ **響應式設計**：支援手機和平板瀏覽

## 修改內容

### 1. HTML 結構調整 (`settings.html`)

#### 新增 Tab 導覽列
```html
<nav class="settings-tabs">
  <button class="tab-btn active" data-tab="system">系統基礎</button>
  <button class="tab-btn" data-tab="users">用戶管理</button>
  <button class="tab-btn" data-tab="clients">客戶管理</button>
  <!-- ... 其他 tab -->
</nav>
```

#### Tab 面板結構
每個tab都包含：
- `tab-panel` 容器（帶有唯一ID）
- 資料表說明
- 主要欄位列表
- 未來功能開發區域

### 2. Tab 列表

共15個Tab，涵蓋系統所有主要資料表：

| Tab名稱 | 資料表 | UI狀態 | 功能 |
|---------|--------|--------|------|
| 系統參數 | Settings | ✅ 完成 | 系統參數設定（完整功能） |
| 用戶管理 | Users | 🔨 框架完成 | 員工帳號列表、搜索、新增/編輯/刪除 |
| 客戶管理 | Clients | 🔨 框架完成 | 客戶資料列表、搜索、新增/編輯/刪除 |
| 任務管理 | Tasks, TaskTemplates | 🔨 框架完成 | 任務列表、狀態篩選、新增/編輯/刪除 |
| 工時管理 | Timesheets | 🔨 框架完成 | 工時記錄列表、日期/員工篩選 |
| 假期管理 | Leaves, CompensatoryLeaveGrants | 🔨 框架完成 | 假期申請列表、類型/狀態篩選 |
| 收據收款 | Receipts, BillingSchedule | 🔨 框架完成 | 收據列表、收款狀態管理 |
| 薪資管理 | Payroll | 🔨 框架完成 | 薪資記錄列表、月份/員工篩選 |
| 成本管理 | Overhead | 🔨 框架完成 | 成本項目列表、類別篩選 |
| 附件系統 | Attachments | 🔨 框架完成 | 附件列表、類型篩選、下載/刪除 |
| 知識庫 | SOP | 🔨 框架完成 | SOP文件列表、分類管理 |
| 服務生命週期 | ClientServicesLifecycle | 🔨 框架完成 | 服務列表、狀態管理 |
| CMS內容 | CMS | 🔨 框架完成 | 內容列表、發布狀態管理 |
| 自動化規則 | AutomationRules | 🔨 框架完成 | 規則列表、啟用/停用管理 |
| 國定假日 | Holidays | 🔨 框架完成 | 假日列表、年份篩選 |

### 3. 每個Tab的UI組成

所有tab（除了系統參數）都包含：

1. **Tab標題列**（`.tab-header`）
   - 左側：模組標題（h2）
   - 右側：新增按鈕（`+ 新增XXX`）

2. **搜索列**（`.search-bar`）
   - 搜索輸入框
   - 篩選下拉選單
   - 搜索按鈕

3. **資料表格**（`.data-table-container`）
   - 表頭（欄位名稱）
   - 資料列（目前顯示"此功能開發中"）
   - 操作按鈕欄（編輯、刪除等）

### 3. JavaScript 功能

#### Tab 切換邏輯
```javascript
// Tab 切換功能
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    
    // 移除所有active狀態
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    
    // 添加當前tab的active狀態
    btn.classList.add('active');
    const targetPanel = document.getElementById('tab-' + targetTab);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  });
});
```

### 4. CSS 樣式調整 (`assets/css/settings-page.css`)

#### 新增樣式：

**Tab導覽**
- `.settings-tabs` - Tab導覽列容器
- `.tab-btn` - Tab按鈕樣式
- `.tab-btn.active` - 啟用狀態Tab樣式（藍色底線）
- `.tab-panel` - Tab面板容器（display: none/block控制）

**Tab內容佈局**
- `.tab-header` - Tab標題與操作列（flex佈局）
- `.search-bar` - 搜索列容器（flex佈局）
- `.data-table-container` - 表格容器（支援橫向滾動）
- `.data-table` - 資料表格樣式

**狀態標籤**
- `.status-badge` - 狀態標籤基礎樣式
- `.status-badge.active` - 啟用狀態（綠色）
- `.status-badge.pending` - 待處理（黃色）
- `.status-badge.rejected` - 拒絕（紅色）
- `.status-badge.draft` - 草稿（灰色）
- `.status-badge.in_progress` - 進行中（藍色）

#### 特點：
- ✅ 支援橫向滾動（當tab太多時）
- ✅ 平滑的切換動畫效果（fadeIn）
- ✅ 啟用tab下方有藍色指示線
- ✅ 表格hover效果
- ✅ 完整的響應式設計（支援手機、平板）
- ✅ 修復了tab切換問題（移除settings-content的flex布局）

## 使用說明

### 當前狀態
- ✅ **系統參數** tab已完成，包含所有系統設定功能（可正常使用）
- ✅ **Tab切換功能** 已修復，點擊tab可正確切換
- ✅ **UI框架** 所有14個資料管理tab都有完整的UI框架（表格、搜索、按鈕）
- ⏳ **資料載入** 各tab顯示"此功能開發中"，等待實現loadXXX()函數

### 後續開發步驟

對於每個tab，需要完成以下3個部分：

#### 1. 實現資料載入函數
在`settings.html`的JavaScript中找到對應的`loadXXX()`函數（目前是空的），實現：
```javascript
async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  try {
    const res = await fetch(`${apiBase}/admin/users`, { credentials:'include' });
    const json = await res.json();
    // 渲染資料到表格
    tbody.innerHTML = json.data.map(user => `
      <tr>
        <td>${user.user_id}</td>
        <td>${user.username}</td>
        <td>${user.name}</td>
        <!-- ... 更多欄位 -->
        <td class="action-btns">
          <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})">編輯</button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})">刪除</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">載入失敗</td></tr>';
  }
}
```

#### 2. 實現新增/編輯功能
- 為新增按鈕添加事件監聽器
- 顯示Modal對話框或跳轉到編輯頁面
- 實現表單提交邏輯

#### 3. 實現刪除功能
- 添加刪除確認對話框
- 呼叫刪除API
- 重新載入列表

### 開發優先順序建議
1. 用戶管理（Users）- 管理員需要
2. 客戶管理（Clients）- 核心業務
3. 任務管理（Tasks）- 日常運營
4. 工時管理（Timesheets）- 已有部分功能
5. 假期管理（Leaves）- 已有部分功能
6. 其他模組依需求排序

## 技術細節

### 資料表映射
所有tab都對應實際的D1資料庫表，migration檔案位於：
```
cloudflare/worker-router/migrations/
```

### API 架構
後續每個模組需要對應的API端點：
```
/internal/api/v1/admin/users          (用戶管理)
/internal/api/v1/admin/clients        (客戶管理 - 已存在)
/internal/api/v1/admin/tasks          (任務管理 - 已存在)
/internal/api/v1/admin/timesheets     (工時管理 - 已存在)
...
```

## 注意事項

1. **權限控制**：所有功能都需要管理員權限
2. **資料完整性**：修改前需要確認資料關聯性
3. **軟刪除**：大部分表支援軟刪除，需在UI中考慮
4. **審計記錄**：重要操作需記錄操作人與時間

## 快速測試指南

### 測試Tab切換功能
1. 打開瀏覽器訪問 `/internal/settings`
2. 確認可以看到15個tab按鈕
3. 點擊不同的tab，確認：
   - ✅ 內容能正確切換
   - ✅ 啟用的tab有藍色底線
   - ✅ 只顯示一個tab的內容
4. 在Chrome DevTools中切換到手機視圖，確認tab可以橫向滾動

### 測試系統參數Tab（已完成功能）
1. 切換到「系統參數」tab
2. 確認可以看到4個設定區塊：
   - 危險設定
   - 薪資相關參數
   - 成本分析參數
   - 一般設定
3. 嘗試修改參數並儲存
4. 確認權限控制（非管理員無法編輯）

### 測試其他Tab（UI框架）
1. 切換到任意其他tab（如「用戶管理」）
2. 確認可以看到：
   - ✅ Tab標題與新增按鈕
   - ✅ 搜索列與篩選器
   - ✅ 資料表格（顯示"此功能開發中"）
3. 確認UI排版正確、無錯位

### 測試響應式設計
1. 在Chrome DevTools中測試不同裝置：
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)
2. 確認在所有尺寸下UI都正常顯示

## 已知問題與限制

### 當前限制
- ❌ 各tab的資料載入功能尚未實現（顯示"此功能開發中"）
- ❌ 新增/編輯/刪除按鈕尚未綁定事件
- ❌ 搜索和篩選功能尚未實現
- ❌ 分頁功能尚未實現（當資料量大時）

### 計劃改進
- [ ] 添加Modal對話框組件（用於新增/編輯）
- [ ] 添加確認對話框組件（用於刪除）
- [ ] 添加分頁組件
- [ ] 添加批量操作功能
- [ ] 添加匯出功能（CSV/Excel）

## 相關文件

- [系統設定 - 後端規格](./開發指南/後端/系統基礎-後端規格.md)
- [系統設定 - 前端規格](./開發指南/前端/系統基礎-前端規格.md)
- [資料庫規範](./開發指南/開發須知/資料庫-D1-規範.md)

