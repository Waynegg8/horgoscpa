-- 遷移附件系統到知識庫
-- 2025-11-08

-- 1. 為 InternalDocuments 添加關聯字段
ALTER TABLE InternalDocuments ADD COLUMN related_entity_type TEXT;
ALTER TABLE InternalDocuments ADD COLUMN related_entity_id TEXT;

-- 2. 創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_internal_documents_related 
ON InternalDocuments(related_entity_type, related_entity_id);

CREATE INDEX IF NOT EXISTS idx_internal_documents_category_related 
ON InternalDocuments(category, related_entity_type);

-- 3. 遷移現有 Attachments 數據到 InternalDocuments
INSERT INTO InternalDocuments (
  title,
  description,
  file_name,
  file_url,
  file_size,
  file_type,
  category,
  scope,
  related_entity_type,
  related_entity_id,
  uploaded_by,
  created_at,
  updated_at,
  is_deleted
)
SELECT 
  filename as title,
  'Migrated from Attachments' as description,
  filename as file_name,
  object_key as file_url,
  size_bytes as file_size,
  content_type as file_type,
  'attachment' as category,
  'task' as scope,
  entity_type as related_entity_type,
  entity_id as related_entity_id,
  uploader_user_id as uploaded_by,
  uploaded_at as created_at,
  uploaded_at as updated_at,
  is_deleted
FROM Attachments
WHERE entity_type IN ('client', 'receipt', 'task')
  AND is_deleted = 0;

-- 4. 標記 Attachments 表為已廢棄（保留數據以防需要回滾）
-- 不刪除表，只添加註釋
-- DROP TABLE IF EXISTS Attachments;  -- 暫時保留

-- 說明：
-- - 遷移客戶、收據、任務的附件到知識庫
-- - 不遷移 SOP 附件（entity_type='sop'），因為 SOP 本身就在知識庫
-- - related_entity_type 記錄原始的 entity_type
-- - related_entity_id 記錄原始的 entity_id
-- - 所有附件的 category='attachment'，scope='task'

