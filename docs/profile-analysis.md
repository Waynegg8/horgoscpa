# 頁面分析報告

檔案： profile.html

---

## 第一部分：可標準化的 UI 組件審計

掃描此檔案的原始碼，找出所有可以被 ant-design-vue 組件替換的「手刻」UI 元素。

| 原始元素 | 建議的 antdv 組件 |
|---------|-----------------|
| 權限提示欄（permBar，第15行） | `<a-alert type="error">` 或 `<a-result status="403">`，使用 `v-if` 控制顯示 |
| 返回按鈕（第19行，`btn btn-secondary`） | `<a-button>` 配合 `<LeftOutlined />` 圖標，使用 `@click` 處理返回邏輯 |
| 卡片容器（card，第23行、第67行） | `<a-card>`，使用 `title` 和 `extra` slot 自定義標題區域 |
| 卡片標題區域（card-header，第24行、第68行） | `<a-card>` 的 `title` slot，或使用 `<a-typography-title>` 作為標題 |
| 卡片內容區域（card-body，第28行、第72行） | `<a-card>` 的默認內容區，無需額外包裝 |
| 表單組（form-group，第29行、第34行等） | `<a-form-item>`，使用 `label`、`required`、`rules` 屬性 |
| 文字輸入框（input type="text"，第31行、第36行、第41行） | `<a-input>`，使用 `v-model` 綁定，`disabled` 屬性控制只讀狀態 |
| 日期選擇器（input type="date"，第46行） | `<a-date-picker>`，使用 `v-model` 綁定，`format="YYYY-MM-DD"` |
| 下拉選單（select，第52行） | `<a-select>`，使用 `v-model` 綁定，`:options` 配置選項 |
| 密碼輸入框（input type="password"，第75行、第80行、第86行） | `<a-input-password>`，使用 `v-model` 綁定，支援顯示/隱藏密碼切換 |
| 提示文字（small，第47行、第57行、第81行） | `<a-form-item>` 的 `help` slot 或 `<a-typography-text type="secondary">` |
| 儲存按鈕（btn btn-primary，第61行） | `<a-button type="primary">`，使用 `:loading` 屬性顯示加載狀態 |
| 修改密碼按鈕（btn btn-warning，第90行） | `<a-button type="warning">` 或 `<a-button type="primary" danger>`，使用 `:loading` 屬性 |
| 內聯樣式（第17行、第26行、第31行等） | 移除所有 `style` 屬性，改用 Ant Design Vue 的組件屬性和間距系統（如 `:gutter`、`margin`） |
| 提示訊息（alert，第143行、第167行、第177行等） | `<a-message>` 或 `<a-notification>`，使用 `message.success()`、`message.error()` 等方法 |
| 確認對話框（confirm，第201行、第250行） | `<a-modal>` 配合 `confirm()` 方法，或使用 `Modal.confirm()` |
| 表單驗證邏輯（第176-179行、第235-248行） | `<a-form>` 配合 `:rules` 屬性進行表單驗證，使用 `validate()` 方法 |
| 只讀輸入框樣式（第31行、第36行、第41行的 `background:#f5f5f5`） | `<a-input>` 的 `disabled` 屬性，或使用 `<a-typography-text>` 顯示只讀數據 |

---

## 第二部分：頁面結構（子路由）拆分藍圖

分析此頁面中「堆疊」在一起的獨立功能區塊（例如 TAB 或多個 `<div class="content-card">`）。

### 父路由 (Parent) 外殼：

**Profile 主頁面外殼**應包含：
- 頁面標題區域（返回按鈕，第18-20行）
- 權限檢查與錯誤提示（第15行、第109-113行的權限驗證邏輯）
- 用戶身份判斷邏輯（第121-136行：判斷是否查看自己的資料或其他用戶的資料）
- 路由參數處理（第122-123行：從 URL 參數中獲取 `user_id`）
- 條件渲染邏輯（第130-132行：管理員查看其他用戶時隱藏修改密碼區塊）

### 子路由 (Children) 拆分：

1. **ProfileInfo 組件**（個人資料編輯）
   - 位置：第22-64行的個人資料卡片
   - 功能區塊：
     - 只讀欄位顯示（姓名、帳號、角色）
     - 可編輯欄位（到職日、性別）
     - 儲存按鈕與相關邏輯
   - 建議路由：作為主頁面的主要內容區域，或使用 `<a-tabs>` 拆分為標籤頁
   - 功能：`loadUserProfile()`（第148-169行）、`saveProfile()`（第172-209行）、`recalculateLeaveBalances()`（第212-227行）

2. **ChangePassword 組件**（修改密碼）
   - 位置：第66-93行的修改密碼卡片
   - 功能區塊：
     - 目前密碼輸入
     - 新密碼輸入
     - 確認新密碼輸入
     - 修改密碼按鈕與相關邏輯
   - 建議路由：作為主頁面的次要內容區域，或使用 `<a-tabs>` 拆分為標籤頁
   - 條件顯示：僅當 `isViewingOwnProfile === true` 時顯示（第130-132行）
   - 功能：`changePassword()`（第230-282行）

3. **UserProfileView 組件**（可選，用於管理員查看其他用戶）
   - 功能：當管理員查看其他用戶資料時，可以選擇是否顯示完整的編輯功能
   - 建議：可以與 `ProfileInfo` 組件共用，通過 `props` 控制編輯權限

---

## 第三部分：資料與邏輯 (API) 抽離建議

分析 `<script>` 區塊中的 fetch 邏輯。

### 建議：

