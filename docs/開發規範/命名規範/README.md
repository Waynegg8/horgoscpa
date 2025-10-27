# 命名規範 - 總覽

**最後更新：** 2025年10月27日

---

## 📌 快速參考

| 類型 | 命名規範 | 範例 | 文檔 |
|------|----------|------|------|
| 資料表 | PascalCase | `Users`, `ClientServices` | [資料庫命名](./資料庫命名.md) |
| 資料欄位 | snake_case | `user_id`, `created_at` | [資料庫命名](./資料庫命名.md) |
| 變數/函數 | camelCase | `userId`, `getUserName()` | [程式碼命名](./程式碼命名.md) |
| 類別/組件 | PascalCase | `UserService`, `ClientForm` | [程式碼命名](./程式碼命名.md) |
| 常數 | UPPER_SNAKE_CASE | `MAX_RETRY`, `API_URL` | [程式碼命名](./程式碼命名.md) |
| 檔案 | 依類型 | `UserService.ts`, `client.api.ts` | [檔案命名](./檔案命名.md) |
| API 端點 | kebab-case | `/api/v1/clients` | [API命名](./API命名.md) |

---

## 📚 詳細文檔

1. **[資料庫命名](./資料庫命名.md)** (80行)
   - 表格命名規範
   - 欄位命名規範
   - 索引命名規範

2. **[程式碼命名](./程式碼命名.md)** (100行)
   - 變數命名
   - 函數命名
   - 類別命名
   - 常數命名

3. **[檔案命名](./檔案命名.md)** (60行)
   - 前端檔案命名
   - 後端檔案命名
   - 文檔檔案命名

4. **[API命名](./API命名.md)** (70行)
   - RESTful 端點命名
   - 查詢參數命名
   - 回應欄位命名

---

## 🎯 命名原則

### 一致性原則
✅ 整個專案使用相同的命名規範  
✅ 同類型的項目使用相同的命名方式  
❌ 不混用不同的命名風格

### 清晰性原則
✅ 使用有意義的名稱  
✅ 避免縮寫（除非是通用縮寫）  
❌ 不使用單字母變數（除了迴圈 i, j）

### 範例

```typescript
✅ 好的命名：
const userId = 123;
const clientName = 'ABC Corp';
function getUserById(id: number) { }
class ClientService { }

❌ 不好的命名：
const uid = 123;              // 過度縮寫
const ClientName = 'ABC Corp'; // 變數不應使用 PascalCase
function get(id) { }          // 不清楚獲取什麼
class clientservice { }       // 類別應使用 PascalCase
```

---

**最後更新：** 2025年10月27日  
**文檔版本：** 1.0


