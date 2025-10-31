# 快速開發指南：為Tab添加實際功能

## 目標
本指南將教你如何為settings.html中的某個tab添加實際的CRUD功能（以「用戶管理」為例）。

## 前置要求
- ✅ 後端API已經實現（如 `/internal/api/v1/admin/users`）
- ✅ Tab的UI框架已經存在（表格、搜索欄、按鈕）
- ✅ 了解基本的JavaScript和Fetch API

## 開發步驟

### 步驟1：實現資料載入功能

找到`settings.html`中的`loadUsers()`函數（約在第1100行），替換為：

```javascript
async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading">載入中...</td></tr>';
  
  try {
    const res = await fetch(`${apiBase}/admin/users`, { 
      credentials: 'include' 
    });
    
    if (!res.ok) throw new Error('載入失敗');
    
    const json = await res.json();
    
    if (!json.ok || !json.data) throw new Error('資料格式錯誤');
    
    const users = json.data;
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="loading">暫無資料</td></tr>';
      return;
    }
    
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.user_id}</td>
        <td>${user.username}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.gender === 'M' ? '男' : '女'}</td>
        <td>${user.start_date || '-'}</td>
        <td>
          <span class="status-badge ${user.is_admin ? 'active' : 'draft'}">
            ${user.is_admin ? '是' : '否'}
          </span>
        </td>
        <td>
          <span class="status-badge ${user.is_deleted ? 'rejected' : 'active'}">
            ${user.is_deleted ? '已刪除' : '正常'}
          </span>
        </td>
        <td class="action-btns">
          <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})">編輯</button>
          ${!user.is_deleted ? `
            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})">刪除</button>
          ` : ''}
        </td>
      </tr>
    `).join('');
    
  } catch (err) {
    console.error('載入用戶失敗:', err);
    tbody.innerHTML = '<tr><td colspan="9" class="loading">載入失敗，請稍後再試</td></tr>';
  }
}
```

### 步驟2：實現搜索功能

在`settings.html`的JavaScript初始化部分（約在第1200行）添加：

```javascript
// 用戶搜索
const btnSearchUsers = document.getElementById('btnSearchUsers');
const searchUsersInput = document.getElementById('searchUsers');

if (btnSearchUsers) {
  btnSearchUsers.addEventListener('click', async () => {
    const keyword = searchUsersInput.value.trim();
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '<tr><td colspan="9" class="loading">搜尋中...</td></tr>';
    
    try {
      const url = keyword 
        ? `${apiBase}/admin/users?search=${encodeURIComponent(keyword)}`
        : `${apiBase}/admin/users`;
      
      const res = await fetch(url, { credentials: 'include' });
      const json = await res.json();
      
      // 重用載入邏輯（將上面的渲染邏輯抽出成函數）
      renderUsers(json.data);
      
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="9" class="loading">搜尋失敗</td></tr>';
    }
  });
  
  // 支援Enter鍵搜索
  searchUsersInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnSearchUsers.click();
  });
}
```

### 步驟3：實現新增功能

添加新增按鈕的事件監聽：

```javascript
// 新增用戶
const btnAddUser = document.getElementById('btnAddUser');
if (btnAddUser) {
  btnAddUser.addEventListener('click', () => {
    // 方法1：使用Modal對話框（需要先創建Modal組件）
    showUserModal(null);
    
    // 方法2：跳轉到新增頁面
    // location.href = '/internal/users/new';
    
    // 方法3：使用prompt（臨時方案）
    const username = prompt('請輸入帳號：');
    if (!username) return;
    
    const name = prompt('請輸入姓名：');
    if (!name) return;
    
    const email = prompt('請輸入Email：');
    if (!email) return;
    
    createUser({ username, name, email });
  });
}

