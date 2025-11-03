-- Add transport subsidy field to MonthlyPayroll table

ALTER TABLE MonthlyPayroll ADD COLUMN transport_subsidy_cents INTEGER NOT NULL DEFAULT 0;

-- Update comment: transport_subsidy_cents 是從該月已核准的 BusinessTrips 計算得出

