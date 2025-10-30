-- Overhead cost types and monthly overhead costs

CREATE TABLE IF NOT EXISTS OverheadCostTypes (
  cost_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_code TEXT UNIQUE NOT NULL,
  cost_name TEXT NOT NULL,
  category TEXT NOT NULL,
  allocation_method TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  CHECK (category IN ('fixed', 'variable')),
  CHECK (allocation_method IN ('per_employee', 'per_hour', 'per_revenue'))
);
CREATE INDEX IF NOT EXISTS idx_overhead_cost_types_active ON OverheadCostTypes(is_active);
CREATE INDEX IF NOT EXISTS idx_overhead_cost_types_category ON OverheadCostTypes(category);

CREATE TABLE IF NOT EXISTS MonthlyOverheadCosts (
  overhead_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  recorded_by INTEGER NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (recorded_by) REFERENCES Users(user_id),
  UNIQUE(cost_type_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_monthly_overhead_date ON MonthlyOverheadCosts(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_overhead_type ON MonthlyOverheadCosts(cost_type_id);



