-- ================================================================
-- Migration 006: 知識庫系統
-- 創建日期: 2025-10-26
-- 說明: SOP、文檔、FAQ 管理系統
-- 依賴: 001_core_tables.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS sop_versions;
DROP TABLE IF EXISTS sops;
DROP TABLE IF EXISTS sop_categories;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS faq_categories;

-- ----------------------------------------------------------------
-- 1. sop_categories（SOP 分類）
-- ----------------------------------------------------------------

CREATE TABLE sop_categories (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 分類信息
    name TEXT NOT NULL UNIQUE,
    parent_category_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    
    -- 說明
    description TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵（自關聯）
    FOREIGN KEY (parent_category_id) REFERENCES sop_categories(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_sop_categories_parent ON sop_categories(parent_category_id);
CREATE INDEX idx_sop_categories_sort ON sop_categories(sort_order);

-- ----------------------------------------------------------------
-- 2. sops（標準作業程序）
-- ----------------------------------------------------------------

CREATE TABLE sops (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 基本信息
    title TEXT NOT NULL,
    content TEXT,
    document_type TEXT CHECK(document_type IN ('sop', 'document', 'faq')),
    
    -- 分類
    category_id INTEGER,
    
    -- 版本
    version INTEGER DEFAULT 1,
    
    -- 狀態
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    
    -- 標籤
    tags TEXT,  -- JSON 格式
    
    -- 創建者
    created_by_user_id INTEGER,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    
    -- 外鍵
    FOREIGN KEY (category_id) REFERENCES sop_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_sops_category ON sops(category_id);
CREATE INDEX idx_sops_status ON sops(status);
CREATE INDEX idx_sops_document_type ON sops(document_type);
CREATE INDEX idx_sops_created_by ON sops(created_by_user_id);

-- ----------------------------------------------------------------
-- 3. sop_versions（SOP 版本歷史）
-- ----------------------------------------------------------------

CREATE TABLE sop_versions (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 關聯 SOP
    sop_id INTEGER NOT NULL,
    
    -- 版本信息
    version INTEGER NOT NULL,
    content TEXT,
    
    -- 修改信息
    modified_by_user_id INTEGER,
    modification_reason TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
    FOREIGN KEY (modified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 唯一約束
    UNIQUE(sop_id, version)
);

-- 索引
CREATE INDEX idx_sop_versions_sop ON sop_versions(sop_id);
CREATE INDEX idx_sop_versions_modified_by ON sop_versions(modified_by_user_id);

-- ----------------------------------------------------------------
-- 4. faq_categories（FAQ 分類）
-- ----------------------------------------------------------------

CREATE TABLE faq_categories (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 分類信息
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    
    -- 說明
    description TEXT,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_faq_categories_sort ON faq_categories(sort_order);

-- ----------------------------------------------------------------
-- 5. faqs（常見問題）
-- ----------------------------------------------------------------

CREATE TABLE faqs (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 分類
    category_id INTEGER NOT NULL,
    
    -- 問答內容
    question TEXT NOT NULL,
    answer TEXT,
    
    -- 排序
    sort_order INTEGER DEFAULT 0,
    
    -- 狀態
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'archived')),
    
    -- 創建者
    created_by_user_id INTEGER,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (category_id) REFERENCES faq_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_faqs_category ON faqs(category_id);
CREATE INDEX idx_faqs_status ON faqs(status);
CREATE INDEX idx_faqs_sort ON faqs(category_id, sort_order);

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 006 completed. Knowledge base tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND (
    name LIKE '%sop%' OR 
    name LIKE '%faq%'
) ORDER BY name;

-- ================================================================
-- End of Migration 006
-- ================================================================

