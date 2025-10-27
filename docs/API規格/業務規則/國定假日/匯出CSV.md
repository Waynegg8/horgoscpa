# 匯出 CSV

**端點：** `GET /api/v1/settings/holidays/export`  
**權限：** 管理員  
**最後更新：** 2025年10月27日

---

## 概述

匯出所有國定假日為 CSV 檔案，方便備份或編輯後重新導入。

---

## 請求

### 查詢參數

- `year` (可選, string): 篩選年份，格式 `YYYY`

---

## 回應

### 成功回應（HTTP 200）

**Content-Type:** `text/csv; charset=utf-8`  
**Content-Disposition:** `attachment; filename="holidays_2025.csv"`

```csv
日期,名稱,類型,說明
2025-01-01,中華民國開國紀念日,national_holiday,元旦
2025-01-26,補班日,makeup_workday,補1/27調整放假
2025-01-27,農曆除夕前一日,national_holiday,調整放假
2025-01-28,農曆除夕,national_holiday,春節
2025-01-29,春節,national_holiday,農曆正月初一
2025-01-30,春節,national_holiday,農曆正月初二
```

---

### CSV 格式說明

**欄位順序：**
1. 日期（YYYY-MM-DD）
2. 名稱
3. 類型（national_holiday 或 makeup_workday）
4. 說明

**編碼：** UTF-8 with BOM（確保 Excel 正確顯示中文）

---

## 使用範例

### 範例 1：匯出所有國定假日

**請求：**
```bash
GET /api/v1/settings/holidays/export
```

**回應：**
- 下載檔案：`holidays_all.csv`
- 包含所有年份的國定假日

---

### 範例 2：匯出 2025 年國定假日

**請求：**
```bash
GET /api/v1/settings/holidays/export?year=2025
```

**回應：**
- 下載檔案：`holidays_2025.csv`
- 只包含 2025 年的國定假日

---

## 前端實作範例

```typescript
async function exportHolidays(year?: string) {
  const url = year 
    ? `/api/v1/settings/holidays/export?year=${year}`
    : '/api/v1/settings/holidays/export';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const blob = await response.blob();
  const filename = response.headers.get('Content-Disposition')
    ?.match(/filename="(.+)"/)?.[1] || 'holidays.csv';
  
  // 觸發下載
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
```

---

## 後端實作參考

```typescript
async function exportHolidaysCSV(year?: string) {
  // 1. 查詢資料
  const holidays = await db.all(`
    SELECT date, name, holiday_type, description
    FROM Holidays
    WHERE is_active = TRUE
      AND (? IS NULL OR substr(date, 1, 4) = ?)
    ORDER BY date
  `, [year, year]);
  
  // 2. 轉換為 CSV
  const header = '日期,名稱,類型,說明\n';
  const rows = holidays.map(h => 
    `${h.date},${h.name},${h.holiday_type},${h.description || ''}`
  ).join('\n');
  
  // 3. 加上 BOM（Excel 正確顯示中文）
  const BOM = '\uFEFF';
  const csv = BOM + header + rows;
  
  return {
    content: csv,
    filename: year ? `holidays_${year}.csv` : 'holidays_all.csv'
  };
}
```

---

## 相關端點

- [批量導入](./批量導入.md)
- [獲取國定假日列表](./獲取國定假日列表.md)
- [API 概覽](./_概覽.md)

---

**最後更新：** 2025年10月27日



**端點：** `GET /api/v1/settings/holidays/export`  
**權限：** 管理員  
**最後更新：** 2025年10月27日

---

## 概述

匯出所有國定假日為 CSV 檔案，方便備份或編輯後重新導入。

---

## 請求

### 查詢參數

- `year` (可選, string): 篩選年份，格式 `YYYY`

---

## 回應

### 成功回應（HTTP 200）

**Content-Type:** `text/csv; charset=utf-8`  
**Content-Disposition:** `attachment; filename="holidays_2025.csv"`

```csv
日期,名稱,類型,說明
2025-01-01,中華民國開國紀念日,national_holiday,元旦
2025-01-26,補班日,makeup_workday,補1/27調整放假
2025-01-27,農曆除夕前一日,national_holiday,調整放假
2025-01-28,農曆除夕,national_holiday,春節
2025-01-29,春節,national_holiday,農曆正月初一
2025-01-30,春節,national_holiday,農曆正月初二
```

---

### CSV 格式說明

**欄位順序：**
1. 日期（YYYY-MM-DD）
2. 名稱
3. 類型（national_holiday 或 makeup_workday）
4. 說明

**編碼：** UTF-8 with BOM（確保 Excel 正確顯示中文）

---

## 使用範例

### 範例 1：匯出所有國定假日

**請求：**
```bash
GET /api/v1/settings/holidays/export
```

**回應：**
- 下載檔案：`holidays_all.csv`
- 包含所有年份的國定假日

---

### 範例 2：匯出 2025 年國定假日

**請求：**
```bash
GET /api/v1/settings/holidays/export?year=2025
```

**回應：**
- 下載檔案：`holidays_2025.csv`
- 只包含 2025 年的國定假日

---

## 前端實作範例

```typescript
async function exportHolidays(year?: string) {
  const url = year 
    ? `/api/v1/settings/holidays/export?year=${year}`
    : '/api/v1/settings/holidays/export';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const blob = await response.blob();
  const filename = response.headers.get('Content-Disposition')
    ?.match(/filename="(.+)"/)?.[1] || 'holidays.csv';
  
  // 觸發下載
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
```

---

## 後端實作參考

```typescript
async function exportHolidaysCSV(year?: string) {
  // 1. 查詢資料
  const holidays = await db.all(`
    SELECT date, name, holiday_type, description
    FROM Holidays
    WHERE is_active = TRUE
      AND (? IS NULL OR substr(date, 1, 4) = ?)
    ORDER BY date
  `, [year, year]);
  
  // 2. 轉換為 CSV
  const header = '日期,名稱,類型,說明\n';
  const rows = holidays.map(h => 
    `${h.date},${h.name},${h.holiday_type},${h.description || ''}`
  ).join('\n');
  
  // 3. 加上 BOM（Excel 正確顯示中文）
  const BOM = '\uFEFF';
  const csv = BOM + header + rows;
  
  return {
    content: csv,
    filename: year ? `holidays_${year}.csv` : 'holidays_all.csv'
  };
}
```

---

## 相關端點

- [批量導入](./批量導入.md)
- [獲取國定假日列表](./獲取國定假日列表.md)
- [API 概覽](./_概覽.md)

---

**最後更新：** 2025年10月27日



