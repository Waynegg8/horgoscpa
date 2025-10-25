-- ================================================================
-- 添加時間戳記欄位 Migration
-- 檔案: 007_add_timestamps.sql
-- 日期: 2025-10-25
-- 描述: 為現有資料表添加 created_at 和 updated_at 欄位
-- ================================================================

-- 客戶指派
ALTER TABLE client_assignments ADD COLUMN created_at DATETIME;
ALTER TABLE client_assignments ADD COLUMN updated_at DATETIME;
UPDATE client_assignments SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- 業務類型
ALTER TABLE business_types ADD COLUMN created_at DATETIME;
ALTER TABLE business_types ADD COLUMN updated_at DATETIME;
UPDATE business_types SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- 客戶（基本表）
ALTER TABLE clients ADD COLUMN created_at DATETIME;
ALTER TABLE clients ADD COLUMN updated_at DATETIME;
UPDATE clients SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- 員工
ALTER TABLE employees ADD COLUMN updated_at DATETIME;
UPDATE employees SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- 假別類型
ALTER TABLE leave_types ADD COLUMN created_at DATETIME;
ALTER TABLE leave_types ADD COLUMN updated_at DATETIME;
UPDATE leave_types SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- 國定假日
ALTER TABLE holidays ADD COLUMN created_at DATETIME;
ALTER TABLE holidays ADD COLUMN updated_at DATETIME;
UPDATE holidays SET created_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- ================================================================
-- Migration 完成
-- ================================================================

