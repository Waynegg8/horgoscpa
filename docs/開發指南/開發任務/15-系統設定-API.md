### 任務 15：系統設定 API（含遷移與權限）

對應索引：`docs/開發指南/開發須知/開發清單-任務索引.md`

【目標】
- 提供管理員可讀寫的系統設定 API；含 D1 遷移 `Settings` 表。

【範圍】
- 遷移：`cloudflare/worker-router/migrations/2025-10-30T001300Z_system_settings.sql`
- 路由：`/internal/api/v1/admin/settings`（GET 全部），`/internal/api/v1/admin/settings/:key`（PUT 更新）
- 權限：僅管理員；危險設定需 `confirmed: true`
- 檔案：
  - `src/api/settings.js`（邏輯）
  - `src/index.js`（導入與路由分派）

【需閱讀】
- `docs/開發指南/後端/系統基礎-後端規格.md`
- `docs/開發指南/開發須知/資料庫-D1-規範.md`
- `docs/開發指南/開發須知/API-設計規範.md`

【驗收標準（AC）】
1) GET 回 `items` 與 `map`；PUT 可更新 `company_name`、`contact_email`、`rule_comp_hours_expiry`（最後者需 `confirmed:true`）。
2) 非管理員回 403；未登入回 401。
3) Email 格式檢核；`rule_comp_hours_expiry` 僅允許 `current_month|next_month|3_months|6_months`。
4) 回應遵循 JSON Envelope。

【部署與測試】
- 套用 D1 遷移後，在預覽環境以管理員帳號測試讀寫成功，非管理員/未登入分別 403/401。


