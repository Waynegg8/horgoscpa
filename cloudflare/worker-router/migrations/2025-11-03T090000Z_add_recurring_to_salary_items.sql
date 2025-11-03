-- 为薪资项目添加循环发放设定
-- recurring_type: 'monthly'=每月发放, 'yearly'=每年指定月份发放, 'once'=仅发放一次
-- recurring_months: 发放月份（JSON数组，例如 "[6,9,12]" 表示6月、9月、12月发放），仅当 recurring_type='yearly' 时使用

-- 添加循环类型字段
ALTER TABLE EmployeeSalaryItems ADD COLUMN recurring_type TEXT DEFAULT 'monthly';

-- 添加发放月份字段
ALTER TABLE EmployeeSalaryItems ADD COLUMN recurring_months TEXT DEFAULT NULL;

