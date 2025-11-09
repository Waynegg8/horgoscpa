# 統一的工具庫 (src/utils/)

## 工具檔案結構

```
src/utils/
├── formatters.js          # 數據格式化工具
├── date.js                # 日期處理工具
├── validation.js          # 表單驗證工具
├── api.js                 # API 工具函數
├── url.js                 # URL 處理工具
├── leaveCalculator.js     # 請假計算工具
├── subsidyCalculator.js   # 交通補貼計算工具
├── payrollUtils.js        # 薪資計算工具
└── constants.js           # 常量定義
```

## 1. formatters.js - 數據格式化工具

**注意**: 此檔案包含所有數據格式化相關的工具函數。如需使用日期相關的格式化函數，請從 `date.js` 導入。

```javascript
// 導入日期相關函數（如果需要）
// import { formatDate, calculateOverdueDays } from './date'
// 格式化貨幣（台幣）
export function formatCurrency(amount) {
  if (amount == null) return '0'
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// 別名：fmtTwd（用於向後兼容）
export const fmtTwd = formatCurrency

// 格式化數字
export function formatNumber(n) {
  if (n == null) return '0'
  return new Intl.NumberFormat('zh-TW').format(n)
}

// 別名：fmtNum（用於向後兼容）
export const fmtNum = formatNumber

// 格式化百分比
export function formatPercentage(n) {
  if (n == null) return '0%'
  return `${(n * 100).toFixed(1)}%`
}

// 別名：fmtPct, formatPercent（用於向後兼容）
export const fmtPct = formatPercentage
export const formatPercent = formatPercentage

// 格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 格式化日期時間
export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// 格式化日期時間（用於歷史記錄等場景）
export function formatDateTimeForHistory(dt) {
  if (!dt) return ''
  const date = new Date(dt)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

// 格式化日期
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

// 格式化日期顯示（用於工時表等場景）
export function formatDateDisplay(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('zh-TW', {
    month: '2-digit',
    day: '2-digit'
  })
}

// 格式化客戶標籤
export function formatClientTags(tags) {
  if (!tags || !Array.isArray(tags)) return []
  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color || 'blue'
  }))
}

// 格式化收據狀態
export function formatReceiptStatus(status, dueDate) {
  const statusMap = {
    'draft': '草稿',
    'issued': '已開立',
    'paid': '已收款',
    'overdue': '逾期',
    'cancelled': '已作廢'
  }
  
  if (status === 'issued' && dueDate) {
    // 導入 calculateOverdueDays（需要在文件頂部導入）
    // import { calculateOverdueDays } from './date'
    const days = calculateOverdueDays(dueDate)
    if (days > 0) {
      return `逾期 ${days} 天`
    }
  }
  
  return statusMap[status] || status
}

// 格式化收據類型
export function formatReceiptType(type) {
  const typeMap = {
    'invoice': '請款單',
    'receipt': '收據'
  }
  return typeMap[type] || type
}

// 格式化收款方式
export function formatPaymentMethod(method) {
  const methodMap = {
    'cash': '現金',
    'transfer': '轉帳',
    'check': '支票'
  }
  return methodMap[method] || method
}

// 將分（cents）轉換為台幣顯示格式
export function centsToTwd(cents) {
  return formatCurrency(cents / 100)
}

// 獲取知識庫分類文字
export function getCategoryText(category) {
  const categoryMap = {
    'sop': 'SOP',
    'faq': 'FAQ',
    'resource': '資源',
    'attachment': '附件',
    'document': '文檔'
  }
  return categoryMap[category] || category
}

// 獲取任務狀態的中文描述
export function getTaskStatusText(status) {
  const statusMap = {
    'pending': '待處理',
    'in_progress': '進行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'blocked': '受阻礙'
  }
  return statusMap[status] || status
}

// 獲取任務來源的中文描述
export function getTaskSourceText(source) {
  const sourceMap = {
    'manual': '手動創建',
    'template': '模板生成',
    'automation': '自動生成'
  }
  return sourceMap[source] || source
}

// 獲取任務到期狀態的中文描述
export function getTaskDueDateStatusText(status) {
  const statusMap = {
    'on_time': '準時',
    'overdue': '逾期',
    'upcoming': '即將到期'
  }
  return statusMap[status] || status
}
```

## 2. date.js - 日期處理工具

