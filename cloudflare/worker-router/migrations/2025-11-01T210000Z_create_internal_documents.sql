-- 内部文档资源中心表
CREATE TABLE IF NOT EXISTS InternalDocuments (
  document_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- 文档信息
  title TEXT NOT NULL,                    -- 文档标题
  description TEXT,                       -- 文档描述
  file_name TEXT NOT NULL,                -- 原始文件名
  file_url TEXT NOT NULL,                 -- R2存储的URL
  file_size INTEGER,                      -- 文件大小（字节）
  file_type TEXT,                         -- MIME类型
  
  -- 分类和标签
  category TEXT,                          -- 分类：contract, finance, hr, tax, other
  tags TEXT,                              -- 标签，逗号分隔
  
  -- 元数据
  uploaded_by INTEGER,                    -- 上传者user_id
  created_at TEXT NOT NULL,               -- 创建时间
  updated_at TEXT NOT NULL,               -- 更新时间
  is_deleted INTEGER DEFAULT 0,           -- 软删除标记
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_internal_documents_category ON InternalDocuments(category);
CREATE INDEX IF NOT EXISTS idx_internal_documents_uploaded_by ON InternalDocuments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_internal_documents_created_at ON InternalDocuments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_documents_is_deleted ON InternalDocuments(is_deleted);

