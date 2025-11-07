# 服務項目綁定 SOP 緩存問題修復測試

## 問題描述
在設置頁面儲存服務項目並綁定SOP時，點擊儲存成功但未看到有成功綁定，原因是前端緩存問題。

## 問題根本原因

### 1. 前端緩存系統
系統使用了兩個緩存模塊：
- `assets/js/data-cache.js` - 數據緩存系統
- `assets/js/fetch-interceptor.js` - Fetch 攔截器

### 2. 緩存機制
- `/services` API 端點被緩存為 `services_types`
- 緩存有效期：1小時
- 所有 GET 請求會被 fetch 攔截器攔截，優先返回緩存數據

### 3. 問題流程
1. 用戶編輯服務項目，綁定 SOP
2. 前端發送 PUT 請求，成功保存到數據庫
3. 前端調用 `loadServices()` 重新加載列表
4. **問題：** fetch 被攔截器攔截，返回的是緩存的舊數據
5. 結果：頁面顯示的仍是未綁定 SOP 的舊數據

## 修復方案

### 1. settings.html 修復項目

#### a) saveService() - 保存服務後清除緩存
```javascript
// ⚡ 清除服務列表緩存，確保獲取最新數據
if (window.DataCache) {
    window.DataCache.clearCache('services_types');
    window.DataCache.clearCache('services');
    console.log('[Settings] 已清除服務列表緩存');
}

// 重新加載服務列表
await loadServices();

// ⚡ 如果 allServices 已被初始化（用戶訪問過任務模板標籤），也更新它
if (allServices && allServices.length > 0) {
    const timestamp = Date.now();
    const res = await fetch(`/internal/api/v1/services?_t=${timestamp}`, { 
        credentials: 'include',
        cache: 'no-cache'
    });
    const json = await res.json();
    if (json.ok && json.data) {
        allServices = json.data;
        console.log('[Settings] 已更新全局服務列表');
    }
}
```

#### b) deleteService() - 刪除服務後清除緩存
```javascript
// ⚡ 清除服務列表緩存，確保獲取最新數據
if (window.DataCache) {
    window.DataCache.clearCache('services_types');
    window.DataCache.clearCache('services');
    console.log('[Settings] 已清除服務列表緩存');
}
```

#### c) loadServices() - 加載時繞過緩存
```javascript
// ⚡ 添加時間戳參數繞過緩存，確保獲取最新數據
const timestamp = Date.now();
const res = await fetch(`/internal/api/v1/services?_t=${timestamp}`, { 
    credentials: 'include',
    cache: 'no-cache' // 禁用瀏覽器緩存
});
```

#### d) editService() - 編輯時繞過緩存
```javascript
// ⚡ 添加時間戳參數確保獲取最新數據
const timestamp = Date.now();
const res = await fetch(`/internal/api/v1/services/${serviceId}?_t=${timestamp}`, { 
    credentials: 'include',
    cache: 'no-cache'
});
```

#### e) loadTemplateOptions() - 任務模板加載服務時繞過緩存
```javascript
// ⚡ 添加時間戳參數繞過緩存，確保獲取最新數據
const timestamp = Date.now();
const [servicesRes, clientsRes, sopRes, attachmentRes] = await Promise.all([
    fetch(`/internal/api/v1/services?_t=${timestamp}`, { 
        credentials: 'include',
        cache: 'no-cache'
    }),
    // ... 其他請求
]);
```

### 2. client-detail.html 修復項目

#### loadServices() - 客戶詳情頁加載服務時繞過緩存
```javascript
// ⚡ 添加時間戳參數繞過緩存，確保獲取最新數據
const timestamp = Date.now();
const res = await fetch(`/internal/api/v1/services?_t=${timestamp}`, {
    credentials: 'include',
    cache: 'no-cache'
});
```

## 測試步驟

### 測試 1：基本綁定測試
1. 登入系統，進入「系統設定」→「服務項目」標籤
2. 點擊「新增」或編輯現有服務項目
3. 填寫服務名稱（例如：記帳服務）
4. 在「服務層級 SOP」下拉選單中選擇一個 SOP（例如：記帳流程）
5. 點擊「儲存」
6. **預期結果：** 
   - 顯示「更新成功」或「新增成功」提示
   - 服務列表中該服務的「服務層級 SOP」列顯示 `📖 SOP #X`（X 為 SOP ID）
   - **不應顯示** `-` 符號

