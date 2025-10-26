-- Step 1: Recreate projects table
CREATE TABLE projects_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    client_id INTEGER,
    start_date DATE,
    end_date DATE,
    status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients_new(id) ON DELETE SET NULL
);
INSERT INTO projects_new (project_name, client_id, start_date, end_date, status)
SELECT p.project_name, c.id, p.start_date, p.end_date, p.status
FROM projects p
JOIN clients_new c ON p.client_name = c.name;
DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;

-- Step 2: Recreate recurring_task_templates table
CREATE TABLE recurring_task_templates_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    task_description TEXT,
    client_id INTEGER,
    frequency TEXT,
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients_new(id) ON DELETE CASCADE
);
INSERT INTO recurring_task_templates_new (template_name, task_description, client_id, frequency, start_date, end_date)
SELECT rtt.template_name, rtt.task_description, c.id, rtt.frequency, rtt.start_date, rtt.end_date
FROM recurring_task_templates rtt
JOIN clients_new c ON rtt.client_name = c.name;
DROP TABLE recurring_task_templates;
ALTER TABLE recurring_task_templates_new RENAME TO recurring_task_templates;

-- Step 3: Finally, drop the old clients table and rename the new one
DROP TABLE clients;
ALTER TABLE clients_new RENAME TO clients;
