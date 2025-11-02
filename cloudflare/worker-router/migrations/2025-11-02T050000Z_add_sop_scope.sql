-- 為SOP添加作用範圍字段（服務層級 vs 任務層級）
-- 2025-11-02

-- 添加scope字段：service（服務層級）、task（任務層級）
-- 注意：不設置默認值，強制用戶明確選擇
ALTER TABLE SOPDocuments ADD COLUMN scope TEXT;

-- 創建索引以提升查詢效率
CREATE INDEX IF NOT EXISTS idx_sop_scope ON SOPDocuments(scope);

-- 說明：
-- - scope = 'service'：服務層級SOP，適用於整個服務的通用流程，會自動關聯到該服務的所有任務
-- - scope = 'task'：任務層級SOP，適用於特定任務的詳細步驟，由用戶在創建任務時手動選擇
-- - 必須明確指定scope，不允許為NULL或其他值

