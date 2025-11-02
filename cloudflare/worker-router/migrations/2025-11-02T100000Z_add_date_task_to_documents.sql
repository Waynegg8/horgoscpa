-- 为知识库文档表添加年月和任务关联字段
-- 2025-11-02

-- 添加年月字段用于筛选
ALTER TABLE InternalDocuments ADD COLUMN doc_year INTEGER;
ALTER TABLE InternalDocuments ADD COLUMN doc_month INTEGER;

-- 添加任务关联字段
ALTER TABLE InternalDocuments ADD COLUMN task_id INTEGER;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_internal_documents_year_month ON InternalDocuments(doc_year, doc_month);
CREATE INDEX IF NOT EXISTS idx_internal_documents_task_id ON InternalDocuments(task_id);

-- 备注：
-- doc_year: 文档所属年份（例如：2025）
-- doc_month: 文档所属月份（1-12）
-- task_id: 关联的任务ID（如果是从任务上传的）

