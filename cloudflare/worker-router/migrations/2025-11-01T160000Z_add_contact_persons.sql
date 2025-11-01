-- 添加公司联络人字段到Clients表

ALTER TABLE Clients ADD COLUMN contact_person_1 TEXT;
ALTER TABLE Clients ADD COLUMN contact_person_2 TEXT;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_clients_contact1 ON Clients(contact_person_1);
CREATE INDEX IF NOT EXISTS idx_clients_contact2 ON Clients(contact_person_2);

