-- ============================================================
-- 為projects表添加category欄位
-- 修復：遠程數據庫缺少此欄位
-- ============================================================

-- 注意：category 欄位已經存在於 projects 表中
-- 此遷移只確保索引存在

-- 創建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);

-- Migration 完成
