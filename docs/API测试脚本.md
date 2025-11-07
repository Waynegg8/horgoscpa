# 报表API测试脚本

## 测试环境
- API Base URL: `https://www.horgoscpa.com/internal/api/v1`
- 需要管理员权限
- 需要有测试数据

## 测试清单

### ✅ 1. 月度收款报表
```bash
# 测试月度收款报表
curl -X GET "https://www.horgoscpa.com/internal/api/v1/reports/monthly/revenue?year=2024&month=11" \
  -H "Cookie: session=YOUR_SESSION" \
  --cookie-jar cookies.txt

# 预期返回
{
  "ok": true,
  "data": {
    "summary": {
      "totalReceivable": 450000,
      "totalReceived": 380000,
      "collectionRate": 84.44,
      "overdueAmount": 25000
    },
    "clientDetails": [...]
  }
}
```

### ✅ 2. 年度收款报表
```bash
curl -X GET "https://www.horgoscpa.com/internal/api/v1/reports/annual/revenue?year=2024" \
  -H "Cookie: session=YOUR_SESSION"
```

### ✅ 3. 月度薪资报表
```bash
curl -X GET "https://www.horgoscpa.com/internal/api/v1/reports/monthly/payroll?year=2024&month=11" \
  -H "Cookie: session=YOUR_SESSION"
```

### ✅ 4. 年度薪资报表
```bash
curl -X GET "https://www.horgoscpa.com/internal/api/v1/reports/annual/payroll?year=2024" \
  -H "Cookie: session=YOUR_SESSION"
```

### ✅ 5. 月度员工产值报表
```bash
curl -X GET "https://www.horgoscpa.com/internal/api/v1/reports/monthly/employee-performance?year=2024&month=11" \
  -H "Cookie: session=YOUR_SESSION"
```

### ⚠️ 6. 客户毛利报表（未完成）
```bash
curl -X GET "https://www.horgoscpa.com/internal/api/v1/reports/monthly/client-profitability?year=2024&month=11" \
  -H "Cookie: session=YOUR_SESSION"
```

## 关键验证点

### 收款报表验证
- [ ] 使用 `service_month` 而非 `receipt_date`
- [ ] 逾期判断基于 `due_date < CURRENT_DATE`
- [ ] 收款率计算正确：(实收/应收) × 100%
- [ ] 按客户和服务类型正确分组

### 薪资报表验证
- [ ] 调用 `calculateEmployeePayroll` 函数
- [ ] 包含绩效奖金（从 MonthlyBonus 表）
- [ ] 包含年终奖金（从 YearEndBonus 表，仅12月）
- [ ] 薪资构成分析计算正确
- [ ] 年度报表性能可接受（< 30秒）

### 员工产值报表验证
- [ ] 收入按工时比例正确分配
- [ ] 标准工时和加权工时正确计算
- [ ] 客户分布统计正确
- [ ] 时薪 = 产生收入 / 加权工时
- [ ] 毛利率计算正确

### 客户毛利报表验证
- [ ] 成本数据来自 `/admin/costs/client` API
- [ ] 收入数据按 `service_month` 统计
- [ ] 毛利 = 收入 - 成本
- [ ] 毛利率 = 毛利 / 收入 × 100%

## 数据完整性检查

### 必须存在的数据
```sql
-- 检查Receipts表是否有service_month字段
SELECT service_month FROM Receipts LIMIT 1;

-- 检查是否有测试数据
SELECT COUNT(*) FROM Receipts WHERE service_month = '2024-11';
SELECT COUNT(*) FROM Timesheets WHERE substr(work_date,1,7) = '2024-11';
SELECT COUNT(*) FROM Users WHERE is_deleted = 0;

-- 检查是否有工时关联任务
SELECT COUNT(*) FROM Timesheets t
LEFT JOIN Tasks task ON task.task_id = t.task_id
WHERE t.is_deleted = 0 
  AND substr(t.work_date,1,7) = '2024-11'
  AND task.client_service_id IS NOT NULL;
```

## 前端测试清单

### 页面加载
- [ ] 访问 `/internal/reports`
- [ ] 页面正常加载，无JS错误
- [ ] Tab切换正常（月度/年度）
- [ ] 年份和月份选择器正常显示

### 月度报表
- [ ] 选择年月后点击"载入报表"
- [ ] 4个Section都有数据显示
- [ ] 数据格式正确（金额、百分比、工时）
- [ ] 员工产值可点击"查看客户分布"
- [ ] 客户分布弹窗正确显示

### 年度报表
- [ ] 选择年度后点击"载入报表"
- [ ] 显示加载提示
- [ ] 所有表格正确填充数据
- [ ] 月度趋势数据完整（1-12月）
- [ ] 按员工/客户汇总数据正确

## 已知问题

### 🔴 Critical
1. 员工产值的`weighted_hours`计算可能不正确
   - 需要确认`Timesheets`表是否有`weighted_hours`字段
   - 如果没有，需要根据`work_type`计算

2. 客户毛利报表未实现
   - 需要完成`handleMonthlyClientProfitability`
   - 需要完成`handleAnnualClientProfitability`

3. 年度员工产值报表未实现
   - 需要完成`handleAnnualEmployeePerformance`

### ⚠️ Medium
1. 年度报表性能问题
   - 需要优化：减少循环调用
   - 建议：后端聚合年度数据

2. 绩效奖金和年终奖金获取
   - 需要确认表结构
   - 需要测试数据

### ℹ️ Low
1. 前端错误处理
   - 需要友好的错误提示
   - 需要处理API超时

2. 数据缓存
   - 年度报表可以缓存
   - 减少重复计算

## 下一步行动

### Phase 1: 修复核心Bug（优先）
1. ✅ 修复收款报表使用`service_month`
2. ✅ 修复薪资报表包含绩效和年终奖金
3. ✅ 重写员工产值报表的收入分配逻辑
4. ❌ 实现客户毛利报表
5. ❌ 实现年度员工产值报表

### Phase 2: 性能优化
1. 优化年度报表查询
2. 添加数据缓存

### Phase 3: 用户体验
1. 改善错误提示
2. 添加导出功能（如需要）
3. 添加打印功能（如需要）

