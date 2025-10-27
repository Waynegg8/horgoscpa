# 個人資料設定 - UI 設計

**頁面路徑：** `/profile`  
**權限：** 所有員工  
**最後更新：** 2025年10月27日

---

## 個人資料編輯表單

```vue
<template>
  <div class="profile-page">
    <h2>個人資料</h2>
    
    <div class="profile-section">
      <h3>基本資訊</h3>
      <form @submit.prevent="updateProfile">
        <div class="form-group">
          <label>姓名 *</label>
          <input 
            v-model="form.name" 
            type="text" 
            required
          />
        </div>
        
        <div class="form-group">
          <label>帳號（不可修改）</label>
          <input 
            :value="user.username" 
            type="text" 
            disabled
          />
        </div>
        
        <div class="form-group">
          <label>性別 *</label>
          <select v-model="form.gender" required>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
          <small class="hint">性別會影響可申請的假別</small>
        </div>
        
        <button type="submit" class="btn-primary">儲存</button>
      </form>
    </div>
    
    <div class="profile-section">
      <h3>修改密碼</h3>
      <form @submit.prevent="changePassword">
        <div class="form-group">
          <label>當前密碼 *</label>
          <input 
            v-model="passwordForm.current_password" 
            type="password" 
            required
          />
        </div>
        
        <div class="form-group">
          <label>新密碼 *</label>
          <input 
            v-model="passwordForm.new_password" 
            type="password" 
            required
            minlength="8"
          />
          <small class="hint">至少8個字元</small>
        </div>
        
        <div class="form-group">
          <label>確認新密碼 *</label>
          <input 
            v-model="passwordForm.confirm_password" 
            type="password" 
            required
          />
        </div>
        
        <button type="submit" class="btn-primary">更新密碼</button>
      </form>
    </div>
  </div>
</template>

<style>
.profile-page {
  max-width: 600px;
  margin: 0 auto;
}

.profile-section {
  background: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.hint {
  color: #666;
  font-size: 0.875rem;
  margin-top: 4px;
  display: block;
}
</style>
```

---

## 相關文檔

- [功能模塊 - 個人資料設定](../../功能模塊/07-個人資料設定.md)
- [業務邏輯](./業務邏輯.md)
- [測試案例](./測試案例.md)


