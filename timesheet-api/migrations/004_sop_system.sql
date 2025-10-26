-- ================================================================
-- SOP 文件管理系統 Migration
-- 檔案: 004_sop_system.sql
-- 日期: 2025-10-25
-- 描述: 建立標準作業程序管理系統
-- ================================================================

-- ============================================================
-- 1. SOP 分類
-- ============================================================
CREATE TABLE IF NOT EXISTS sop_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  description TEXT,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES sop_categories(id) ON DELETE CASCADE
);

-- ============================================================
-- 2. SOP 文檔
-- ============================================================
CREATE TABLE IF NOT EXISTS sops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category_id INTEGER,
  content TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES sop_categories(id),
  FOREIGN KEY (created_by) REFERENCES users(username),
  FOREIGN KEY (updated_by) REFERENCES users(username)
);

-- ============================================================
-- 3. SOP 版本歷史
-- ============================================================
CREATE TABLE IF NOT EXISTS sop_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id INTEGER NOT NULL,
  version TEXT NOT NULL,
  content TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  change_notes TEXT,
  
  FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(username)
);

-- ============================================================
-- 4. SOP 標籤
-- ============================================================
CREATE TABLE IF NOT EXISTS sop_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sop_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  
  FOREIGN KEY (sop_id) REFERENCES sops(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. 索引優化
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sops_category ON sops(category_id);
CREATE INDEX IF NOT EXISTS idx_sops_status ON sops(status);
CREATE INDEX IF NOT EXISTS idx_sops_created_by ON sops(created_by);
CREATE INDEX IF NOT EXISTS idx_sop_versions_sop ON sop_versions(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_tags_sop ON sop_tags(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_tags_tag ON sop_tags(tag);

-- ============================================================
-- 6. 初始分類資料
-- ============================================================
-- 注意：初始分類資料已存在於資料庫中，跳過插入
-- 現有類別：記帳作業、報稅作業、登記作業、審計作業、一般行政

-- ============================================================
-- Migration 完成
-- ============================================================

