-- ================================================================
-- Initial Schema for HorgosCPA Internal System
-- Version: 1.0
-- Date: 2025-10-26
-- Description: This single script defines the entire database schema,
--              consolidating all previous migrations into one authoritative file.
--              It establishes the correct table structures, relationships,
--              and necessary seed data for the system to operate correctly.
-- ================================================================

-- Drop tables in reverse order of dependency to avoid foreign key constraints issues.
DROP TABLE IF EXISTS task_generation_log;
DROP TABLE IF EXISTS task_execution_log;
DROP TABLE IF EXISTS task_stages;
DROP TABLE IF EXISTS multi_stage_tasks;
DROP TABLE IF EXISTS recurring_task_instances;
DROP TABLE IF EXISTS recurring_task_templates;
DROP TABLE IF EXISTS template_stages;
DROP TABLE IF EXISTS multi_stage_templates;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS service_checklist_templates;
DROP TABLE IF EXISTS client_services;
DROP TABLE IF EXISTS client_interactions;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS timesheets;
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
DROP TABLE IF EXISTS system_parameters;
DROP TABLE IF EXISTS leave_events;
DROP TABLE IF EXISTS other_leave_rules;
DROP TABLE IF EXISTS annual_leave_carryover;
DROP TABLE IF EXISTS annual_leave_rules;
DROP TABLE IF EXISTS overtime_rates;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS leave_types;
DROP TABLE IF EXISTS business_types;


-- ================================================================
-- Table Creation
-- ================================================================

-- Core User and Employee Tables
CREATE TABLE employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    hire_date DATE,
    gender TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
    employee_id INTEGER UNIQUE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Client Management Tables
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    tax_id TEXT UNIQUE,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'potential')),
    region TEXT CHECK(region IN ('台中', '台北', '其他')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE client_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_type TEXT NOT NULL,
    frequency TEXT NOT NULL,
    fee DECIMAL(10, 2) DEFAULT 0,
    estimated_hours DECIMAL(5, 2) DEFAULT 0,
    assigned_to INTEGER,
    backup_assignee INTEGER,
    start_month INTEGER,
    execution_day INTEGER,
    advance_days INTEGER DEFAULT 7,
    due_days INTEGER DEFAULT 15,
    invoice_count INTEGER DEFAULT 0,
    difficulty_level INTEGER,
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    special_requirements TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_generated_at DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (backup_assignee) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE client_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL,
    subject TEXT,
    content TEXT,
    interaction_date DATETIME,
    participants TEXT,
    follow_up_required BOOLEAN DEFAULT 0,
    follow_up_date DATE,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Unified Task Management System
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date DATETIME,
    assigned_user_id INTEGER,
    created_by_user_id INTEGER,
    client_id INTEGER,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE TABLE multi_stage_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL UNIQUE,
    total_stages INTEGER NOT NULL,
    completed_stages INTEGER DEFAULT 0,
    overall_progress INTEGER DEFAULT 0,
    current_stage INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE task_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    multi_stage_task_id INTEGER NOT NULL,
    stage_order INTEGER NOT NULL,
    stage_name TEXT NOT NULL,
    stage_description TEXT,
    status TEXT DEFAULT 'pending',
    checklist TEXT, -- JSON format
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    assigned_to_user_id INTEGER,
    completed_by_user_id INTEGER,
    completed_at DATETIME,
    notes TEXT,
    requires_approval BOOLEAN DEFAULT 0,
    approved_by_user_id INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (multi_stage_task_id) REFERENCES multi_stage_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE task_generation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_service_id INTEGER NOT NULL,
    execution_period TEXT NOT NULL,
    generated_task_id INTEGER,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    generation_method TEXT,
    FOREIGN KEY (client_service_id) REFERENCES client_services(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    UNIQUE(client_service_id, execution_period)
);

-- Project Management (as an extension of tasks)
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client_id INTEGER,
    description TEXT,
    status TEXT DEFAULT 'planning',
    priority TEXT DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    budget DECIMAL(12, 2),
    actual_cost DECIMAL(12, 2),
    assigned_to_user_id INTEGER,
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);


-- Knowledge Base & CMS
CREATE TABLE sop_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES sop_categories(id) ON DELETE SET NULL
);

CREATE TABLE sops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    category_id INTEGER,
    document_type TEXT,
    status TEXT DEFAULT 'draft',
    created_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES sop_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT,
    status TEXT DEFAULT 'draft',
    published_at DATETIME,
    author_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE media_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    url TEXT NOT NULL,
    uploaded_by_user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE faq_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    status TEXT DEFAULT 'active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES faq_categories(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);


-- Timesheet and HR
CREATE TABLE business_types (
    type_name TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE leave_types (
    type_name TEXT PRIMARY KEY NOT NULL
);

CREATE TABLE timesheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    client_id INTEGER,
    work_date DATE NOT NULL,
    day_of_week TEXT,
    work_year INTEGER,
    work_month INTEGER,
    hours_normal REAL DEFAULT 0,
    hours_ot_weekday_134 REAL DEFAULT 0,
    hours_ot_weekday_167 REAL DEFAULT 0,
    hours_ot_rest_134 REAL DEFAULT 0,
    hours_ot_rest_167 REAL DEFAULT 0,
    hours_ot_rest_267 REAL DEFAULT 0,
    hours_ot_offday_100 REAL DEFAULT 0,
    hours_ot_offday_200 REAL DEFAULT 0,
    hours_ot_holiday_100 REAL DEFAULT 0,
    hours_ot_holiday_134 REAL DEFAULT 0,
    hours_ot_holiday_167 REAL DEFAULT 0,
    leave_type TEXT,
    leave_hours REAL DEFAULT 0,
    business_type TEXT,
    weighted_hours REAL DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (business_type) REFERENCES business_types(type_name),
    FOREIGN KEY (leave_type) REFERENCES leave_types(type_name)
);

-- System & Configuration Tables
CREATE TABLE system_parameters (
    param_name TEXT PRIMARY KEY NOT NULL,
    param_value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE report_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_name TEXT NOT NULL,
    params_json TEXT NOT NULL,
    data_json TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    UNIQUE(report_name, params_json)
);

CREATE TABLE holidays (
    holiday_date TEXT PRIMARY KEY NOT NULL,
    holiday_name TEXT NOT NULL
);

-- ================================================================
-- Seed Data
-- ================================================================

-- Default Admin User (Password: admin123)
INSERT INTO users (username, password_hash, role, is_active) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 1);

-- Default Business Types
INSERT INTO business_types (type_name) VALUES
('記帳'),
('簽證'),
('工商'),
('其他');

-- Default Leave Types
INSERT INTO leave_types (type_name) VALUES
('特休'),
('病假'),
('事假'),
('婚假'),
('喪假'),
('生理假');

-- Default System Parameters
INSERT INTO system_parameters (param_name, param_value, description) VALUES
('task_auto_generation_time', '00:00', 'Time of day (UTC) to run automated task generation.'),
('session_expiry_hours', '24', 'Number of hours before a user session expires.'),
('max_upload_size_mb', '10', 'Maximum file size for media uploads in MB.');

-- ================================================================
-- Schema creation complete.
-- ================================================================
