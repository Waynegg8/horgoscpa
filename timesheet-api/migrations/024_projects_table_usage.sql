-- Migration 024: Projects 表使用說明和狀態標記
-- 目的：明確 projects 表的使用方式和狀態
-- 日期：2025-10-26
-- 狀態：說明性 migration（不修改數據）

-- Projects 表狀態說明：
-- ========================================
-- projects, project_tasks, project_checklist 這三個表已存在（Migration 006 創建）
-- 但根據系統設計，專案管理已整合到統一任務系統（tasks.html）
-- 
-- 使用方式：
-- 1. **推薦**：使用統一任務系統（tasks 表 + category = 'project'）
--    - 簡單專案：只用 tasks 表
--    - 複雜專案：可選擇性使用 projects 表記錄預算等額外資訊
--
-- 2. **可選**：混合使用
--    - projects 表：記錄專案管理資訊（預算、成本等）
--    - tasks 表：記錄實際執行任務
--    - 在 tasks.description 中記錄 project_id 關聯
--
-- 狀態：保留（Active - 可選使用）
-- 頁面：無獨立頁面（已整合到 tasks.html）
-- 參考：docs/專案管理系統整合說明.md
-- ========================================

-- 創建元數據表記錄表格使用狀態
CREATE TABLE IF NOT EXISTS _table_metadata (
  table_name TEXT PRIMARY KEY,
  status TEXT NOT NULL,  -- active, deprecated, optional
  usage_note TEXT,
  related_doc TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入 projects 相關表的元數據
INSERT OR REPLACE INTO _table_metadata (table_name, status, usage_note, related_doc) VALUES
  ('projects', 'optional', '選用：用於記錄專案預算等管理資訊。推薦使用 tasks 表（category=project）', 'docs/專案管理系統整合說明.md'),
  ('project_tasks', 'optional', '選用：projects 表的子任務記錄', 'docs/專案管理系統整合說明.md'),
  ('project_checklist', 'optional', '選用：projects 表的檢查清單', 'docs/專案管理系統整合說明.md'),
  ('service_schedule', 'deprecated', '已廢棄：由 client_services 表替代（Migration 015）', 'docs/客戶管理系統設計.md'),
  ('client_services_old', 'deprecated', '已廢棄：Migration 015 的備份表，可安全刪除', 'Migration 015'),
  ('recurring_task_generation_log', 'deprecated', '已廢棄：由 task_generation_log 表替代', 'Migration 013');

-- 完成提示
SELECT '✅ Projects 表狀態已標記為「可選使用」' AS status;
SELECT 'ℹ️  可執行 SELECT * FROM _table_metadata 查看所有表格使用狀態' AS info;

-- 回滾說明（DOWN）：
-- DROP TABLE IF EXISTS _table_metadata;

