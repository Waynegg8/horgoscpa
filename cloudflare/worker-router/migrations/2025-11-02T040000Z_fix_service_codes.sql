-- 修正服務類型代碼，與SOP分類保持一致
-- 2025-11-02

-- 統一使用小寫，與knowledge.html中的category選項保持一致
UPDATE Services SET service_code = 'accounting' WHERE service_code = 'ACCOUNTING';
UPDATE Services SET service_code = 'tax' WHERE service_code = 'TAX_FILING';
UPDATE Services SET service_code = 'consulting' WHERE service_code = 'CONSULTING';

-- 確保其他可能的服務類型也使用小寫
-- 如果未來新增服務，請使用與knowledge.html一致的category值：
-- accounting（記帳流程）
-- tax（稅務流程）
-- business（工商登記）
-- hr（人事管理）
-- finance（財務管理）
-- internal（內部流程）
-- other（其他）

