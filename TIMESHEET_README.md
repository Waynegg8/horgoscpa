# 霍爾果斯工時管理系統

## 系統架構

### 前端
- **檔案**: `timesheet.html`
- **功能**: 工時表查詢與顯示
- **特色**: 月曆式橫向顯示，自動標示週末和國定假日

### 後端 API
- **平台**: Cloudflare Workers + D1 Database
- **端點**: `https://timesheet-api.hergscpa.workers.dev`
- **主要檔案**: `timesheet-api/src/index.js`

### 資料庫
- **類型**: Cloudflare D1 (SQLite)
- **初始化腳本**: `timesheet-api/init_db.sql`

### 資料上傳工具
- **腳本**: `upload_timesheet_data.py`
- **功能**: 批次上傳 CSV 工時記錄

## 主要功能

### 1. 工時表顯示 (timesheet.html)

#### 特點
- ✅ 月曆式橫向佈局，一次顯示整個月
- ✅ 固定左側欄位（客戶、業務類型、工時類型）
- ✅ 自動標示週末（黃色背景）
- ✅ 自動標示國定假日（紅色背景）
- ✅ 工時記錄（綠色背景）
- ✅ 請假記錄（藍色背景）
- ✅ 自動計算月總工時
- ✅ 響應式設計，支援各種螢幕尺寸

#### 使用方式
1. 開啟 `timesheet.html`
2. 選擇員工
3. 選擇年份和月份
4. 系統自動載入並顯示工時記錄

### 2. API 端點

#### GET /api/employees
取得所有員工列表

**回應範例**:
```json
[
  {"name": "莊凱閔", "hire_date": "2020-05-04"},
  {"name": "張紜蓁", "hire_date": "2019-04-15"}
]
```

#### GET /api/clients?employee={員工名稱}
取得指定員工的客戶列表

#### GET /api/business-types
取得所有業務類型

#### GET /api/leave-types
取得所有請假類型

#### GET /api/holidays?year={年份}
取得指定年份的國定假日

#### GET /api/timesheet-data?employee={員工}&year={年份}&month={月份}
取得指定員工和月份的工時資料

**回應範例**:
```json
{
  "workEntries": [
    {
      "clientName": "佳禾研發",
      "businessType": "記帳",
      "workType": "正常工時",
      "hours": {
        "14": 4,
        "15": 5
      }
    }
  ],
  "leaveEntries": [
    {
      "leaveType": "特休",
      "hours": {
        "16": 8
      }
    }
  ]
}
```

#### POST /api/save-timesheet
儲存工時資料

**請求格式**:
```json
{
  "employee": "莊凱閔",
  "year": 2025,
  "month": 10,
  "workEntries": [...],
  "leaveEntries": [...]
}
```

### 3. 批次上傳工具

#### 使用方式

1. 準備 CSV 檔案（格式參見 `上傳工時資料說明.md`）
2. 執行上傳腳本：
   ```bash
   python upload_timesheet_data.py
   ```

#### CSV 欄位格式
- 員工姓名
- 客戶名稱
- 工作日期 (YYYY/MM/DD)
- 年度
- 月份
- 正常工時
- 各類加班時數
- 假別（選填）
- 請假時數（選填）
- 業務類型

## 資料庫結構

### 主要資料表

1. **employees** - 員工資料
2. **clients** - 客戶資料
3. **client_assignments** - 員工與客戶對應
4. **business_types** - 業務類型
5. **leave_types** - 請假類型
6. **timesheets** - 工時記錄（核心表）
7. **holidays** - 國定假日
8. **overtime_rates** - 加班費率
9. **annual_leave_rules** - 特休規則
10. **other_leave_rules** - 其他假期規則

## 部署說明

### 1. 資料庫初始化

```bash
# 使用 Wrangler CLI
wrangler d1 execute timesheet-db --file=timesheet-api/init_db.sql
```

### 2. 部署 Worker

```bash
cd timesheet-api
wrangler deploy
```

### 3. 部署前端

將 `timesheet.html` 及相關靜態檔案上傳到網站伺服器。

## 開發環境設定

### 需求
- Python 3.7+（用於資料上傳工具）
- Node.js 16+（用於 Worker 開發）
- Wrangler CLI

### 安裝依賴

```bash
# Python 依賴
pip install requests

# Wrangler CLI
npm install -g wrangler
```

## 最近更新

### 2025-10-24
- ✅ 重新設計工時表為月曆式橫向佈局
- ✅ 添加週末和國定假日自動標示
- ✅ 改進 UI 樣式，參考 index.html 設計
- ✅ 實現自動載入功能
- ✅ 創建批次上傳工具
- ✅ 成功上傳測試資料（莊凱閔、張紜蓁、呂柏澄 10月工時）

## 已知問題

1. 大螢幕（>1600px）：完美顯示，無需滾動
2. 中等螢幕（1400-1600px）：調整字體大小
3. 小螢幕（<1400px）：允許水平滾動

## 待辦事項

- [ ] 新增工時記錄編輯功能
- [ ] 新增工時記錄刪除功能
- [ ] 匯出 Excel 功能
- [ ] 工時統計報表
- [ ] 使用者權限管理

## 聯絡資訊

如有問題或建議，請聯繫系統管理員。

