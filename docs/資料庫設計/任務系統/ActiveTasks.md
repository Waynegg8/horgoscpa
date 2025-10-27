# ActiveTasks (執行中任務)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ActiveTasks (
  active_task_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  task_template_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  assigned_user_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT '進行中',
  year INTEGER,
  period TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id),
  FOREIGN KEY (assigned_user_id) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `active_task_id` | INTEGER PK | 執行中任務 ID |
| `client_id` | TEXT FK | 客戶 ID |
| `client_service_id` | INTEGER FK | 關聯的客戶服務 ID |
| `task_template_id` | INTEGER FK | 任務模板 ID |
| `title` | TEXT | 任務標題（例如：'仟鑽-記帳-114年9-10月'） |
| `assigned_user_id` | INTEGER FK | 負責員工 ID |
| `start_date` | TEXT | 開始日期 |
| `due_date` | TEXT | 到期日期（根據所有階段天數自動計算） |
| `status` | TEXT | 整體狀態（'進行中', '已完成', '逾期'） |
| `year` | INTEGER | 年份 |
| `period` | TEXT | 期間（例如：'9-10月'） |

---

## 索引

```sql
CREATE INDEX idx_activetasks_user ON ActiveTasks(assigned_user_id);
CREATE INDEX idx_activetasks_client ON ActiveTasks(client_id);
CREATE INDEX idx_activetasks_status ON ActiveTasks(status);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [任務進度追蹤](../../功能模塊/16-任務進度追蹤.md)
- [自動化流程 - 任務生成器](../../自動化流程/01-任務生成器.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ActiveTasks (
  active_task_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  task_template_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  assigned_user_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT '進行中',
  year INTEGER,
  period TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id),
  FOREIGN KEY (assigned_user_id) REFERENCES Users(user_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `active_task_id` | INTEGER PK | 執行中任務 ID |
| `client_id` | TEXT FK | 客戶 ID |
| `client_service_id` | INTEGER FK | 關聯的客戶服務 ID |
| `task_template_id` | INTEGER FK | 任務模板 ID |
| `title` | TEXT | 任務標題（例如：'仟鑽-記帳-114年9-10月'） |
| `assigned_user_id` | INTEGER FK | 負責員工 ID |
| `start_date` | TEXT | 開始日期 |
| `due_date` | TEXT | 到期日期（根據所有階段天數自動計算） |
| `status` | TEXT | 整體狀態（'進行中', '已完成', '逾期'） |
| `year` | INTEGER | 年份 |
| `period` | TEXT | 期間（例如：'9-10月'） |

---

## 索引

```sql
CREATE INDEX idx_activetasks_user ON ActiveTasks(assigned_user_id);
CREATE INDEX idx_activetasks_client ON ActiveTasks(client_id);
CREATE INDEX idx_activetasks_status ON ActiveTasks(status);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [任務進度追蹤](../../功能模塊/16-任務進度追蹤.md)
- [自動化流程 - 任務生成器](../../自動化流程/01-任務生成器.md)

---

**最後更新：** 2025年10月27日



