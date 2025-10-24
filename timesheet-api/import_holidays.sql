-- 1. 清除所有舊的國定假日
DELETE FROM holidays;

-- 2. 匯入最新的國定假日清單
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