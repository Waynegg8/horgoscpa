-- Migration 023: 清理舊表和廢棄數據
-- 目的：移除已整合或廢棄的舊表，保持資料庫整潔
-- 日期：2025-10-26
-- ⚠️ 執行前請確保已備份資料庫

-- 1. 刪除 client_services_old 表（如果存在）
-- Migration 015 重建 client_services 時創建的備份表
DROP TABLE IF EXISTS client_services_old;

-- 2. 標記 service_schedule 表為廢棄（但暫不刪除）
-- 此表已被 client_services 替代（Migration 015）
-- 創建註釋視圖標記其狀態
CREATE VIEW IF NOT EXISTS _deprecated_tables AS
SELECT 'service_schedule' as table_name, 'Replaced by client_services in Migration 015' as reason, '2025-10' as deprecated_date
UNION ALL
SELECT 'recurring_task_generation_log' as table_name, 'Replaced by task_generation_log in Migration 013' as reason, '2025-10' as deprecated_date;

-- 3. 清理過期的 session（超過30天）
DELETE FROM sessions WHERE expires_at < datetime('now', '-30 days');

-- 4. 清理過期的快取（超過7天）
DELETE FROM report_cache WHERE expires_at < datetime('now', '-7 days');

-- 5. 完成提示
SELECT '✅ 舊表已清理' AS status;
SELECT 'ℹ️  可執行 SELECT * FROM _deprecated_tables 查看廢棄表列表' AS info;

-- 回滾說明（DOWN）：
-- 此 migration 主要是清理動作，無法完全回滾
-- 如需還原被刪除的 client_services_old 表，請從備份還原
-- DROP VIEW IF EXISTS _deprecated_tables;

