-- Initialize basic leave balances for all users
-- This ensures every user has sick leave and personal leave records

-- Get current year
-- For each active user, ensure they have sick leave and personal leave balances

-- Sick leave: 30 days per year (普通傷病假)
INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at)
SELECT 
  user_id,
  'sick' as leave_type,
  CAST(strftime('%Y', 'now') AS INTEGER) as year,
  30 as total,
  0 as used,
  30 as remain,
  datetime('now') as updated_at
FROM Users
WHERE is_deleted = 0;

-- Personal leave: 14 days per year (事假)
INSERT OR IGNORE INTO LeaveBalances (user_id, leave_type, year, total, used, remain, updated_at)
SELECT 
  user_id,
  'personal' as leave_type,
  CAST(strftime('%Y', 'now') AS INTEGER) as year,
  14 as total,
  0 as used,
  14 as remain,
  datetime('now') as updated_at
FROM Users
WHERE is_deleted = 0;

-- Annual leave will be calculated based on seniority (handled by separate logic)
-- Compensatory leave is tracked in CompensatoryLeaveGrants table
-- Life event leaves are tracked in LifeEventLeaveGrants table

