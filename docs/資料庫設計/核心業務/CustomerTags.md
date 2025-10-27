# CustomerTags (客戶標籤主表)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE CustomerTags (
  tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_name TEXT NOT NULL UNIQUE,           -- 標籤名稱（唯一）
  tag_color TEXT,                          -- 標籤顏色（HEX格式）
  tag_description TEXT,                    -- 標籤說明
  sort_order INTEGER DEFAULT 0,            -- 排序順序
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES Users(user_id),
  FOREIGN KEY (deleted_by) REFERENCES Users(user_id)
);
```

---

## 索引

```sql
CREATE INDEX idx_customer_tags_name ON CustomerTags(tag_name);
CREATE INDEX idx_customer_tags_active ON CustomerTags(is_deleted);
```

---

## 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `tag_id` | INTEGER PK | ✅ | 標籤 ID（自動遞增）|
| `tag_name` | TEXT UNIQUE | ✅ | 標籤名稱（唯一，避免重複）|
| `tag_color` | TEXT | | 標籤顏色（HEX格式，如：#FF5733）|
| `tag_description` | TEXT | | 標籤說明 |
| `sort_order` | INTEGER | | 排序順序（預設：0）|
| `created_by` | INTEGER FK | | 創建者 ID |

---

## 預設標籤

系統初始化時應創建以下標籤：

| tag_name | tag_color | tag_description |
|----------|-----------|-----------------|
| VIP客戶 | #FF5733 | 重要客戶，優先處理 |
| 重點客戶 | #FFC300 | 需要特別關注的客戶 |
| 潛在客戶 | #DAF7A6 | 尚未簽約的潛在客戶 |
| 長期合作 | #33A1FF | 長期穩定合作的客戶 |
| 新客戶 | #C70039 | 新加入的客戶 |
| 需關注 | #FF33F6 | 需要特別注意的客戶 |

---

## 常用查詢

### 查詢所有有效標籤

```sql
SELECT * FROM CustomerTags 
WHERE is_deleted = 0 
ORDER BY sort_order, tag_name;
```

### 查詢標籤使用次數

```sql
SELECT 
  ct.tag_id,
  ct.tag_name,
  ct.tag_color,
  COUNT(cta.assignment_id) as usage_count
FROM CustomerTags ct
LEFT JOIN ClientTagAssignments cta ON ct.tag_id = cta.tag_id
WHERE ct.is_deleted = 0
GROUP BY ct.tag_id
ORDER BY usage_count DESC;
```

### 搜尋標籤

```sql
SELECT * FROM CustomerTags 
WHERE tag_name LIKE ? 
  AND is_deleted = 0
ORDER BY tag_name;
```

---

## 業務規則

1. **標籤名稱唯一性**：
   - `tag_name` 必須唯一
   - 避免創建重複標籤（如："VIP" 和 "vip"）
   - 新增前應檢查是否已存在

2. **標籤顏色**：
   - 使用 HEX 格式（如：#FF5733）
   - 前端顯示時使用此顏色
   - 可選欄位

3. **排序順序**：
   - `sort_order` 決定標籤顯示順序
   - 數字越小越靠前
   - 相同順序則按名稱排序

4. **軟刪除**：
   - 使用 `is_deleted` 標記
   - 刪除標籤時，相關的 `ClientTagAssignments` 也會被移除（ON DELETE CASCADE）
   - 保留歷史記錄

5. **權限控制**：
   - 管理員可以新增/編輯/刪除標籤
   - 一般員工只能查看和使用標籤

---

## API 端點

- `GET /api/v1/customer-tags` - 查詢所有標籤
- `POST /api/v1/customer-tags` - 新增標籤
- `PUT /api/v1/customer-tags/:tag_id` - 更新標籤
- `DELETE /api/v1/customer-tags/:tag_id` - 刪除標籤（軟刪除）
- `GET /api/v1/customer-tags/:tag_id/usage` - 查詢標籤使用情況

---

## 相關表格

- **ClientTagAssignments** - 客戶與標籤的關聯表
- **Clients** - 客戶主表

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [Clients](./Clients.md)
- [ClientTagAssignments](./ClientTagAssignments.md)
- [客戶管理 API](../../API設計/客戶管理API.md)

---

**最後更新：** 2025年10月27日


