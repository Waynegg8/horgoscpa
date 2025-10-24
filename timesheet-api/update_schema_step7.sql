/* 建立一個新表格來儲存特休年資規則 */
CREATE TABLE annual_leave_rules (
  seniority_years REAL PRIMARY KEY NOT NULL, -- 年資 (主鍵)
  leave_days REAL NOT NULL                 -- 對應天數
);