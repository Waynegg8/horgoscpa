# 開發任務 26：編輯客戶 API

**對應規格：** 後端 `docs/開發指南/後端/客戶管理-後端規格.md`

**對應手冊：** `docs/使用手冊/功能模組-02-客戶管理.md`

## 範圍

實作 `PUT /api/v1/clients/:id` API，更新客戶資料。

## 輸入

- `client_id`（路徑參數）
- 請求 Body：`company_name`, `assignee_user_id`, `phone`, `email`, `client_notes`, `payment_notes`, `tag_ids`

## 輸出

- 更新後的客戶資料

## 驗證與權限

- 需登入
- 員工可編輯所有客戶（小型事務所彈性設計）
- 統一編號不可修改
- 驗證必填欄位、格式、負責人員存在性
- 驗證標籤 ID 存在性

## 實作重點

- 更新 `Clients` 表記錄
- 刪除舊的標籤關聯並重建新的關聯
- 更新 `updated_at` 時間戳
- 遵守 JSON Envelope 格式

## 驗收標準

- [ ] API 正確更新客戶資料
- [ ] 標籤關聯正確更新
- [ ] 驗證規則正確執行
- [ ] 已部署並可透過前端呼叫

