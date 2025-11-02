-- 为InternalFAQ和InternalDocuments添加scope字段
-- 2025-11-02

-- 为InternalFAQ添加scope字段
ALTER TABLE InternalFAQ ADD COLUMN scope TEXT;

-- 为InternalDocuments添加scope字段
ALTER TABLE InternalDocuments ADD COLUMN scope TEXT;

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_internal_faq_scope ON InternalFAQ(scope);
CREATE INDEX IF NOT EXISTS idx_internal_documents_scope ON InternalDocuments(scope);

