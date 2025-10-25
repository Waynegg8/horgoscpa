-- 修復使用者密碼雜湊
-- 刪除舊的使用者並重新插入正確的密碼雜湊

-- 先刪除所有現有使用者
DELETE FROM users;

-- 插入管理員帳號 (密碼: admin123)
INSERT INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', NULL, 1);

-- 插入員工帳號 (預設密碼: employee123)
INSERT INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('zhuang', '5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff', 'employee', '莊凱閔', 1);

INSERT INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('zhang', '5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff', 'employee', '張紜蓁', 1);

INSERT INTO users (username, password_hash, role, employee_name, is_active) 
VALUES ('lu', '5b2f8e27e2e5b4081c03ce70b288c87bd1263140cbd1bd9ae078123509b7caff', 'employee', '呂柏澄', 1);

