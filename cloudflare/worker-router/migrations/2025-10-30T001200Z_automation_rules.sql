-- Automation rules and run logs

CREATE TABLE IF NOT EXISTS AutomationRules (
  rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL,         -- daily|weekly|monthly|cron
  schedule_value TEXT,                 -- e.g. '02:00', 'Mon 03:00', '1 02:00', or CRON expr
  condition_json TEXT,                 -- JSON string describing conditions/filters
  action_json TEXT NOT NULL,           -- JSON string describing actions
  is_enabled BOOLEAN DEFAULT 1,
  last_run_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  CHECK (schedule_type IN ('daily','weekly','monthly','cron'))
);

CREATE INDEX IF NOT EXISTS idx_auto_rules_enabled ON AutomationRules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_auto_rules_sched ON AutomationRules(schedule_type);

CREATE TABLE IF NOT EXISTS AutomationRunLogs (
  run_id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id INTEGER NOT NULL,
  started_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT,
  status TEXT DEFAULT 'success',       -- success|failed
  message TEXT,
  FOREIGN KEY (rule_id) REFERENCES AutomationRules(rule_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_runs_rule ON AutomationRunLogs(rule_id);
CREATE INDEX IF NOT EXISTS idx_auto_runs_started ON AutomationRunLogs(started_at);


