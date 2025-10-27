# TaskStageTemplates 資料表

**用途：** 儲存任務模板的階段定義（如資料收集、營業稅過帳等）  
**最後更新：** 2025年10月27日

---

## 資料表結構

```sql
CREATE TABLE TaskStageTemplates (
  stage_template_id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_template_id INTEGER NOT NULL,           -- 所屬任務模板
  stage_name TEXT NOT NULL,                    -- 階段名稱
  stage_order INTEGER NOT NULL,                -- 階段順序（1, 2, 3...）
  estimated_days INTEGER NOT NULL,             -- 預計天數
  description TEXT,                            -- 階段說明
  depends_on INTEGER,                          -- 依賴的階段ID（可選）
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id),
  FOREIGN KEY (depends_on) REFERENCES TaskStageTemplates(stage_template_id)
);
```

---

## 欄位說明

| 欄位 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `stage_template_id` | INTEGER | ✅ | 主鍵（自動遞增）|
| `task_template_id` | INTEGER | ✅ | 所屬任務模板ID |
| `stage_name` | TEXT | ✅ | 階段名稱（如：資料收集）|
| `stage_order` | INTEGER | ✅ | 階段順序（1, 2, 3...）|
| `estimated_days` | INTEGER | ✅ | 預計天數 |
| `description` | TEXT | ❌ | 階段說明 |
| `depends_on` | INTEGER | ❌ | 依賴的階段ID（若設定，該階段必須在依賴階段完成後才能開始）|
| `created_at` | TEXT | ❌ | 創建時間 |
| `updated_at` | TEXT | ❌ | 更新時間 |

---

## 範例資料

### 記帳標準流程的階段
```sql
-- 階段1：資料收集
INSERT INTO TaskStageTemplates (
  stage_template_id, task_template_id, stage_name,
  stage_order, estimated_days, description
) VALUES (
  1, 1, '資料收集與核對',
  1, 3, '收集客戶提供的原始憑證並核對'
);

-- 階段2：營業稅過帳（依賴階段1）
INSERT INTO TaskStageTemplates (
  stage_template_id, task_template_id, stage_name,
  stage_order, estimated_days, description, depends_on
) VALUES (
  2, 1, '營業稅過帳',
  2, 2, '處理營業稅相關帳務', 1
);

-- 階段3：提列折舊（依賴階段2）
INSERT INTO TaskStageTemplates (
  stage_template_id, task_template_id, stage_name,
  stage_order, estimated_days, description, depends_on
) VALUES (
  3, 1, '提列折舊',
  3, 1, '計算並提列折舊', 2
);

-- 階段4：報表產出（依賴階段3）
INSERT INTO TaskStageTemplates (
  stage_template_id, task_template_id, stage_name,
  stage_order, estimated_days, description, depends_on
) VALUES (
  4, 1, '報表產出與檢查',
  4, 2, '產出財務報表並進行最終檢查', 3
);
```

---

## 索引設計

```sql
-- 加快任務模板查詢
CREATE INDEX idx_stage_templates_task ON TaskStageTemplates(task_template_id);

-- 加快順序查詢
CREATE INDEX idx_stage_templates_order 
ON TaskStageTemplates(task_template_id, stage_order);

-- 加快依賴查詢
CREATE INDEX idx_stage_templates_depends 
ON TaskStageTemplates(depends_on) 
WHERE depends_on IS NOT NULL;
```

---

## 查詢範例

### 查詢模板的所有階段（按順序）
```sql
SELECT * FROM TaskStageTemplates
WHERE task_template_id = ?
ORDER BY stage_order;
```

### 查詢階段的依賴關係
```sql
SELECT 
  t1.stage_template_id,
  t1.stage_name,
  t1.stage_order,
  t2.stage_name as depends_on_stage_name
FROM TaskStageTemplates t1
LEFT JOIN TaskStageTemplates t2 ON t1.depends_on = t2.stage_template_id
WHERE t1.task_template_id = ?
ORDER BY t1.stage_order;
```

