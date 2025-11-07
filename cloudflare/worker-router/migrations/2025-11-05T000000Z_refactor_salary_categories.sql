-- 重构薪资项目分类系统
-- 跳过此迁移：因为表已存在且有外键约束，无法安全重建
-- 新的category值已在应用层处理，无需修改数据库结构
-- 如果将来需要严格的CHECK约束，需要在维护窗口期手动执行

SELECT 'Migration skipped - table already exists with FK constraints' AS status;

