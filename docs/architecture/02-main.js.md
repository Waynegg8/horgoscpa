# 項目入口 (src/main.js)

## 完整代碼

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router from './router'
import './assets/css/common.css' // 全局樣式

const app = createApp(App)
const pinia = createPinia()

// 使用 Pinia
app.use(pinia)

// 使用 Vue Router
app.use(router)

// 使用 Ant Design Vue
app.use(Antd)

// 全局配置
app.config.globalProperties.$message = Antd.message
app.config.globalProperties.$notification = Antd.notification
app.config.globalProperties.$modal = Antd.Modal

app.mount('#app')
```

## 說明

### 初始化順序
1. **創建 Vue 應用實例**: `createApp(App)`
2. **創建 Pinia 實例**: `createPinia()`
3. **註冊 Pinia**: `app.use(pinia)` - 必須在 Router 之前
4. **註冊 Vue Router**: `app.use(router)`
5. **註冊 Ant Design Vue**: `app.use(Antd)`
6. **掛載應用**: `app.mount('#app')`

### 全局配置
- **Ant Design Vue 樣式**: 引入重置樣式 `ant-design-vue/dist/reset.css`
- **全局樣式**: 引入項目自定義全局樣式
- **全局屬性**: 可選，配置全局 message、notification、modal 實例

### 注意事項
1. Pinia 必須在 Router 之前註冊
2. 如果需要使用 TypeScript，將檔案命名為 `main.ts`
3. 全局樣式檔案需要根據項目實際路徑調整

