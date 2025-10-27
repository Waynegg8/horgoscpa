# 任務 API 設計

**API 前綴：** `/api/v1/tasks`  
**最後更新：** 2025年10月27日

---

## API 概述

任務 API 提供任務追蹤系統的所有操作，包括任務模板管理、任務實例管理、階段進度更新等。

---

## 認證要求

所有端點都需要身份驗證（除了登入 API）。

**驗證方式：** HttpOnly Cookie

**錯誤回應：**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "請先登入"
  }
}
```
**HTTP 狀態碼：** 401

---

## 端點列表

### 任務模板管理（僅管理員）

#### 獲取所有任務模板

```
GET /api/v1/task-templates
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "task_template_id": 1,
      "name": "記帳標準流程（雙月）",
      "service_template_id": 1,
      "description": "雙月記帳服務的標準作業流程",
      "total_days": 8,
      "stages": [
        {
          "stage_template_id": 1,
          "stage_name": "資料收集與核對",
          "stage_order": 1,
          "estimated_days": 3
        },
        {
          "stage_template_id": 2,
          "stage_name": "營業稅過帳",
          "stage_order": 2,
          "estimated_days": 2
        }
      ]
    }
  ]
}
```

---

#### 建立任務模板

```
POST /api/v1/task-templates
```

**權限：** 管理員

**請求：**
```json
{
  "name": "公司設立流程",
  "service_template_id": 2,
  "description": "新公司設立的完整流程",
  "stages": [
    {
      "stage_name": "資料準備",
      "stage_order": 1,
      "estimated_days": 5,
      "description": "準備設立文件"
    },
    {
      "stage_name": "送件申請",
      "stage_order": 2,
      "estimated_days": 3
    },
    {
      "stage_name": "領取證書",
      "stage_order": 3,
      "estimated_days": 1
    }
  ]
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "task_template_id": 2,
    "name": "公司設立流程",
    "total_days": 9
  }
}
```

**HTTP 狀態碼：** 201 Created

---

#### 更新任務模板

```
PUT /api/v1/task-templates/:id
```

**權限：** 管理員

---

#### 刪除任務模板

```
DELETE /api/v1/task-templates/:id
```

**權限：** 管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "message": "已刪除任務模板及其 3 個階段"
  }
}
```

---

### 任務實例管理

#### 獲取任務列表

```
GET /api/v1/tasks
```

**權限：** 需登入

**查詢參數：**
| 參數 | 類型 | 說明 | 範例 |
|------|------|------|------|
| `status` | string | 狀態篩選 | `進行中`, `已完成`, `逾期` |
| `client_id` | string | 客戶篩選 | `12345678` |
| `page` | number | 頁碼 | `1` |
| `limit` | number | 每頁筆數 | `20` |
| `sort` | string | 排序欄位 | `due_date`, `title` |
| `order` | string | 排序方向 | `asc`, `desc` |

**回應：**
```json
{
  "success": true,
  "data": [
    {
      "active_task_id": 1,
      "title": "仟鑽-記帳-114年9-10月",
      "client_name": "仟鑽企業",
      "client_id": "12345678",
      "assigned_user_name": "紜蓁",
      "status": "進行中",
      "start_date": "2025-11-01",
      "due_date": "2025-11-15",
      "progress": "50%",
      "completed_stages": 2,
      "total_stages": 4,
      "days_remaining": 8
    }
  ],
  "meta": {
    "page": 1,
    "total": 10,
    "limit": 20,
    "timestamp": "2025-10-27T12:00:00Z"
  }
}
```

---

#### 獲取任務詳情

```
GET /api/v1/tasks/:taskId
```

**權限：** 需登入，且為任務負責人或管理員

**回應：**
```json
{
  "success": true,
  "data": {
    "active_task_id": 1,
    "title": "仟鑽-記帳-114年9-10月",
    "client": {
      "client_id": "12345678",
      "company_name": "仟鑽企業",
      "contact_person_1": "王先生"
    },
    "assigned_user": {
      "user_id": 2,
      "name": "紜蓁"
    },
    "start_date": "2025-11-01",
    "due_date": "2025-11-15",
    "status": "進行中",
    "stages": [
      {
        "active_stage_id": 1,
        "stage_name": "資料收集與核對",
        "stage_order": 1,
        "estimated_days": 3,
        "start_date": "2025-11-01",
        "due_date": "2025-11-03",
        "completed_date": "2025-11-03",
        "status": "已完成",
        "notes": "已收到全部發票"
      },
      {
        "active_stage_id": 2,
        "stage_name": "營業稅過帳",
        "stage_order": 2,
        "estimated_days": 2,
        "start_date": "2025-11-04",
        "due_date": "2025-11-05",
        "completed_date": null,
        "status": "進行中",
        "notes": null
      }
    ],
    "linked_sop": {
      "sop_id": 5,
      "title": "仟鑽企業-記帳服務SOP",
      "url": "/sop/5"
    }
  }
}
```

