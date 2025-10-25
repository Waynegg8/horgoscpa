# 📝 如何新增說明文檔

本指南說明如何在專案中新增說明文檔。

## 🎯 基本原則

**所有說明文檔統一放在 `docs/` 資料夾中**

## 📂 資料夾結構

```
docs/
├── README.md                        # 文檔索引（必讀）
├── HOW_TO_ADD_DOCS.md              # 本檔案
│
├── [一般文檔].md                    # 通用說明文檔
│
└── [子系統名稱]/                    # 特定子系統的文檔
    ├── README.md                    # 子系統總覽
    └── [相關文檔].md                # 相關說明文檔
```

## ✅ 新增文檔步驟

### 1️⃣ 確定文檔類型

#### 一般文檔（通用說明）
放在 `docs/` 根目錄

**範例：**
- `docs/DEPLOYMENT_GUIDE.md` - 部署指南
- `docs/API_REFERENCE.md` - API 參考
- `docs/TROUBLESHOOTING.md` - 疑難排解

#### 子系統文檔（特定功能）
放在 `docs/[子系統名稱]/` 子資料夾

**範例：**
- `docs/timesheet-api/README.md` - Timesheet API 說明
- `docs/blog-system/CONTENT_GUIDE.md` - 部落格內容指南
- `docs/email-service/SETUP.md` - 郵件服務設定

### 2️⃣ 建立文檔檔案

```bash
# 一般文檔
New-Item -Path "docs/YOUR_DOCUMENT.md" -ItemType File

# 子系統文檔（如果資料夾不存在，先建立）
New-Item -Path "docs/your-subsystem" -ItemType Directory
New-Item -Path "docs/your-subsystem/YOUR_DOCUMENT.md" -ItemType File
```

### 3️⃣ 撰寫文檔內容

使用以下格式作為模板：

```markdown
# 📘 文檔標題

簡短說明這份文檔的目的。

## 🎯 目標讀者

說明這份文檔適合誰閱讀。

## 📋 內容大綱

1. 第一部分
2. 第二部分
3. 第三部分

## 內容開始...

### 章節標題

內容...

## 相關連結

- [相關文檔 1](./OTHER_DOC.md)
- [相關文檔 2](./ANOTHER_DOC.md)

## 最後更新

- **日期**: 2025-10-25
- **更新者**: [姓名]
```

### 4️⃣ 更新文檔索引

編輯 `docs/README.md`，將新文檔加入索引：

```markdown
### 📂 [相關類別]

- **[YOUR_DOCUMENT.md](./YOUR_DOCUMENT.md)** - 文檔簡短說明
```

### 5️⃣ （可選）更新主 README

如果是重要的文檔，可以在根目錄的 `README.md` 中加入連結：

```markdown
## 📚 文檔中心

- **[docs/YOUR_DOCUMENT.md](./docs/YOUR_DOCUMENT.md)** - 文檔說明
```

## 📝 命名規範

### 檔案命名

- ✅ **使用大寫字母和底線**：`SETUP_GUIDE.md`
- ✅ **使用英文命名**（內容可用中文）
- ✅ **描述性名稱**：`DATABASE_BACKUP_GUIDE.md`
- ❌ **避免**：`guide.md`、`文件.md`、`doc-1.md`

### 常見文檔類型命名

| 類型 | 命名範例 |
|------|---------|
| 設定指南 | `SETUP_GUIDE.md` |
| 使用手冊 | `USER_MANUAL.md` |
| API 參考 | `API_REFERENCE.md` |
| 疑難排解 | `TROUBLESHOOTING.md` |
| 開發指南 | `DEVELOPMENT_GUIDE.md` |
| 部署說明 | `DEPLOYMENT.md` |
| 設定檔說明 | `CONFIG_REFERENCE.md` |
| 變更記錄 | `CHANGELOG.md` |
| 貢獻指南 | `CONTRIBUTING.md` |

### 子系統資料夾命名

- ✅ **小寫字母和連字號**：`timesheet-api`、`blog-system`
- ✅ **與程式碼資料夾一致**
- ❌ **避免**：`TimesheetAPI`、`blog_system`

## 📋 文檔檢查清單

新增文檔前，請確認：

- [ ] 檔案放在正確的位置（`docs/` 或 `docs/[子系統]/`）
- [ ] 檔案命名符合規範（大寫字母 + 底線）
- [ ] 文檔包含清楚的標題和說明
- [ ] 已更新 `docs/README.md` 索引
- [ ] 內容使用 Markdown 格式
- [ ] 包含相關連結（如有需要）
- [ ] 標註最後更新日期

## 💡 文檔撰寫技巧

### 1. 使用表情符號增加可讀性

```markdown
## 🎯 目標
## ⚠️ 注意事項
## ✅ 完成
## 📝 範例
```

### 2. 提供程式碼範例

````markdown
```bash
# 執行命令
npm install
```
````

### 3. 使用表格整理資訊

```markdown
| 參數 | 說明 | 預設值 |
|------|------|--------|
| port | 連接埠 | 3000 |
```

### 4. 加入目錄連結（長文檔）

```markdown
## 目錄

- [安裝](#安裝)
- [設定](#設定)
- [使用方式](#使用方式)
```

### 5. 提供疑難排解

```markdown
## ❓ 常見問題

### Q: 為什麼...？
A: 因為...
```

## 📚 範例：完整流程

### 情境：新增郵件服務設定指南

```bash
# 1. 建立子系統資料夾
mkdir docs/email-service

# 2. 建立文檔檔案
New-Item -Path "docs/email-service/SETUP_GUIDE.md" -ItemType File

# 3. 撰寫內容
# （編輯 SETUP_GUIDE.md）

# 4. 更新索引
# （編輯 docs/README.md，加入連結）
```

在 `docs/README.md` 中加入：

```markdown
### 📧 郵件服務文檔

- **[email-service/SETUP_GUIDE.md](./email-service/SETUP_GUIDE.md)** - 郵件服務設定指南
```

## 🔄 維護文檔

### 定期檢查
- 每季檢查文檔是否需要更新
- 確保連結沒有失效
- 更新過時的資訊

### 更新記錄
每次更新時，在文檔底部加上：

```markdown
## 📝 更新記錄

- **2025-10-25**: 初版建立
- **2025-11-01**: 新增章節 X
```

## 🤝 協作建議

### Git Commit 訊息

```bash
# 新增文檔
git commit -m "docs: add email service setup guide"

# 更新文檔
git commit -m "docs: update API endpoints documentation"

# 修正文檔
git commit -m "docs: fix typo in deployment guide"
```

### Pull Request

- 標題：`[Docs] 新增/更新 XXX 文檔`
- 說明：簡述新增或更新的內容

## 📞 需要協助？

如有任何文檔相關問題，請：
1. 查看 [docs/README.md](./README.md) 文檔索引
2. 參考現有文檔的格式
3. 聯絡專案維護者

---

**最後更新**: 2025-10-25

