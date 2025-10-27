# 報表中心 - UI 設計

**頁面路徑：** `/reports`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 報表選擇介面

```vue
<template>
  <div class="reports-page">
    <h2>📊 報表中心</h2>
    
    <!-- 報表類型選擇 -->
    <div class="report-selector">
      <div class="selector-group">
        <label>報表類型</label>
        <select v-model="selectedReportType">
          <option value="employee_timesheet">員工工時統計（詳細版）</option>
          <option value="client_analysis">客戶服務分析</option>
          <option value="business_distribution">業務類型分佈</option>
          <option value="comprehensive">月度綜合報告</option>
          <option value="leave_usage">假期使用率統計</option>
        </select>
      </div>
      
      <div class="selector-group">
        <label>時間範圍</label>
        <select v-model="selectedPeriod">
          <option value="current_month">本月</option>
          <option value="last_month">上月</option>
          <option value="current_quarter">本季</option>
          <option value="current_year">本年</option>
          <option value="custom">自訂...</option>
        </select>
      </div>
      
      <div v-if="selectedReportType === 'employee_timesheet'" class="selector-group">
        <label>員工篩選</label>
        <select v-model="selectedEmployee">
          <option value="">所有員工</option>
          <option 
            v-for="emp in employees"
            :key="emp.user_id"
            :value="emp.user_id"
          >
            {{ emp.name }}
          </option>
        </select>
      </div>
      
      <div class="actions">
        <button @click="generateReport" class="btn-primary">
          產生報表
        </button>
        <button @click="exportExcel" class="btn-secondary">
          匯出 Excel
        </button>
      </div>
    </div>
    
    <!-- 報表結果區 -->
    <div v-if="reportData" class="report-content">
      <component 
        :is="reportComponent" 
        :data="reportData"
        :period="selectedPeriod"
      />
    </div>
  </div>
</template>

<style>
.report-selector {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: end;
}

.selector-group {
  flex: 1;
  min-width: 200px;
}

.selector-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.report-content {
  margin-top: 24px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
</style>
```

---

## 員工工時統計報表（詳細版）

```vue
<template>
  <div class="employee-timesheet-report">
    <h3>員工工時統計報表 - {{ period }} - {{ data.employee.name }}</h3>
    
    <!-- 業務類型分組 -->
    <div 
      v-for="(businessData, businessType) in data.by_business_type"
      :key="businessType"
      class="business-section"
    >
      <h4>【{{ businessType }}】</h4>
      
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>工時類型</th>
            <th>原始工時</th>
            <th>倍率</th>
            <th>加權工時</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="item in businessData.breakdown"
            :key="item.work_type"
          >
            <td>{{ item.work_type }}</td>
            <td>{{ item.hours.toFixed(1) }}h</td>
            <td>× {{ item.rate.toFixed(2) }}</td>
            <td>{{ item.weighted_hours.toFixed(2) }}h</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="subtotal">
            <td>業務小計</td>
            <td>{{ businessData.subtotal.hours.toFixed(1) }}h</td>
            <td></td>
            <td>{{ businessData.subtotal.weighted_hours.toFixed(2) }}h</td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <!-- 總計 -->
    <div class="total-section">
      <h4>【總計】</h4>
      <div class="stat-grid">
        <div class="stat">
          <span class="label">原始工時總計</span>
          <span class="value">{{ data.total.hours.toFixed(1) }}h</span>
        </div>
        <div class="stat">
          <span class="label">加權工時總計</span>
          <span class="value">{{ data.total.weighted_hours.toFixed(2) }}h</span>
        </div>
        <div class="stat">
          <span class="label">加權比例</span>
          <span class="value">{{ data.total.weighted_ratio.toFixed(1) }}%</span>
        </div>
      </div>
    </div>
    
    <!-- 加班分析（圓餅圖） -->
    <div class="overtime-analysis">
      <h4>【加班分析】</h4>
      <canvas ref="overtimeChart"></canvas>
    </div>
  </div>
</template>

<style>
.business-section {
  margin-bottom: 24px;
  border-left: 4px solid #2196F3;
  padding-left: 16px;
}

.breakdown-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.breakdown-table th,
.breakdown-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.breakdown-table tfoot {
  font-weight: 600;
  background: #f5f5f5;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.stat {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  text-align: center;
}

.stat .label {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 8px;
}

.stat .value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2196F3;
}
</style>
```

---

## 客戶服務分析報表

```vue
<template>
  <div class="client-analysis-report">
    <h3>客戶服務分析報表 - {{ period }}</h3>
    
    <table class="analysis-table">
      <thead>
        <tr>
          <th>客戶</th>
          <th>服務</th>
          <th>原始工時</th>
          <th>加權工時</th>
          <th>收費</th>
          <th>成本估算</th>
          <th>效益比</th>
          <th>評估</th>
        </tr>
      </thead>
      <tbody>
        <tr 
          v-for="client in data.clients"
          :key="client.client_id"
          :class="getRowClass(client.efficiency_ratio)"
        >
          <td>{{ client.client_name }}</td>
          <td>{{ client.service_type }}</td>
          <td>{{ client.hours.toFixed(1) }}h</td>
          <td>{{ client.weighted_hours.toFixed(2) }}h</td>
          <td>NT$ {{ client.fee.toLocaleString() }}</td>
          <td>NT$ {{ client.cost_estimate.toLocaleString() }}</td>
          <td>{{ client.efficiency_ratio.toFixed(2) }}</td>
          <td>{{ getEvaluation(client.efficiency_ratio) }}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="note">
      <strong>說明：</strong>
      效益比 = 收費 / (加權工時 × 時薪假設 NT$ {{ data.hourly_rate }})
    </div>
  </div>
</template>

<script>
methods: {
  getRowClass(ratio) {
    if (ratio > 1.5) return 'high-profit';
    if (ratio >= 1.0) return 'normal-profit';
    return 'loss';
  },
  getEvaluation(ratio) {
    if (ratio > 1.5) return '✅✅ 高獲利';
    if (ratio >= 1.0) return '✅ 獲利';
    if (ratio >= 0.8) return '⚠️ 持平';
    return '❌ 虧損';
  }
}
</script>
```

---

## 相關文檔

- [功能模塊 - 報表中心](../../功能模塊/10-報表中心.md)
- [業務邏輯](./業務邏輯.md)

