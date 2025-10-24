-- 1. 清除所有舊的加班費率
DELETE FROM overtime_rates;

-- 2. 匯入最新的加班費率
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('平日加班', 0, 2, 1.34);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('平日加班', 2, 4, 1.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('休息日加班', 0, 2, 1.34);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('休息日加班', 2, 8, 1.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('休息日加班', 8, 12, 2.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('國定假日加班', 0, 8, 1);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('國定假日加班', 8, 10, 1.34);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('國定假日加班', 10, 12, 1.67);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('例假日加班', 0, 8, 1);
INSERT INTO overtime_rates (rate_type, hour_start, hour_end, rate_multiplier) VALUES ('例假日加班', 8, 12, 2);