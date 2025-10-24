/* 建立一個新表格來儲存特休結轉資料 */
CREATE TABLE annual_leave_carryover (
  employee_name TEXT PRIMARY KEY NOT NULL, -- 員工姓名 (主鍵)
  carryover_days REAL NOT NULL DEFAULT 0,  -- 結轉天數
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE
);