**創建 `src/composables/useUserProfileApi.js` 檔案**，抽離以下 API 請求邏輯：

1. **`fetchCurrentUser()` 函數**
   - 位置：第109-119行的用戶信息獲取邏輯
   - 功能：獲取當前登入用戶的信息
   - API 端點：`GET /internal/api/v1/auth/me`
   - 返回：`Promise<{ ok: boolean, data: User }>`
   - 錯誤處理：401 狀態碼時重定向到登入頁面
   - 建議：此函數可能已存在於 `useAuthApi.js` 中，可重用

2. **`fetchUserProfile(userId)` 函數**
   - 位置：第150-155行的用戶資料獲取邏輯
   - 功能：根據用戶 ID 獲取用戶詳細資料
   - API 端點：`GET /internal/api/v1/users/:userId`
   - 參數：`userId: number`
   - 返回：`Promise<{ ok: boolean, data: UserProfile }>`
   - 錯誤處理：統一的錯誤處理邏輯

3. **`updateUserProfile(userId, data)` 函數**
   - 位置：第182-190行的個人資料更新邏輯
   - 功能：更新用戶的個人資料（到職日、性別）
   - API 端點：`PUT /internal/api/v1/users/:userId/profile`
   - 參數：
     - `userId: number`
     - `data: { hire_date: string, gender: string }`
   - 返回：`Promise<{ ok: boolean, message?: string }>`
   - 錯誤處理：統一的錯誤處理邏輯

4. **`changePassword(data)` 函數**
   - 位置：第255-263行的密碼修改邏輯
   - 功能：修改當前用戶的密碼
   - API 端點：`POST /internal/api/v1/auth/change-password`
   - 參數：`{ current_password: string, new_password: string }`
   - 返回：`Promise<{ ok: boolean, message?: string }>`
   - 錯誤處理：統一的錯誤處理邏輯
   - 建議：此函數可能已存在於 `useAuthApi.js` 中，可重用

5. **`recalculateLeaveBalances(userId)` 函數**
   - 位置：第214-217行的假期額度重新計算邏輯
   - 功能：重新計算用戶的假期額度
   - API 端點：`POST /internal/api/v1/leaves/recalculate-balances/:userId`
   - 參數：`userId: number`
   - 返回：`Promise<{ ok: boolean, message?: string }>`
   - 錯誤處理：統一的錯誤處理邏輯
   - 建議：此函數可能已存在於 `useLeavesApi.js` 中，可重用

6. **表單驗證邏輯**（可抽離到 `src/utils/validators.js`）
   - 個人資料表單驗證：到職日、性別必填驗證
   - 密碼表單驗證：目前密碼、新密碼、確認新密碼必填驗證，新密碼長度驗證（至少 6 個字元），新密碼與確認密碼一致性驗證

7. **狀態管理**（建議使用 Pinia）
   - 創建 `stores/userProfile.js` store
   - 管理以下狀態：
     - `currentUser`：當前登入用戶信息
     - `targetUser`：目標用戶資料（用於編輯）
     - `isViewingOwnProfile`：是否查看自己的資料
     - `loading`：加載狀態
     - `error`：錯誤信息
     - `formData`：表單數據（個人資料、密碼）

8. **API 基礎配置**（可抽離到 `src/utils/api.js`）
   - API 基礎 URL 判斷邏輯（第98-99行）
   - 統一的請求配置（credentials、headers 等）
   - 統一的錯誤處理邏輯

---

## 第四部分：重構步驟總結

用非技術語言，總結重構這個頁面的第一步應該做什麼。

**第一步：建立 API 服務層與表單驗證邏輯**

在開始重構 UI 之前，首先應該將所有的數據獲取和提交邏輯從頁面中分離出來。具體來說：

1. **創建 API 服務檔案**：建立一個專門的檔案（例如 `useUserProfileApi.js`）來處理所有與用戶資料相關的數據請求。將目前混雜在頁面 JavaScript 中的 `fetch` 調用（例如獲取當前用戶信息、獲取用戶資料、更新用戶資料、修改密碼、重新計算假期額度）都移動到這個檔案中。

2. **統一錯誤處理**：在 API 服務層統一處理錯誤情況（例如 401 未授權、網絡錯誤等），避免在每個頁面組件中重複編寫錯誤處理代碼。同時，將原本使用 `alert()` 顯示錯誤訊息的方式改為使用 Ant Design Vue 的 `message` 或 `notification` 組件。

3. **建立表單驗證規則**：將所有的表單驗證邏輯（例如必填欄位驗證、密碼長度驗證、密碼一致性驗證）從頁面中抽離出來，放在一個共用的驗證規則檔案中，這樣可以讓表單驗證邏輯更加清晰和可重用。

4. **設置狀態管理**：使用 Pinia 建立一個專門的 store 來管理用戶資料頁面的狀態（例如當前用戶信息、目標用戶資料、是否查看自己的資料等），這樣可以讓狀態在多個組件之間共享，並且更容易追蹤狀態變化。

5. **處理 API 基礎配置**：將 API 基礎 URL 的判斷邏輯（根據環境變數判斷使用哪個 API 端點）抽離到一個共用的配置檔案中，這樣可以讓 API 調用更加統一和易於維護。

完成這一步後，頁面中的 JavaScript 邏輯會變得更加清晰，後續重構 UI 組件時也會更容易，因為數據獲取和業務邏輯已經與 UI 渲染邏輯分離了。同時，統一的錯誤處理和表單驗證邏輯可以讓用戶體驗更加一致。

