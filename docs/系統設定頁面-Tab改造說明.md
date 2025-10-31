# 系統設定頁面 Tab 改造說明

## 修改日期
2025-10-31

## 修改目的
將系統設定頁面改造為Tab式結構，將系統中所有資料庫表都囊括在內，方便後續逐一完成各模組的CRUD功能。

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

共14個Tab，涵蓋系統所有主要資料表：

| Tab名稱 | 資料表 | 用途 |
|---------|--------|------|
| 系統基礎 | Settings | 系統參數設定（已完成） |
| 用戶管理 | Users | 員工帳號與權限管理 |
| 客戶管理 | Clients | 客戶資料管理 |
| 任務管理 | Tasks, TaskTemplates | 任務與任務模板 |
| 工時管理 | Timesheets | 員工工時記錄 |
| 假期管理 | Leaves, CompensatoryLeaveGrants, Holidays | 假期、補休、國定假日 |
| 收據收款 | Receipts, BillingSchedule | 收據與帳單管理 |
| 薪資管理 | Payroll | 薪資計算與發放 |
| 成本管理 | Overhead | 公司成本分析 |
| 附件系統 | Attachments | 檔案附件管理 |
| 知識庫 | SOP | 內部知識文件 |
| 服務生命週期 | ClientServicesLifecycle, ServiceStructure | 客戶服務流程 |
| CMS內容 | CMS | 官網內容管理 |
| 自動化規則 | AutomationRules, CronExecutions | 自動化規則與定時任務 |

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
- `.settings-tabs` - Tab導覽列容器
- `.tab-btn` - Tab按鈕樣式
- `.tab-btn.active` - 啟用狀態Tab樣式
- `.tab-panel` - Tab面板容器
- `.db-info` - 資料表資訊框樣式
- 響應式設計調整（支援手機瀏覽）

#### 特點：
- 支援橫向滾動（當tab太多時）
- 平滑的切換動畫效果
- 啟用tab下方有藍色指示線
- 響應式設計，移動端友善

## 使用說明

### 當前狀態
- ✅ **系統基礎** tab已完成，包含所有系統設定功能
- ⏳ 其他13個tab為佔位符，標註"此模組尚未完成，後續開發中..."

### 後續開發
逐個完成每個tab的功能：
1. 從最重要的模組開始（如用戶管理、客戶管理）
2. 每個模組包含：
   - 列表展示（讀取資料）
   - 新增功能
   - 編輯功能
   - 刪除功能
   - 搜尋與篩選
3. 完成後可移除"尚未完成"提示

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

## 測試建議

1. 測試tab切換功能是否順暢
2. 測試響應式設計（手機、平板）
3. 測試權限控制（非管理員無法訪問）
4. 測試各模組的CRUD功能（開發完成後）

## 相關文件

- [系統設定 - 後端規格](./開發指南/後端/系統基礎-後端規格.md)
- [系統設定 - 前端規格](./開發指南/前端/系統基礎-前端規格.md)
- [資料庫規範](./開發指南/開發須知/資料庫-D1-規範.md)

