-- ================================================================
-- Migration 003: 範本系統
-- 創建日期: 2025-10-26
-- 說明: 統一的任務範本系統，整合 multi_stage_templates 和 service_checklist_templates
-- 依賴: 001_core_tables.sql, 002_task_system.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS task_template_stages;
DROP TABLE IF EXISTS task_templates;
DROP TABLE IF EXISTS template_stages;  -- 舊表
DROP TABLE IF EXISTS multi_stage_templates;  -- 舊表
DROP TABLE IF EXISTS service_checklist_templates;  -- 舊表

-- ----------------------------------------------------------------
-- 1. task_templates（統一範本表）
-- ----------------------------------------------------------------

CREATE TABLE task_templates (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 範本信息
    template_name TEXT NOT NULL,
    template_type TEXT NOT NULL CHECK(template_type IN ('general', 'service_checklist')),
    
    -- 分類（general 類型使用）
    category TEXT CHECK(category IN ('business', 'finance', 'general')),
    
    -- 服務類型（service_checklist 類型使用）
    service_type TEXT CHECK(service_type IN ('accounting', 'vat', 'income_tax', 'withholding', 'audit')),
    
    -- 範本數據（JSON 格式，統一結構）
    template_data TEXT NOT NULL,
    
    -- 版本控制
    version INTEGER DEFAULT 1,
    
    -- 狀態
    is_active BOOLEAN DEFAULT 1,
    is_default BOOLEAN DEFAULT 0,
    is_locked BOOLEAN DEFAULT 0,
    
    -- 創建和修改者
    created_by_user_id INTEGER,
    last_modified_by_user_id INTEGER,
    
    -- 描述
    description TEXT,
    modification_reason TEXT,
    usage_count INTEGER DEFAULT 0,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (last_modified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_task_templates_type ON task_templates(template_type);
CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_templates_service_type ON task_templates(service_type);
CREATE INDEX idx_task_templates_is_default ON task_templates(is_default);
CREATE INDEX idx_task_templates_is_active ON task_templates(is_active);

-- ----------------------------------------------------------------
-- 2. task_template_stages（範本階段）
-- ----------------------------------------------------------------

CREATE TABLE task_template_stages (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯範本
    template_id INTEGER NOT NULL,
    
    -- 階段順序
    stage_order INTEGER NOT NULL,
    
    -- 階段數據（JSON 格式）
    stage_data TEXT NOT NULL,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_task_template_stages_template ON task_template_stages(template_id);
CREATE INDEX idx_task_template_stages_order ON task_template_stages(template_id, stage_order);

-- ----------------------------------------------------------------
-- 3. 添加 multi_stage_tasks 的範本外鍵
-- ----------------------------------------------------------------

-- 這個外鍵在 002 中無法創建，因為 task_templates 表還不存在
-- 現在表已創建，可以通過索引來建立關聯關係

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 003 completed. Template system tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%template%' ORDER BY name;

-- ================================================================
-- End of Migration 003
-- ================================================================

