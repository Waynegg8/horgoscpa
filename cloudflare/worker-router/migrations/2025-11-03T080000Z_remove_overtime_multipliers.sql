-- 删除加班费倍率设定（工时表中已存储加权工时）
DELETE FROM PayrollSettings WHERE setting_key IN (
    'overtime_1_5x_multiplier',
    'overtime_2x_multiplier', 
    'overtime_3x_multiplier'
);

