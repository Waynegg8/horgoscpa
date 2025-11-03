-- 修复薪资项目的生效日期
-- 将所有生效日期设置为2025年初，以便历史月份也能查询到

UPDATE EmployeeSalaryItems
SET effective_date = '2025-01-01'
WHERE effective_date > '2025-01-31';

-- 如果需要更早的日期，可以改为 '2024-01-01'

