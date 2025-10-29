# 開發指南

**給 AI：** 實現所有功能的完整技術規格

---

## 🚨 開始前必讀（每次都要！）

**收到用戶需求後，按順序閱讀：**

1. **[開始前檢查清單.md](./開始前檢查清單.md)** ⭐⭐⭐
   - 確認編碼設定（繁體中文 UTF-8）
   - 列出需要修改的文檔
   - 準備驗證命令
   
2. **[AI開發須知.md](./AI開發須知.md)** ⭐⭐
   - 核心原則（禁止事項、必須遵守）
   - 標準開發流程
   - 編碼處理規範

3. **對應的完整規格** ⭐
   - 例如：客戶管理-完整規格.md
   - 包含所有技術細節

**然後才開始開發！**

---

## 📚 完整規格文檔清單

### 核心功能（5個）
1. **[客戶管理-完整規格.md](./客戶管理-完整規格.md)** ✅
   - 資料表：Clients, CustomerTags, ClientTagAssignments (3個)
   - API：7個端點
   
2. **[工時管理-完整規格.md](./工時管理-完整規格.md)** ✅
   - 資料表：TimeLogs, WorkTypes, OvertimeRates, CompensatoryLeave (4個)
   - API：5個端點
   
3. **[假期管理-完整規格.md](./假期管理-完整規格.md)** ✅
   - 資料表：LeaveApplications, LeaveTypes, AnnualLeaveRules, OtherLeaveRules (4個)
   - API：5個端點
   
4. **[任務管理-完整規格.md](./任務管理-完整規格.md)** ✅
   - 資料表：TaskTemplates, TaskStageTemplates, ActiveTasks, ActiveTaskStages, ClientServices (5個)
   - API：12個端點

5. **[知識管理-完整規格.md](./知識管理-完整規格.md)** ✅
   - 資料表：SOPDocuments, ClientSOPLinks, KnowledgeArticles (3個)
   - API：12個端點

### 系統功能（3個）
6. **[業務規則-完整規格.md](./業務規則-完整規格.md)** ✅
   - 資料表：Holidays, LeaveTypes, OvertimeRates, AnnualLeaveRules, OtherLeaveRules, ServiceFrequencyTypes, Services (7個)
   - API：30+個端點

7. **[外部內容管理-完整規格.md](./外部內容管理-完整規格.md)** ✅
   - 資料表：ExternalArticles, ExternalFAQ, ResourceCenter, ExternalImages (4個)
   - API：15個端點
   
8. **[系統基礎-完整規格.md](./系統基礎-完整規格.md)** ✅
   - 資料表：Users, Settings, AuditLogs (3個)
   - API：12個端點
   - 包含：認證、員工管理、個人資料、系統設定、審計日誌

### 新增功能（v3.2）（5個）
9. **[薪資管理-完整規格.md](./薪資管理-完整規格.md)** ✅
   - 資料表：SalaryItemTypes, EmployeeSalaryItems, MonthlyPayroll, OvertimeRecords (5個，含 Users 擴充)
   - API：8個端點
   - 包含：靈活薪資結構、月薪制計算、全勤機制、薪資報表

10. **[管理成本-完整規格.md](./管理成本-完整規格.md)** ✅
    - 資料表：OverheadCostTypes, MonthlyOverheadCosts (2個)
    - API：6個端點
    - 包含：成本項目管理、月度成本記錄、成本分攤計算

11. **[發票收款-完整規格.md](./發票收款-完整規格.md)** ✅
    - 資料表：Receipts, ReceiptItems, ReceiptSequence, Payments (4個)
    - API：10個端點
    - 包含：收據管理、收款管理、應收帳款分析
    - ⚠️ 會計師事務所開立收據（無稅額），非發票

12. **[附件系統-完整規格.md](./附件系統-完整規格.md)** ✅
    - 資料表：Attachments (1個)
    - API：4個端點
    - 包含：Cloudflare R2 整合、檔案驗證、安全性控制

