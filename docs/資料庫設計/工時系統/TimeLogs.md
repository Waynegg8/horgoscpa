# TimeLogs 資料表

**用途：** 儲存員工的工時記錄  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE TimeLogs (
  time_log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,                    -- 員工ID
  work_date TEXT NOT NULL,                     -- 工作日期（YYYY-MM-DD）
  client_id TEXT,                              -- 客戶統編（工作相關）
  service_id INTEGER,                          -- 服務項目ID（工作相關）
  work_type_id INTEGER,                        -- 工時類型ID（正常/加班等）
  hours REAL NOT NULL,                         -- 實際工時
  weighted_hours REAL,                         -- 加權工時
  leave_type_id INTEGER,                       -- 假別ID（請假時）
  notes TEXT,                                  -- 備註
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (service_id) REFERENCES Services(service_id),
  FOREIGN KEY (work_type_id) REFERENCES WorkTypes(work_type_id),
  FOREIGN KEY (leave_type_id) REFERENCES LeaveTypes(leave_type_id)
);
```

---

## 索引設計

```sql
CREATE INDEX idx_timelogs_user_date ON TimeLogs(user_id, work_date);
CREATE INDEX idx_timelogs_client ON TimeLogs(client_id);
CREATE INDEX idx_timelogs_month ON TimeLogs(substr(work_date, 1, 7));
```

---

## 相關文檔

- [功能模塊 - 工時表填寫](../../功能模塊/08-工時表填寫.md)


