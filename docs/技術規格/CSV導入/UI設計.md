# CSV導入功能 - UI 設計

**頁面路徑：** `/settings/import`  
**權限：** 管理員  
**最後更新：** 2025年10月27日

---

## CSV 導入介面

```vue
<template>
  <div class="csv-import-page">
    <h2>CSV 批量導入</h2>
    
    <!-- 選擇導入類型 -->
    <div class="import-type-selector">
      <h3>選擇導入類型</h3>
      <div class="type-cards">
        <div 
          v-for="type in importTypes"
          :key="type.value"
          class="type-card"
          :class="{ active: selectedType === type.value }"
          @click="selectedType = type.value"
        >
          <div class="icon">{{ type.icon }}</div>
          <h4>{{ type.label }}</h4>
          <p>{{ type.description }}</p>
        </div>
      </div>
    </div>
    
    <!-- 下載範本 -->
    <div class="template-section">
      <h3>下載範本</h3>
      <p>請先下載對應的 CSV 範本，填寫資料後再上傳</p>
      <button 
        @click="downloadTemplate(selectedType)"
        class="btn-secondary"
      >
        📥 下載 {{ getTypeName(selectedType) }} 範本
      </button>
    </div>
    
    <!-- 上傳 CSV -->
    <div class="upload-section">
      <h3>上傳 CSV 檔案</h3>
      <div 
        class="dropzone"
        @drop.prevent="handleDrop"
        @dragover.prevent
        @dragenter="isDragOver = true"
        @dragleave="isDragOver = false"
        :class="{ 'drag-over': isDragOver }"
      >
        <input 
          type="file" 
          accept=".csv"
          @change="handleFileSelect"
          ref="fileInput"
          style="display: none"
        />
        
        <div v-if="!selectedFile" class="dropzone-placeholder">
          <div class="icon">📂</div>
          <p>拖放 CSV 檔案至此，或</p>
          <button 
            @click="$refs.fileInput.click()"
            class="btn-primary"
          >
            選擇檔案
          </button>
        </div>
        
        <div v-else class="file-preview">
          <div class="file-info">
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size">{{ formatFileSize(selectedFile.size) }}</span>
          </div>
          <button @click="clearFile" class="btn-icon">🗑️</button>
        </div>
      </div>
    </div>
    
    <!-- 預覽與驗證 -->
    <div v-if="previewData" class="preview-section">
      <h3>資料預覽與驗證</h3>
      
      <div class="validation-summary">
        <div class="stat">
          <span class="label">總筆數</span>
          <span class="value">{{ previewData.total }}</span>
        </div>
        <div class="stat success">
          <span class="label">有效筆數</span>
          <span class="value">{{ previewData.valid }}</span>
        </div>
        <div class="stat error">
          <span class="label">錯誤筆數</span>
          <span class="value">{{ previewData.invalid }}</span>
        </div>
      </div>
      
      <!-- 錯誤列表 -->
      <div v-if="previewData.errors.length > 0" class="errors-list">
        <h4>❌ 發現以下錯誤：</h4>
        <div 
          v-for="(error, index) in previewData.errors"
          :key="index"
          class="error-item"
        >
          <span class="row-number">第 {{ error.row }} 行：</span>
          <span class="error-message">{{ error.message }}</span>
        </div>
      </div>
      
      <!-- 資料表格預覽 -->
      <div class="data-table">
        <table>
          <thead>
            <tr>
              <th v-for="col in previewData.columns" :key="col">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(row, index) in previewData.rows.slice(0, 5)"
              :key="index"
              :class="{ error: row.hasError }"
            >
              <td v-for="col in previewData.columns" :key="col">
                {{ row[col] }}
              </td>
            </tr>
          </tbody>
        </table>
        <p class="preview-note">僅顯示前 5 筆資料</p>
      </div>
    </div>
    
    <!-- 操作按鈕 -->
    <div class="actions">
      <button 
        v-if="selectedFile"
        @click="validateFile"
        class="btn-secondary"
      >
        驗證資料
      </button>
      <button 
        v-if="previewData && previewData.valid > 0"
        @click="confirmImport"
        class="btn-primary"
        :disabled="importing"
      >
        {{ importing ? '導入中...' : `確認導入 ${previewData.valid} 筆資料` }}
      </button>
    </div>
  </div>
</template>

<style>
.type-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.type-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.type-card:hover {
  border-color: #2196F3;
}

.type-card.active {
  border-color: #2196F3;
  background: #e3f2fd;
}

.dropzone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  background: #fafafa;
  transition: all 0.2s;
}

.dropzone.drag-over {
  border-color: #2196F3;
  background: #e3f2fd;
}

.validation-summary {
  display: flex;
  gap: 24px;
  margin: 16px 0;
}

.stat {
  background: white;
  padding: 16px;
  border-radius: 6px;
  border-left: 4px solid #2196F3;
}

.stat.success {
  border-color: #4caf50;
}

.stat.error {
  border-color: #f44336;
}

.data-table {
  overflow-x: auto;
  margin-top: 16px;
}

.data-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.data-table th,
.data-table td {
  border: 1px solid #e0e0e0;
  padding: 8px 12px;
  text-align: left;
}

.data-table tr.error {
  background: #ffebee;
}
</style>
```

---

## 相關文檔

- [功能模塊 - CSV導入功能](../../功能模塊/05-CSV導入功能.md)
- [業務邏輯](./業務邏輯.md)