---

#### 手動建立任務（管理員）

```
POST /api/v1/tasks
```

**權限：** 管理員

**請求：**
```json
{
  "client_id": "12345678",
  "task_template_id": 1,
  "assigned_user_id": 2,
  "title": "仟鑽-記帳-114年11月",
  "start_date": "2025-12-01"
}
```

**邏輯：**
1. 驗證任務模板存在
2. 建立 `ActiveTasks` 記錄
3. 根據模板建立所有 `ActiveTaskStages` 記錄
4. 計算總到期日
5. 返回完整任務資料

---

### 階段進度管理

#### 獲取任務的所有階段

```
GET /api/v1/tasks/:taskId/stages
```

**權限：** 需登入，且為任務負責人或管理員

---

#### 更新階段狀態

```
PUT /api/v1/tasks/stages/:stageId
```

**權限：** 需登入，且為任務負責人或管理員

**請求：**
```json
{
  "status": "進行中",
  "notes": "已完成資料核對"
}
```

**後端邏輯：**
```typescript
// services/task.service.ts

async updateStageStatus(stageId: number, status: string, notes?: string) {
  const stage = await this.getStage(stageId);
  
  // 如果狀態改為「進行中」，設定開始日期和到期日
  if (status === '進行中' && stage.status === '未開始') {
    const startDate = new Date().toISOString().split('T')[0];
    const dueDate = addDays(startDate, stage.estimated_days);
    
    await db.prepare(`
      UPDATE ActiveTaskStages 
      SET status = ?, start_date = ?, due_date = ?, notes = ?
      WHERE active_stage_id = ?
    `).bind(status, startDate, dueDate, notes, stageId).run();
  }
  
  // 如果狀態改為「已完成」，設定完成日期
  else if (status === '已完成') {
    const completedDate = new Date().toISOString().split('T')[0];
    
    await db.prepare(`
      UPDATE ActiveTaskStages 
      SET status = ?, completed_date = ?, notes = ?
      WHERE active_stage_id = ?
    `).bind(status, completedDate, notes, stageId).run();
  }
  
  // 其他狀態更新
  else {
    await db.prepare(`
      UPDATE ActiveTaskStages 
      SET status = ?, notes = ?
      WHERE active_stage_id = ?
    `).bind(status, notes, stageId).run();
  }
  
  // 檢查並更新任務整體狀態
  await this.updateTaskOverallStatus(stage.active_task_id);
}
```

**回應：**
```json
{
  "success": true,
  "data": {
    "active_stage_id": 2,
    "status": "進行中",
    "start_date": "2025-11-04",
    "due_date": "2025-11-05",
    "notes": "已完成資料核對"
  }
}
```

---

### 可選功能端點

#### F156 - 複製任務

```
POST /api/v1/tasks/:taskId/duplicate
```

---

#### F157 - 重新指派任務

```
PUT /api/v1/tasks/:taskId/reassign
Body: { "new_assignee_id": 3 }
```

---

## 錯誤處理

### 常見錯誤碼

| 錯誤碼 | HTTP狀態 | 說明 |
|--------|----------|------|
| `TASK_NOT_FOUND` | 404 | 任務不存在 |
| `STAGE_NOT_FOUND` | 404 | 階段不存在 |
| `PERMISSION_DENIED` | 403 | 無權限操作此任務 |
| `INVALID_STATUS` | 422 | 無效的狀態值 |
| `TEMPLATE_NOT_FOUND` | 404 | 任務模板不存在 |

**範例錯誤回應：**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "您無權編輯此任務",
    "details": {
      "task_id": 123,
      "assigned_user_id": 2,
      "current_user_id": 3
    }
  }
}
```

---

## Webhook（可選）

如需整合外部系統，可在任務狀態變更時觸發 Webhook：

```typescript
// 任務完成時
if (allStagesCompleted(taskId)) {
  await fetch('https://external-system.com/webhook', {
    method: 'POST',
    body: JSON.stringify({
      event: 'task.completed',
      task_id: taskId,
      client_id: task.client_id
    })
  });
}
```

---

**相關文檔：**
- [任務追蹤系統模塊](../功能模塊/05-任務追蹤系統模塊.md)
- [自動化流程](../自動化流程.md) - task-generator Cron Job

