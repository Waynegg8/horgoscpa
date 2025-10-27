# LeaveEvents 資料表

**用途：** 儲存員工的生活事件（婚假、喪假等事件登記）  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE LeaveEvents (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,                    -- 員工ID
  event_type TEXT NOT NULL,                    -- 事件類型（結婚/喪假/產假等）
  event_date TEXT NOT NULL,                    -- 事件日期
  granted_hours REAL,                          -- 給予的假期時數
  notes TEXT,                                  -- 備註
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
```

---

## 範例資料

### 結婚事件
```sql
INSERT INTO LeaveEvents (
  user_id, event_type, event_date, granted_hours
) VALUES (
  2, '結婚', '2023-05-10', 64
);
-- 給予 8 天婚假（64小時）
```

### 喪假事件
```sql
INSERT INTO LeaveEvents (
  user_id, event_type, event_date, granted_hours, notes
) VALUES (
  3, '喪假', '2025-03-15', 24, '父母喪假'
);
-- 給予 3 天喪假（24小時）
```

---

## 索引設計

```sql
CREATE INDEX idx_leave_events_user ON LeaveEvents(user_id);
CREATE INDEX idx_leave_events_date ON LeaveEvents(event_date);
```

---

## 相關文檔

- [功能模塊 - 生活事件登記](../../功能模塊/12-生活事件登記.md)


