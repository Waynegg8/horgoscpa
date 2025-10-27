# LeaveBalances 資料表

**用途：** 儲存員工的假期餘額  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE LeaveBalances (
  balance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type_id INTEGER NOT NULL,
  balance REAL NOT NULL DEFAULT 0,              -- 剩餘時數
  used REAL DEFAULT 0,                          -- 已使用時數
  year INTEGER NOT NULL,                        -- 年度
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (leave_type_id) REFERENCES LeaveTypes(leave_type_id),
  UNIQUE(user_id, leave_type_id, year)
);
```

---

## 索引設計

```sql
CREATE INDEX idx_leave_balances_user ON LeaveBalances(user_id);
CREATE INDEX idx_leave_balances_year ON LeaveBalances(year);
```





