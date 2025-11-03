-- 为知识库相关表添加客户关联字段
-- 2025-11-02
-- 注意：如果字段已存在，此迁移可能已经运行过，跳过即可

-- 为SOP文档表添加索引（字段可能已存在）
CREATE INDEX IF NOT EXISTS idx_sop_client_id ON SOPDocuments(client_id);

-- 为FAQ表添加索引（字段可能已存在）
CREATE INDEX IF NOT EXISTS idx_faq_client_id ON InternalFAQ(client_id);

-- 为内部文档表添加索引（字段可能已存在）
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON InternalDocuments(client_id);