```javascript
// 格式化本地日期
export function formatLocalDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('zh-TW')
}

// 格式化年月（YYYY-MM）
export function formatYm(ym) {
  if (!ym) return ''
  return ym
}

// 獲取當前年月（YYYY-MM）
export function getCurrentYm() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// 月份加減
export function addMonth(ym, delta) {
  const [year, month] = ym.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  const newYear = date.getFullYear()
  const newMonth = String(date.getMonth() + 1).padStart(2, '0')
  return `${newYear}-${newMonth}`
}

// 獲取週一日期
export function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 調整到週一
  return new Date(d.setDate(diff))
}

// 格式化週範圍
export function formatWeekRange(monday) {
  if (!monday) return ''
  const mondayDate = monday instanceof Date ? monday : new Date(monday)
  const sunday = new Date(mondayDate)
  sunday.setDate(mondayDate.getDate() + 6)
  // 導入 formatDate 函數（需要在文件頂部導入）
  // import { formatDate } from './formatters'
  return `${formatDate(mondayDate)} - ${formatDate(sunday)}`
}

// 判定日期類型（工作日、休息日、假日）
export function getDateType(dateStr, holidays) {
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  const isoDate = dateStr.split('T')[0]
  
  if (holidays && holidays.has(isoDate)) {
    return 'holiday'
  }
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'weekend'
  }
  
  return 'workday'
}

// 建立週日期模型
export function buildWeekDays(currentWeekStart, holidays) {
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart)
    date.setDate(currentWeekStart.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    weekDays.push({
      date: dateStr,
      dayOfWeek: date.getDay(),
      type: getDateType(dateStr, holidays),
      label: date.toLocaleDateString('zh-TW', { weekday: 'short' })
    })
  }
  return weekDays
}

// 計算逾期天數
export function calculateOverdueDays(dueDate) {
  if (!dueDate) return 0
  const due = new Date(dueDate)
  const now = new Date()
  // 設置為當天的 00:00:00，只比較日期
  now.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diffTime = now - due
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

// 格式化月份為民國年月格式（用於薪資等場景）
export function formatMonth(month) {
  if (!month) return ''
  // 如果已經是 YYYY-MM 格式，轉換為民國年月
  if (typeof month === 'string' && month.includes('-')) {
    const [year, monthNum] = month.split('-')
    const rocYear = parseInt(year) - 1911
    return `${rocYear}年${parseInt(monthNum)}月`
  }
  return month
}
```

## 3. validation.js - 表單驗證工具

```javascript
// 客戶編號驗證（8位數字）
export function validateClientId(clientId) {
  return /^\d{8}$/.test(clientId)
}

// 統一編號驗證（台灣統編）
export function validateTaxId(taxId) {
  // 台灣統一編號驗證邏輯
  // 實現邏輯...
}

// 郵箱驗證
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 帳號格式驗證（英文字母、數字和底線）
export function validateUsername(username) {
  return /^[a-zA-Z0-9_]+$/.test(username)
}

// 密碼強度驗證
export function validatePassword(password) {
  return password.length >= 6
}

// 表單驗證規則生成器
export function createRules(rules) {
  return rules
}

// Ant Design Vue 表單驗證規則
export const clientFormRules = {
  company_name: [
    { required: true, message: '請輸入公司名稱', trigger: 'blur' }
  ],
  tax_id: [
    { required: true, message: '請輸入統一編號', trigger: 'blur' },
    { validator: validateTaxId, trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '請輸入有效的郵箱地址', trigger: 'blur' }
  ]
}

export const passwordFormRules = {
  current_password: [
    { required: true, message: '請輸入目前密碼', trigger: 'blur' }
  ],
  new_password: [
    { required: true, message: '請輸入新密碼', trigger: 'blur' },
    { min: 6, message: '密碼長度至少 6 個字元', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: '請確認新密碼', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        // 驗證新密碼與確認密碼一致
        // 實現邏輯...
      },
      trigger: 'blur'
    }
  ]
}
```

## 4. api.js - API 工具函數

```javascript
// 獲取 API 基礎路徑
export function getApiBase() {
  const onProdHost = window.location.hostname.endsWith('horgoscpa.com')
  return onProdHost ? '/internal/api/v1' : 'https://www.horgoscpa.com/internal/api/v1'
}

// 構建 API URL
export function buildApiUrl(endpoint) {
  const base = getApiBase()
  return `${base}${endpoint}`
}

// 統一錯誤處理
export function handleApiError(error) {
  if (error.response) {
    // 服務器響應錯誤
    return {
      status: error.response.status,
      message: error.response.data?.message || '請求失敗',
      data: error.response.data
    }
  } else if (error.request) {
    // 請求發送但無響應
    return {
      status: 0,
      message: '網絡錯誤，請檢查網絡連接',
      data: null
    }
  } else {
    // 其他錯誤
    return {
      status: -1,
      message: error.message || '未知錯誤',
      data: null
    }
  }
}
```

## 5. url.js - URL 處理工具

```javascript
// 獲取重定向目標（從 URL 參數）
export function getRedirectTarget() {
  const urlParams = new URLSearchParams(window.location.search)
  const redirect = urlParams.get('redirect')
  
  if (!redirect) return null
  
  // 驗證重定向路徑的安全性（防止開放重定向攻擊）
  if (redirect.startsWith('/') || redirect.startsWith(window.location.origin)) {
    return redirect
  }
  
  return null
}

// 構建 URL 參數
export function buildQueryString(params) {
  const query = new URLSearchParams()
  Object.keys(params).forEach(key => {
    if (params[key] != null) {
      query.append(key, params[key])
    }
  })
  return query.toString()
}

// 解析 URL 參數
export function parseQueryString(queryString) {
  const params = {}
  const query = new URLSearchParams(queryString)
  query.forEach((value, key) => {
    params[key] = value
  })
  return params
}
```

