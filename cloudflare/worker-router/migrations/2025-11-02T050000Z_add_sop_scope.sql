-- 為SOP添加作用範圍字段（服務層級 vs 任務層級）
-- 2025-11-02

-- 添加scope字段：service（服務層級）、task（任務層級）、both（兩者皆可）
ALTER TABLE SOPDocuments ADD COLUMN scope TEXT DEFAULT 'both';

-- 創建索引以提升查詢效率
CREATE INDEX IF NOT EXISTS idx_sop_scope ON SOPDocuments(scope);

-- 說明：
-- - scope = 'service'：服務層級SOP，適用於整個服務的通用流程
-- - scope = 'task'：任務層級SOP，適用於特定任務的詳細步驟
-- - scope = 'both'：兩者皆可（默認值，適用於所有場景）

