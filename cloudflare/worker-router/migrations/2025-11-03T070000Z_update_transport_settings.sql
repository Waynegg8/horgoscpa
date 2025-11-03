-- 更新交通补贴设定为区间制
-- 删除旧的交通补贴单价设定
DELETE FROM PayrollSettings WHERE setting_key = 'transport_rate_per_km';

-- 添加新的交通补贴区间设定
INSERT INTO PayrollSettings (setting_key, setting_value, setting_type, category, display_name, description) VALUES
('transport_amount_per_interval', '60', 'number', 'transport', '交通补贴每区间金额（元）', '每个区间固定金额'),
('transport_km_per_interval', '5', 'number', 'transport', '每个区间公里数', '例如：5公里为1个区间');

