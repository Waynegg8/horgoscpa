# 業務規則管理 - UI 設計

**頁面路徑：** `/settings/rules`  
**權限：** 管理員  
**最後更新：** 2025年10月27日

---

## 整體佈局

```vue
<template>
  <div class="rules-page">
    <h2>⚙️ 業務規則管理</h2>
    
    <div class="rules-layout">
      <!-- 側邊欄導航 -->
      <aside class="sidebar">
        <nav>
          <div class="nav-section">
            <h3>📅 假期規則</h3>
            <a 
              href="#national-holidays"
              :class="{ active: activeSection === 'national-holidays' }"
            >
              國定假日
            </a>
            <a 
              href="#leave-types"
              :class="{ active: activeSection === 'leave-types' }"
            >
              假別類型
            </a>
          </div>
          
          <div class="nav-section">
            <h3>⏰ 工時規則</h3>
            <a 
              href="#overtime-rates"
              :class="{ active: activeSection === 'overtime-rates' }"
            >
              加班費率
            </a>
            <a 
              href="#annual-leave"
              :class="{ active: activeSection === 'annual-leave' }"
            >
              特休規則
            </a>
            <a 
              href="#other-leaves"
              :class="{ active: activeSection === 'other-leaves' }"
            >
              其他假期
            </a>
          </div>
          
          <div class="nav-section">
            <h3>📝 服務規則</h3>
            <a 
              href="#cycle-types"
              :class="{ active: activeSection === 'cycle-types' }"
            >
              週期類型
            </a>
          </div>
        </nav>
      </aside>
      
      <!-- 內容區 -->
      <main class="content">
        <component 
          :is="currentComponent" 
          @update="handleUpdate"
        />
      </main>
    </div>
  </div>
</template>

<style>
.rules-layout {
  display: flex;
  gap: 24px;
  margin-top: 24px;
}

.sidebar {
  width: 250px;
  flex-shrink: 0;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  height: fit-content;
  position: sticky;
  top: 24px;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section h3 {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.nav-section a {
  display: block;
  padding: 8px 12px;
  color: #333;
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-section a:hover {
  background: #f5f5f5;
  color: #2196F3;
}

.nav-section a.active {
  background: #e3f2fd;
  color: #2196F3;
  font-weight: 500;
}

.content {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
</style>
```

---

## 國定假日管理介面

```vue
<template>
  <div class="national-holidays-section">
    <div class="section-header">
      <h3>國定假日管理</h3>
      <button @click="bulkImport" class="btn-secondary">
        批量導入
      </button>
    </div>
    
    <table class="holidays-table">
      <thead>
        <tr>
          <th>日期</th>
          <th>假日名稱</th>
          <th>類型</th>
          <th>狀態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="holiday in holidays" :key="holiday.holiday_id">
          <td>{{ holiday.holiday_date }}</td>
          <td>{{ holiday.holiday_name }}</td>
          <td>
            <span :class="`badge ${holiday.holiday_type}`">
              {{ holiday.holiday_type === 'holiday' ? '國定假日' : '補班日' }}
            </span>
          </td>
          <td>
            <span :class="`status ${holiday.is_active ? 'active' : 'inactive'}`">
              {{ holiday.is_active ? '啟用' : '停用' }}
            </span>
          </td>
          <td>
            <button @click="editHoliday(holiday)" class="btn-icon">✏️</button>
            <button @click="deleteHoliday(holiday)" class="btn-icon">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

---

## 加班費率設定介面

```vue
<template>
  <div class="overtime-rates-section">
    <h3>加班費率設定（勞基法）</h3>
    
    <div class="rates-grid">
      <div 
        v-for="rate in overtimeRates"
        :key="rate.rate_id"
        class="rate-card"
      >
        <div class="rate-header">
          <h4>{{ rate.overtime_type }}</h4>
          <span class="multiplier">× {{ rate.rate }}</span>
        </div>
        
        <div class="rate-description">
          {{ rate.description }}
        </div>
        
        <div class="rate-rules">
          <strong>規則：</strong>
          <p>{{ rate.rules }}</p>
        </div>
        
        <button 
          @click="editRate(rate)"
          class="btn-secondary btn-sm"
        >
          編輯
        </button>
      </div>
    </div>
    
    <div class="law-reference">
      <strong>📖 勞基法參考：</strong>
      <p>根據勞動基準法第 24 條規定...</p>
    </div>
  </div>
</template>

<style>
.rates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin: 24px 0;
}

.rate-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s;
}

.rate-card:hover {
  border-color: #2196F3;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.rate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.multiplier {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2196F3;
}

.law-reference {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  border-left: 4px solid #4caf50;
  margin-top: 24px;
}
</style>
```

---

## 特休規則設定介面

```vue
<template>
  <div class="annual-leave-section">
    <div class="section-header">
      <h3>特休規則設定（勞基法）</h3>
      <button @click="addRule" class="btn-primary">+ 新增規則</button>
    </div>
    
    <table class="rules-table">
      <thead>
        <tr>
          <th>年資（月）</th>
          <th>特休天數</th>
          <th>說明</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="rule in annualLeaveRules" :key="rule.rule_id">
          <td>{{ rule.months_of_service }} 個月以上</td>
          <td>{{ rule.annual_leave_days }} 天</td>
          <td>{{ rule.description }}</td>
          <td>
            <button @click="editRule(rule)" class="btn-icon">✏️</button>
            <button @click="deleteRule(rule)" class="btn-icon">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="calculation-example">
      <h4>計算範例</h4>
      <p>員工到職日：2023-03-15</p>
      <p>當前年資：{{ calculateSeniority('2023-03-15') }} 個月</p>
      <p>特休天數：{{ getAnnualLeaveDays('2023-03-15') }} 天</p>
    </div>
  </div>
</template>
```

---

## 相關文檔

- [功能模塊 - 業務規則管理](../../功能模塊/02-業務規則管理.md)
- [業務邏輯](./業務邏輯.md)

