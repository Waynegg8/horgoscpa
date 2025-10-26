-- ================================================================
-- Migration 010: 種子數據
-- 創建日期: 2025-10-26
-- 說明: 初始化系統必需的基礎數據
-- 依賴: 所有前面的 migrations
-- ================================================================

-- ----------------------------------------------------------------
-- 1. 默認管理員賬號
-- ----------------------------------------------------------------

-- 創建默認管理員（密碼：admin123）
-- 密碼 hash: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
INSERT OR IGNORE INTO users (id, username, password_hash, role, is_active) 
VALUES (1, 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 1);

-- ----------------------------------------------------------------
-- 2. 請假類型
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO leave_types (type_name, type_code, is_paid, requires_approval, annual_quota, description) VALUES
('特休', 'annual', 1, 0, 0, '年度特休假，依年資計算'),
('病假', 'sick', 1, 0, 30, '病假每年30天'),
('事假', 'personal', 0, 1, 14, '事假每年14天'),
('婚假', 'marriage', 1, 1, 8, '婚假8天'),
('喪假', 'bereavement', 1, 1, 8, '喪假最多8天'),
('產假', 'maternity', 1, 1, 56, '產假8週'),
('陪產假', 'paternity', 1, 1, 7, '陪產假7天');

-- ----------------------------------------------------------------
-- 2. 業務類型
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO business_types (type_name, type_code, description) VALUES
('記帳', 'accounting', '日常記帳服務'),
('稅務', 'tax', '稅務申報相關'),
('諮詢', 'consulting', '財務諮詢服務'),
('簽證', 'audit', '財務簽證服務'),
('其他', 'other', '其他業務類型');

-- ----------------------------------------------------------------
-- 3. 年假規則
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO annual_leave_rules (min_years, max_years, days, description) VALUES
(0, 0.5, 0, '未滿半年無年假'),
(0.5, 1, 3, '半年以上未滿1年：3天'),
(1, 2, 7, '1年以上未滿2年：7天'),
(2, 3, 10, '2年以上未滿3年：10天'),
(3, 5, 14, '3年以上未滿5年：14天'),
(5, 10, 15, '5年以上未滿10年：15天'),
(10, NULL, 30, '10年以上：每年增加1天，最高30天');

-- ----------------------------------------------------------------
-- 4. 加班費率
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO overtime_rates (work_type, rate, description) VALUES
('正常工時', 1.00, '一般工作時間'),
('平日加班(1.34)', 1.34, '平日前2小時加班'),
('平日加班(1.67)', 1.67, '平日第3小時起加班'),
('休息日加班(1.34)', 1.34, '休息日前2小時'),
('休息日加班(1.67)', 1.67, '休息日第3-8小時'),
('休息日加班(2.67)', 2.67, '休息日第9小時起'),
('國定假日加班', 2.00, '國定假日加班');

-- ----------------------------------------------------------------
-- 5. 國定假日（2025年）
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO holidays (holiday_date, holiday_name, holiday_type) VALUES
('2025-01-01', '元旦', 'national'),
('2025-01-27', '農曆除夕', 'national'),
('2025-01-28', '春節初一', 'national'),
('2025-01-29', '春節初二', 'national'),
('2025-01-30', '春節初三', 'national'),
('2025-02-28', '和平紀念日', 'national'),
('2025-04-04', '兒童節', 'national'),
('2025-04-05', '清明節', 'national'),
('2025-05-31', '端午節', 'national'),
('2025-10-07', '中秋節', 'national'),
('2025-10-10', '國慶日', 'national');

-- ----------------------------------------------------------------
-- 6. FAQ 分類
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO faq_categories (name, sort_order, description) VALUES
('記帳服務', 1, '記帳相關問題'),
('稅務申報', 2, '稅務申報相關問題'),
('工商登記', 3, '公司登記相關問題'),
('系統使用', 4, '系統操作相關問題'),
('其他問題', 5, '其他常見問題');

-- ----------------------------------------------------------------
-- 7. SOP 分類
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO sop_categories (name, parent_category_id, sort_order, description) VALUES
('記帳作業', NULL, 1, '日常記帳標準作業程序'),
('稅務申報', NULL, 2, '各類稅務申報作業程序'),
('工商登記', NULL, 3, '公司登記相關作業程序'),
('內部管理', NULL, 4, '內部管理流程'),
('系統操作', NULL, 5, '系統使用說明');

-- ----------------------------------------------------------------
-- 8. 系統參數
-- ----------------------------------------------------------------

INSERT OR IGNORE INTO system_parameters (param_category, param_key, param_value, value_type, description, is_editable) VALUES
('general', 'company_name', '霍爾果斯會計師事務所', 'string', '公司名稱', 1),
('general', 'default_work_hours', '8', 'number', '每日標準工時', 1),
('general', 'timezone', 'Asia/Taipei', 'string', '系統時區', 0),

('task', 'default_advance_days', '7', 'number', '任務提前生成天數', 1),
('task', 'default_due_days', '15', 'number', '任務默認期限天數', 1),
('task', 'enable_auto_generation', 'true', 'boolean', '啟用自動任務生成', 1),

('notification', 'enable_email', 'false', 'boolean', '啟用郵件通知', 1),
('notification', 'enable_browser', 'true', 'boolean', '啟用瀏覽器通知', 1),
('notification', 'reminder_before_days', '3', 'number', '截止前幾天提醒', 1),

('report', 'cache_expiry_hours', '24', 'number', '報表快取有效期（小時）', 1),
('report', 'max_cache_size', '100', 'number', '最大快取報表數量', 1);

-- ================================================================
-- 驗證：檢查數據
-- ================================================================

SELECT 'Migration 010 completed. Seed data inserted' as status;
SELECT COUNT(*) as leave_types_count FROM leave_types;
SELECT COUNT(*) as business_types_count FROM business_types;
SELECT COUNT(*) as system_parameters_count FROM system_parameters;

-- ================================================================
-- End of Migration 010
-- ================================================================

