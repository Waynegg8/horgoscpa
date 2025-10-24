-- 1. 清除所有舊的其他假期規則
DELETE FROM other_leave_rules;

-- 2. 匯入最新的其他假期規則
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('婚假', 8, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('事假', 14, '年度給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('病假', 30, '年度給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-直系血親', 8, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-配偶父母', 6, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-兄弟姊妹', 3, '事件給假');
INSERT INTO other_leave_rules (leave_type, leave_days, grant_type) VALUES ('喪假-祖父母', 3, '事件給假');