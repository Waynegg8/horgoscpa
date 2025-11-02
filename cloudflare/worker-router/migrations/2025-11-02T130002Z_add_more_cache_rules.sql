-- 添加更多缓存失效规则

-- 请假相关规则
INSERT OR IGNORE INTO CacheInvalidationRules (source_table, source_operation, target_cache_type, scope_filter, description) VALUES
('LeaveRequests', 'INSERT', 'leaves_list', '{"user_id": "affected"}', '新增请假时失效该用户请假列表'),
('LeaveRequests', 'UPDATE', 'leaves_list', '{"user_id": "affected"}', '更新请假时失效该用户请假列表'),
('LeaveRequests', 'DELETE', 'leaves_list', '{"user_id": "affected"}', '删除请假时失效该用户请假列表'),
('LeaveRequests', 'INSERT', 'leaves_balances', '{"user_id": "affected"}', '新增请假时失效该用户假期余额'),
('LeaveRequests', 'UPDATE', 'leaves_balances', '{"user_id": "affected"}', '更新请假时失效该用户假期余额'),
('LeaveRequests', 'DELETE', 'leaves_balances', '{"user_id": "affected"}', '删除请假时失效该用户假期余额'),

('LeaveBalances', 'INSERT', 'leaves_balances', '{"user_id": "affected"}', '新增假期余额'),
('LeaveBalances', 'UPDATE', 'leaves_balances', '{"user_id": "affected"}', '更新假期余额'),

-- 任务相关规则
('Tasks', 'INSERT', 'tasks_list', NULL, '新增任务时失效任务列表缓存'),
('Tasks', 'UPDATE', 'tasks_list', NULL, '更新任务时失效任务列表缓存'),
('Tasks', 'DELETE', 'tasks_list', NULL, '删除任务时失效任务列表缓存'),

-- 收据相关规则
('Receipts', 'INSERT', 'receipts_list', NULL, '新增收据时失效收据列表缓存'),
('Receipts', 'UPDATE', 'receipts_list', NULL, '更新收据时失效收据列表缓存'),
('Receipts', 'DELETE', 'receipts_list', NULL, '删除收据时失效收据列表缓存'),
('Receipts', 'INSERT', 'receipts_statistics', NULL, '新增收据时失效统计缓存'),
('Receipts', 'UPDATE', 'receipts_statistics', NULL, '更新收据时失效统计缓存'),

-- 用户相关规则
('Users', 'INSERT', 'users_list', NULL, '新增用户时失效用户列表缓存'),
('Users', 'UPDATE', 'users_list', NULL, '更新用户时失效用户列表缓存'),
('Users', 'DELETE', 'users_list', NULL, '删除用户时失效用户列表缓存'),

-- 服务类型相关规则
('Services', 'INSERT', 'services_list', NULL, '新增服务时失效服务列表缓存'),
('Services', 'UPDATE', 'services_list', NULL, '更新服务时失效服务列表缓存'),
('ServiceItems', 'INSERT', 'services_list', NULL, '新增服务项时失效服务列表缓存'),
('ServiceItems', 'UPDATE', 'services_list', NULL, '更新服务项时失效服务列表缓存');