## 6. leaveCalculator.js - 請假計算工具

```javascript
// 計算請假時數（扣除午休）
export function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  
  const start = parseTime(startTime)
  const end = parseTime(endTime)
  
  let hours = (end - start) / (1000 * 60 * 60)
  
  // 扣除午休時間（12:00 - 13:00）
  if (start < parseTime('13:00') && end > parseTime('12:00')) {
    hours -= 1
  }
  
  return Math.max(0, hours)
}

// 解析時間字符串（HH:mm）
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

// 生成時間選項
export function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      options.push({
        label: timeStr,
        value: timeStr
      })
    }
  }
  return options
}
```

## 7. subsidyCalculator.js - 交通補貼計算工具

```javascript
// 計算交通補貼（每 5 公里 60 元，向上取整）
export function calculateSubsidy(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return 0
  const intervals = Math.ceil(distanceKm / 5)
  return intervals * 60
}
```

## 8. payrollUtils.js - 薪資計算工具

```javascript
// 自動生成薪資項目代碼
export function generateItemCode() {
  // 實現邏輯...
}

// 獲取薪資項目類別標籤
export function getCategoryLabel(category) {
  const categoryMap = {
    'allowance': '加給',
    'subsidy': '津貼',
    'bonus': '獎金',
    'deduction': '扣款'
  }
  return categoryMap[category] || category
}

// 計算時薪
export function calculateHourlyRate(baseSalaryCents, divisor) {
  if (!baseSalaryCents || !divisor) return 0
  return baseSalaryCents / divisor
}

// 格式化薪資詳情數據
export function formatPayrollDetail(data) {
  if (!data) return null
  // 需要導入 formatCurrency（需要在文件頂部導入）
  // import { formatCurrency } from '../formatters'
  return {
    ...data,
    baseSalary: formatCurrency(data.baseSalaryCents / 100),
    totalEarnings: formatCurrency(data.totalEarningsCents / 100),
    totalDeductions: formatCurrency(data.totalDeductionsCents / 100),
    netSalary: formatCurrency(data.netSalaryCents / 100),
    items: (data.items || []).map(item => ({
      ...item,
      amount: formatCurrency(item.amountCents / 100)
    }))
  }
}

// 注意：formatMonth() 函數已移至 date.js，請從 date.js 導入使用
```

## 9. constants.js - 常量定義

```javascript
// 假別翻譯
export const LEAVE_TYPES = {
  'annual': '特休',
  'sick': '病假',
  'personal': '事假',
  'compensatory': '補休',
  'marriage': '婚假',
  'maternity': '產假',
  'paternity': '陪產假',
  'funeral': '喪假'
}

// 狀態翻譯
export const LEAVE_STATUS = {
  'pending': '待審核',
  'approved': '已核准',
  'rejected': '已拒絕'
}

// 事件類型翻譯
export const EVENT_TYPES = {
  'birth': '生育',
  'marriage': '結婚',
  'death': '死亡'
}

// 任務狀態
export const TASK_STATUS = {
  'pending': '待處理',
  'in_progress': '進行中',
  'completed': '已完成',
  'cancelled': '已取消'
}

// 收據狀態
export const RECEIPT_STATUS = {
  'draft': '草稿',
  'issued': '已開立',
  'paid': '已收款',
  'overdue': '逾期',
  'cancelled': '已作廢'
}

// 收據類型
export const RECEIPT_TYPE = {
  'invoice': '請款單',
  'receipt': '收據'
}

// 收款方式
export const PAYMENT_METHOD = {
  'cash': '現金',
  'transfer': '轉帳',
  'check': '支票'
}

// 工時類型
export const WORK_TYPES = {
  'normal': '一般',
  'overtime_before_2h': '平日OT前2h',
  'overtime_after_2h': '平日OT後2h',
  'weekend_overtime_before_2h': '休息日前2h',
  'weekend_overtime_after_2h': '休息日後2h'
}
```

## 使用範例

```javascript
// 在組件中使用
import { formatCurrency, formatDate } from '@/utils/formatters'
import { calculateHours } from '@/utils/leaveCalculator'
import { LEAVE_TYPES } from '@/utils/constants'

// 格式化貨幣
const amount = formatCurrency(1000) // "NT$1,000"

// 格式化日期
const date = formatDate('2024-01-01') // "2024/01/01"

// 計算請假時數
const hours = calculateHours('09:00', '18:00') // 8

// 使用常量
const leaveTypeLabel = LEAVE_TYPES['annual'] // "特休"
```

