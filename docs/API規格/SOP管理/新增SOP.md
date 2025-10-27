# 新增 SOP

**端點：** `POST /api/v1/knowledge/sop`  
**權限：** 管理員

---

## 請求

### Body
```json
{
  "title": "每月記帳作業流程",
  "content": "# 每月記帳作業流程\n\n## 第一步：收集憑證...",
  "category": "記帳服務",
  "tags": ["記帳", "月結", "憑證"],
  "version": "1.0",
  "is_published": true
}
```

### 欄位說明
| 欄位 | 類型 | 必填 | 說明 |
|-----|------|------|------|
| `title` | string | ✅ | SOP 標題 |
| `content` | string | ✅ | SOP 內容（Markdown）|
| `category` | string | ❌ | 分類 |
| `tags` | string[] | ❌ | 標籤陣列 |
| `version` | string | ❌ | 版本號（預設 1.0）|
| `is_published` | boolean | ❌ | 是否發布（預設 false）|

---

## 成功回應

**HTTP 狀態碼：** 201

```json
{
  "success": true,
  "data": {
    "sop_id": 15,
    "message": "SOP 已創建"
  }
}
```

---

## 錯誤回應

### 無權限
**HTTP 狀態碼：** 403
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "無權限操作"
  }
}
```

