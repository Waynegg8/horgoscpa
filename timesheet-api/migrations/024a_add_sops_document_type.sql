-- ================================================================
-- Add document_type to sops
-- 檔案: 024a_add_sops_document_type.sql
-- 日期: 2025-10-26
-- 說明: 為 sops 新增 document_type 欄位，支援 SOP/INTERNAL/FAQ 區分
-- ================================================================

ALTER TABLE sops ADD COLUMN document_type TEXT CHECK(document_type IN ('SOP','INTERNAL','FAQ')) DEFAULT 'SOP';

-- Backfill existing rows as 'SOP' by default (D1 sqlite auto default covers new reads)
-- No data migration needed beyond default.
