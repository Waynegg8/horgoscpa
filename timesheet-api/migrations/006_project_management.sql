-- ================================================================
-- 專案與任務管理系統 Migration
-- 檔案: 006_project_management.sql
-- 日期: 2025-10-25
-- 描述: 建立專案和任務管理，整合客戶、員工、工時系統
-- ================================================================

-- ============================================================
-- 1. 專案表（整合客戶）
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  client_name TEXT,
  description TEXT,
  status TEXT DEFAULT 'planning' 
    CHECK(status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' 
    CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  
  start_date DATE,
  due_date DATE,
  completed_date DATE,
  
  created_by TEXT NOT NULL,
  assigned_to TEXT,
  
  progress INTEGER DEFAULT 0,  -- 0-100
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (client_name) REFERENCES clients(name) ON UPDATE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(username),
  FOREIGN KEY (assigned_to) REFERENCES employees(name)
);

-- ============================================================
-- 2. 任務表（整合專案）
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' 
    CHECK(status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  
  assigned_to TEXT,
  estimated_hours REAL DEFAULT 0,
  actual_hours REAL DEFAULT 0,
  
  due_date DATE,
  completed_date DATE,
  
  sort_order INTEGER DEFAULT 0,
  parent_task_id INTEGER,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES employees(name),
  FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. 任務檢核清單
-- ============================================================
CREATE TABLE IF NOT EXISTS task_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  item_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. 任務更新記錄
-- ============================================================
CREATE TABLE IF NOT EXISTS task_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  update_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(username)
);

-- ============================================================
-- 5. 工時與任務關聯表（整合現有工時系統）
-- ============================================================
CREATE TABLE IF NOT EXISTS timesheet_task_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timesheet_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  hours REAL NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. 索引優化
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_name);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to ON projects(assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON projects(due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

CREATE INDEX IF NOT EXISTS idx_checklist_task ON task_checklist(task_id);
CREATE INDEX IF NOT EXISTS idx_updates_task ON task_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_links_task ON timesheet_task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_links_date ON timesheet_task_links(date);

-- ============================================================
-- Migration 完成
-- ============================================================

