# API 速查表

**所有 API 端點一覽** | 快速查找 API 文檔

---

## 📋 按模塊分類

### 🔐 認證 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/auth/login` | POST | 登入 | 公開 | [認證API](../API規格/認證API.md#登入) |
| `/api/v1/auth/logout` | POST | 登出 | 已登入 | [認證API](../API規格/認證API.md#登出) |
| `/api/v1/auth/verify` | GET | 驗證會話 | 已登入 | [認證API](../API規格/認證API.md#驗證) |
| `/api/v1/auth/change-password` | POST | 修改密碼 | 已登入 | [認證API](../API規格/認證API.md#修改密碼) |

---

### ~~👥 員工權限 API~~ ⚠️ 已移除

**優化說明：** 權限系統已簡化為 `Users.is_admin`，不需要模塊權限管理API

**原有端點：** 8個（已全部移除）
- ~~獲取預設權限模板~~
- ~~更新預設權限模板~~
- ~~同步預設模板到員工~~
- ~~獲取所有員工權限~~
- ~~獲取特定員工權限~~
- ~~更新員工權限~~
- ~~恢復員工為預設模板~~
- ~~獲取當前用戶權限~~

**優化後：** 
- 權限由 `Users.is_admin` 控制
- 前端路由使用 `meta: { requireAdmin: true }`
- 後端API使用 `requireAdmin` middleware

---

### 👤 員工管理 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/users` | GET | 查詢員工列表 | 管理員 | [員工管理API](../API規格/員工管理API.md#列表) |
| `/api/v1/users` | POST | 新增員工 | 管理員 | [員工管理API](../API規格/員工管理API.md#新增) |
| `/api/v1/users/:id` | GET | 查詢員工詳情 | 管理員 | [員工管理API](../API規格/員工管理API.md#詳情) |
| `/api/v1/users/:id` | PUT | 更新員工 | 管理員 | [員工管理API](../API規格/員工管理API.md#更新) |

---

### 🏢 客戶管理 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/clients` | GET | 查詢客戶列表 | 所有員工 | [客戶管理API](../API規格/客戶管理API.md#列表) |
| `/api/v1/clients` | POST | 新增客戶 | 管理員 | [客戶管理API](../API規格/客戶管理API.md#新增) |
| `/api/v1/clients/:id` | GET | 查詢客戶詳情 | 所有員工 | [客戶管理API](../API規格/客戶管理API.md#詳情) |
| `/api/v1/clients/:id` | PUT | 更新客戶 | 管理員 | [客戶管理API](../API規格/客戶管理API.md#更新) |
| `/api/v1/clients/:id` | DELETE | 刪除客戶 | 管理員 | [客戶管理API](../API規格/客戶管理API.md#刪除) |
| `/api/v1/clients/tags` | GET | 獲取所有標籤 | 所有員工 | [客戶管理API](../API規格/客戶管理API.md#標籤) |
| `/api/v1/clients/tags` | POST | 新增標籤 | 管理員 | [客戶管理API](../API規格/客戶管理API.md#標籤) |

---

### 🔧 服務項目 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/services` | GET | 查詢服務列表 | 所有員工 | [服務項目API](../API規格/服務項目API.md#列表) |
| `/api/v1/services` | POST | 新增服務項目 | 管理員 | [服務項目API](../API規格/服務項目API.md#新增) |
| `/api/v1/services/:id` | GET | 查詢服務詳情 | 所有員工 | [服務項目API](../API規格/服務項目API.md#詳情) |
| `/api/v1/services/:id` | PUT | 更新服務項目 | 管理員 | [服務項目API](../API規格/服務項目API.md#更新) |
| `/api/v1/services/:id` | DELETE | 刪除服務項目 | 管理員 | [服務項目API](../API規格/服務項目API.md#刪除) |

---

### 📋 客戶服務 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/client-services` | GET | 查詢客戶服務列表 | 所有員工 | [客戶服務API](../API規格/客戶服務API.md#列表) |
| `/api/v1/client-services` | POST | 新增客戶服務 | 管理員 | [客戶服務API](../API規格/客戶服務API.md#新增) |
| `/api/v1/client-services/:id` | GET | 查詢服務詳情 | 所有員工 | [客戶服務API](../API規格/客戶服務API.md#詳情) |
| `/api/v1/client-services/:id` | PUT | 更新客戶服務 | 管理員 | [客戶服務API](../API規格/客戶服務API.md#更新) |
| `/api/v1/client-services/:id` | DELETE | 刪除客戶服務 | 管理員 | [客戶服務API](../API規格/客戶服務API.md#刪除) |

---

### ⏱️ 工時管理 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/timelogs` | GET | 查詢工時列表 | 所有員工 | [工時管理API](../API規格/工時管理API.md#列表) |
| `/api/v1/timelogs` | POST | 新增工時 | 所有員工 | [工時管理API](../API規格/工時管理API.md#新增) |
| `/api/v1/timelogs/:id` | PUT | 更新工時 | 所有員工 | [工時管理API](../API規格/工時管理API.md#更新) |
| `/api/v1/timelogs/:id` | DELETE | 刪除工時 | 所有員工 | [工時管理API](../API規格/工時管理API.md#刪除) |

---

### 📊 加權工時 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/weighted-hours/calculate` | POST | 計算加權工時 | 所有員工 | [加權工時API](../API規格/加權工時API.md) |

---

### 🗂️ 任務管理 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/task-templates` | GET | 查詢模板列表 | 管理員 | [任務管理API](../API規格/任務管理API.md#模板列表) |
| `/api/v1/task-templates` | POST | 新增模板 | 管理員 | [任務管理API](../API規格/任務管理API.md#新增模板) |
| `/api/v1/task-templates/:id` | PUT | 更新模板 | 管理員 | [任務管理API](../API規格/任務管理API.md#更新模板) |
| `/api/v1/task-templates/:id` | DELETE | 刪除模板 | 管理員 | [任務管理API](../API規格/任務管理API.md#刪除模板) |
| `/api/v1/tasks` | GET | 查詢任務列表 | 所有員工 | [任務管理API](../API規格/任務管理API.md#任務列表) |
| `/api/v1/tasks/:id` | GET | 查詢任務詳情 | 所有員工 | [任務管理API](../API規格/任務管理API.md#任務詳情) |
| `/api/v1/tasks/:id/stages/:stageId/start` | POST | 開始階段 | 所有員工 | [任務管理API](../API規格/任務管理API.md#開始階段) |
| `/api/v1/tasks/:id/stages/:stageId/complete` | POST | 完成階段 | 所有員工 | [任務管理API](../API規格/任務管理API.md#完成階段) |

---

### 🏖️ 假期管理 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/leave-applications` | POST | 新增假期申請 | 所有員工 | [假期管理API](../API規格/假期管理API.md#申請) |
| `/api/v1/leave-applications` | GET | 查詢假期記錄 | 所有員工 | [假期管理API](../API規格/假期管理API.md#記錄) |
| `/api/v1/leave-balance` | GET | 查詢假期餘額 | 所有員工 | [假期管理API](../API規格/假期管理API.md#餘額) |

---

### 🎂 生活事件 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/life-events` | POST | 登記生活事件 | 所有員工 | [生活事件API](../API規格/生活事件API.md) |

---

### 📈 報表中心 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/reports/timelog-summary` | GET | 工時統計報表 | 管理員 | [報表中心API](../API規格/報表中心API.md#工時) |
| `/api/v1/reports/client-summary` | GET | 客戶統計報表 | 管理員 | [報表中心API](../API規格/報表中心API.md#客戶) |
| `/api/v1/reports/leave-summary` | GET | 假期統計報表 | 管理員 | [報表中心API](../API規格/報表中心API.md#假期) |

---

### 📊 儀表板 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/dashboard` | GET | 查詢儀表板數據 | 所有員工 | [儀表板API](../API規格/儀表板API.md) |

---

### 👤 個人資料 API
| 端點 | 方法 | 說明 | 權限 | 詳細文檔 |
|------|------|------|------|---------|
| `/api/v1/profile` | GET | 獲取個人資料 | 所有員工 | [個人資料API](../API規格/個人資料API.md#獲取) |
| `/api/v1/profile` | PUT | 更新個人資料 | 所有員工 | [個人資料API](../API規格/個人資料API.md#更新) |

---

## 📚 業務規則 API

### 📅 國定假日 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/holidays` | GET | 獲取國定假日列表 | 管理員 |
| `/api/v1/holidays` | POST | 新增國定假日 | 管理員 |
| `/api/v1/holidays/:id` | PUT | 編輯國定假日 | 管理員 |
| `/api/v1/holidays/:id` | DELETE | 刪除國定假日 | 管理員 |
| `/api/v1/holidays/import` | POST | 批量導入 | 管理員 |

→ [詳細文檔](../API規格/業務規則API.md#國定假日)

---

### 🏷️ 假別類型 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/leave-types` | GET | 獲取假別類型列表 | 管理員 |
| `/api/v1/leave-types` | POST | 新增假別類型 | 管理員 |
| `/api/v1/leave-types/:id` | PUT | 編輯假別類型 | 管理員 |
| `/api/v1/leave-types/:id/enable` | POST | 啟用假別類型 | 管理員 |
| `/api/v1/leave-types/:id/disable` | POST | 停用假別類型 | 管理員 |

→ [詳細文檔](../API規格/業務規則API.md#假別類型)

---

### 💰 加班費率 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/overtime-rates` | GET | 獲取加班費率列表 | 管理員 |
| `/api/v1/overtime-rates` | POST | 新增加班費率 | 管理員 |
| `/api/v1/overtime-rates/:id` | PUT | 編輯加班費率 | 管理員 |
| `/api/v1/overtime-rates/restore-defaults` | POST | 恢復法定預設值 | 管理員 |

→ [詳細文檔](../API規格/業務規則API.md#加班費率)

---

### 🌴 特休規則 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/annual-leave-rules` | GET | 獲取特休規則列表 | 管理員 |
| `/api/v1/annual-leave-rules` | POST | 新增特休規則 | 管理員 |
| `/api/v1/annual-leave-rules/:id` | PUT | 編輯特休規則 | 管理員 |
| `/api/v1/annual-leave-rules/:id` | DELETE | 刪除特休規則 | 管理員 |
| `/api/v1/annual-leave-rules/restore-defaults` | POST | 恢復法定預設值 | 管理員 |

→ [詳細文檔](../API規格/業務規則API.md#特休規則)

---

### 🔄 週期類型 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/frequency-types` | GET | 獲取週期類型列表 | 管理員 |
| `/api/v1/frequency-types` | POST | 新增週期類型 | 管理員 |
| `/api/v1/frequency-types/:id` | PUT | 編輯週期類型 | 管理員 |
| `/api/v1/frequency-types/:id/enable` | POST | 啟用週期類型 | 管理員 |
| `/api/v1/frequency-types/:id/disable` | POST | 停用週期類型 | 管理員 |

→ [詳細文檔](../API規格/業務規則API.md#週期類型)

---

### 📜 其他假期規則 API
| 端點 | 方法 | 說明 | 權限 |
|------|------|------|------|
| `/api/v1/other-leave-rules` | GET | 獲取其他假期規則列表 | 管理員 |
| `/api/v1/other-leave-rules` | POST | 新增規則 | 管理員 |
| `/api/v1/other-leave-rules/:id` | PUT | 編輯規則 | 管理員 |
| `/api/v1/other-leave-rules/:id` | DELETE | 刪除規則 | 管理員 |

→ [詳細文檔](../API規格/業務規則API.md#其他假期規則)

---

## 🔍 快速查找

### 按權限查找

**管理員專用（14 個模塊）：**
- 員工權限管理
- 員工帳號管理
- 業務規則管理（6 種規則）
- 服務項目管理
- 客戶管理（新增/編輯/刪除）
- 任務模板管理
- 報表中心
- CSV 導入

**所有員工可用（8 個模塊）：**
- 個人資料設定
- 工時表填寫
- 加權工時計算
- 假期申請與查詢
- 生活事件登記
- 任務進度查看
- 客戶資料查看
- 儀表板

---

## 📝 共用規範

### 統一響應格式
```json
{
  "success": true,
  "data": { ... }
}
```

### 統一錯誤格式
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "錯誤訊息"
  }
}
```

### 分頁參數
- `limit`: 預設 50，最大 100
- `offset`: 從 0 開始

詳見 [API 共用規範](../API規格/API共用規範.md)

---

## 🔗 相關文檔

- **[API 共用規範](../API規格/API共用規範.md)** - 統一格式、錯誤碼、認證
- **[錯誤碼速查表](./錯誤碼速查表.md)** - 所有錯誤碼說明
- **[數據模型速查表](./數據模型速查表.md)** - 資料表關係圖

---

**最後更新：** 2025年10月27日  
**API 端點總數：** 80+

