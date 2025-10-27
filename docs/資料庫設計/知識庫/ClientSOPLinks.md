# ClientSOPLinks (客戶專屬 SOP 連結)

**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ClientSOPLinks (
  link_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  custom_notes TEXT,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id)
);
```

---

## 用途

為特定客戶的特定服務連結專屬 SOP（處理客製化流程）

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [客戶專屬SOP連結](../../功能模塊/19-客戶專屬SOP連結.md)

---

**最後更新：** 2025年10月27日



**最後更新：** 2025年10月27日

---

## 表格定義

```sql
CREATE TABLE ClientSOPLinks (
  link_id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  client_service_id INTEGER NOT NULL,
  sop_id INTEGER NOT NULL,
  custom_notes TEXT,
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (client_service_id) REFERENCES ClientServices(client_service_id),
  FOREIGN KEY (sop_id) REFERENCES SOPDocuments(sop_id)
);
```

---

## 用途

為特定客戶的特定服務連結專屬 SOP（處理客製化流程）

---

## 相關文檔

- [資料庫設計](../../資料庫設計.md)
- [客戶專屬SOP連結](../../功能模塊/19-客戶專屬SOP連結.md)

---

**最後更新：** 2025年10月27日



