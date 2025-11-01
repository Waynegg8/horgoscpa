-- Add time fields to LeaveRequests for hourly leave tracking

ALTER TABLE LeaveRequests ADD COLUMN start_time TEXT;
ALTER TABLE LeaveRequests ADD COLUMN end_time TEXT;

-- start_time and end_time are in HH:MM format (e.g., "09:00", "14:30")
-- Only used when unit = 'hour'

