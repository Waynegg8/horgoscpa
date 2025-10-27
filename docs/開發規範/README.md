# 開發規範索引

**目的：** 統一開發標準，確保代碼質量和可維護性  
**適用範圍：** 所有開發人員和 AI 助手  
**最後更新：** 2025年10月27日

---

## 概述

本目錄包含所有開發相關的規範和指南，包括代碼規範、文檔結構、AI 開發指南等。

---

## 規範文檔列表

### 核心規範

| 文檔 | 說明 | 適用對象 |
|------|------|---------|
| [文檔結構指南](./文檔結構指南.md) | 四層金字塔文檔結構 | 文檔撰寫者、AI |
| [代碼規範](./代碼規範.md) | 命名、架構、API 規範 | 開發人員、AI |
| [AI 開發指南](../AI開發指南.md) | AI 開發流程和最佳實踐 | AI 助手 |

---

## 四層金字塔文檔結構

詳見：[文檔結構指南](./文檔結構指南.md)

```
第1層：功能模塊（功能概覽）
  ├─ 使用場景
  ├─ 子功能列表
  └─ 索引鏈接
  
第2層：技術規格（實現細節）
  ├─ UI 設計
  ├─ 業務邏輯
  └─ 測試案例
  
第3層：API 規格（接口定義）
  ├─ _概覽.md
  └─ 各端點詳細規格
  
第4層：資料庫設計（數據結構）
  └─ 各資料表詳細設計
```

---

## 代碼規範重點

詳見：[代碼規範](./代碼規範.md)

### 命名規範

- **資料庫**：PascalCase（`Users`、`TimeLogs`）
- **API 端點**：kebab-case（`/api/v1/module-permissions`）
- **前端組件**：PascalCase（`UserProfile.vue`）
- **JavaScript/TypeScript**：camelCase（`getUserData`）

---

### 架構規範

#### 後端分層
```
Routes (路由定義)
  ↓
Controllers (請求處理)
  ↓
Services (業務邏輯)
  ↓
Repositories (資料存取)
  ↓
Database
```

#### 前端分層
```
Pages (頁面組件)
  ↓
Feature Components (功能組件)
  ↓
Stores (狀態管理)
  ↓
API Services (API 呼叫)
  ↓
HTTP Client
```

---

### RESTful API 規範

- **GET** - 獲取資源（不修改資料）
- **POST** - 創建資源
- **PUT** - 更新資源（完整更新）
- **PATCH** - 更新資源（部分更新）
- **DELETE** - 刪除資源

**端點命名範例：**
```
GET    /api/v1/users          # 獲取用戶列表
GET    /api/v1/users/:id      # 獲取特定用戶
POST   /api/v1/users          # 創建用戶
PUT    /api/v1/users/:id      # 更新用戶
DELETE /api/v1/users/:id      # 刪除用戶
```

---

## AI 開發流程

詳見：[AI 開發指南](../AI開發指南.md)

### 標準流程（4步驟）

```
步驟1：討論需求
  ↓
步驟2：更新設計文檔
  ↓
步驟3：基於文檔編碼
  ↓
步驟4：測試與優化
```

### 核心原則

1. **討論優先** - 先充分討論再動手
2. **文檔先行** - 先更新文檔再編碼
3. **基於文檔** - 嚴格按照文檔實現
4. **禁止修改外部網站** - 內部系統與外部網站完全分離

---

## 標準化原則

### 禁止硬編碼

❌ **錯誤做法：**
```javascript
const overtimeRate = 1.34; // 硬編碼在代碼中
```

✅ **正確做法：**
```javascript
const overtimeRate = await db.get('SELECT rate_multiplier FROM OvertimeRates WHERE ...');
```

---

### 使用管理介面

❌ **錯誤做法：**
```sql
-- 直接修改資料庫
UPDATE OvertimeRates SET rate_multiplier = 1.40 WHERE rate_id = 1;
```

✅ **正確做法：**
- 管理員透過網頁介面「業務規則管理 > 加班費率設定」修改
- API 處理驗證和更新邏輯

---

## 模塊化原則

### 單一職責

每個檔案只負責一個功能：

```
✅ services/user.service.js        # 只處理用戶業務邏輯
✅ repositories/user.repository.js # 只處理用戶資料存取
✅ components/UserProfile.vue      # 只顯示用戶資料
```

### 可重用性

共用邏輯抽取為獨立模塊：

```
✅ utils/dateHelper.js             # 日期處理工具
✅ components/common/Button.vue    # 共用按鈕組件
✅ composables/usePermissions.js   # 權限檢查邏輯
```

---

## 重要警告

### 🚨 外部網站禁止修改

詳見：[外部網站禁止修改清單](../🚨外部網站禁止修改清單.md)

**禁止修改的文件：**
- `index.html`（外部首頁）
- `services/*.html`（服務頁面）
- `blog.html`、`faq.html` 等
- `assets/css/`（外部樣式）
- `assets/images/`（外部圖片）

**原因：** 外部網站已上線，任何修改會影響現有客戶體驗。

---

## 相關文檔

- [功能模塊索引](../功能模塊/README.md) - 查看功能需求
- [技術規格索引](../技術規格/README.md) - 查看技術實現
- [API規格索引](../API規格/README.md) - 查看 API 定義
- [資料庫設計索引](../資料庫設計/README.md) - 查看資料表結構

