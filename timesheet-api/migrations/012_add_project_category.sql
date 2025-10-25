-- ============================================================
-- 為projects表添加category欄位
-- 修復：遠程數據庫缺少此欄位
-- ============================================================

-- 添加category欄位
ALTER TABLE projects ADD COLUMN category TEXT DEFAULT '其他' CHECK(category IN ('記帳','工商','財簽','稅簽','其他'));

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

-- Migration 完成

