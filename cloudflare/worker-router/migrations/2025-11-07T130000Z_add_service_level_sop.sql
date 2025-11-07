-- 為服務項目添加服務層級SOP
-- 2025-11-07

-- 添加service_sop_id字段到Services表
ALTER TABLE Services ADD COLUMN service_sop_id INTEGER;

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_services_sop ON Services(service_sop_id);

-- 說明：
-- service_sop_id：服務層級的SOP，代表整個服務的通用流程
-- 當創建任務模板時，會自動繼承該服務的service_sop_id
-- 每個任務還可以在TaskTemplateStages中設置任務層級的SOP（sop_id和attachment_id）

