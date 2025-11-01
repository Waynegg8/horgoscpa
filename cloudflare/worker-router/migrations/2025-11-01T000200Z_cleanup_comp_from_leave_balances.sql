-- Clean up comp leave type from LeaveBalances table
-- Comp leave should only be tracked in CompensatoryLeaveGrants table

DELETE FROM LeaveBalances WHERE leave_type = 'comp';

