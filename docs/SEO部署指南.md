# SEO 與部署指南

## 部署後立即執行

### 1. 驗證 301 導向

測試以下 URL 是否正確導向：

```
https://www.horgoscpa.com/video.html → /resources.html (301)
https://www.horgoscpa.com/blog/[任意舊文章].html → /blog.html (301)
```

### 2. 提交新站點地圖

**Google Search Console**

1. 登入 https://search.google.com/search-console
2. 選擇網站資源
3. 前往「站點地圖」
4. 移除舊的 `video-sitemap.xml`（如有）
5. 提交新的 `sitemap_index.xml`
6. 等待索引更新（通常 1-7 天）

### 3. 設定 Analytics 註記

**Google Analytics**

1. 登入 GA4
2. 前往「管理」→「事件」
3. 新增自訂事件：
   - 資源下載追蹤
   - 計算機連結點擊
   - 文章分類瀏覽

### 4. 監控 404 錯誤

**工具**
- Google Search Console → 涵蓋範圍
- Cloudflare Analytics → 流量 404

**預期**
- 前 2 週可能出現舊 blog URL 的 404
- 確認 301 導向生效後會逐漸減少

## SEO 檢查清單

### 技術 SEO

- [x] `sitemap.xml` 已更新
- [x] `robots.txt` 正確（不阻擋新頁面）
- [x] 301 導向規則已設定（`_redirects`）
- [x] 所有頁面有唯一 `<title>` 與 `<meta description>`
- [x] 結構化資料 JSON-LD（文章頁、組織資訊）
- [ ] 確認 hreflang（如有多語言）
- [ ] Canonical URL 設定
- [ ] Open Graph 與 Twitter Card meta tags

### 內容 SEO

- [ ] 每篇文章有清晰的 H1-H6 結構
- [ ] 圖片有 alt 屬性
- [ ] 內部連結（文章間互連）
- [ ] 外部連結有 rel="noopener"
- [ ] 文章字數 1500+ 字

### 效能 SEO

- [ ] 圖片優化（WebP、壓縮、lazy load）
- [ ] CSS/JS 最小化
- [ ] CDN 加速（Cloudflare）
- [ ] Core Web Vitals 達標

## Lighthouse 目標

- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: 100

## 驗證工具

```bash
# 安裝 Lighthouse CLI（可選）
npm install -g lighthouse

# 測試首頁
lighthouse https://www.horgoscpa.com/index.html --output html --output-path report.html

# 測試 blog 列表
lighthouse https://www.horgoscpa.com/blog.html --output html --output-path blog-report.html

# 測試資源中心
lighthouse https://www.horgoscpa.com/resources.html --output html --output-path resources-report.html
```

## 斷鏈掃描

### 線上工具
- [Screaming Frog](https://www.screamingfrog.co.uk/seo-spider/)
- [W3C Link Checker](https://validator.w3.org/checklink)
- [Broken Link Checker](https://www.brokenlinkcheck.com/)

### 本地掃描（如有 Node.js）

```bash
npm install -g broken-link-checker
blc https://www.horgoscpa.com -ro
```

## 監控指標

### 前 30 天監控

- Search Console 涵蓋範圍錯誤
- 404 錯誤率
- 平均排名變化
- 點擊率（CTR）
- 索引頁面數

### 預期變化

- 第 1 週：索引頁面數下降（舊文章移除）
- 第 2-4 週：新文章逐步被索引
- 第 4-8 週：流量可能波動，正常現象
- 第 8 週後：流量應趨於穩定或成長

## Cloudflare Pages 設定

### _redirects 規則

檔案已建立於專案根目錄，Cloudflare Pages 會自動讀取。

### 自訂域名（如需）

1. Cloudflare Pages → 自訂網域
2. 設定 CNAME/A 記錄
3. 啟用 HTTPS
4. 強制 HTTPS 導向

## 緊急回滾方案

如需回滾至舊版：

1. Git 回復至前一版本
2. 重新部署
3. 提交舊版 sitemap

備份位置：（請自行備份舊 blog/ 與 video/）

## 聯絡人

- 技術問題：[技術負責人]
- SEO 問題：[SEO 負責人]
- 內容問題：[內容負責人]

---

最後更新：2025-10-25



