-- Add salary and allowance fields to Users table

-- Add base_salary field (monthly base salary in TWD)
ALTER TABLE Users ADD COLUMN base_salary INTEGER DEFAULT 40000;

-- Add regular_allowance field (monthly regular allowance that counts towards hourly rate)
ALTER TABLE Users ADD COLUMN regular_allowance INTEGER DEFAULT 0;

-- Add note field for salary notes
ALTER TABLE Users ADD COLUMN salary_notes TEXT;

-- Update existing users to have reasonable default salaries based on their role
UPDATE Users SET base_salary = 45000 WHERE is_admin = 1 AND base_salary = 40000;


