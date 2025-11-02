-- ⚡ 性能优化：添加关键索引
-- 目标：工时表页面加载时间从 3秒 降低到 <1秒

-- ==================== 客户表索引 ====================
-- 优化客户列表查询
CREATE INDEX IF NOT EXISTS idx_clients_deleted_created 
ON Clients(is_deleted, created_at DESC);

-- 优化客户ID查询
CREATE INDEX IF NOT EXISTS idx_clients_id_deleted 
ON Clients(client_id, is_deleted);

-- 优化负责人查询
CREATE INDEX IF NOT EXISTS idx_clients_assignee 
ON Clients(assignee_user_id);

-- ==================== 客户服务表索引 ====================
-- 优化客户服务查询
CREATE INDEX IF NOT EXISTS idx_client_services_client 
ON ClientServices(client_id, is_deleted);

-- 优化服务ID查询
CREATE INDEX IF NOT EXISTS idx_client_services_service 
ON ClientServices(service_id, is_deleted);

-- ==================== 服务计费表索引 ====================
-- 优化计费明细查询
CREATE INDEX IF NOT EXISTS idx_billing_schedule_client_service 
ON ServiceBillingSchedule(client_service_id);

-- ==================== 工时表索引 ====================
-- ⚡ 关键索引：按用户和日期范围查询工时
CREATE INDEX IF NOT EXISTS idx_timesheets_user_date 
ON Timesheets(user_id, work_date, is_deleted);

-- 优化按日期范围查询
CREATE INDEX IF NOT EXISTS idx_timesheets_date_deleted 
ON Timesheets(work_date, is_deleted);

-- 优化客户工时查询
CREATE INDEX IF NOT EXISTS idx_timesheets_client 
ON Timesheets(client_id, work_date);

-- ==================== 假日表索引 ====================
-- 优化假日日期查询
CREATE INDEX IF NOT EXISTS idx_holidays_date 
ON Holidays(holiday_date);

-- ==================== 请假表索引 ====================
-- ⚡ 关键索引：按用户和日期范围查询请假
CREATE INDEX IF NOT EXISTS idx_leaves_user_date 
ON LeaveRequests(user_id, start_date, end_date, is_deleted);

-- 优化按日期范围查询
CREATE INDEX IF NOT EXISTS idx_leaves_date_deleted 
ON LeaveRequests(start_date, end_date, is_deleted);

-- 优化状态筛选
CREATE INDEX IF NOT EXISTS idx_leaves_status 
ON LeaveRequests(status, is_deleted);

-- ==================== 请假余额表索引 ====================
-- 优化余额查询
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year 
ON LeaveBalances(user_id, year, leave_type);

-- ==================== 补休授予表索引 ====================
-- 优化补休余额查询
CREATE INDEX IF NOT EXISTS idx_comp_leave_grants_user_status 
ON CompensatoryLeaveGrants(user_id, status, hours_remaining);

-- ==================== 生活事件假期表索引 ====================
-- 优化生活事件假期查询
CREATE INDEX IF NOT EXISTS idx_life_event_grants_user 
ON LifeEventLeaveGrants(user_id, status, days_remaining, valid_until);

-- ==================== 用户表索引 ====================
-- 优化用户ID查询
CREATE INDEX IF NOT EXISTS idx_users_id_deleted 
ON Users(user_id, is_deleted);

-- ==================== 标签关联表索引 ====================
-- 优化标签查询
CREATE INDEX IF NOT EXISTS idx_client_tags_client 
ON ClientTagAssignments(client_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_client_tags_tag 
ON ClientTagAssignments(tag_id, client_id);

-- ==================== 分析统计 ====================
-- 为所有表运行 ANALYZE 以更新查询优化器统计信息
ANALYZE Clients;
ANALYZE ClientServices;
ANALYZE ServiceBillingSchedule;
ANALYZE Timesheets;
ANALYZE Holidays;
ANALYZE LeaveRequests;
ANALYZE LeaveBalances;
ANALYZE CompensatoryLeaveGrants;
ANALYZE Users;
ANALYZE ClientTagAssignments;

