# Users (員工資料庫)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `user_id` | INTEGER PK | 員工唯一識別碼 |
| `name` | TEXT | 員工姓名（例如：'紜蓁', '凱閔'） |
| `username` | TEXT UNIQUE | 登入帳號 |
| `hashed_password` | TEXT | Argon2 雜湊處理後的密碼 |
| `is_admin` | BOOLEAN | 是否為管理員 |
| `gender` | TEXT | 性別（'male', 'female', 'other'） |
| `created_at` | TEXT | 建立時間 |
| `updated_at` | TEXT | 更新時間 |

---

## 索引

```sql
CREATE INDEX idx_users_username ON Users(username);
```

---

## 常用查詢

### 查詢所有員工

```sql
SELECT user_id, name, is_admin FROM Users 
WHERE is_deleted = 0 
ORDER BY name;
```

### 驗證登入

```sql
SELECT * FROM Users 
WHERE username = ? AND is_deleted = 0;
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [員工帳號管理](../../功能模塊/04-員工帳號管理.md)
- [認證 API](../../API設計/認證API.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT 0,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `user_id` | INTEGER PK | 員工唯一識別碼 |
| `name` | TEXT | 員工姓名（例如：'紜蓁', '凱閔'） |
| `username` | TEXT UNIQUE | 登入帳號 |
| `hashed_password` | TEXT | Argon2 雜湊處理後的密碼 |
| `is_admin` | BOOLEAN | 是否為管理員 |
| `gender` | TEXT | 性別（'male', 'female', 'other'） |
| `created_at` | TEXT | 建立時間 |
| `updated_at` | TEXT | 更新時間 |

---

## 索引

```sql
CREATE INDEX idx_users_username ON Users(username);
```

---

## 常用查詢

### 查詢所有員工

```sql
SELECT user_id, name, is_admin FROM Users 
WHERE is_deleted = 0 
ORDER BY name;
```

### 驗證登入

```sql
SELECT * FROM Users 
WHERE username = ? AND is_deleted = 0;
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [員工帳號管理](../../功能模塊/04-員工帳號管理.md)
- [認證 API](../../API設計/認證API.md)

---

**最後更新：** 2025年10月27日