13. **[報表分析-完整規格.md](./報表分析-完整規格.md)** ✅
    - 資料表：無（使用現有表）
    - API：6個端點
    - 包含：客戶成本分析、員工工時分析、薪資報表、收款報表

### 必讀文檔
- **[如何開發.md](./如何開發.md)** ⭐ - 開發流程說明
- **[AI開發須知.md](./AI開發須知.md)** ⭐ - 核心原則
- **[共用規範.md](./共用規範.md)** ⭐ - 統一標準

---

## 🚀 如何使用

### 開發新功能時

**步驟1：** 閱讀對應的完整規格  
→ 例如：開發客戶管理 → 閱讀「客戶管理-完整規格.md」

**步驟2：** 理解內容  
- 資料表結構
- API 端點
- 前端組件
- 業務邏輯
- 測試案例

**步驟3：** 按順序實現  
1. 創建資料表
2. 實現後端（Repository → Service → Route）
3. 實現前端（API Service → Page → Components）
4. 測試驗證

**步驟4：** 遵循共用規範  
- API 響應格式
- 權限控制方式
- 錯誤處理標準

---

## 📝 文檔結構說明

### 每個完整規格文檔包含：

```markdown
# XX管理 - 完整開發規格

## 資料表
- CREATE TABLE 語句
- 索引設計
- 欄位說明

## API 端點
- 所有端點列表
- 請求/響應範例
- 權限要求

## 前端組件
- 頁面組件代碼
- 子組件代碼
- 狀態管理

## 後端實現
- Service 層代碼
- Repository 層代碼
- Route 層代碼

## 業務規則
- 驗證規則
- 計算邏輯
- 權限控制

## 測試案例
- 單元測試
- 集成測試
```

**所有技術細節集中在一個文檔！**

---

## 🎯 完整規格統計（v3.2）

**所有 13 個完整規格已完成：** ✅

| 規格文檔 | 資料表數 | API數 | 狀態 |
|---------|---------|------|------|
| 系統基礎 | 3 | 12 | ✅ |
| 客戶管理 | 3 | 7 | ✅ |
| 工時管理 | 4 | 12 | ✅ |
| 假期管理 | 4 | 14 | ✅ |
| 任務管理 | 5 | 16 | ✅ |
| 知識管理 | 3 | 10 | ✅ |
| 業務規則 | 7 | 6 | ✅ |
| 外部內容 | 4 | 8 | ✅ |
| **薪資管理** | **6** | **13** | ✅ |
| **管理成本** | **2** | **6** | ✅ |
| **收據收款** | **4** | **10** | ✅ |
| **附件系統** | **1** | **4** | ✅ |
| **報表分析** | **0** | **6** | ✅ |
| **總計** | **45個表** | **147個API** | ✅ |

**涵蓋所有 45 個資料表和 147 個 API 端點**

---

## ⚠️ 重要提醒

### 一致性原則（必須遵守！）

**核心原則：單一真相源（SSOT）**
- 資料表數量 → 只在 `系統資料/數據表清單.md` 定義
- API數量 → 只在 `系統資料/API清單.md` 定義
- 其他所有文檔都必須與SSOT一致

**快速驗證命令：**
```powershell
cd docs
Get-ChildItem -Filter "*.md" -Recurse | Select-String "個.*[表API]" | ForEach-Object {
    if ($_.Line -match '(\d+)個') { "$($_.FileName): $($matches[1])個" }
} | Sort-Object | Get-Unique
# 如果看到多個不同的數字 → 不一致！
```

**必須檢查：**
- ✅ 數字與SSOT一致（不依賴硬編碼）
- ✅ 交叉引用對稱（A→B 且 B→A）
- ✅ 格式規範統一
- ✅ 文檔完整無缺

**詳細驗證步驟：** [系統資料/一致性验证脚本.md](../系統資料/一致性验证脚本.md)

---

**AI 開發時只需閱讀開發指南目錄下的文檔即可！**

