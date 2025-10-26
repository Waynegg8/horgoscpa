-- ================================================================
-- Migration 007: 內容管理系統（CMS）
-- 創建日期: 2025-10-26
-- 說明: 部落格文章、資源、媒體庫管理
-- 依賴: 001_core_tables.sql
-- ================================================================

-- ----------------------------------------------------------------
-- 清理：刪除舊表（如果存在）
-- ----------------------------------------------------------------

DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS media_library;

-- ----------------------------------------------------------------
-- 1. posts（部落格文章）
-- ----------------------------------------------------------------

CREATE TABLE posts (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 基本信息
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    
    -- 分類和標籤
    category TEXT,
    tags TEXT,  -- JSON 格式
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT,
    
    -- 特色圖片
    featured_image_url TEXT,
    
    -- 狀態
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
    
    -- 發布信息
    author_user_id INTEGER,
    published_at DATETIME,
    
    -- 統計
    view_count INTEGER DEFAULT 0,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_author ON posts(author_user_id);
CREATE INDEX idx_posts_published ON posts(published_at);
CREATE INDEX idx_posts_category ON posts(category);

-- ----------------------------------------------------------------
-- 2. media_library（媒體庫）
-- ----------------------------------------------------------------

CREATE TABLE media_library (
    -- 主鍵
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 文件信息
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- 存儲信息
    url TEXT NOT NULL,
    storage_path TEXT,
    
    -- 圖片額外信息
    width INTEGER,
    height INTEGER,
    
    -- Alt 文字（SEO）
    alt_text TEXT,
    caption TEXT,
    
    -- 上傳者
    uploaded_by_user_id INTEGER,
    
    -- 使用統計
    usage_count INTEGER DEFAULT 0,
    
    -- 時間戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外鍵
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_media_library_file_type ON media_library(file_type);
CREATE INDEX idx_media_library_uploaded_by ON media_library(uploaded_by_user_id);
CREATE INDEX idx_media_library_created ON media_library(created_at);

-- ================================================================
-- 驗證：檢查表創建
-- ================================================================

SELECT 'Migration 007 completed. CMS tables created:' as status;
SELECT name FROM sqlite_master WHERE type='table' AND (
    name = 'posts' OR 
    name = 'media_library'
) ORDER BY name;

-- ================================================================
-- End of Migration 007
-- ================================================================

