-- ================================================
-- 步驟 1: 建立所有表格 (從您的 update_schema_step*.sql 和基本表格推斷)
-- ================================================

-- Employees 表格 (員工)
CREATE TABLE IF NOT EXISTS employees (
  name TEXT PRIMARY KEY,
  hire_date DATE NOT NULL,
  email TEXT
);

-- Clients 表格 (客戶)
CREATE TABLE IF NOT EXISTS clients (
  name TEXT PRIMARY KEY
);

-- Client assignments (員工與客戶的映射)
CREATE TABLE IF NOT EXISTS client_assignments (
  employee_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  PRIMARY KEY (employee_name, client_name),
  FOREIGN KEY (employee_name) REFERENCES employees(name),
  FOREIGN KEY (client_name) REFERENCES clients(name)
);

-- Business types (業務類型)
CREATE TABLE IF NOT EXISTS business_types (
  type_name TEXT PRIMARY KEY
);

-- Leave types (請假類型)
CREATE TABLE IF NOT EXISTS leave_types (
  type_name TEXT PRIMARY KEY
);

-- Timesheets (工時表，核心資料儲存，從 index.js 推斷)
CREATE TABLE IF NOT EXISTS timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT NOT NULL,
  client_name TEXT,
  work_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  work_year INTEGER NOT NULL,
  work_month INTEGER NOT NULL,
  hours_normal REAL DEFAULT 0,
  hours_ot_weekday_134 REAL DEFAULT 0,
  hours_ot_weekday_167 REAL DEFAULT 0,
  hours_ot_rest_134 REAL DEFAULT 0,
  hours_ot_rest_167 REAL DEFAULT 0,
  hours_ot_rest_267 REAL DEFAULT 0,
  hours_ot_offday_100 REAL DEFAULT 0,
  hours_ot_offday_200 REAL DEFAULT 0,
  hours_ot_holiday_100 REAL DEFAULT 0,
  hours_ot_holiday_134 REAL DEFAULT 0,
  hours_ot_holiday_167 REAL DEFAULT 0,
  leave_type TEXT,
  leave_hours REAL DEFAULT 0,
  business_type TEXT,
  weighted_hours REAL DEFAULT 0,
  FOREIGN KEY (employee_name) REFERENCES employees(name),
  FOREIGN KEY (client_name) REFERENCES clients(name),
  FOREIGN KEY (business_type) REFERENCES business_types(type_name),
  FOREIGN KEY (leave_type) REFERENCES leave_types(type_name)
);

-- 加班費率 (從 update_schema_step6.sql)
CREATE TABLE IF NOT EXISTS overtime_rates (
  rate_type TEXT NOT NULL,       /* '平日加班', '休息日加班' 等 */
  hour_start REAL NOT NULL,    /* 時數起 (>) */
  hour_end REAL NOT NULL,      /* 時數迄 (<=) */
  rate_multiplier REAL NOT NULL  /* 費率倍率 */
);

-- 特休年資規則 (從 update_schema_step7.sql)
CREATE TABLE IF NOT EXISTS annual_leave_rules (
  seniority_years REAL PRIMARY KEY NOT NULL, -- 年資 (主鍵)
  leave_days REAL NOT NULL                 -- 對應天數
);

-- 特休結轉資料 (從 update_schema_step8.sql)
CREATE TABLE IF NOT EXISTS annual_leave_carryover (
  employee_name TEXT PRIMARY KEY NOT NULL, -- 員工姓名 (主鍵)
  carryover_days REAL NOT NULL DEFAULT 0,  -- 結轉天數
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE
);

-- 其他假期規則 (從 update_schema_step9.sql)
CREATE TABLE IF NOT EXISTS other_leave_rules (
  leave_type TEXT PRIMARY KEY NOT NULL, -- 假期類別 (主鍵)
  leave_days REAL NOT NULL,              -- 給假天數
  grant_type TEXT NOT NULL               -- 給假類型 ('事件給假' 或 '年度給假')
);

-- 假期事件 (從 update_schema_step10.sql)
CREATE TABLE IF NOT EXISTS leave_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,      -- 唯一的事件 ID
  employee_name TEXT NOT NULL,               -- 員工姓名
  event_date TEXT NOT NULL,                  -- 事件發生日期 (格式: 'YYYY-MM-DD')
  event_type TEXT NOT NULL,                  -- 事件類型 (例如 '婚假', '喪假-直系血親')
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE,
  FOREIGN KEY (event_type) REFERENCES other_leave_rules(leave_type) ON UPDATE CASCADE
);

/* 建立索引以加快查詢 */
CREATE INDEX IF NOT EXISTS idx_leave_events_employee_type ON leave_events (employee_name, event_type);

