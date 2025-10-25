-- 1. 清除所有舊的特休規則
DELETE FROM annual_leave_rules;

-- 2. 匯入最新的特休規則
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