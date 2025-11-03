-- 薪资项目类型表和员工薪资项目表

-- 1. 薪资项目类型表（SalaryItemTypes）
CREATE TABLE IF NOT EXISTS SalaryItemTypes (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('allowance', 'bonus', 'deduction')),
  is_regular_payment BOOLEAN DEFAULT 0,  -- 是否为经常性给与（影响时薪计算）
  is_fixed BOOLEAN DEFAULT 0,  -- 金额是否固定
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_item_types_category ON SalaryItemTypes(category);
CREATE INDEX IF NOT EXISTS idx_salary_item_types_regular ON SalaryItemTypes(is_regular_payment);

-- 2. 员工薪资项目表（EmployeeSalaryItems）
CREATE TABLE IF NOT EXISTS EmployeeSalaryItems (
  employee_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_type_id INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),  -- 金额（以分为单位）
  effective_date TEXT NOT NULL,  -- 生效日期 YYYY-MM-DD
  expiry_date TEXT,  -- 过期日期（NULL表示永久有效）
  is_active BOOLEAN DEFAULT 1,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (item_type_id) REFERENCES SalaryItemTypes(item_type_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_salary_items_user ON EmployeeSalaryItems(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_type ON EmployeeSalaryItems(item_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_date ON EmployeeSalaryItems(effective_date, expiry_date);
CREATE INDEX IF NOT EXISTS idx_employee_salary_items_active ON EmployeeSalaryItems(is_active);

-- 3. 插入预设薪资项目类型
INSERT INTO SalaryItemTypes (item_code, item_name, category, is_regular_payment, is_fixed, description, display_order) VALUES
  ('FULL_ATTENDANCE', '全勤奖金', 'bonus', 1, 0, '当月无病假、事假时发放', 1),
  ('MEAL_ALLOWANCE', '伙食津贴', 'allowance', 1, 1, '每月固定伙食津贴', 2),
  ('TRANSPORT_ALLOWANCE', '交通津贴', 'allowance', 1, 1, '每月固定交通津贴', 3),
  ('POSITION_ALLOWANCE', '职务加给', 'allowance', 1, 1, '主管或特殊职务加给', 4),
  ('PHONE_ALLOWANCE', '电话津贴', 'allowance', 1, 1, '每月电话费补助', 5),
  ('PARKING_ALLOWANCE', '停车津贴', 'allowance', 1, 1, '每月停车费补助', 6),
  ('PERFORMANCE', '绩效奖金', 'bonus', 1, 0, '每月绩效奖金（可按月调整）', 7),
  ('SPECIAL_BONUS', '特殊奖金', 'bonus', 0, 0, '非经常性特殊奖金', 8);

-- 4. 为现有员工设置预设薪资项目（示例）
-- 管理员获得较高的全勤奖金和职务加给
INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'FULL_ATTENDANCE'),
  300000,  -- 3000元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 1;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'MEAL_ALLOWANCE'),
  240000,  -- 2400元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 1;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'TRANSPORT_ALLOWANCE'),
  120000,  -- 1200元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 1;

-- 一般员工获得较低的全勤奖金
INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'FULL_ATTENDANCE'),
  200000,  -- 2000元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 0;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'MEAL_ALLOWANCE'),
  240000,  -- 2400元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 0;

INSERT INTO EmployeeSalaryItems (user_id, item_type_id, amount_cents, effective_date, created_by)
SELECT 
  u.user_id,
  (SELECT item_type_id FROM SalaryItemTypes WHERE item_code = 'TRANSPORT_ALLOWANCE'),
  120000,  -- 1200元
  '2025-01-01',
  u.user_id
FROM Users u
WHERE u.is_admin = 0;

