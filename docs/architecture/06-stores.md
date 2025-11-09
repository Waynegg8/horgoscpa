# 統一的狀態管理 (src/stores/)

## Store 檔案結構

```
src/stores/
├── auth.js              # 認證狀態管理
├── clients.js           # 客戶狀態管理
├── tasks.js             # 任務狀態管理
├── dashboard.js         # 儀表板狀態管理
├── timesheets.js        # 工時狀態管理
├── receipts.js          # 收據狀態管理
├── payroll.js           # 薪資狀態管理
├── leaves.js            # 假期狀態管理
├── costs.js             # 成本狀態管理
├── trips.js             # 外出登記狀態管理
├── knowledge.js         # 知識庫狀態管理
└── settings.js          # 系統設定狀態管理
```

## 1. auth.js - 認證狀態管理

```javascript
import { defineStore } from 'pinia'
import { useAuthApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null
  }),
  
  getters: {
    isAdmin: (state) => state.user?.isAdmin || false,
    userId: (state) => state.user?.id || null,
    userName: (state) => state.user?.name || ''
  },
  
  actions: {
    // 登入
    async login(username, password) {
      this.loading = true
      this.error = null
      try {
        const response = await useAuthApi().login(username, password)
        if (response.ok) {
          this.user = response.data
          this.isAuthenticated = true
          return { ok: true }
        } else {
          this.error = response.message
          return { ok: false, message: response.message }
        }
      } catch (error) {
        this.error = error.message
        return { ok: false, message: error.message }
      } finally {
        this.loading = false
      }
    },
    
    // 登出
    async logout() {
      this.user = null
      this.isAuthenticated = false
      this.error = null
      // 可以調用 API 登出
    },
    
    // 檢查 Session
    async checkSession() {
      try {
        const response = await useAuthApi().checkSession()
        if (response && response.ok) {
          this.user = response.data
          this.isAuthenticated = true
          return true
        }
      } catch (error) {
        // 靜默處理錯誤
      }
      this.user = null
      this.isAuthenticated = false
      return false
    },
    
    // 清除錯誤
    clearError() {
      this.error = null
    }
  }
})
```

## 2. clients.js - 客戶狀態管理

```javascript
import { defineStore } from 'pinia'
import { useClientApi } from '@/api/clients'

export const useClientStore = defineStore('clients', {
  state: () => ({
    clients: [],
    currentClient: null,
    clientServices: [],
    billingSchedules: [],
    serviceComponents: [],
    allTags: [],
    allServices: [],
    allUsers: [],
    allSOPs: [],
    loading: false,
    error: null,
    pagination: {
      current: 1,
      pageSize: 50,
      total: 0
    },
    filters: {
      q: '',
      tag_id: null
    },
    selectedClientIds: []
  }),
  
  getters: {
    // 根據 ID 獲取客戶
    getClientById: (state) => (id) => {
      return state.clients.find(client => client.id === id)
    }
  },
  
  actions: {
    // 獲取客戶列表
    async fetchClients(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().fetchClients({
          page: this.pagination.current,
          perPage: this.pagination.pageSize,
          ...this.filters,
          ...params
        })
        this.clients = response.data
        this.pagination.total = response.meta?.total || 0
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取客戶詳情
    async fetchClientDetail(clientId) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().fetchClientDetail(clientId)
        this.currentClient = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建客戶
    async createClient(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().createClient(payload)
        // 可以選擇刷新列表
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新客戶
    async updateClient(clientId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().updateClient(clientId, data)
        if (this.currentClient?.id === clientId) {
          this.currentClient = { ...this.currentClient, ...data }
        }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 刪除客戶
    async deleteClient(clientId) {
      this.loading = true
      this.error = null
      try {
        const response = await useClientApi().deleteClient(clientId)
        this.clients = this.clients.filter(client => client.id !== clientId)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置篩選條件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },
    
    // 設置分頁
    setPagination(pagination) {
      this.pagination = { ...this.pagination, ...pagination }
    },
    
    // 設置選中的客戶
    setSelectedClientIds(ids) {
      this.selectedClientIds = ids
    },
    
    // 清除選中的客戶
    clearSelectedClientIds() {
      this.selectedClientIds = []
    }
  }
})
```

## 3. tasks.js - 任務狀態管理

