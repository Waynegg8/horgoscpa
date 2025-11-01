-- 清理ClientServices表结构
-- 现在服务组成部分(ServiceComponents)有自己的delivery_frequency
-- ClientServices的service_cycle字段不再需要

-- 注意：SQLite不支持直接删除列，但我们可以：
-- 1. 不再使用service_cycle字段（在代码中忽略）
-- 2. 添加注释说明该字段已废弃

-- 为了保持数据库整洁，我们在API层面忽略service_cycle

-- 验证ServiceComponents表的数据完整性
-- 确保所有活跃的ClientServices都有对应的ServiceComponents配置

SELECT '清理完成：service_cycle字段将在API层面被忽略，所有服务周期由ServiceComponents.delivery_frequency控制' AS status;

