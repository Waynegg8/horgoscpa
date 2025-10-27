# ClientServices (客戶訂閱服務)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ClientServices (
  client_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  service_template_id INTEGER NOT NULL,
  frequency TEXT CHECK (frequency IN ('每月', '雙月', '單次')),
  fee INTEGER,
  trigger_months TEXT,
  is_active BOOLEAN DEFAULT 1,
  payment_remarks TEXT,
  service_remarks TEXT,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (service_template_id) REFERENCES ServiceTemplates(template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `client_service_id` | INTEGER PK | 客戶服務 ID |
| `client_id` | TEXT FK | 客戶 ID |
| `service_template_id` | INTEGER FK | 服務模板 ID |
| `frequency` | TEXT | 頻率（'每月', '雙月', '單次'） |
| `fee` | INTEGER | 費用 |
| `trigger_months` | TEXT | 觸發月份（JSON 格式：`[1,3,5,7,9,11]`） |
| `is_active` | BOOLEAN | 是否啟用 |
| `payment_remarks` | TEXT | 付款備註 |
| `service_remarks` | TEXT | 服務備註 |

---

## 索引

```sql
CREATE INDEX idx_clientservices_client ON ClientServices(client_id);
CREATE INDEX idx_clientservices_active ON ClientServices(is_active);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [客戶服務設定](../../功能模塊/15-客戶服務設定.md)
- [自動化流程 - 任務生成器](../../自動化流程/01-任務生成器.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ClientServices (
  client_service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  service_template_id INTEGER NOT NULL,
  frequency TEXT CHECK (frequency IN ('每月', '雙月', '單次')),
  fee INTEGER,
  trigger_months TEXT,
  is_active BOOLEAN DEFAULT 1,
  payment_remarks TEXT,
  service_remarks TEXT,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (service_template_id) REFERENCES ServiceTemplates(template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 說明 |
|------|------|------|
| `client_service_id` | INTEGER PK | 客戶服務 ID |
| `client_id` | TEXT FK | 客戶 ID |
| `service_template_id` | INTEGER FK | 服務模板 ID |
| `frequency` | TEXT | 頻率（'每月', '雙月', '單次'） |
| `fee` | INTEGER | 費用 |
| `trigger_months` | TEXT | 觸發月份（JSON 格式：`[1,3,5,7,9,11]`） |
| `is_active` | BOOLEAN | 是否啟用 |
| `payment_remarks` | TEXT | 付款備註 |
| `service_remarks` | TEXT | 服務備註 |

---

## 索引

```sql
CREATE INDEX idx_clientservices_client ON ClientServices(client_id);
CREATE INDEX idx_clientservices_active ON ClientServices(is_active);
```

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [客戶服務設定](../../功能模塊/15-客戶服務設定.md)
- [自動化流程 - 任務生成器](../../自動化流程/01-任務生成器.md)

---

**最後更新：** 2025年10月27日



