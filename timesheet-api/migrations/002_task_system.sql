-- ================================================================
-- Migration 002: 任務系統
-- 創建日期: 2025-10-26
-- 說明: 統一任務管理系統，整合專案、多階段任務、週期任務
-- 依賴: 001_core_tables.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS task_stages;
DROP TABLE IF EXISTS multi_stage_tasks;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;  -- 廢棄，整合到 tasks

-- ----------------------------------------------------------------
-- 1. tasks（統一任務表）
-- ----------------------------------------------------------------

CREATE TABLE tasks (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 基本信息
    title TEXT NOT NULL,
    description TEXT,
    
    -- 任務類型（新增：統一管理所有類型）
    task_type TEXT DEFAULT 'task' CHECK(task_type IN ('task', 'project', 'recurring')),
    category TEXT CHECK(category IN ('recurring', 'business', 'finance', 'client_service', 'general')),
    
    -- 狀態與優先級
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'on_hold', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    
    -- 時間（標準化命名）
    due_date DATETIME,
    start_date DATETIME,
    completed_date DATETIME,
    
    -- 關聯（統一使用 user_id 格式）
    assigned_user_id INTEGER,
    created_by_user_id INTEGER,
    client_id INTEGER,
    
    -- 專案專用欄位（當 task_type='project' 時使用）
    project_budget DECIMAL(12, 2),
    project_actual_cost DECIMAL(12, 2),
    
    -- 標籤和附件
    tags TEXT,  -- JSON 格式
    attachments_data TEXT,  -- JSON 格式
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

-- 索引（優化查詢性能）
CREATE INDEX idx_tasks_assigned_user ON tasks(assigned_user_id);
CREATE INDEX idx_tasks_created_by_user ON tasks(created_by_user_id);
CREATE INDEX idx_tasks_client ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- ----------------------------------------------------------------
-- 2. multi_stage_tasks（多階段任務）
-- ----------------------------------------------------------------

CREATE TABLE multi_stage_tasks (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯任務（一對一）
    task_id INTEGER NOT NULL UNIQUE,
    
    -- 階段統計
    total_stages INTEGER NOT NULL,
    completed_stages INTEGER DEFAULT 0,
    overall_progress INTEGER DEFAULT 0,
    current_stage INTEGER DEFAULT 1,
    
    -- 範本信息
    template_id INTEGER,
    template_type TEXT CHECK(template_type IN ('general', 'service_checklist')),
    template_version INTEGER,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    -- template_id 外鍵將在 003 migration 中添加
);

-- 索引
CREATE INDEX idx_multi_stage_tasks_task ON multi_stage_tasks(task_id);
CREATE INDEX idx_multi_stage_tasks_template ON multi_stage_tasks(template_id);

-- ----------------------------------------------------------------
-- 3. task_stages（任務階段）
-- ----------------------------------------------------------------

CREATE TABLE task_stages (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯多階段任務
    multi_stage_task_id INTEGER NOT NULL,
    
    -- 階段信息
    stage_order INTEGER NOT NULL,
    stage_name TEXT NOT NULL,
    stage_description TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'skipped')),
    
    -- 檢查清單（JSON 格式）
    checklist_data TEXT,
    
    -- 工時估算與實際
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    
    -- 人員分配（統一命名）
    assigned_user_id INTEGER,
    completed_by_user_id INTEGER,
    approved_by_user_id INTEGER,
    
    -- 審核
    requires_approval BOOLEAN DEFAULT 0,
    
    -- 時間
    completed_at DATETIME,
    approved_at DATETIME,
    
    -- 備註
    notes TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (multi_stage_task_id) REFERENCES multi_stage_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_task_stages_multi_stage_task ON task_stages(multi_stage_task_id);
CREATE INDEX idx_task_stages_assigned_user ON task_stages(assigned_user_id);
CREATE INDEX idx_task_stages_status ON task_stages(status);
CREATE INDEX idx_task_stages_order ON task_stages(multi_stage_task_id, stage_order);

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 002 completed. Task system tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%task%' ORDER BY name;

-- ================================================================
-- End of Migration 002
-- ================================================================

