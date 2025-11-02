# localStorage 容量管理

## 📊 容量分析

### 浏览器限制

| 浏览器 | localStorage 限制 |
|--------|-------------------|
| Chrome/Edge | ~10MB |
| Firefox | ~10MB |
| Safari | ~5MB |
| **保守估计** | **5MB** |

---

## 💾 我们的使用情况

### 实际存储内容

#### 1. 数据缓存（DataCache）
**前缀**：`horgos_cache_`

| 类型 | 数量 | 单项大小 | 总计 |
|------|------|----------|------|
| P0（核心） | 3项 | 5-20KB | 15-60KB |
| P1（首屏） | 4项 | 5-30KB | 20-120KB |
| P2（补充） | 5项 | 10-50KB | 50-250KB |
| P3（完整） | 31项 | 2-50KB | 62-1550KB |
| **总计** | **43项** | - | **~1-2MB** |

#### 2. HTML 预渲染（Prerender）
**前缀**：`horgos_prerender_`

| 页面 | HTML 大小 | 说明 |
|------|-----------|------|
| Dashboard | 20-50KB | 包含大量动态数据 |
| Timesheets | 10-30KB | 工时表首屏 |
| Tasks | 10-30KB | 任务列表 |
| Clients | 10-30KB | 客户列表 |
| Receipts | 10-30KB | 收据列表 |
| Leaves | 10-30KB | 假期列表 |
| **总计** | **~70-200KB** | 6个主要页面 |

### 总使用量

```
数据缓存：1-2MB（约 20-40%）
HTML 预渲染：70-200KB（约 1-4%）
其他数据：<100KB（约 <2%）
─────────────────────────
总计：1-2.5MB（约 25-50%）
```

**结论**：✅ **容量充足，完全够用！**

---

## 🛠 容量管理机制

### 1. 自动检查
系统启动时自动检查容量：

```javascript
// 自动执行
window.Prerender.checkCapacity();
```

输出示例：
```
[Prerender] 📊 localStorage 使用情况:
  - 总计: 1567KB / 5120KB (30%)
  - 数据缓存: 1234KB
  - HTML 预渲染: 156KB
  - 其他: 177KB
[Prerender] ✓ localStorage 容量充足
```

### 2. 自动清理
当容量不足时（保存失败），自动清理：

1. 删除最旧的 50% 预渲染
2. 重新尝试保存
3. 如果仍失败，报告错误

```javascript
try {
  localStorage.setItem(key, value);
} catch (quotaError) {
  cleanupOldPrerender();  // 自动清理
  localStorage.setItem(key, value);  // 重试
}
```

### 3. 手动清理
可以手动清理不需要的缓存：

```javascript
// 清除所有预渲染
window.Prerender.clearAll();

// 清除所有数据缓存
window.DataCache.clearAll();
```

---

## 📈 容量监控

### 实时查看使用情况

```javascript
// 获取详细使用情况
const usage = window.Prerender.getStorageUsage();
console.log(usage);
```

输出：
```javascript
{
  total: 1567,      // 总计 KB
  cache: 1234,      // 数据缓存 KB
  prerender: 156,   // HTML 预渲染 KB
  other: 177,       // 其他 KB
  limit: 5120,      // 限制 KB (5MB)
  usage: 30         // 使用率 %
}
```

### 查看预渲染状态

```javascript
const status = window.Prerender.getStatus();
console.log(status);
```

输出：
```javascript
{
  count: 6,           // 已预渲染页面数
  pages: [
    { key: 'dashboard', age: 120, size: 45 },  // 120秒前，45KB
    { key: 'timesheets', age: 130, size: 23 },
    { key: 'tasks', age: 135, size: 18 },
    ...
  ],
  totalSize: 156      // 总计 156KB
}
```

---

## ⚠️ 容量预警

系统会自动监控容量使用：

### 绿色（< 50%）
```
[Prerender] ✓ localStorage 容量充足
```
**操作**：无需操作

### 黄色（50-80%）
```
[Prerender] ℹ localStorage 使用正常
```
**操作**：注意监控，考虑定期清理

### 红色（> 80%）
```
[Prerender] ⚠ localStorage 使用超过 80%，建议清理
```
**操作**：
1. 清理旧预渲染：`window.Prerender.clearAll()`
2. 清理过期数据缓存：`window.DataCache.clearExpired()`

---

## 🎯 优化策略

### 当前策略（已实现）

1. **数据缓存**：
   - 有效期：1小时
   - 自动过期清理
   - 压缩存储（JSON）

2. **HTML 预渲染**：
   - 有效期：5分钟
   - 自动过期清理
   - 容量不足时自动清理最旧的

3. **智能清理**：
   - 保存失败时自动清理
   - 优先删除最旧的预渲染
   - 保留最常用的数据

### 未来优化（如果需要）

1. **使用 IndexedDB**：
   - 容量：~50MB - 数GB
   - 更适合大数据存储
   - 支持复杂查询

2. **压缩算法**：
   - 使用 LZ-String 压缩 HTML
   - 可减少 50-70% 大小
   - 但增加 CPU 开销

3. **选择性预渲染**：
   - 只预渲染最常用的页面
   - 根据访问频率动态调整
   - 减少存储需求

---

## 💡 最佳实践

### 1. 定期检查
```javascript
// 每天检查一次
setInterval(() => {
  window.Prerender.checkCapacity();
}, 24 * 60 * 60 * 1000);
```

### 2. 登出时清理
```javascript
// 登出时清理缓存
function logout() {
  window.Prerender.clearAll();
  window.DataCache.clearAll();
  // ... 执行登出
}
```

### 3. 监控告警
```javascript
const { usage } = window.Prerender.checkCapacity();
if (usage.usage > 80) {
  alert('系统缓存接近容量上限，建议清理！');
}
```

---

## 📋 FAQ

### Q: 如果 localStorage 满了会怎样？
**A**: 系统会自动清理最旧的 50% 预渲染，然后重试保存。如果仍然失败，会在控制台显示错误，但不会影响系统正常使用。

### Q: 多久清理一次缓存？
**A**: 
- 数据缓存：1小时自动过期
- HTML 预渲染：5分钟自动过期
- 不需要手动清理（除非容量不足）

### Q: 如何完全清空缓存？
**A**: 
```javascript
// 清空所有预渲染
window.Prerender.clearAll();

// 清空所有数据缓存
window.DataCache.clearAll();

// 或直接清空 localStorage
localStorage.clear();
```

### Q: 预渲染 HTML 为什么只保留 5 分钟？
**A**: 因为 HTML 包含时间敏感信息（如"2分钟前"），5分钟足够覆盖同一个会话中的页面切换，而且数据缓存保留1小时，可以快速重新渲染。

### Q: 如果需要更大容量怎么办？
**A**: 可以升级到 IndexedDB（50MB-数GB），但目前 localStorage（5-10MB）完全够用。

---

## 📊 实际测试数据

**测试环境**：Chrome 浏览器，管理员账号

| 项目 | 数据量 | 实际大小 |
|------|--------|----------|
| 43项 API 数据 | 完整数据集 | ~1.8MB |
| 6个页面 HTML | 完整预渲染 | ~178KB |
| 总计 | - | **~2MB (40%)** |

**结论**：✅ 完全够用，还有 60% 剩余容量！

---

**更新时间**：2025-11-02
**当前使用率**：~25-50%
**推荐策略**：保持现状，无需额外优化

