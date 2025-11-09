# 項目依賴配置 (package.json)

## 核心依賴

```json
{
  "dependencies": {
    "vue": "^3.3.4",
    "vue-router": "^4.2.5",
    "pinia": "^2.1.7",
    "ant-design-vue": "^4.0.0",
    "axios": "^1.6.2",
    "@ant-design/icons-vue": "^7.0.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.5.0",
    "vite": "^5.0.8",
    "typescript": "^5.3.3",
    "@types/node": "^20.10.5"
  }
}
```

## 依賴說明

### 核心框架
- **vue**: Vue 3 框架
- **vue-router**: Vue Router 4 用於路由管理
- **pinia**: Vue 3 推薦的狀態管理庫

### UI 框架
- **ant-design-vue**: Ant Design Vue 4.x 組件庫
- **@ant-design/icons-vue**: Ant Design Vue 圖標庫

### HTTP 請求
- **axios**: 用於 API 請求（推薦）或使用原生 fetch

### 開發工具
- **vite**: 構建工具
- **typescript**: TypeScript 支持（可選）

## 安裝命令

```bash
npm install
```

## 注意事項

1. **Ant Design Vue 版本**: 使用 4.x 版本，與 Vue 3 完全兼容
2. **Pinia**: 已取代 Vuex，是 Vue 3 官方推薦的狀態管理方案
3. **axios**: 可以根據項目需求選擇是否使用，也可以使用原生 fetch 封裝

