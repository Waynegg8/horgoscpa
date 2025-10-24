/* 建立一個新表格來儲存系統參數 (鍵值對) */
CREATE TABLE system_parameters (
  param_name TEXT PRIMARY KEY NOT NULL, -- 參數名稱 (主鍵)
  param_value REAL NOT NULL             -- 參數值 (使用 REAL 來存儲數字)
);