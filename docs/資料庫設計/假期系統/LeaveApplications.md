# LeaveApplications 資料表

**用途：** 儲存員工的假期申請記錄  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE LeaveApplications (
  leave_application_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,                    -- 員工ID
  leave_type_id INTEGER NOT NULL,              -- 假別ID
  start_date TEXT NOT NULL,                    -- 開始日期
  end_date TEXT NOT NULL,                      -- 結束日期
  total_hours REAL NOT NULL,                   -- 總時數
  reason TEXT,                                 -- 請假事由
  status TEXT DEFAULT 'pending',               -- pending/approved/rejected
  approved_by INTEGER,                         -- 審核者
  approved_at TEXT,                            -- 審核時間
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (leave_type_id) REFERENCES LeaveTypes(leave_type_id),
  FOREIGN KEY (approved_by) REFERENCES Users(user_id)
);
```

---

## 索引設計

```sql
CREATE INDEX idx_leave_apps_user ON LeaveApplications(user_id);
CREATE INDEX idx_leave_apps_status ON LeaveApplications(status);
CREATE INDEX idx_leave_apps_date ON LeaveApplications(start_date, end_date);
```





