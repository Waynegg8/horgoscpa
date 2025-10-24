-- 1. 清除所有舊的特休規則
DELETE FROM annual_leave_rules;

-- 2. 匯入最新的特休規則
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (0.5, 3);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (1, 7);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (2, 10);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (3, 14);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (4, 14);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (5, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (10, 15);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (11, 16);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (12, 17);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (13, 18);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (14, 19);
INSERT INTO annual_leave_rules (seniority_years, leave_days) VALUES (15, 20);