-- 系統參數 (從 update_schema_step11.sql)
CREATE TABLE IF NOT EXISTS system_parameters (
  param_name TEXT PRIMARY KEY NOT NULL, -- 參數名稱 (主鍵)
  param_value REAL NOT NULL             -- 參數值 (使用 REAL 來存儲數字)
);

-- 國定假日 (從 update_schema_step12.sql)
CREATE TABLE IF NOT EXISTS holidays (
  holiday_date TEXT PRIMARY KEY NOT NULL, -- 假日日期 (主鍵, 格式 'YYYY-MM-DD')
  holiday_name TEXT NOT NULL              -- 假日名稱
);

-- ================================================
-- 步驟 2: 插入所有資料 (從您的 import_*.sql 檔案，修正表格名稱錯誤)
-- ================================================

-- 清除並插入員工資料 (從 import_employees.sql)
DELETE FROM employees;
INSERT INTO employees (name, hire_date, email) VALUES ('莊凱閔', '2020-05-04', 'test@test.com');
INSERT INTO employees (name, hire_date, email) VALUES ('張紜蓁', '2019-04-15', 'test@test.com');
INSERT INTO employees (name, hire_date, email) VALUES ('呂柏澄', '2025-05-12', 'test@test.com');

-- 清除並插入客戶資料 (從 import_clients_FINAL.sql)
DELETE FROM clients;
INSERT INTO clients (name) VALUES ('喜埕');
INSERT INTO clients (name) VALUES ('篤行');
INSERT INTO clients (name) VALUES ('木村一心');
INSERT INTO clients (name) VALUES ('蘭埕');
INSERT INTO clients (name) VALUES ('小巷愛樂芬');
INSERT INTO clients (name) VALUES ('東坡居');
INSERT INTO clients (name) VALUES ('禾茗飲料店');
INSERT INTO clients (name) VALUES ('利基開發建設');
INSERT INTO clients (name) VALUES ('長葒人力資源');
INSERT INTO clients (name) VALUES ('仲凌網通');
INSERT INTO clients (name) VALUES ('奕緯公關');
INSERT INTO clients (name) VALUES ('虫憶甲蟲館');
INSERT INTO clients (name) VALUES ('好期');
INSERT INTO clients (name) VALUES ('住福大河');
INSERT INTO clients (name) VALUES ('企業菁英');
INSERT INTO clients (name) VALUES ('品順室內裝修');
INSERT INTO clients (name) VALUES ('黃蘋科技');
INSERT INTO clients (name) VALUES ('御饗');
INSERT INTO clients (name) VALUES ('宸鳴');
INSERT INTO clients (name) VALUES ('群淼科技');
INSERT INTO clients (name) VALUES ('無齡感');
INSERT INTO clients (name) VALUES ('無藏茗葉');
INSERT INTO clients (name) VALUES ('聾人協會');
INSERT INTO clients (name) VALUES ('佳禾研發');
INSERT INTO clients (name) VALUES ('仟鑽(簽證)');
INSERT INTO clients (name) VALUES ('日央文化事業');
INSERT INTO clients (name) VALUES ('進昇技術諮詢');
INSERT INTO clients (name) VALUES ('有泩開發');
INSERT INTO clients (name) VALUES ('彥輝工業社');
INSERT INTO clients (name) VALUES ('睿杰工程');
INSERT INTO clients (name) VALUES ('梅川商行');
INSERT INTO clients (name) VALUES ('天青');
INSERT INTO clients (name) VALUES ('米吉');
INSERT INTO clients (name) VALUES ('翱祥科技');
INSERT INTO clients (name) VALUES ('振中投資');
INSERT INTO clients (name) VALUES ('昊遠精密科技');
INSERT INTO clients (name) VALUES ('大有工業(簽證)');
INSERT INTO clients (name) VALUES ('士邦機械');
INSERT INTO clients (name) VALUES ('爵特');
INSERT INTO clients (name) VALUES ('有舜建設有限公司(114.02.25新客)');
INSERT INTO clients (name) VALUES ('國群建設');
INSERT INTO clients (name) VALUES ('邦群不動產');
INSERT INTO clients (name) VALUES ('冠群資訊');
INSERT INTO clients (name) VALUES ('果思管顧(原冠群管顧)');
INSERT INTO clients (name) VALUES ('嘉人管顧');
INSERT INTO clients (name) VALUES ('豪辰投資');
INSERT INTO clients (name) VALUES ('榮建土地開發');
INSERT INTO clients (name) VALUES ('安永信(原銘鐘實業)');
INSERT INTO clients (name) VALUES ('廉風台中建國分所');
INSERT INTO clients (name) VALUES ('霍爾果斯');
INSERT INTO clients (name) VALUES ('輝律商標');
INSERT INTO clients (name) VALUES ('一橋地政士');
INSERT INTO clients (name) VALUES ('黃維君地政士');
INSERT INTO clients (name) VALUES ('快得機械');
INSERT INTO clients (name) VALUES ('盛鈺精機');
INSERT INTO clients (name) VALUES ('金溢國際');
INSERT INTO clients (name) VALUES ('中華食安協會');
INSERT INTO clients (name) VALUES ('優治工業');
INSERT INTO clients (name) VALUES ('冠絟工業');
INSERT INTO clients (name) VALUES ('正茵資產');
INSERT INTO clients (name) VALUES ('許家瑜律師');
INSERT INTO clients (name) VALUES ('喜田投資');
INSERT INTO clients (name) VALUES ('金澤實業');
INSERT INTO clients (name) VALUES ('馥樂咖啡');
INSERT INTO clients (name) VALUES ('尚銀實業');
INSERT INTO clients (name) VALUES ('偉光國際');
INSERT INTO clients (name) VALUES ('前景投資');
INSERT INTO clients (name) VALUES ('比如資產');
INSERT INTO clients (name) VALUES ('志恆資本');
INSERT INTO clients (name) VALUES ('范特喜');
INSERT INTO clients (name) VALUES ('舊氏設計');
INSERT INTO clients (name) VALUES ('無齡感有限公司');
INSERT INTO clients (name) VALUES ('萊斯特生醫');
INSERT INTO clients (name) VALUES ('和大芯科技');
INSERT INTO clients (name) VALUES ('森見室內裝修');
INSERT INTO clients (name) VALUES ('八福銀髮');
INSERT INTO clients (name) VALUES ('吉市文創');
INSERT INTO clients (name) VALUES ('成大裕');
INSERT INTO clients (name) VALUES ('草悟道');
INSERT INTO clients (name) VALUES ('福記中藥行');
INSERT INTO clients (name) VALUES ('興大員生社');
INSERT INTO clients (name) VALUES ('超仁運動用品');
INSERT INTO clients (name) VALUES ('基龍米克斯');
INSERT INTO clients (name) VALUES ('福祿門');

