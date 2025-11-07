-- 重构薪资项目分类系统
-- 1. 更新 category CHECK 约束，支持新的分类
-- 2. 移除 is_regular_payment 和 is_fixed 字段（已废弃）

-- SQLite 不支持直接修改 CHECK 约束，需要重建表
-- Step 0: 禁用外键约束（重建表时需要）
PRAGMA foreign_keys = OFF;

-- Step 1: 创建新表结构
CREATE TABLE IF NOT EXISTS SalaryItemTypes_new (
  item_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('regular_allowance', 'irregular_allowance', 'bonus', 'year_end_bonus', 'deduction', 'allowance')),
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Step 2: 复制数据（如果有的话，并且表存在）
INSERT INTO SalaryItemTypes_new (item_type_id, item_code, item_name, category, description, is_active, display_order, created_at, updated_at)
SELECT item_type_id, item_code, item_name, category, description, is_active, display_order, created_at, updated_at
FROM SalaryItemTypes
WHERE EXISTS (SELECT 1 FROM SalaryItemTypes LIMIT 1);

-- Step 3: 删除旧表（如果存在）
DROP TABLE IF EXISTS SalaryItemTypes;

-- Step 4: 重命名新表
ALTER TABLE SalaryItemTypes_new RENAME TO SalaryItemTypes;

-- Step 5: 重建索引
CREATE INDEX IF NOT EXISTS idx_salary_item_types_active ON SalaryItemTypes(is_active);
CREATE INDEX IF NOT EXISTS idx_salary_item_types_category ON SalaryItemTypes(category);

-- Step 6: 插入标准薪资项目（繁体中文）
INSERT INTO SalaryItemTypes (item_code, item_name, category, description, display_order, is_active, created_at, updated_at) VALUES
  ('TEAM_LEADER_ALLOWANCE', '組長加給', 'regular_allowance', '固定每月發放', 1, 1, datetime('now'), datetime('now')),
  ('FULL_ATTENDANCE_BONUS', '全勤獎金', 'bonus', '無病假、事假時發放', 2, 1, datetime('now'), datetime('now')),
  ('PERFORMANCE', '績效獎金', 'bonus', '每月變動的績效獎金', 3, 1, datetime('now'), datetime('now')),
  ('LABOR_INSURANCE', '勞保(個人負擔)', 'deduction', '勞工保險個人負擔部分', 10, 1, datetime('now'), datetime('now')),
  ('HEALTH_INSURANCE', '健保(個人負擔)', 'deduction', '健康保險個人負擔部分', 11, 1, datetime('now'), datetime('now'));

-- Step 7: 重新启用外键约束
PRAGMA foreign_keys = ON;