### 測試 2：清除 SOP 綁定測試
1. 編輯已綁定 SOP 的服務項目
2. 將「服務層級 SOP」下拉選單改為「無」
3. 點擊「儲存」
4. **預期結果：** 
   - 服務列表中該服務的「服務層級 SOP」列顯示 `-`

### 測試 3：跨標籤頁一致性測試
1. 在「服務項目」標籤更新某個服務，綁定 SOP
2. 切換到「任務模板」標籤
3. 點擊「新增模板」
4. 在「服務項目」下拉選單中選擇剛才更新的服務
5. **預期結果：** 
   - 應顯示「服務層級 SOP（自動繼承自服務項目）」區塊
   - 顯示剛才綁定的 SOP 信息

### 測試 4：客戶詳情頁測試
1. 進入任意客戶詳情頁
2. 在「服務組成部分」區塊中新增或編輯服務
3. **預期結果：** 
   - 服務下拉選單應顯示最新的服務列表
   - 包含剛才在設置頁面新增或更新的服務

### 測試 5：瀏覽器控制台驗證
1. 打開瀏覽器開發者工具（F12）→ Console 標籤
2. 執行上述任何測試
3. **預期結果：** 
   - 應看到類似以下的日誌：
     ```
     [Settings] 已清除服務列表緩存
     服務項目API響應: {ok: true, code: "SUCCESS", message: "查询成功", data: Array(5), meta: {...}}
     ```
   - **不應看到：** `[FetchInterceptor] ✓ 使用緩存: services_types`

## 技術細節

### 緩存清除策略
- **localStorage 緩存：** 使用 `DataCache.clearCache()` 清除
- **Fetch 攔截器緩存：** 使用時間戳參數 `?_t=${timestamp}` 繞過
- **瀏覽器 HTTP 緩存：** 使用 `cache: 'no-cache'` 選項禁用

### 時間戳參數
- 格式：`?_t=1699999999999`
- 用途：使每次請求的 URL 唯一，繞過所有緩存層
- 優點：不影響後端 API，後端會自動忽略未知參數

### 雙重保障
1. **主動清除：** 在保存/刪除後主動清除 localStorage 緩存
2. **被動繞過：** 在加載時使用時間戳參數繞過所有緩存

## 已修復的文件
- ✅ `settings.html` - 服務項目管理頁面
- ✅ `client-detail.html` - 客戶詳情頁面

## 未來優化建議

### 1. 後端 API 緩存清除
可以在 `cloudflare/worker-router/src/api/services.js` 中添加緩存清除邏輯：

```javascript
// PUT /internal/api/v1/services/:id - 更新服務項目
// ... 更新數據庫後 ...

// ⚡ 清除相關緩存
await invalidateCacheByType(env, 'services_list');
await invalidateCacheByType(env, 'services_detail', { filters: { serviceId } });
```

### 2. 統一緩存管理
創建一個統一的緩存管理模塊，在數據變更時自動清除相關緩存：

```javascript
// cache-invalidation.js
const CACHE_DEPENDENCIES = {
  'services': ['services_types', 'services', 'services_list'],
  'tasks': ['tasks_all', 'tasks_pending', 'tasks_in_progress'],
  // ...
};

function invalidateRelated(key) {
  const related = CACHE_DEPENDENCIES[key] || [];
  related.forEach(k => DataCache.clearCache(k));
}
```

### 3. 版本化緩存
使用版本號而不是時間戳，當數據更新時遞增版本號：

```javascript
let servicesVersion = 1;

// 保存後
servicesVersion++;

// 加載時
fetch(`/internal/api/v1/services?v=${servicesVersion}`)
```

## 驗證完成
- ✅ 語法檢查通過（無 linter 錯誤）
- ✅ 邏輯流程正確
- ✅ 緩存清除機制完整
- ✅ 跨頁面一致性保證

## 提交建議
建議提交訊息：
```
fix: 修復服務項目綁定SOP後顯示舊數據的緩存問題

- 在 saveService() 和 deleteService() 中添加緩存清除邏輯
- 在 loadServices()、editService()、loadTemplateOptions() 中使用時間戳繞過緩存
- 修復 client-detail.html 中的相同問題
- 確保跨標籤頁數據一致性

問題原因：前端緩存系統（data-cache.js + fetch-interceptor.js）
會緩存 /services API 響應1小時，導致保存後仍顯示舊數據

修復方案：雙重保障
1. 主動清除 localStorage 緩存
2. 使用時間戳參數繞過 fetch 攔截器緩存
```

