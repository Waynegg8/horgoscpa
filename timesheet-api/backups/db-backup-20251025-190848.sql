PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE employees (
  name TEXT PRIMARY KEY,
  hire_date DATE NOT NULL,
  email TEXT
, gender TEXT);
INSERT INTO "employees" VALUES('莊凱閔','2020-05-04','test@test.com','male');
INSERT INTO "employees" VALUES('張紜蓁','2019-04-15','test@test.com','female');
INSERT INTO "employees" VALUES('呂柏澄','2025-05-12','test@test.com','male');
CREATE TABLE clients (
  name TEXT PRIMARY KEY
);
INSERT INTO "clients" VALUES('喜埕');
INSERT INTO "clients" VALUES('篤行');
INSERT INTO "clients" VALUES('木村一心');
INSERT INTO "clients" VALUES('蘭埕');
INSERT INTO "clients" VALUES('小巷愛樂芬');
INSERT INTO "clients" VALUES('東坡居');
INSERT INTO "clients" VALUES('禾茗飲料店');
INSERT INTO "clients" VALUES('利基開發建設');
INSERT INTO "clients" VALUES('長葒人力資源');
INSERT INTO "clients" VALUES('仲凌網通');
INSERT INTO "clients" VALUES('奕緯公關');
INSERT INTO "clients" VALUES('虫憶甲蟲館');
INSERT INTO "clients" VALUES('好期');
INSERT INTO "clients" VALUES('住福大河');
INSERT INTO "clients" VALUES('企業菁英');
INSERT INTO "clients" VALUES('品順室內裝修');
INSERT INTO "clients" VALUES('黃蘋科技');
INSERT INTO "clients" VALUES('御饗');
INSERT INTO "clients" VALUES('宸鳴');
INSERT INTO "clients" VALUES('群淼科技');
INSERT INTO "clients" VALUES('無齡感');
INSERT INTO "clients" VALUES('無藏茗葉');
INSERT INTO "clients" VALUES('聾人協會');
INSERT INTO "clients" VALUES('佳禾研發');
INSERT INTO "clients" VALUES('仟鑽');
INSERT INTO "clients" VALUES('日央文化事業');
INSERT INTO "clients" VALUES('進昇技術諮詢');
INSERT INTO "clients" VALUES('有泩開發');
INSERT INTO "clients" VALUES('彥輝工業社');
INSERT INTO "clients" VALUES('睿杰工程');
INSERT INTO "clients" VALUES('梅川商行');
INSERT INTO "clients" VALUES('天青');
INSERT INTO "clients" VALUES('米吉');
INSERT INTO "clients" VALUES('翱祥科技');
INSERT INTO "clients" VALUES('振中投資');
INSERT INTO "clients" VALUES('昊遠精密科技');
INSERT INTO "clients" VALUES('大有工業(簽證)');
INSERT INTO "clients" VALUES('士邦機械');
INSERT INTO "clients" VALUES('爵特');
INSERT INTO "clients" VALUES('有舜建設有限公司(114.02.25新客)');
INSERT INTO "clients" VALUES('國群建設');
INSERT INTO "clients" VALUES('邦群不動產');
INSERT INTO "clients" VALUES('冠群資訊');
INSERT INTO "clients" VALUES('果思管顧(原冠群管顧)');
INSERT INTO "clients" VALUES('嘉人管顧');
INSERT INTO "clients" VALUES('豪辰投資');
INSERT INTO "clients" VALUES('榮建土地開發');
INSERT INTO "clients" VALUES('安永信(原銘鐘實業)');
INSERT INTO "clients" VALUES('廉風台中建國分所');
INSERT INTO "clients" VALUES('霍爾果斯');
INSERT INTO "clients" VALUES('輝律商標');
INSERT INTO "clients" VALUES('一橋地政士');
INSERT INTO "clients" VALUES('黃維君地政士');
INSERT INTO "clients" VALUES('快得機械');
INSERT INTO "clients" VALUES('盛鈺精機');
INSERT INTO "clients" VALUES('金溢國際');
INSERT INTO "clients" VALUES('中華食安協會');
INSERT INTO "clients" VALUES('優治工業');
INSERT INTO "clients" VALUES('冠絟工業');
INSERT INTO "clients" VALUES('正茵資產');
INSERT INTO "clients" VALUES('許家瑜律師');
INSERT INTO "clients" VALUES('喜田投資');
INSERT INTO "clients" VALUES('金澤實業');
INSERT INTO "clients" VALUES('馥樂咖啡');
INSERT INTO "clients" VALUES('尚銀實業');
INSERT INTO "clients" VALUES('偉光國際');
INSERT INTO "clients" VALUES('前景投資');
INSERT INTO "clients" VALUES('比如資產');
INSERT INTO "clients" VALUES('志恆資本');
INSERT INTO "clients" VALUES('范特喜');
INSERT INTO "clients" VALUES('舊氏設計');
INSERT INTO "clients" VALUES('無齡感有限公司');
INSERT INTO "clients" VALUES('萊斯特生醫');
INSERT INTO "clients" VALUES('和大芯科技');
INSERT INTO "clients" VALUES('森見室內裝修');
INSERT INTO "clients" VALUES('八福銀髮');
INSERT INTO "clients" VALUES('吉市文創');
INSERT INTO "clients" VALUES('成大裕');
INSERT INTO "clients" VALUES('草悟道');
INSERT INTO "clients" VALUES('福記中藥行');
INSERT INTO "clients" VALUES('興大員生社');
INSERT INTO "clients" VALUES('超仁運動用品');
INSERT INTO "clients" VALUES('基龍米克斯');
INSERT INTO "clients" VALUES('福祿門');
INSERT INTO "clients" VALUES('無指定客戶');
CREATE TABLE client_assignments (
  employee_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  PRIMARY KEY (employee_name, client_name),
  FOREIGN KEY (employee_name) REFERENCES employees(name),
  FOREIGN KEY (client_name) REFERENCES clients(name)
);
INSERT INTO "client_assignments" VALUES('張紜蓁','日央文化事業');
INSERT INTO "client_assignments" VALUES('張紜蓁','進昇技術諮詢');
INSERT INTO "client_assignments" VALUES('張紜蓁','有泩開發');
INSERT INTO "client_assignments" VALUES('張紜蓁','彥輝工業社');
INSERT INTO "client_assignments" VALUES('張紜蓁','睿杰工程');
INSERT INTO "client_assignments" VALUES('張紜蓁','梅川商行');
INSERT INTO "client_assignments" VALUES('張紜蓁','天青');
INSERT INTO "client_assignments" VALUES('張紜蓁','米吉');
INSERT INTO "client_assignments" VALUES('張紜蓁','翱祥科技');
INSERT INTO "client_assignments" VALUES('張紜蓁','振中投資');
INSERT INTO "client_assignments" VALUES('張紜蓁','昊遠精密科技');
INSERT INTO "client_assignments" VALUES('張紜蓁','大有工業(簽證)');
INSERT INTO "client_assignments" VALUES('張紜蓁','士邦機械');
INSERT INTO "client_assignments" VALUES('張紜蓁','爵特');
INSERT INTO "client_assignments" VALUES('張紜蓁','有舜建設有限公司(114.02.25新客)');
INSERT INTO "client_assignments" VALUES('張紜蓁','國群建設');
INSERT INTO "client_assignments" VALUES('張紜蓁','邦群不動產');
INSERT INTO "client_assignments" VALUES('張紜蓁','無齡感有限公司');
INSERT INTO "client_assignments" VALUES('莊凱閔','佳禾研發');
INSERT INTO "client_assignments" VALUES('莊凱閔','萊斯特生醫');
INSERT INTO "client_assignments" VALUES('莊凱閔','和大芯科技');
INSERT INTO "client_assignments" VALUES('莊凱閔','森見室內裝修');
INSERT INTO "client_assignments" VALUES('莊凱閔','八福銀髮');
INSERT INTO "client_assignments" VALUES('莊凱閔','吉市文創');
INSERT INTO "client_assignments" VALUES('莊凱閔','成大裕');
INSERT INTO "client_assignments" VALUES('莊凱閔','草悟道');
INSERT INTO "client_assignments" VALUES('莊凱閔','福記中藥行');
INSERT INTO "client_assignments" VALUES('莊凱閔','興大員生社');
INSERT INTO "client_assignments" VALUES('莊凱閔','超仁運動用品');
INSERT INTO "client_assignments" VALUES('莊凱閔','基龍米克斯');
INSERT INTO "client_assignments" VALUES('莊凱閔','福祿門');
INSERT INTO "client_assignments" VALUES('呂柏澄','振中投資');
INSERT INTO "client_assignments" VALUES('呂柏澄','喜埕');
INSERT INTO "client_assignments" VALUES('呂柏澄','篤行');
INSERT INTO "client_assignments" VALUES('呂柏澄','木村一心');
INSERT INTO "client_assignments" VALUES('呂柏澄','蘭埕');
INSERT INTO "client_assignments" VALUES('呂柏澄','小巷愛樂芬');
INSERT INTO "client_assignments" VALUES('呂柏澄','東坡居');
INSERT INTO "client_assignments" VALUES('呂柏澄','禾茗飲料店');
INSERT INTO "client_assignments" VALUES('呂柏澄','利基開發建設');
INSERT INTO "client_assignments" VALUES('呂柏澄','長葒人力資源');
INSERT INTO "client_assignments" VALUES('呂柏澄','仲凌網通');
INSERT INTO "client_assignments" VALUES('呂柏澄','奕緯公關');
INSERT INTO "client_assignments" VALUES('呂柏澄','虫憶甲蟲館');
INSERT INTO "client_assignments" VALUES('呂柏澄','好期');
INSERT INTO "client_assignments" VALUES('呂柏澄','舊氏設計');
INSERT INTO "client_assignments" VALUES('呂柏澄','住福大河');
INSERT INTO "client_assignments" VALUES('呂柏澄','企業菁英');
INSERT INTO "client_assignments" VALUES('呂柏澄','品順室內裝修');
INSERT INTO "client_assignments" VALUES('呂柏澄','黃蘋科技');
INSERT INTO "client_assignments" VALUES('呂柏澄','御饗');
INSERT INTO "client_assignments" VALUES('呂柏澄','宸鳴');
INSERT INTO "client_assignments" VALUES('呂柏澄','群淼科技');
INSERT INTO "client_assignments" VALUES('呂柏澄','無藏茗葉');
INSERT INTO "client_assignments" VALUES('呂柏澄','聾人協會');
INSERT INTO "client_assignments" VALUES('呂柏澄','前景投資');
CREATE TABLE business_types (
  type_name TEXT PRIMARY KEY
);
INSERT INTO "business_types" VALUES('營業稅');
INSERT INTO "business_types" VALUES('營所稅');
INSERT INTO "business_types" VALUES('工商登記');
INSERT INTO "business_types" VALUES('扣繳');
INSERT INTO "business_types" VALUES('暫繳');
INSERT INTO "business_types" VALUES('記帳');
INSERT INTO "business_types" VALUES('查帳');
INSERT INTO "business_types" VALUES('財簽');
INSERT INTO "business_types" VALUES('稅簽');
INSERT INTO "business_types" VALUES('內部會議');
INSERT INTO "business_types" VALUES('內部行政-輸入客戶明細');
INSERT INTO "business_types" VALUES('內部行政');
INSERT INTO "business_types" VALUES('教育訓練');
CREATE TABLE leave_types (
  type_name TEXT PRIMARY KEY
);
INSERT INTO "leave_types" VALUES('特休');
INSERT INTO "leave_types" VALUES('加班補休');
INSERT INTO "leave_types" VALUES('事假');
INSERT INTO "leave_types" VALUES('病假');
INSERT INTO "leave_types" VALUES('生理假');
INSERT INTO "leave_types" VALUES('婚假');
INSERT INTO "leave_types" VALUES('喪假');
INSERT INTO "leave_types" VALUES('喪假-直系血親');
INSERT INTO "leave_types" VALUES('喪假-配偶父母');
INSERT INTO "leave_types" VALUES('喪假-兄弟姊妹');
INSERT INTO "leave_types" VALUES('喪假-祖父母');
INSERT INTO "leave_types" VALUES('產假');
INSERT INTO "leave_types" VALUES('陪產假');
INSERT INTO "leave_types" VALUES('產檢假');
CREATE TABLE timesheets (
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
INSERT INTO "timesheets" VALUES(11,'張紜蓁','有舜建設有限公司(114.02.25新客)','2025-10-14','星期二',2025,10,5,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',5);
INSERT INTO "timesheets" VALUES(12,'張紜蓁','無指定客戶','2025-10-14','星期二',2025,10,3,0,0,0,0,0,0,0,0,0,0,NULL,0,'內部行政',3);
INSERT INTO "timesheets" VALUES(13,'張紜蓁','無指定客戶','2025-10-16','星期四',2025,10,5,0,0,0,0,0,0,0,0,0,0,NULL,0,'內部行政',5);
INSERT INTO "timesheets" VALUES(14,'張紜蓁','有舜建設有限公司(114.02.25新客)','2025-10-15','星期三',2025,10,5,0,0,0,0,0,0,0,0,0,0,NULL,0,'內部行政',5);
INSERT INTO "timesheets" VALUES(15,'張紜蓁','無指定客戶','2025-10-15','星期三',2025,10,3,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',3);
INSERT INTO "timesheets" VALUES(16,'張紜蓁','無齡感有限公司','2025-10-16','星期四',2025,10,3,0,0,0,0,0,0,0,0,0,0,NULL,0,'營所稅',3);
INSERT INTO "timesheets" VALUES(40,'莊凱閔','佳禾研發','2025-10-14','星期二',2025,10,4,0,0,0,0,0,0,0,0,0,0,NULL,0,'營所稅',4);
INSERT INTO "timesheets" VALUES(41,'莊凱閔','萊斯特生醫','2025-10-14','星期二',2025,10,1,0,0,0,0,0,0,0,0,0,0,NULL,0,'工商登記',1);
INSERT INTO "timesheets" VALUES(42,'莊凱閔','和大芯科技','2025-10-14','星期二',2025,10,1,0,0,0,0,0,0,0,0,0,0,NULL,0,'工商登記',1);
INSERT INTO "timesheets" VALUES(43,'莊凱閔','森見室內裝修','2025-10-15','星期三',2025,10,0.5,0,0,0,0,0,0,0,0,0,0,NULL,0,'工商登記',0.5);
INSERT INTO "timesheets" VALUES(44,'莊凱閔','八福銀髮','2025-10-15','星期三',2025,10,1,0,0,0,0,0,0,0,0,0,0,NULL,0,'工商登記',1);
INSERT INTO "timesheets" VALUES(45,'莊凱閔','無指定客戶','2025-10-15','星期三',2025,10,2.5,0,0,0,0,0,0,0,0,0,0,NULL,0,'內部行政',2.5);
INSERT INTO "timesheets" VALUES(46,'莊凱閔','無指定客戶','2025-10-17','星期五',2025,10,4,0,0,0,0,0,0,0,0,0,0,NULL,0,'內部行政',4);
INSERT INTO "timesheets" VALUES(47,'莊凱閔','盛鈺精機','2025-10-16','星期四',2025,10,4,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',4);
INSERT INTO "timesheets" VALUES(48,'莊凱閔','盛鈺精機','2025-10-17','星期五',2025,10,2,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',2);
INSERT INTO "timesheets" VALUES(49,'莊凱閔','范特喜','2025-10-16','星期四',2025,10,2,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',2);
INSERT INTO "timesheets" VALUES(50,'莊凱閔',NULL,'2025-10-16','星期四',2025,10,0,0,0,0,0,0,0,0,0,0,0,'事假',2,NULL,0);
INSERT INTO "timesheets" VALUES(51,'呂柏澄','無指定客戶','2025-10-14','星期二',2025,10,8,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',8);
INSERT INTO "timesheets" VALUES(52,'呂柏澄','無指定客戶','2025-10-15','星期三',2025,10,1,0,0,0,0,0,0,0,0,0,0,NULL,0,'內部行政-輸入客戶明細',1);
INSERT INTO "timesheets" VALUES(53,'呂柏澄','無指定客戶','2025-10-16','星期四',2025,10,2,0,0,0,0,0,0,0,0,0,0,NULL,0,'內部行政-輸入客戶明細',2);
INSERT INTO "timesheets" VALUES(54,'呂柏澄','振中投資','2025-10-15','星期三',2025,10,7,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',7);
INSERT INTO "timesheets" VALUES(55,'呂柏澄','振中投資','2025-10-16','星期四',2025,10,6,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',6);
INSERT INTO "timesheets" VALUES(56,'呂柏澄','振中投資','2025-10-17','星期五',2025,10,7,0,0,0,0,0,0,0,0,0,0,NULL,0,'記帳',7);
INSERT INTO "timesheets" VALUES(57,'呂柏澄','禾茗飲料店','2025-10-17','星期五',2025,10,1,0,0,0,0,0,0,0,0,0,0,NULL,0,'營所稅',1);
INSERT INTO "timesheets" VALUES(58,'呂柏澄','蘭埕','2025-10-18','星期六',2025,10,0,0,8,0,0,0,0,0,0,0,0,NULL,0,'稅簽',12.7);
INSERT INTO "timesheets" VALUES(59,'呂柏澄','仲凌網通','2025-10-20','星期一',2025,10,8,0,0,0,0,0,0,0,0,0,0,NULL,0,'營所稅',8);
CREATE TABLE overtime_rates (
  rate_type TEXT NOT NULL,       /* '平日加班', '休息日加班' 等 */
  hour_start REAL NOT NULL,    /* 時數起 (>) */
  hour_end REAL NOT NULL,      /* 時數迄 (<=) */
  rate_multiplier REAL NOT NULL  /* 費率倍率 */
);
INSERT INTO "overtime_rates" VALUES('平日加班',0,2,1.34);
INSERT INTO "overtime_rates" VALUES('平日加班',2,4,1.67);
INSERT INTO "overtime_rates" VALUES('休息日加班',0,2,1.34);
INSERT INTO "overtime_rates" VALUES('休息日加班',2,8,1.67);
INSERT INTO "overtime_rates" VALUES('休息日加班',8,12,2.67);
INSERT INTO "overtime_rates" VALUES('國定假日加班',0,8,1);
INSERT INTO "overtime_rates" VALUES('國定假日加班',8,10,1.34);
INSERT INTO "overtime_rates" VALUES('國定假日加班',10,12,1.67);
INSERT INTO "overtime_rates" VALUES('例假日加班',0,8,1);
INSERT INTO "overtime_rates" VALUES('例假日加班',8,12,2);
CREATE TABLE annual_leave_rules (
  seniority_years REAL PRIMARY KEY NOT NULL, -- 年資 (主鍵)
  leave_days REAL NOT NULL                 -- 對應天數
);
INSERT INTO "annual_leave_rules" VALUES(0.5,3);
INSERT INTO "annual_leave_rules" VALUES(1,7);
INSERT INTO "annual_leave_rules" VALUES(2,10);
INSERT INTO "annual_leave_rules" VALUES(3,14);
INSERT INTO "annual_leave_rules" VALUES(4,14);
INSERT INTO "annual_leave_rules" VALUES(5,15);
INSERT INTO "annual_leave_rules" VALUES(6,15);
INSERT INTO "annual_leave_rules" VALUES(7,15);
INSERT INTO "annual_leave_rules" VALUES(8,15);
INSERT INTO "annual_leave_rules" VALUES(9,15);
INSERT INTO "annual_leave_rules" VALUES(10,15);
INSERT INTO "annual_leave_rules" VALUES(11,16);
INSERT INTO "annual_leave_rules" VALUES(12,17);
INSERT INTO "annual_leave_rules" VALUES(13,18);
INSERT INTO "annual_leave_rules" VALUES(14,19);
INSERT INTO "annual_leave_rules" VALUES(15,20);
INSERT INTO "annual_leave_rules" VALUES(16,21);
INSERT INTO "annual_leave_rules" VALUES(17,22);
INSERT INTO "annual_leave_rules" VALUES(18,23);
INSERT INTO "annual_leave_rules" VALUES(19,24);
INSERT INTO "annual_leave_rules" VALUES(20,25);
INSERT INTO "annual_leave_rules" VALUES(21,26);
INSERT INTO "annual_leave_rules" VALUES(22,27);
INSERT INTO "annual_leave_rules" VALUES(23,28);
INSERT INTO "annual_leave_rules" VALUES(24,29);
INSERT INTO "annual_leave_rules" VALUES(25,30);
CREATE TABLE annual_leave_carryover (
  employee_name TEXT PRIMARY KEY NOT NULL, -- 員工姓名 (主鍵)
  carryover_days REAL NOT NULL DEFAULT 0,  -- 結轉天數
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE
);
CREATE TABLE other_leave_rules (
  leave_type TEXT PRIMARY KEY NOT NULL, -- 假期類別 (主鍵)
  leave_days REAL NOT NULL,              -- 給假天數
  grant_type TEXT NOT NULL               -- 給假類型 ('事件給假' 或 '年度給假')
);
INSERT INTO "other_leave_rules" VALUES('婚假',8,'事件給假');
INSERT INTO "other_leave_rules" VALUES('事假',14,'年度給假');
INSERT INTO "other_leave_rules" VALUES('病假',30,'年度給假');
INSERT INTO "other_leave_rules" VALUES('喪假-直系血親',8,'事件給假');
INSERT INTO "other_leave_rules" VALUES('喪假-配偶父母',6,'事件給假');
INSERT INTO "other_leave_rules" VALUES('喪假-兄弟姊妹',3,'事件給假');
INSERT INTO "other_leave_rules" VALUES('喪假-祖父母',3,'事件給假');
INSERT INTO "other_leave_rules" VALUES('產假',56,'事件給假');
INSERT INTO "other_leave_rules" VALUES('陪產假',7,'事件給假');
INSERT INTO "other_leave_rules" VALUES('產檢假',5,'事件給假');
CREATE TABLE leave_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,      -- 唯一的事件 ID
  employee_name TEXT NOT NULL,               -- 員工姓名
  event_date TEXT NOT NULL,                  -- 事件發生日期 (格式: 'YYYY-MM-DD')
  event_type TEXT NOT NULL,                  -- 事件類型 (例如 '婚假', '喪假-直系血親')
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE,
  FOREIGN KEY (event_type) REFERENCES other_leave_rules(leave_type) ON UPDATE CASCADE
);
CREATE TABLE system_parameters (
  param_name TEXT PRIMARY KEY NOT NULL, -- 參數名稱 (主鍵)
  param_value REAL NOT NULL             -- 參數值 (使用 REAL 來存儲數字)
);
INSERT INTO "system_parameters" VALUES('每日正常工時上限',8);
INSERT INTO "system_parameters" VALUES('每日加班時數上限',4);
INSERT INTO "system_parameters" VALUES('每日請假時數上限',8);
INSERT INTO "system_parameters" VALUES('假日每日加班時數上限',12);
CREATE TABLE holidays (
  holiday_date TEXT PRIMARY KEY NOT NULL, -- 假日日期 (主鍵, 格式 'YYYY-MM-DD')
  holiday_name TEXT NOT NULL              -- 假日名稱
);
INSERT INTO "holidays" VALUES('2025-01-01','開國紀念日');
INSERT INTO "holidays" VALUES('2025-01-27','除夕前一日彈性放假');
INSERT INTO "holidays" VALUES('2025-01-28','農曆除夕');
INSERT INTO "holidays" VALUES('2025-01-29','農曆春節');
INSERT INTO "holidays" VALUES('2025-01-30','農曆春節');
INSERT INTO "holidays" VALUES('2025-01-31','農曆春節');
INSERT INTO "holidays" VALUES('2025-02-28','和平紀念日');
INSERT INTO "holidays" VALUES('2025-04-03','兒童節(調整放假)');
INSERT INTO "holidays" VALUES('2025-04-04','兒童節/民族掃墓節');
INSERT INTO "holidays" VALUES('2025-05-01','勞動節');
INSERT INTO "holidays" VALUES('2025-05-30','端午節(補假)');
INSERT INTO "holidays" VALUES('2025-09-29','教師節(補假)');
INSERT INTO "holidays" VALUES('2025-10-06','中秋節');
INSERT INTO "holidays" VALUES('2025-10-10','國慶日');
INSERT INTO "holidays" VALUES('2025-10-24','光復節(補假)');
INSERT INTO "holidays" VALUES('2025-12-25','行憲紀念日');
INSERT INTO "holidays" VALUES('2026-01-01','開國紀念日');
INSERT INTO "holidays" VALUES('2026-02-16','農曆除夕');
INSERT INTO "holidays" VALUES('2026-02-17','農曆春節');
INSERT INTO "holidays" VALUES('2026-02-18','農曆春節');
INSERT INTO "holidays" VALUES('2026-02-19','農曆春節');
INSERT INTO "holidays" VALUES('2026-02-20','農曆春節(補假)');
INSERT INTO "holidays" VALUES('2026-02-27','和平紀念日(補假)');
INSERT INTO "holidays" VALUES('2026-04-03','兒童節(補假)');
INSERT INTO "holidays" VALUES('2026-04-06','民族掃墓節(補假)');
INSERT INTO "holidays" VALUES('2026-05-01','勞動節');
INSERT INTO "holidays" VALUES('2026-06-19','端午節');
INSERT INTO "holidays" VALUES('2026-09-25','中秋節');
INSERT INTO "holidays" VALUES('2026-09-28','教師節');
INSERT INTO "holidays" VALUES('2026-10-09','國慶日(補假)');
INSERT INTO "holidays" VALUES('2026-10-26','光復節(補假)');
INSERT INTO "holidays" VALUES('2026-12-25','行憲紀念日');
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
  employee_name TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE SET NULL
);
INSERT INTO "users" VALUES(5,'admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9','admin',NULL,1,'2025-10-25 00:26:50','2025-10-25 00:26:50');
INSERT INTO "users" VALUES(6,'zhuang','bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a','employee','莊凱閔',1,'2025-10-25 00:26:50','2025-10-25 04:07:16');
INSERT INTO "users" VALUES(7,'zhang','5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff','employee','張紜蓁',1,'2025-10-25 00:26:50','2025-10-25 00:26:50');
INSERT INTO "users" VALUES(8,'lu','5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff','employee','呂柏澄',1,'2025-10-25 00:26:50','2025-10-25 00:26:50');
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_token TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO "sessions" VALUES(6,'0cfed100bbf6cfdd26b223aa4f8eb9682d37005ff017f629f8b81e7fe3c97fe9',6,'2025-11-01T03:21:13.468Z','2025-10-25 03:21:13');
INSERT INTO "sessions" VALUES(7,'ab2e5f0016c2cce79f18457e785ea19b86d00f69cd2d0b552cded57058ec949c',5,'2025-11-01T03:32:33.504Z','2025-10-25 03:32:33');
INSERT INTO "sessions" VALUES(8,'b57a4b1ef70cf21dc60ef4dd020f3c2ee8339bb6fded8b8c78c4f7743e06398c',5,'2025-11-01T03:42:39.404Z','2025-10-25 03:42:39');
INSERT INTO "sessions" VALUES(12,'512b175a1e71b95d03a114450359d2db08bc8bc8a5b51dd0420c15d49a850033',5,'2025-11-01T04:07:41.441Z','2025-10-25 04:07:41');
INSERT INTO "sessions" VALUES(13,'464753720c93d471ee08675be0385b08536535efd163de456d478b0025149065',5,'2025-11-01T04:15:32.172Z','2025-10-25 04:15:32');
INSERT INTO "sessions" VALUES(14,'08c07876b3d6792f1baeebf39b14ad04ae0178b31aa445c41f53f00f5414e4ef',5,'2025-11-01T04:24:36.870Z','2025-10-25 04:24:36');
INSERT INTO "sessions" VALUES(15,'a1a91948945dfe34fecb2918ef00dda92aef7a633e7b016dd92d94410bf8d9eb',5,'2025-11-01T04:34:54.657Z','2025-10-25 04:34:54');
INSERT INTO "sessions" VALUES(16,'9419e6997b90b1da23346265410500763663d8445e392d84423411fcd30e62d4',5,'2025-11-01T05:03:56.819Z','2025-10-25 05:03:56');
INSERT INTO "sessions" VALUES(17,'77a6998b6ec6124f5778b1c1cf4f1a6aa8e0ea717fc4f9965749d9514f3077ca',5,'2025-11-01T05:14:22.198Z','2025-10-25 05:14:22');
INSERT INTO "sessions" VALUES(18,'52cc3f258ddd08b5659a627e575d7753cbfaa6c74828148ee09eac580281495d',5,'2025-11-01T05:22:10.869Z','2025-10-25 05:22:10');
INSERT INTO "sessions" VALUES(20,'38f31d415ec4cca5f39134fb9c18b96f55d3d0eda246baf63e206b730e7841c5',5,'2025-11-01T05:53:06.632Z','2025-10-25 05:53:06');
INSERT INTO "sessions" VALUES(23,'a4fbf15ab116522797d8651d5de433a9127cb9a1d7ac1b66fb4b850ef108bff4',7,'2025-11-01T10:07:43.275Z','2025-10-25 10:07:43');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('timesheets',59);
INSERT INTO "sqlite_sequence" VALUES('users',10);
INSERT INTO "sqlite_sequence" VALUES('sessions',23);
INSERT INTO "sqlite_sequence" VALUES('leave_events',3);
CREATE INDEX idx_leave_events_employee_type ON leave_events (employee_name, event_type);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_employee ON users(employee_name);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
