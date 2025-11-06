-- Overhead recurring templates and monthly generation helper

CREATE TABLE IF NOT EXISTS OverheadRecurringTemplates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cost_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  notes TEXT,
  recurring_type TEXT NOT NULL DEFAULT 'monthly', -- monthly | yearly | once
  recurring_months TEXT, -- JSON array (1..12), for yearly
  effective_from TEXT,   -- 'YYYY-MM'
  effective_to TEXT,     -- 'YYYY-MM' or NULL
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (cost_type_id) REFERENCES OverheadCostTypes(cost_type_id),
  FOREIGN KEY (created_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_overhead_tpl_active ON OverheadRecurringTemplates(is_active);
CREATE INDEX IF NOT EXISTS idx_overhead_tpl_cost_type ON OverheadRecurringTemplates(cost_type_id);


