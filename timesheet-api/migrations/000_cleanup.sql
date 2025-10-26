-- ================================================================
-- 清理脚本：删除所有旧表
-- 必须按照依赖关系的反向顺序删除
-- ================================================================

-- 禁用外键约束检查（SQLite 中需要）
PRAGMA foreign_keys = OFF;

-- 删除所有表（按反向依赖顺序）
DROP TABLE IF EXISTS task_generation_log;
DROP TABLE IF EXISTS task_execution_log;
DROP TABLE IF EXISTS task_stages;
DROP TABLE IF EXISTS multi_stage_tasks;
DROP TABLE IF EXISTS recurring_task_instances;
DROP TABLE IF EXISTS recurring_task_templates;
DROP TABLE IF EXISTS template_stages;
DROP TABLE IF EXISTS multi_stage_templates;
DROP TABLE IF EXISTS task_template_stages;
DROP TABLE IF EXISTS task_templates;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS service_checklist_templates;
DROP TABLE IF EXISTS client_services;
DROP TABLE IF EXISTS client_interactions;
DROP TABLE IF EXISTS client_assignments;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS timesheets;
DROP TABLE IF EXISTS leave_events;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS sop_versions;
DROP TABLE IF EXISTS sops;
DROP TABLE IF EXISTS sop_categories;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS media_library;
DROP TABLE IF EXISTS report_cache;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS faq_categories;
DROP TABLE IF EXISTS task_reminders;
DROP TABLE IF EXISTS user_workload_stats;
DROP TABLE IF EXISTS system_parameters;
DROP TABLE IF EXISTS other_leave_rules;
DROP TABLE IF EXISTS annual_leave_carryover;
DROP TABLE IF EXISTS annual_leave_rules;
DROP TABLE IF EXISTS overtime_rates;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS leave_types;
DROP TABLE IF EXISTS business_types;

-- 重新启用外键约束
PRAGMA foreign_keys = ON;

SELECT 'Cleanup completed' as status;

