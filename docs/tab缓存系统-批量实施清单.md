# Tab 缓存系统 - 批量实施清单

## ✅ 已完成的页面

1. **knowledge.html** ✅
   - Tabs: SOP, FAQ, Resources
   - 实施方式：手动优化，添加 `forceRefreshTab()` 函数

2. **settings.html** ✅
   - Tabs: system, templates, users, clients, tasks, timesheets, leaves, receipts, payroll, costs, attachments, sop, lifecycle, cms, automation, holidays
   - 实施方式：使用 TabCache 系统

3. **costs.html** ✅
   - Tabs: items, employee, client
   - 实施方式：使用 TabCache 系统

## 🔄 待处理的页面

### 高优先级（有数据加载）

4. **cms.html**
   - Tabs: blog, faq, services, resources
   - 切换 tab 时会加载对应内容

5. **rules.html**
   - 需要检查是否有 tab 及数据加载

6. **payroll.html**
   - 需要检查是否有 tab 及数据加载

7. **receipts.html**
   - 需要检查是否有 tab 及数据加载

### 低优先级（仅显示/隐藏）

8. **reports.html**
   - Tabs: employee-hours, client-cost, payroll, receivables
   - 仅切换显示，数据通过查询按钮加载（不急需缓存）

9. **lifecycle.html**
   - 需要检查是否有真正的 tab 功能

10. **task-detail.html**
    - 详情页，可能有子 tab（低优先级）

11. **client-detail.html**
    - 详情页，可能有子 tab（低优先级）

## 🛠 实施步骤（标准流程）

### 1. 添加 tab-cache.js 到 <head>
```html
<head>
  ...
  <!-- ⚡ Tab 缓存系统 -->
  <script src="/assets/js/tab-cache.js"></script>
</head>
```

### 2. 初始化 TabCache
```javascript
let currentTab = 'defaultTab';
if (window.TabCache) {
  window.TabCache.init(['tab1', 'tab2', 'tab3']);
}
```

### 3. 修改 tab 切换逻辑
```javascript
// 原来的代码：
btn.addEventListener('click', () => {
  // ...切换显示...
  if (key === 'tab1') loadTab1Data();
});

// 修改为：
btn.addEventListener('click', () => {
  const key = btn.dataset.tab;
  const shouldLoad = window.TabCache ? 
    window.TabCache.shouldLoad(currentTab, key) : true;
  currentTab = key;
  
  // ...切换显示...
  
  if (shouldLoad) {
    if (key === 'tab1') loadTab1Data();
    if (window.TabCache) window.TabCache.markLoaded(key);
  }
});
```

## ⚡ 用户体验改进

### 修改前
```
点击 Tab1 → 加载数据（2秒）→ 显示
切换到 Tab2 → 加载数据（2秒）→ 显示
切回 Tab1 → ❌ 再次加载数据（2秒）→ 显示
```

### 修改后
```
点击 Tab1 → 加载数据（2秒）→ 显示
切换到 Tab2 → 加载数据（2秒）→ 显示
切回 Tab1 → ⚡ 瞬间显示（<10ms，使用缓存）
```

### 额外特性
- **点击当前 tab**: 自动强制刷新
- **明确日志**: 控制台显示 `[TabCache] ⚡ 使用缓存` 或 `🔄 强制刷新`

## 📊 优先处理顺序

1. ✅ knowledge.html - 完成
2. ✅ settings.html - 完成（最多 tab）
3. ✅ costs.html - 完成
4. ⏳ cms.html - 进行中
5. ⏳ rules.html
6. ⏳ payroll.html
7. ⏳ receipts.html
8. 📋 reports.html（低优先级）
9. 📋 其他详情页（低优先级）

## 🎯 目标

**让所有内部页面的 tab 切换都实现"秒开"体验，无需每次重新加载数据。**


