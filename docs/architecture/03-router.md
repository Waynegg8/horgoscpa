# 路由配置 (src/router/index.js)

## 完整路由配置

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('@/views/clients/ClientsList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/add',
    name: 'ClientAdd',
    component: () => import('@/views/clients/ClientAdd.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clients/:id',
    name: 'ClientDetail',
    component: () => import('@/views/clients/ClientDetail.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'ClientInfo',
        component: () => import('@/views/clients/ClientBasicInfo.vue')
      },
      {
        path: 'services',
        name: 'ClientServices',
        component: () => import('@/views/clients/ClientServices.vue')
      },
      {
        path: 'billing',
        name: 'ClientBilling',
        component: () => import('@/views/clients/ClientBilling.vue')
      }
    ]
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/tasks/TasksList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/new',
    name: 'TasksNew',
    component: () => import('@/views/tasks/TasksNew.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/overview',
    name: 'TaskOverview',
    component: () => import('@/views/tasks/TaskOverview.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('@/views/tasks/TaskDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/timesheets',
    name: 'Timesheets',
    component: () => import('@/views/Timesheets.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/receipts',
    name: 'Receipts',
    component: () => import('@/views/receipts/ReceiptsList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/receipts/:id',
    name: 'ReceiptDetail',
    component: () => import('@/views/receipts/ReceiptDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/payroll',
    name: 'Payroll',
    component: () => import('@/views/payroll/PayrollLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: 'calc'
      },
      {
        path: 'calc',
        name: 'PayrollCalc',
        component: () => import('@/views/payroll/PayrollCalc.vue')
      },
      {
        path: 'items',
        name: 'PayrollItems',
        component: () => import('@/views/payroll/PayrollItems.vue')
      },
      {
        path: 'emp',
        name: 'PayrollEmp',
        component: () => import('@/views/payroll/PayrollEmp.vue')
      },
      {
        path: 'bonus',
        name: 'PayrollBonus',
        component: () => import('@/views/payroll/PayrollBonus.vue')
      },
      {
        path: 'yearend',
        name: 'PayrollYearend',
        component: () => import('@/views/payroll/PayrollYearend.vue')
      },
      {
        path: 'settings',
        name: 'PayrollSettings',
        component: () => import('@/views/payroll/PayrollSettings.vue')
      },
      {
        path: 'punch',
        name: 'PayrollPunch',
        component: () => import('@/views/payroll/PayrollPunch.vue')
      }
    ]
  },
  {
    path: '/leaves',
    name: 'Leaves',
    component: () => import('@/views/Leaves.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/costs',
    name: 'Costs',
    component: () => import('@/views/costs/CostsLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: 'items'
      },
      {
        path: 'items',
        name: 'CostItems',
        component: () => import('@/views/costs/CostItems.vue')
      },
      {
        path: 'employee',
        name: 'CostEmployee',
        component: () => import('@/views/costs/CostEmployee.vue')
      },
      {
        path: 'client',
        name: 'CostClient',
        component: () => import('@/views/costs/CostClient.vue')
      }
    ]
  },
  {
    path: '/trips',
    name: 'Trips',
    component: () => import('@/views/Trips.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/knowledge',
    name: 'Knowledge',
    component: () => import('@/views/knowledge/KnowledgeLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: 'sop'
      },
      {
        path: 'sop',
        name: 'KnowledgeSOP',
        component: () => import('@/views/knowledge/KnowledgeSOP.vue')
      },
      {
        path: 'faq',
        name: 'KnowledgeFAQ',
        component: () => import('@/views/knowledge/KnowledgeFAQ.vue')
      },
      {
        path: 'resources',
        name: 'KnowledgeResources',
        component: () => import('@/views/knowledge/KnowledgeResources.vue')
      },
      {
        path: 'attachments',
        name: 'KnowledgeAttachments',
        component: () => import('@/views/knowledge/KnowledgeAttachments.vue')
      }
    ]
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/settings/SettingsLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: 'services'
      },
      {
        path: 'services',
        name: 'SettingsServices',
        component: () => import('@/views/settings/SettingsServices.vue')
      },
      {
        path: 'templates',
        name: 'SettingsTemplates',
        component: () => import('@/views/settings/SettingsTemplates.vue')
      },
      {
        path: 'users',
        name: 'SettingsUsers',
        component: () => import('@/views/settings/SettingsUsers.vue')
      },
      {
        path: 'company',
        name: 'SettingsCompany',
        component: () => import('@/views/settings/SettingsCompany.vue')
      },
      {
        path: 'automation',
        name: 'SettingsAutomation',
        component: () => import('@/views/settings/SettingsAutomation.vue')
      },
      {
        path: 'holidays',
        name: 'SettingsHolidays',
        component: () => import('@/views/settings/SettingsHolidays.vue')
      }
    ]
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守衛
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 檢查是否需要認證
  if (to.meta.requiresAuth) {
    // 檢查是否已登入
    if (!authStore.isAuthenticated) {
      // 嘗試從 session 恢復登入狀態
      await authStore.checkSession()
      
      if (!authStore.isAuthenticated) {
        next({
          path: '/login',
          query: { redirect: to.fullPath }
        })
        return
      }
    }
    
    // 檢查是否需要管理員權限
    if (to.meta.requiresAdmin && !authStore.user?.isAdmin) {
      next({ path: '/dashboard' })
      return
    }
  }
  
  // 如果已登入且訪問登入頁，重定向到首頁
  if (to.path === '/login' && authStore.isAuthenticated) {
    next({ path: '/' })
    return
  }
  
  next()
})

export default router
```

## 路由結構說明

### 主要路由
1. **登入頁** (`/login`): 不需要認證
2. **儀表板** (`/dashboard`): 需要認證
3. **客戶管理** (`/clients`): 需要認證
   - 客戶列表
   - 新增客戶
   - 客戶詳情（含子路由：基本信息、服務、收費設定）
4. **任務管理** (`/tasks`): 需要認證
   - 任務列表
   - 新增任務
   - 任務總覽
   - 任務詳情
5. **工時管理** (`/timesheets`): 需要認證
6. **收據管理** (`/receipts`): 需要認證
   - 收據列表
   - 收據詳情
7. **薪資管理** (`/payroll`): 需要認證和管理員權限
   - 多個子路由（計算、項目、員工、獎金、年終、設定、打卡）
8. **假期管理** (`/leaves`): 需要認證
9. **成本管理** (`/costs`): 需要認證和管理員權限
   - 多個子路由（項目、員工、客戶）
10. **外出登記** (`/trips`): 需要認證
11. **知識庫** (`/knowledge`): 需要認證
    - 多個子路由（SOP、FAQ、資源、附件）
12. **系統設定** (`/settings`): 需要認證和管理員權限
    - 多個子路由（服務、模板、用戶、公司、自動化、假日）
13. **個人資料** (`/profile`): 需要認證

### 路由守衛
- **認證檢查**: 檢查 `meta.requiresAuth`
- **權限檢查**: 檢查 `meta.requiresAdmin`
- **自動重定向**: 已登入用戶訪問登入頁時重定向到首頁
- **Session 恢復**: 嘗試從 session 恢復登入狀態

### 注意事項
1. 使用 `createWebHistory` 創建 HTML5 歷史模式
2. 路由懶加載: 使用動態 import 實現代碼分割
3. 路由元信息: 使用 `meta` 字段存儲路由的額外信息
4. 嵌套路由: 客戶詳情、薪資管理、成本管理等使用嵌套路由

