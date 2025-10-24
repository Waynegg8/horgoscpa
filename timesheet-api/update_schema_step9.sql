/* 建立一個新表格來儲存其他假期規則 */
CREATE TABLE other_leave_rules (
  leave_type TEXT PRIMARY KEY NOT NULL, -- 假期類別 (主鍵)
  leave_days REAL NOT NULL,              -- 給假天數
  grant_type TEXT NOT NULL               -- 給假類型 ('事件給假' 或 '年度給假')
);