-- 清除並插入業務類型 (從 import_business_types.sql，修正表格為 business_types)
DELETE FROM business_types;
INSERT INTO business_types (type_name) VALUES ('營業稅');
INSERT INTO business_types (type_name) VALUES ('營所稅');
INSERT INTO business_types (type_name) VALUES ('工商登記');
INSERT INTO business_types (type_name) VALUES ('扣繳');
INSERT INTO business_types (type_name) VALUES ('暫繳');
INSERT INTO business_types (type_name) VALUES ('記帳');
INSERT INTO business_types (type_name) VALUES ('查帳');
INSERT INTO business_types (type_name) VALUES ('財簽');
INSERT INTO business_types (type_name) VALUES ('稅簽');
INSERT INTO business_types (type_name) VALUES ('內部會議');
INSERT INTO business_types (type_name) VALUES ('內部行政-輸入客戶明細');
INSERT INTO business_types (type_name) VALUES ('內部行政');
INSERT INTO business_types (type_name) VALUES ('教育訓練');

-- 清除並插入請假類型 (從 import_leave_types.sql，修正表格為 leave_types)
DELETE FROM leave_types;
INSERT INTO leave_types (type_name) VALUES ('特休');
INSERT INTO leave_types (type_name) VALUES ('加班補休');
INSERT INTO leave_types (type_name) VALUES ('事假');
INSERT INTO leave_types (type_name) VALUES ('病假');
INSERT INTO leave_types (type_name) VALUES ('生理假');
INSERT INTO leave_types (type_name) VALUES ('婚假');
INSERT INTO leave_types (type_name) VALUES ('喪假');
INSERT INTO leave_types (type_name) VALUES ('喪假-直系血親');
INSERT INTO leave_types (type_name) VALUES ('喪假-配偶父母');
INSERT INTO leave_types (type_name) VALUES ('喪假-兄弟姊妹');
INSERT INTO leave_types (type_name) VALUES ('喪假-祖父母');