async function createUser(userData) {
  try {
    const res = await fetch(`${apiBase}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    
    if (!res.ok) throw new Error('新增失敗');
    
    const json = await res.json();
    
    if (json.ok) {
      setMsg('新增成功！', true);
      loadUsers(); // 重新載入列表
    } else {
      throw new Error(json.message || '新增失敗');
    }
    
  } catch (err) {
    setMsg(err.message || '新增失敗', false);
  }
}
```

### 步驟4：實現編輯功能

添加編輯函數（需要在全域範圍）：

```javascript
// 將這個函數添加到window物件，讓onclick可以呼叫
window.editUser = async function(userId) {
  try {
    // 先取得用戶資料
    const res = await fetch(`${apiBase}/admin/users/${userId}`, {
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('取得資料失敗');
    
    const json = await res.json();
    const user = json.data;
    
    // 方法1：使用Modal（推薦）
    showUserModal(user);
    
    // 方法2：使用prompt（臨時方案）
    const name = prompt('請輸入姓名：', user.name);
    if (!name) return;
    
    const email = prompt('請輸入Email：', user.email);
    if (!email) return;
    
    await updateUser(userId, { name, email });
    
  } catch (err) {
    setMsg(err.message || '編輯失敗', false);
  }
};

async function updateUser(userId, userData) {
  try {
    const res = await fetch(`${apiBase}/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(userData)
    });
    
    if (!res.ok) throw new Error('更新失敗');
    
    const json = await res.json();
    
    if (json.ok) {
      setMsg('更新成功！', true);
      loadUsers();
    } else {
      throw new Error(json.message || '更新失敗');
    }
    
  } catch (err) {
    setMsg(err.message || '更新失敗', false);
  }
}
```

### 步驟5：實現刪除功能

添加刪除函數：

```javascript
window.deleteUser = async function(userId) {
  // 確認對話框
  if (!confirm('確定要刪除此用戶嗎？此操作無法復原！')) {
    return;
  }
  
  try {
    const res = await fetch(`${apiBase}/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!res.ok) throw new Error('刪除失敗');
    
    const json = await res.json();
    
    if (json.ok) {
      setMsg('刪除成功！', true);
      loadUsers();
    } else {
      throw new Error(json.message || '刪除失敗');
    }
    
  } catch (err) {
    setMsg(err.message || '刪除失敗', false);
  }
};
```

## 程式碼組織建議

### 重構：抽出渲染邏輯

將資料渲染邏輯抽出成獨立函數，方便複用：

```javascript
function renderUsers(users) {
  const tbody = document.querySelector('#usersTable tbody');
  
  if (!users || users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">暫無資料</td></tr>';
    return;
  }
  
  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.user_id}</td>
      <td>${user.username}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.gender === 'M' ? '男' : '女'}</td>
      <td>${user.start_date || '-'}</td>
      <td>
        <span class="status-badge ${user.is_admin ? 'active' : 'draft'}">
          ${user.is_admin ? '是' : '否'}
        </span>
      </td>
      <td>
        <span class="status-badge ${user.is_deleted ? 'rejected' : 'active'}">
          ${user.is_deleted ? '已刪除' : '正常'}
        </span>
      </td>
      <td class="action-btns">
        <button class="btn btn-sm btn-primary" onclick="editUser(${user.user_id})">編輯</button>
        ${!user.is_deleted ? `
          <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.user_id})">刪除</button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '<tr><td colspan="9" class="loading">載入中...</td></tr>';
  
  try {
    const res = await fetch(`${apiBase}/admin/users`, { credentials: 'include' });
    const json = await res.json();
    renderUsers(json.data);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading">載入失敗</td></tr>';
  }
}
```

## 測試清單

完成開發後，測試以下功能：

- [ ] **載入功能**：切換到tab時能正確載入資料
- [ ] **搜索功能**：輸入關鍵字可以正確篩選
- [ ] **新增功能**：點擊新增按鈕可以新增資料
- [ ] **編輯功能**：點擊編輯按鈕可以修改資料
- [ ] **刪除功能**：點擊刪除按鈕有確認對話框，刪除成功
- [ ] **錯誤處理**：API錯誤時顯示友善的錯誤訊息
- [ ] **權限檢查**：非管理員無法訪問
- [ ] **響應式**：手機上也能正常使用

## 進階功能

完成基本CRUD後，可以添加：

### 1. 分頁功能
```javascript
let currentPage = 1;
const pageSize = 20;

async function loadUsers(page = 1) {
  const res = await fetch(
    `${apiBase}/admin/users?page=${page}&pageSize=${pageSize}`,
    { credentials: 'include' }
  );
  // 渲染資料和分頁按鈕
}
```

### 2. 批量操作
```javascript
// 添加checkbox到每一行
// 實現全選/取消全選
// 批量刪除功能
```

### 3. 排序功能
```javascript
// 點擊表頭可以排序
let sortBy = 'user_id';
let sortOrder = 'asc';
```

### 4. 匯出功能
```javascript
function exportToCSV() {
  // 匯出目前顯示的資料為CSV
}
```

## 套用到其他Tab

將「用戶管理」的開發模式套用到其他tab：

1. **客戶管理**：將`Users`改為`Clients`，API改為`/admin/clients`
2. **任務管理**：將`Users`改為`Tasks`，API改為`/admin/tasks`
3. **其他tab**：依此類推

## 常見問題

### Q: onclick在嚴格模式下無法使用？
A: 將函數掛載到window物件：`window.editUser = function() {...}`

### Q: 如何避免XSS攻擊？
A: 使用DOMPurify或手動轉義HTML：
```javascript
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Q: 如何添加Modal對話框？
A: 建議創建一個獨立的Modal組件，或使用現有的UI庫（如Bootstrap Modal）

## 相關文件

- [系統設定頁面Tab改造說明](./系統設定頁面-Tab改造說明.md)
- [API設計規範](./開發指南/開發須知/API-設計規範.md)
- [前端共用規範](./開發指南/開發須知/前端-共用規範.md)






