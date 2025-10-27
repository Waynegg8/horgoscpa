# LeaveEvents (假期事件登記簿)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE LeaveEvents (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `event_id` | INTEGER PK | 事件 ID |
| `user_id` | INTEGER FK | 員工 ID |
| `event_type` | TEXT | 事件類型（例如：'婚假', '喪假'） |
| `event_date` | TEXT | 事件日期 |

---

## 用途

員工自行登記婚假、喪假等事件，系統據此計算假期額度

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [生活事件登記](../../功能模塊/12-生活事件登記.md)
- [其他假期規則](./OtherLeaveRules.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE LeaveEvents (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  event_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `event_id` | INTEGER PK | 事件 ID |
| `user_id` | INTEGER FK | 員工 ID |
| `event_type` | TEXT | 事件類型（例如：'婚假', '喪假'） |
| `event_date` | TEXT | 事件日期 |

---

## 用途

員工自行登記婚假、喪假等事件，系統據此計算假期額度

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [生活事件登記](../../功能模塊/12-生活事件登記.md)
- [其他假期規則](./OtherLeaveRules.md)

---

**最後更新：** 2025年10月27日