-- 清除並插入加班費率 (從 import_overtime_rates.sql)
DELETE FROM overtime_rates;
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('平日加班', 0, 2, 1.34);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('平日加班', 2, 4, 1.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('休息日加班', 0, 2, 1.34);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('休息日加班', 2, 8, 1.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('休息日加班', 8, 12, 2.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('國定假日加班', 0, 8, 1);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('國定假日加班', 8, 10, 1.34);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('國定假日加班', 10, 12, 1.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('例假日加班', 0, 8, 1);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('例假日加班', 8, 12, 2);

-- 清除並插入特休規則 (從 import_annual_leave_rules.sql)
DELETE FROM annual_leave_rules;
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (0.5, 3);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (1, 7);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (2, 10);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (3, 14);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (4, 14);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (5, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (6, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (7, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (8, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (9, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (10, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (11, 16);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (12, 17);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (13, 18);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (14, 19);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (15, 20);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (16, 21);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (17, 22);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (18, 23);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (19, 24);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (20, 25);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (21, 26);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (22, 27);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (23, 28);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (24, 29);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (25, 30);

-- 清除並插入其他假期規則 (從 import_other_leave_rules.sql)
DELETE FROM other_leave_rules;
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('婚假', 8, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('事假', 14, '年度給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('病假', 30, '年度給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-直系血親', 8, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-配偶父母', 6, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-兄弟姊妹', 3, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-祖父母', 3, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('產假', 56, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('陪產假', 7, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('產檢假', 5, '事件給假');

-- 清除並插入系統參數 (從 import_system_parameters.sql)
DELETE FROM system_parameters;
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日正常工時上限', 8);
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日加班時數上限', 4);
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日請假時數上限', 8);
INSERT INTO system_parameters (param_name, param_value) VALUES ('假日每日加班時數上限', 12);

-- 清除並插入國定假日 (從 import_holidays.sql)
DELETE FROM holidays;
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-01-01', '開國紀念日');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-01-27', '除夕前一日彈性放假');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-01-28', '農曆除夕');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-01-29', '農曆春節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-01-30', '農曆春節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-01-31', '農曆春節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-02-28', '和平紀念日');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-04-03', '兒童節(調整放假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-04-04', '兒童節/民族掃墓節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-05-01', '勞動節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-05-30', '端午節(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-09-29', '教師節(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-10-06', '中秋節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-10-10', '國慶日');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-10-24', '光復節(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2025-12-25', '行憲紀念日');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-01-01', '開國紀念日');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-02-16', '農曆除夕');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-02-17', '農曆春節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-02-18', '農曆春節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-02-19', '農曆春節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-02-20', '農曆春節(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-02-27', '和平紀念日(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-04-03', '兒童節(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-04-06', '民族掃墓節(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-05-01', '勞動節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-06-19', '端午節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-09-25', '中秋節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-09-28', '教師節');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-10-09', '國慶日(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-10-26', '光復節(補假)');
INSERT INTO holidays (holiday_date, holiday_name) VALUES ('2026-12-25', '行憲紀念日');

-- 清除並插入客戶指派 (從 import_assignments.sql)
DELETE FROM client_assignments;
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '仟鑽(簽證)');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '日央文化事業');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '進昇技術諮詢');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '有泩開發');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '彥輝工業社');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '睿杰工程');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '梅川商行');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '天青');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '米吉');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '翱祥科技');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '振中投資');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '昊遠精密科技');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '大有工業(簽證)');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '士邦機械');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '爵特');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '有舜建設有限公司(114.02.25新客)');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '國群建設');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '邦群不動產');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('張紜蓁', '無齡感有限公司');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '佳禾研發');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '萊斯特生醫');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '和大芯科技');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '森見室內裝修');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '八福銀髮');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '吉市文創');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '成大裕');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '草悟道');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '福記中藥行');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '興大員生社');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '超仁運動用品');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '基龍米克斯');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '福祿門');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '振中投資');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '喜埕');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '篤行');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '木村一心');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '蘭埕');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '小巷愛樂芬');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '東坡居');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '禾茗飲料店');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '利基開發建設');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '長葒人力資源');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '仲凌網通');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '奕緯公關');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '虫憶甲蟲館');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '好期');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '舊氏設計');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '住福大河');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '企業菁英');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '品順室內裝修');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '黃蘋科技');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '御饗');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '宸鳴');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '群淼科技');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '無藏茗葉');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('呂柏澄', '聾人協會');

-- ================================================
-- 注意事項:
-- 1. 這個腳本會先建立表格 (使用 IF NOT EXISTS 避免重複錯誤)。
-- 2. 然後清除並插入資料 (DELETE 確保乾淨)。
-- 3. 如果有外鍵衝突 (例如 client_assignments 引用不存在的 clients)，請先插入 clients 再插入 assignments。
-- 4. 對於 annual_leave_carryover 和 leave_events，您的檔案中沒有資料，所以未包含插入。如果需要，添加測試資料。
-- 5. 在 Cloudflare D1 控制台或 Wrangler CLI 執行這個腳本。
-- 6. 執行後，重新部署 Worker 並測試 API。