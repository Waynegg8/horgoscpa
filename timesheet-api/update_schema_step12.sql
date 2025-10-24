/* 建立一個新表格來儲存國定假日 */
CREATE TABLE holidays (
  holiday_date TEXT PRIMARY KEY NOT NULL, -- 假日日期 (主鍵, 格式 'YYYY-MM-DD')
  holiday_name TEXT NOT NULL              -- 假日名稱
);