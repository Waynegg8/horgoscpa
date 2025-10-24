/* 建立一個新表格來儲存加班費率 */
CREATE TABLE overtime_rates (
  rate_type TEXT NOT NULL,       /* '平日加班', '休息日加班' 等 */
  hour_start REAL NOT NULL,    /* 時數起 (>) */
  hour_end REAL NOT NULL,      /* 時數迄 (<=) */
  rate_multiplier REAL NOT NULL  /* 費率倍率 */
);