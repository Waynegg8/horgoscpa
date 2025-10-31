-- 为TaskTemplateStages添加SOP和附件连结

ALTER TABLE TaskTemplateStages ADD COLUMN sop_id INTEGER;
ALTER TABLE TaskTemplateStages ADD COLUMN attachment_id INTEGER;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_stages_sop ON TaskTemplateStages(sop_id);
CREATE INDEX IF NOT EXISTS idx_template_stages_attachment ON TaskTemplateStages(attachment_id);

-- 添加外键约束（注释形式，供参考）
-- FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id) ON DELETE SET NULL
-- FOREIGN KEY (attachment_id) REFERENCES Attachments(attachment_id) ON DELETE SET NULL