### 檢查階段是否可以開始（依賴檢查）
```sql
-- 查詢某階段的依賴是否已完成
SELECT 
  tst.stage_template_id,
  tst.stage_name,
  tst.depends_on,
  ast.status as dependent_stage_status
FROM TaskStageTemplates tst
LEFT JOIN ActiveTaskStages ast ON ast.stage_template_id = tst.depends_on
WHERE tst.stage_template_id = ?;
```

---

## 關聯資料表

### TaskTemplates（任務模板）
```sql
FOREIGN KEY (task_template_id) REFERENCES TaskTemplates(task_template_id)
```

### ActiveTaskStages（任務階段實例）
```sql
CREATE TABLE ActiveTaskStages (
  ...
  stage_template_id INTEGER,
  ...
  FOREIGN KEY (stage_template_id) REFERENCES TaskStageTemplates(stage_template_id)
);
```

---

## 業務規則

### 階段順序規則
- `stage_order` 從 1 開始
- 同一模板下的階段順序不可重複
- 建議連續編號（1, 2, 3...）

### 依賴關係規則
- `depends_on` 必須指向同一模板的其他階段
- 不允許循環依賴（A依賴B，B依賴A）
- 依賴階段的 `stage_order` 必須小於當前階段

### 驗證規則
- `stage_name`: 1-100 字元
- `estimated_days`: 必須 > 0
- `stage_order`: 必須 > 0

---

## 依賴關係驗證

### 檢查循環依賴
```typescript
async function checkCircularDependency(
  stageId: number, 
  dependsOn: number
): Promise<boolean> {
  // 遞迴檢查依賴鏈
  const visited = new Set<number>();
  
  async function traverse(currentId: number): Promise<boolean> {
    if (currentId === stageId) {
      return true;  // 發現循環
    }
    
    if (visited.has(currentId)) {
      return false;
    }
    
    visited.add(currentId);
    
    const stage = await db.prepare(
      'SELECT depends_on FROM TaskStageTemplates WHERE stage_template_id = ?'
    ).bind(currentId).first();
    
    if (stage.depends_on) {
      return await traverse(stage.depends_on);
    }
    
    return false;
  }
  
  return await traverse(dependsOn);
}
```

### 檢查依賴順序
```sql
-- 確保依賴階段的順序小於當前階段
SELECT 
  t1.stage_order as current_order,
  t2.stage_order as depends_on_order
FROM TaskStageTemplates t1
JOIN TaskStageTemplates t2 ON t1.depends_on = t2.stage_template_id
WHERE t1.stage_template_id = ?
  AND t2.stage_order >= t1.stage_order;
-- 若有結果，表示依賴順序錯誤
```

---

## 階段複製（創建任務實例時）

```typescript
async function copyStageTemplatesToActiveTask(
  taskTemplateId: number, 
  taskId: number
) {
  // 查詢所有階段模板
  const stages = await db.prepare(`
    SELECT * FROM TaskStageTemplates 
    WHERE task_template_id = ?
    ORDER BY stage_order
  `).bind(taskTemplateId).all();
  
  // 複製到 ActiveTaskStages
  for (const stage of stages.results) {
    await db.prepare(`
      INSERT INTO ActiveTaskStages (
        task_id, stage_template_id, stage_name,
        stage_order, estimated_days, status, depends_on
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      taskId,
      stage.stage_template_id,
      stage.stage_name,
      stage.stage_order,
      stage.estimated_days,
      stage.depends_on
    ).run();
  }
}
```

---

## 相關文檔

- [功能模塊 - 任務模板管理](../../功能模塊/14-任務模板管理.md)
- [TaskTemplates 資料表](./TaskTemplates.md)
- [ActiveTaskStages 資料表](./ActiveTaskStages.md)





