-- ==================== 薪资计算缓存表 ====================
-- 用途：自动缓存每月薪资计算结果，加速报表查询
-- 更新机制：每次调用 calculateEmployeePayroll 后自动更新

CREATE TABLE IF NOT EXISTS PayrollCache (
  user_id INTEGER NOT NULL,
  year_month TEXT NOT NULL,  -- YYYY-MM
  
  -- 薪资数据（单位：分）
  base_salary_cents INTEGER NOT NULL DEFAULT 0,
  gross_salary_cents INTEGER NOT NULL DEFAULT 0,
  net_salary_cents INTEGER NOT NULL DEFAULT 0,
  overtime_cents INTEGER NOT NULL DEFAULT 0,
  performance_bonus_cents INTEGER NOT NULL DEFAULT 0,
  year_end_bonus_cents INTEGER NOT NULL DEFAULT 0,
  
  -- 其他统计数据
  total_work_hours REAL DEFAULT 0,
  total_overtime_hours REAL DEFAULT 0,
  
  -- 自动更新时间
  last_calculated_at TEXT DEFAULT (datetime('now')),
  
  PRIMARY KEY (user_id, year_month),
  FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- 索引：按年月查询（用于年度报表）
CREATE INDEX IF NOT EXISTS idx_payroll_cache_year_month 
ON PayrollCache(year_month);

-- 索引：按员工查询
CREATE INDEX IF NOT EXISTS idx_payroll_cache_user 
ON PayrollCache(user_id);

