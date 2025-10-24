-- 1. 清除所有舊的系統參數
DELETE FROM system_parameters;

-- 2. 匯入最新的系統參數
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日正常工時上限', 8);
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日加班時數上限', 4);
INSERT INTO system_parameters (param_name, param_value) VALUES ('每日請假時數上限', 8);
INSERT INTO system_parameters (param_name, param_value) VALUES ('假日每日加班時數上限', 12);