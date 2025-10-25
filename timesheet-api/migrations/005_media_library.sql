-- ================================================================
-- 媒體庫 Migration
-- 檔案: 005_media_library.sql
-- 日期: 2025-10-25
-- 描述: 統一的媒體管理，供 SOP、CMS 等功能使用
-- ================================================================

-- 媒體庫
CREATE TABLE IF NOT EXISTS media_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,  -- 'image', 'document', 'video'
  file_size INTEGER,
  mime_type TEXT,
  alt_text TEXT,
  
  uploaded_by TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (uploaded_by) REFERENCES users(username)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_media_type ON media_library(file_type);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON media_library(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media_library(uploaded_at);

-- ================================================================
-- Migration 完成
-- ================================================================