---

**最後更新：** 2025年10月27日



**目的：** 統一開發標準，確保代碼質量和可維護性  
**適用範圍：** 所有開發人員和 AI 助手  
**最後更新：** 2025年10月27日

---

## 概述

本目錄包含所有開發相關的規範和指南，包括代碼規範、文檔結構、AI 開發指南等。

---

## 規範文檔列表

### 核心規範

| 文檔 | 說明 | 適用對象 |
|------|------|---------|
| [文檔結構指南](./文檔結構指南.md) | 四層金字塔文檔結構 | 文檔撰寫者、AI |
| [代碼規範](./代碼規範.md) | 命名、架構、API 規範 | 開發人員、AI |
| [AI 開發指南](../AI開發指南.md) | AI 開發流程和最佳實踐 | AI 助手 |

---

## 四層金字塔文檔結構

詳見：[文檔結構指南](./文檔結構指南.md)

```
第1層：功能模塊（功能概覽）
  ├─ 使用場景
  ├─ 子功能列表
  └─ 索引鏈接
  
第2層：技術規格（實現細節）
  ├─ UI 設計
  ├─ 業務邏輯
  └─ 測試案例
  
第3層：API 規格（接口定義）
  ├─ _概覽.md
  └─ 各端點詳細規格
  
第4層：資料庫設計（數據結構）
  └─ 各資料表詳細設計
```

---

## 代碼規範重點

詳見：[代碼規範](./代碼規範.md)

### 命名規範

- **資料庫**：PascalCase（`Users`、`TimeLogs`）
- **API 端點**：kebab-case（`/api/v1/module-permissions`）
- **前端組件**：PascalCase（`UserProfile.vue`）
- **JavaScript/TypeScript**：camelCase（`getUserData`）

---

### 架構規範

#### 後端分層
```
Routes (路由定義)
  ↓
Controllers (請求處理)
  ↓
Services (業務邏輯)
  ↓
Repositories (資料存取)
  ↓
Database
```

#### 前端分層
```
Pages (頁面組件)
  ↓
Feature Components (功能組件)
  ↓
Stores (狀態管理)
  ↓
API Services (API 呼叫)
  ↓
HTTP Client
```

---

### RESTful API 規範

- **GET** - 獲取資源（不修改資料）
- **POST** - 創建資源
- **PUT** - 更新資源（完整更新）
- **PATCH** - 更新資源（部分更新）
- **DELETE** - 刪除資源

**端點命名範例：**
```
GET    /api/v1/users          # 獲取用戶列表
GET    /api/v1/users/:id      # 獲取特定用戶
POST   /api/v1/users          # 創建用戶
PUT    /api/v1/users/:id      # 更新用戶
DELETE /api/v1/users/:id      # 刪除用戶
```

---

## AI 開發流程

詳見：[AI 開發指南](../AI開發指南.md)

### 標準流程（4步驟）

```
步驟1：討論需求
  ↓
步驟2：更新設計文檔
  ↓
步驟3：基於文檔編碼
  ↓
步驟4：測試與優化
```

### 核心原則

1. **討論優先** - 先充分討論再動手
2. **文檔先行** - 先更新文檔再編碼
3. **基於文檔** - 嚴格按照文檔實現
4. **禁止修改外部網站** - 內部系統與外部網站完全分離

---

## 標準化原則

### 禁止硬編碼

❌ **錯誤做法：**
```javascript
const overtimeRate = 1.34; // 硬編碼在代碼中
```

✅ **正確做法：**
```javascript
const overtimeRate = await db.get('SELECT rate_multiplier FROM OvertimeRates WHERE ...');
```

---

### 使用管理介面

❌ **錯誤做法：**
```sql
-- 直接修改資料庫
UPDATE OvertimeRates SET rate_multiplier = 1.40 WHERE rate_id = 1;
```

✅ **正確做法：**
- 管理員透過網頁介面「業務規則管理 > 加班費率設定」修改
- API 處理驗證和更新邏輯

---

## 模塊化原則

### 單一職責

每個檔案只負責一個功能：

```
✅ services/user.service.js        # 只處理用戶業務邏輯
✅ repositories/user.repository.js # 只處理用戶資料存取
✅ components/UserProfile.vue      # 只顯示用戶資料
```

### 可重用性

共用邏輯抽取為獨立模塊：

```
✅ utils/dateHelper.js             # 日期處理工具
✅ components/common/Button.vue    # 共用按鈕組件
✅ composables/usePermissions.js   # 權限檢查邏輯
```

---

## 重要警告

### 🚨 外部網站禁止修改

詳見：[外部網站禁止修改清單](../🚨外部網站禁止修改清單.md)

**禁止修改的文件：**
- `index.html`（外部首頁）
- `services/*.html`（服務頁面）
- `blog.html`、`faq.html` 等
- `assets/css/`（外部樣式）
- `assets/images/`（外部圖片）

**原因：** 外部網站已上線，任何修改會影響現有客戶體驗。

---

## 相關文檔

- [功能模塊索引](../功能模塊/README.md) - 查看功能需求
- [技術規格索引](../技術規格/README.md) - 查看技術實現
- [API規格索引](../API規格/README.md) - 查看 API 定義
- [資料庫設計索引](../資料庫設計/README.md) - 查看資料表結構

---

**最後更新：** 2025年10月27日



