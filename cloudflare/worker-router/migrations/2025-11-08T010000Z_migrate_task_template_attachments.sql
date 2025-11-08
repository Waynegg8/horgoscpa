-- 遷移任務模板階段的文檔引用
-- 將 TaskTemplateStages.attachment_id 改為引用 InternalDocuments (資源中心)

-- 1. 創建新字段
ALTER TABLE TaskTemplateStages ADD COLUMN document_id INTEGER;

-- 2. 創建索引
CREATE INDEX IF NOT EXISTS idx_template_stages_document ON TaskTemplateStages(document_id);

-- 3. 說明：
-- - attachment_id（舊）：原本指向 Attachments 表，現已廢棄
-- - document_id（新）：指向 InternalDocuments 表，用於綁定資源中心的文檔
-- - 資源中心文檔：category='resource'，包含範本、法規等可重複使用的檔案
-- - 保留 attachment_id 字段以便回滾
-- 
-- 使用方式：
-- 任務模板可以綁定資源中心的文檔（如：記帳範本.xlsx、稅務申報指南.pdf）
-- 這些文檔在多個任務中共用，不屬於特定任務的附件