```javascript
import { defineStore } from 'pinia'
import { useTaskApi } from '@/api/tasks'

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    currentTask: null,
    taskSOPs: [],
    taskDocuments: [],
    currentTaskId: null,
    loading: false,
    error: null,
    filters: {
      q: '',
      status: null,
      assignee: null,
      tags: null
    }
  }),
  
  getters: {
    // 根據 ID 獲取任務
    getTaskById: (state) => (id) => {
      return state.tasks.find(task => task.id === id)
    }
  },
  
  actions: {
    // 獲取任務列表
    async fetchTasks(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().fetchTasks({
          ...this.filters,
          ...params
        })
        this.tasks = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取任務詳情
    async fetchTaskDetail(taskId) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().fetchTaskDetail(taskId)
        this.currentTask = response.data
        this.currentTaskId = taskId
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建任務
    async createTask(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().createTask(payload)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新任務狀態
    async updateTaskStatus(taskId, data) {
      this.loading = true
      this.error = null
      try {
        const response = await useTaskApi().updateTaskStatus(taskId, data)
        if (this.currentTask?.id === taskId) {
          this.currentTask = { ...this.currentTask, ...data }
        }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置篩選條件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    }
  }
})
```

## 4. dashboard.js - 儀表板狀態管理

```javascript
import { defineStore } from 'pinia'
import { useDashboardApi } from '@/api/dashboard'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    dashboardData: null,
    currentYm: null,
    financeMode: 'month',
    financeYm: null,
    activityDays: 7,
    activityUserId: null,
    activityType: null,
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取儀表板數據
    async fetchDashboardData(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await useDashboardApi().fetchDashboardData({
          ym: this.currentYm,
          financeYm: this.financeYm,
          financeMode: this.financeMode,
          activity_days: this.activityDays,
          activity_user_id: this.activityUserId,
          activity_type: this.activityType,
          ...params
        })
        this.dashboardData = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置當前年月
    setCurrentYm(ym) {
      this.currentYm = ym
    },
    
    // 設置財務模式
    setFinanceMode(mode) {
      this.financeMode = mode
    },
    
    // 設置活動篩選
    setActivityFilters(filters) {
      this.activityDays = filters.days || this.activityDays
      this.activityUserId = filters.userId || this.activityUserId
      this.activityType = filters.type || this.activityType
    }
  }
})
```

## 5. timesheets.js - 工時狀態管理

```javascript
import { defineStore } from 'pinia'
import { useTimesheetApi } from '@/api/timesheets'

export const useTimesheetStore = defineStore('timesheets', {
  state: () => ({
    currentWeekStart: null,
    currentUser: null,
    isAdmin: false,
    clients: [],
    clientServices: new Map(),
    serviceItems: new Map(),
    holidays: new Map(),
    leaves: new Map(),
    timesheets: [],
    pendingChanges: new Map(),
    weeklySummary: null,
    monthlySummary: null,
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取客戶列表
    async fetchClients() {
      try {
        const response = await useTimesheetApi().fetchClients()
        this.clients = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取客戶服務
    async fetchClientServices(clientId) {
      try {
        const response = await useTimesheetApi().fetchClientServices(clientId)
        this.clientServices.set(clientId, response.data)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取服務項目
    async fetchServiceItems(clientId, serviceId) {
      const key = `${clientId}_${serviceId}`
      try {
        const response = await useTimesheetApi().fetchServiceItems(clientId, serviceId)
        this.serviceItems.set(key, response.data)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取工時記錄
    async fetchTimesheets(params) {
      this.loading = true
      this.error = null
      try {
        const response = await useTimesheetApi().fetchTimesheets(params)
        this.timesheets = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 保存工時記錄
    async saveTimesheets(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useTimesheetApi().saveTimesheets(payload)
        this.pendingChanges.clear()
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 添加待保存變更
    addPendingChange(key, change) {
      this.pendingChanges.set(key, change)
    },
    
    // 清除待保存變更
    clearPendingChanges() {
      this.pendingChanges.clear()
    }
  }
})
```

## 6. receipts.js - 收據狀態管理

