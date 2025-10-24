-- 清除舊資料（如果需要）
DELETE FROM leave_types;

-- 正確插入
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