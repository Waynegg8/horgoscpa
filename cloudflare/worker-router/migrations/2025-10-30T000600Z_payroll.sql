-- Payroll runs and monthly payroll results

CREATE TABLE IF NOT EXISTS PayrollRuns (
  run_id TEXT PRIMARY KEY,
  month TEXT NOT NULL,              -- YYYY-MM
  idempotency_key TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(month)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_runs_idem ON PayrollRuns(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON PayrollRuns(month);

CREATE TABLE IF NOT EXISTS MonthlyPayroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  base_salary_cents INTEGER NOT NULL,
  regular_allowance_cents INTEGER NOT NULL,
  bonus_cents INTEGER NOT NULL,
  overtime_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  is_full_attendance BOOLEAN NOT NULL,
  FOREIGN KEY (run_id) REFERENCES PayrollRuns(run_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payroll_run ON MonthlyPayroll(run_id);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_user ON MonthlyPayroll(user_id);



