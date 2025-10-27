# WorkTypes 資料表

**用途：** 儲存工時類型及其加權比率（正常工時、平日加班、假日加班等）  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE WorkTypes (
  work_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_type_name TEXT NOT NULL,                -- 工時類型名稱
  multiplier REAL NOT NULL DEFAULT 1.0,        -- 加權倍數
  description TEXT,                            -- 說明
  sort_order INTEGER DEFAULT 0,                -- 排序順序
  is_active BOOLEAN DEFAULT 1,                 -- 是否啟用
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 範例資料

```sql
INSERT INTO WorkTypes (work_type_id, work_type_name, multiplier, sort_order) VALUES
(1, '正常工時', 1.0, 1),
(2, '平日加班', 1.34, 2),
(3, '假日加班', 1.67, 3),
(4, '國定假日加班', 2.0, 4);
```

---

## 索引設計

```sql
CREATE INDEX idx_work_types_active ON WorkTypes(is_active);
```

---

## 相關文檔

- [功能模塊 - 加權工時計算](../../功能模塊/09-加權工時計算.md)


