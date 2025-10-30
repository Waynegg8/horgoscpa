# 開發任務 28：標籤管理 API

**對應規格：** 後端 `docs/開發指南/後端/客戶管理-後端規格.md`

**對應手冊：** `docs/使用手冊/功能模組-02-客戶管理.md`

## 範圍

實作標籤的 CRUD API：
- `GET /api/v1/tags` - 查詢所有標籤
- `POST /api/v1/tags` - 新增標籤
- `PUT /api/v1/tags/:id` - 更新標籤
- `DELETE /api/v1/tags/:id` - 刪除標籤

## 輸入

### GET /api/v1/tags
- 無參數

### POST /api/v1/tags
- `tag_name`（必填，唯一）
- `tag_color`（選填，HEX 顏色碼）

### PUT /api/v1/tags/:id
- `tag_name`（選填）
- `tag_color`（選填）

### DELETE /api/v1/tags/:id
- `tag_id`（路徑參數）

## 輸出

- 標籤資料或操作結果

## 驗證與權限

- 需登入
- 所有員工可查看標籤
- 所有員工可新增/編輯/刪除標籤（小型事務所彈性設計）
- 刪除標籤時檢查是否有客戶使用（如有，回傳錯誤或級聯刪除關聯）

## 實作重點

- 標籤名稱唯一性驗證
- 顏色碼格式驗證（#RRGGBB）
- 遵守 JSON Envelope 格式

## 驗收標準

- [ ] 所有 API 端點正常運作
- [ ] 唯一性與格式驗證正確
- [ ] 刪除標籤時處理客戶關聯
- [ ] 已部署並可透過前端呼叫