```javascript
import { defineStore } from 'pinia'
import { useReceiptApi } from '@/api/receipts'

export const useReceiptStore = defineStore('receipts', {
  state: () => ({
    receipts: [],
    currentReceipt: null,
    reminders: [],
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取收據列表
    async fetchAllReceipts(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().fetchAllReceipts(params)
        this.receipts = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取收據詳情
    async fetchReceiptDetail(receiptId) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().fetchReceiptDetail(receiptId)
        this.currentReceipt = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建收據
    async createReceipt(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().createReceipt(payload)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 更新收據
    async updateReceipt(receiptId, payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useReceiptApi().updateReceipt(receiptId, payload)
        if (this.currentReceipt?.id === receiptId) {
          this.currentReceipt = { ...this.currentReceipt, ...payload }
        }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取收據提醒
    async fetchReceiptReminders() {
      try {
        const response = await useReceiptApi().fetchReceiptReminders()
        this.reminders = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    }
  }
})
```

## 7. payroll.js - 薪資狀態管理

```javascript
import { defineStore } from 'pinia'
import { usePayrollApi } from '@/api/payroll'

export const usePayrollStore = defineStore('payroll', {
  state: () => ({
    payrollPreview: new Map(),
    salaryItemTypes: [],
    employees: [],
    selectedEmployee: null,
    yearlyBonus: new Map(),
    yearEndBonus: new Map(),
    payrollSettings: null,
    punchRecords: [],
    selectedPunchRecord: null,
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取薪資預覽
    async loadPayrollPreview(month) {
      this.loading = true
      this.error = null
      try {
        const response = await usePayrollApi().loadPayrollPreview(month)
        this.payrollPreview.set(month, response.data)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 獲取薪資項目類型
    async loadSalaryItemTypes() {
      try {
        const response = await usePayrollApi().loadSalaryItemTypes()
        this.salaryItemTypes = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取員工列表
    async loadAllUsers() {
      try {
        const response = await usePayrollApi().loadAllUsers()
        this.employees = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取員工薪資
    async loadUserSalary(userId) {
      try {
        const response = await usePayrollApi().loadUserSalary(userId)
        this.selectedEmployee = { id: userId, salary: response.data }
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取系統設定
    async loadPayrollSettings() {
      try {
        const response = await usePayrollApi().loadPayrollSettings()
        this.payrollSettings = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    }
  }
})
```

## 8. leaves.js - 假期狀態管理

```javascript
import { defineStore } from 'pinia'
import { useLeavesApi } from '@/api/leaves'

export const useLeavesStore = defineStore('leaves', {
  state: () => ({
    balances: [],
    leaves: [],
    lifeEvents: [],
    filters: {
      year: null,
      month: null,
      type: null,
      userId: null
    },
    loading: false,
    error: null
  }),
  
  actions: {
    // 獲取假期餘額
    async getLeavesBalances(year, userId = null) {
      try {
        const response = await useLeavesApi().getLeavesBalances(year, userId)
        this.balances = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      }
    },
    
    // 獲取假期列表
    async getLeavesList(params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await useLeavesApi().getLeavesList({
          ...this.filters,
          ...params
        })
        this.leaves = response.data
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 創建假期
    async createLeave(payload) {
      this.loading = true
      this.error = null
      try {
        const response = await useLeavesApi().createLeave(payload)
        return response
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 設置篩選條件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    }
  }
})
```

## 使用範例

```javascript
// 在組件中使用
import { useAuthStore } from '@/stores/auth'
import { useClientStore } from '@/stores/clients'

export default {
  setup() {
    const authStore = useAuthStore()
    const clientStore = useClientStore()
    
    // 使用 state
    const isAuthenticated = computed(() => authStore.isAuthenticated)
    const clients = computed(() => clientStore.clients)
    
    // 使用 actions
    const loadClients = async () => {
      await clientStore.fetchClients()
    }
    
    return {
      isAuthenticated,
      clients,
      loadClients
    }
  }
}
```

## 注意事項

1. **狀態持久化**: 可以根據需要使用 `pinia-plugin-persistedstate` 插件持久化某些狀態
2. **錯誤處理**: 統一在 store actions 中處理錯誤
3. **加載狀態**: 每個 store 都應該有 `loading` 狀態來追蹤異步操作
4. **緩存管理**: 對於列表數據，可以使用 Map 或其他數據結構進行緩存
5. **狀態重置**: 在適當的時候重置狀態，避免狀態污染

