# 員工帳號管理 - UI 設計

**頁面路徑：** `/settings/users`  
**權限：** 管理員  
**最後更新：** 2025年10月27日

---

## 員工列表與管理

```vue
<template>
  <div class="user-management">
    <div class="header">
      <h2>員工帳號管理</h2>
      <button @click="addUser" class="btn-primary">+ 新增員工</button>
    </div>
    
    <table class="user-table">
      <thead>
        <tr>
          <th>姓名</th>
          <th>帳號</th>
          <th>角色</th>
          <th>性別</th>
          <th>狀態</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.user_id">
          <td>{{ user.name }}</td>
          <td>{{ user.username }}</td>
          <td>{{ user.is_admin ? '管理員' : '員工' }}</td>
          <td>{{ user.gender }}</td>
          <td>
            <span :class="user.is_active ? 'status-active' : 'status-inactive'">
              {{ user.is_active ? '啟用' : '停用' }}
            </span>
          </td>
          <td>
            <button @click="editUser(user)">編輯</button>
            <button @click="resetPassword(user)">重設密碼</button>
            <button 
              @click="toggleActive(user)"
              :class="user.is_active ? 'btn-danger' : 'btn-success'"
            >
              {{ user.is_active ? '停用' : '啟用' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```





