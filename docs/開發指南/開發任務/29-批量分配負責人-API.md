# 開發任務 29：批量分配負責人 API（管理員）

**對應規格：** 後端 `docs/開發指南/後端/客戶管理-後端規格.md`

**對應手冊：** `docs/使用手冊/功能模組-02-客戶管理.md`

## 範圍

實作 `POST /api/v1/clients/batch-assign` API，批量更新客戶的負責人員。

## 輸入

- `client_ids`（陣列，客戶 ID 列表，上限 100）
- `assignee_user_id`（新的負責人員 ID）

## 輸出

- 成功更新的客戶數量

## 驗證與權限

- **僅管理員可執行**（`is_admin = true`）
- 驗證 `client_ids` 陣列長度 ≤ 100
- 驗證 `assignee_user_id` 存在且有效
- 驗證所有 `client_ids` 存在且未刪除

## 實作重點

- 使用 `WHERE client_id IN (...)` 批量更新
- 更新 `assignee_user_id` 和 `updated_at`
- 回傳實際更新的記錄數
- 遵守 JSON Envelope 格式

## 驗收標準

- [ ] API 正確批量更新負責人
- [ ] 僅管理員可執行（403 權限檢查）
- [ ] 上限 100 筆的驗證正確
- [ ] 已部署並可透過前端呼叫

