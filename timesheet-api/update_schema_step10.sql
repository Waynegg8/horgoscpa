/* 建立一個新表格來儲存假期事件 (婚假/喪假) */
CREATE TABLE leave_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,      -- 唯一的事件 ID
  employee_name TEXT NOT NULL,               -- 員工姓名
  event_date TEXT NOT NULL,                  -- 事件發生日期 (格式: 'YYYY-MM-DD')
  event_type TEXT NOT NULL,                  -- 事件類型 (例如 '婚假', '喪假-直系血親')
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE,
  FOREIGN KEY (event_type) REFERENCES other_leave_rules(leave_type) ON UPDATE CASCADE
);

/* 建立索引以加快查詢 */
CREATE INDEX IF NOT EXISTS idx_leave_events_employee_type ON leave_events (employee_name, event_type);