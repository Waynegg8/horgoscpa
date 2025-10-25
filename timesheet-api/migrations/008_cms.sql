-- ================================================================
-- 內容管理系統 (CMS) Migration
-- 檔案: 008_cms.sql
-- 日期: 2025-10-25
-- 描述: 文章和資源管理，整合現有 blog 和 resources 頁面
-- ================================================================

-- ============================================================
-- 1. 文章表
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  cover_image TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  
  -- 狀態
  status TEXT DEFAULT 'draft' 
    CHECK(status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at DATETIME,
  scheduled_at DATETIME,
  
  -- 統計
  views_count INTEGER DEFAULT 0,
  reading_minutes INTEGER,
  
  -- 作者
  author_id TEXT NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (author_id) REFERENCES users(username)
);

-- ============================================================
-- 2. 文章標籤
-- ============================================================
CREATE TABLE IF NOT EXISTS post_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE
);

-- ============================================================
-- 3. 資源表
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT,  -- 'guide', 'template', 'checklist', 'calculator'
  category TEXT,
  content TEXT,
  summary TEXT,
  
  -- 檔案
  download_url TEXT,
  file_size TEXT,
  file_format TEXT,
  
  -- 計算機
  calculator_url TEXT,
  
  status TEXT DEFAULT 'draft' 
    CHECK(status IN ('draft', 'published', 'archived')),
  
  views_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(username)
);

-- ============================================================
-- 4. 索引優化
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON blog_posts(published_at);

CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag);

CREATE INDEX IF NOT EXISTS idx_resources_slug ON resources(slug);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_category ON resources(category);

-- ================================================================
-- Migration 完成
-- ================================================================

