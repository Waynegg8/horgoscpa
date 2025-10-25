-- ================================================
-- 初始資料完整匯入
-- 整合所有 import_*.sql 檔案內容
-- ================================================

-- ========== 1. 員工資料 ==========
DELETE FROM employees;
INSERT INTO employees (name, hire_date, email, gender) VALUES ('莊凱閔', '2020-05-04', 'test@test.com', NULL);
INSERT INTO employees (name, hire_date, email, gender) VALUES ('張紜蓁', '2019-04-15', 'test@test.com', NULL);
INSERT INTO employees (name, hire_date, email, gender) VALUES ('呂柏澄', '2025-05-12', 'test@test.com', 'male');

-- ========== 2. 客戶資料 ==========
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

-- ========== 3. 業務類型 ==========
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

-- ========== 4. 假別類型 ==========
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
INSERT INTO leave_types (type_name) VALUES ('產假');
INSERT INTO leave_types (type_name) VALUES ('陪產假');
INSERT INTO leave_types (type_name) VALUES ('產檢假');

-- ========== 5. 加班費率規則 ==========
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

-- ========== 6. 特休年資規則 ==========
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

-- ========== 7. 其他假期規則 ==========
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

-- ========== 8. 系統參數 ==========
DELETE FROM system_parameters;
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日正常工時上限', 8);
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日加班時數上限', 4);
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日請假時數上限', 8);
INSERT INTO system_parameters (param_name, param_value) VALUES ('假日每日加班時數上限', 12);

-- ========== 9. 國定假日（2025-2026）==========
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

-- ========== 10. 客戶指派 ==========
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
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '冠群資訊');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '果思管顧(原冠群管顧)');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '嘉人管顧');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '豪辰投資');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '榮建土地開發');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '安永信(原銘鐘實業)');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '廉風台中建國分所');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '霍爾果斯');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '輝律商標');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '一橋地政士');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '黃維君地政士');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '快得機械');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '盛鈺精機');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '金溢國際');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '中華食安協會');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '優治工業');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '冠絟工業');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '正茵資產');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '許家瑜律師');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '喜田投資');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '金澤實業');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '馥樂咖啡');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '尚銀實業');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '偉光國際');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '前景投資');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '比如資產');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '志恆資本');
INSERT INTO client_assignments (employee_name, client_name) VALUES ('莊凱閔', '范特喜');
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

-- ========== 11. 預設管理員與使用者 ==========
-- 預設管理員帳號（密碼: admin123）
INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', NULL, 1);

-- 員工帳號（密碼: employee123）
INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('zhuang', '5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff', 'employee', '莊凱閔', 1);

INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('zhang', '5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff', 'employee', '張紜蓁', 1);

INSERT OR IGNORE INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('lu', '5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff', 'employee', '呂柏澄', 1);

