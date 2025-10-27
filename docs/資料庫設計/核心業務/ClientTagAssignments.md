# ClientTagAssignments (客戶標籤關聯表)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ClientTagAssignments (
  assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,                 -- 客戶 ID
  tag_id INTEGER NOT NULL,                 -- 標籤 ID
  assigned_at TEXT DEFAULT (datetime('now')),
  assigned_by INTEGER,                     -- 誰指派的標籤
  FOREIGN KEY (client_id) REFERENCES Clients(client_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES CustomerTags(tag_id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES Users(user_id),
  UNIQUE(client_id, tag_id)                -- 同一客戶不能重複同一標籤
);
```

---

## 索引

```sql
CREATE INDEX idx_client_tag_client ON ClientTagAssignments(client_id);
CREATE INDEX idx_client_tag_tag ON ClientTagAssignments(tag_id);
```

---

## 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `assignment_id` | INTEGER PK | ✅ | 指派 ID（自動遞增）|
| `client_id` | TEXT FK | ✅ | 客戶 ID（關聯到 Clients 表）|
| `tag_id` | INTEGER FK | ✅ | 標籤 ID（關聯到 CustomerTags 表）|
| `assigned_at` | TEXT | | 指派時間（預設：當前時間）|
| `assigned_by` | INTEGER FK | | 誰指派的（關聯到 Users 表）|

---

## 常用查詢

### 查詢客戶的所有標籤

```sql
SELECT 
  cta.assignment_id,
  ct.tag_id,
  ct.tag_name,
  ct.tag_color,
  cta.assigned_at,
  u.user_name as assigned_by_name
FROM ClientTagAssignments cta
JOIN CustomerTags ct ON cta.tag_id = ct.tag_id
LEFT JOIN Users u ON cta.assigned_by = u.user_id
WHERE cta.client_id = ? 
  AND ct.is_deleted = 0
ORDER BY cta.assigned_at DESC;
```

### 查詢擁有特定標籤的所有客戶

```sql
SELECT 
  c.*,
  cta.assigned_at,
  u.user_name as assigned_by_name
FROM Clients c
JOIN ClientTagAssignments cta ON c.client_id = cta.client_id
LEFT JOIN Users u ON cta.assigned_by = u.user_id
WHERE cta.tag_id = ? 
  AND c.is_deleted = 0
ORDER BY c.company_name;
```

### 查詢客戶標籤統計

```sql
SELECT 
  c.client_id,
  c.company_name,
  COUNT(cta.assignment_id) as tag_count,
  GROUP_CONCAT(ct.tag_name, ', ') as tags
FROM Clients c
LEFT JOIN ClientTagAssignments cta ON c.client_id = cta.client_id
LEFT JOIN CustomerTags ct ON cta.tag_id = ct.tag_id AND ct.is_deleted = 0
WHERE c.is_deleted = 0
GROUP BY c.client_id
ORDER BY tag_count DESC, c.company_name;
```

### 批次查詢多個客戶的標籤

```sql
SELECT 
  cta.client_id,
  ct.tag_id,
  ct.tag_name,
  ct.tag_color
FROM ClientTagAssignments cta
JOIN CustomerTags ct ON cta.tag_id = ct.tag_id
WHERE cta.client_id IN (?, ?, ?) 
  AND ct.is_deleted = 0
ORDER BY cta.client_id, ct.tag_name;
```

---

## 業務規則

1. **唯一性約束**：
   - 同一客戶不能重複指派同一標籤
   - `UNIQUE(client_id, tag_id)` 確保唯一性
   - 重複指派會返回錯誤

2. **級聯刪除**：
   - 客戶被刪除時，相關的標籤關聯自動刪除（`ON DELETE CASCADE`）
   - 標籤被刪除時，相關的客戶關聯自動刪除（`ON DELETE CASCADE`）
   - 保持資料一致性

3. **指派記錄**：
   - 記錄誰在何時指派的標籤
   - 用於審計和追蹤
   - `assigned_by` 可以為 NULL（系統自動指派）

4. **批次操作**：
   - 支援一次為多個客戶指派同一標籤
   - 支援一次為同一客戶指派多個標籤
   - 使用交易（Transaction）確保一致性

---

## API 端點

- `GET /api/v1/clients/:client_id/tags` - 查詢客戶的所有標籤
- `POST /api/v1/clients/:client_id/tags` - 為客戶新增標籤
- `DELETE /api/v1/clients/:client_id/tags/:tag_id` - 移除客戶的標籤
- `POST /api/v1/clients/:client_id/tags/batch` - 批次新增標籤
- `GET /api/v1/tags/:tag_id/clients` - 查詢擁有特定標籤的客戶

---

## 使用範例

### 為客戶新增標籤

```javascript
// 新增單個標籤
await db.run(`
  INSERT INTO ClientTagAssignments (client_id, tag_id, assigned_by)
  VALUES (?, ?, ?)
`, [clientId, tagId, userId]);
```

### 批次新增標籤

```javascript
// 為一個客戶新增多個標籤
const tagIds = [1, 2, 3];
for (const tagId of tagIds) {
  await db.run(`
    INSERT OR IGNORE INTO ClientTagAssignments (client_id, tag_id, assigned_by)
    VALUES (?, ?, ?)
  `, [clientId, tagId, userId]);
}
```

### 移除客戶標籤

```javascript
await db.run(`
  DELETE FROM ClientTagAssignments 
  WHERE client_id = ? AND tag_id = ?
`, [clientId, tagId]);
```

### 更新客戶標籤（替換所有標籤）

```javascript
// 先刪除所有標籤
await db.run(`DELETE FROM ClientTagAssignments WHERE client_id = ?`, [clientId]);

// 再新增新標籤
for (const tagId of newTagIds) {
  await db.run(`
    INSERT INTO ClientTagAssignments (client_id, tag_id, assigned_by)
    VALUES (?, ?, ?)
  `, [clientId, tagId, userId]);
}
```

---

## 相關表格

- **Clients** - 客戶主表
- **CustomerTags** - 標籤主表
- **Users** - 用戶表（記錄誰指派的）

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [Clients](./Clients.md)
- [CustomerTags](./CustomerTags.md)
- [客戶管理 API](../../API設計/客戶管理API.md)

---

**最後更新：** 2025年10月27日





