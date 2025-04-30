# 霍爾果斯會計師事務所官方網站

這是霍爾果斯會計師事務所的官方網站專案，使用Hugo靜態網站生成器和Ananke主題構建。

## 網站功能

- 響應式設計，適合各種設備瀏覽
- 多頁面結構，包括首頁、服務介紹、團隊介紹、常見問題、部落格和聯絡頁面
- 首頁輪播展示
- 浮動聯絡按鈕（免費諮詢和LINE聯絡）
- 部落格搜尋和分類標籤功能
- 聯絡表單（使用Formspree）
- Google地圖整合

## 技術架構

- 靜態網站生成器: [Hugo](https://gohugo.io/)
- 主題: [Ananke](https://github.com/theNewDynamic/gohugo-theme-ananke)
- 表單處理: [Formspree](https://formspree.io/)
- 部署: GitHub Pages with GitHub Actions

## 安裝與使用

### 本地開發

1. 安裝Hugo (建議使用最新版本)

   ```bash
   # macOS
   brew install hugo
   
   # Windows (使用Chocolatey)
   choco install hugo -confirm
   
   # Linux
   snap install hugo
   ```

2. 克隆此儲存庫

   ```bash
   git clone https://github.com/yourusername/horgoscpa-website.git
   cd horgoscpa-website
   ```

3. 安裝Ananke主題

   ```bash
   git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke.git themes/ananke
   ```

4. 啟動本地開發伺服器

   ```bash
   hugo server -D
   ```

5. 在瀏覽器中訪問 http://localhost:1313 查看網站

### 部署

網站使用GitHub Actions自動部署到GitHub Pages。當推送到主分支時，會自動觸發部署流程。

要設置自動部署，您需要：

1. 在GitHub儲存庫設置中啟用GitHub Pages
2. 創建名為`GH_PAT`的儲存庫密鑰，並設置為具有適當權限的Personal Access Token
3. 確保`.github/workflows/deploy.yml`文件存在於儲存庫中

## 網站內容管理

### 添加新部落格文章

```bash
hugo new blog/my-new-post.md
```

然後編輯新創建的文件，添加內容並設置metadata。

### 修改服務項目

編輯`content/services/`目錄下的相應文件。

### 更新團隊成員

編輯`data/team.yaml`文件，更新或添加團隊成員信息。

## 自定義

- 修改`config.toml`更改基本設置
- 編輯`assets/css/custom.css`自定義樣式
- 修改`static/images`目錄下的圖片資源

## 維護說明

- 定期更新Hugo和主題版本以獲取最新功能和安全修復
- 備份網站內容和配置文件
- 監控網站性能和訪問數據
- 定期發布新的部落格文章以提高SEO表現

## 聯絡信息

霍爾果斯會計師事務所
- 地址：台中市西區建國路21號3樓之1
- 電話：04-2220-5606
- LINE ID：@208ihted
- 網站：www.horgoscpa.com

## 授權

本網站內容版權歸霍爾果斯會計師事務所所有。網站代碼採用MIT授權。