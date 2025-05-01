# 霍爾果斯會計師事務所網站

本網站為霍爾果斯會計師事務所官方網站，採用純 HTML/CSS/JS 架構，部署於 GitHub Pages + Cloudflare Pages。

## 結構說明

```
/
├── index.html             # 首頁
├── services.html          # 服務總覽頁
├── services/              # 各服務詳情頁
├── team.html              # 團隊介紹
├── faq.html               # 常見問題
├── contact.html           # 聯絡我們
├── blog.html              # 部落格總覽
├── blog/                  # 單篇文章頁
├── video.html             # 影片頁
├── assets/                # 圖片 / CSS / 字體
├── favicon.ico            # 網站 icon
├── manifest.json          # PWA 設定檔
├── sitemap.xml            # SEO 搜尋引擎索引
├── robots.txt             # 搜尋爬蟲指令
```

## 部署方式

### GitHub Pages
1. Push 所有檔案到 main 分支
2. GitHub 設定頁面 → Pages → 選擇 `main / root`
3. 部署完成網址為 `https://你的帳號.github.io/你的專案/`

### Cloudflare Pages
1. 新增 Pages 專案，綁定 GitHub Repo
2. Build command 留空，Framework preset 設定為 `None`
3. Output directory 設定為 `./`
4. 儲存並部署即可

## 維護說明

- 若要新增文章：複製 `blog/[文章].html`，改內容與連結
- 若要新增影片：編輯 `video.html`，新增卡片 + YouTube iframe
- 若要修改 FAQ：編輯 `faq.html` 裡的 `<details>` 區塊
- 若要新增服務：編輯 `services.html` + 新增 `services/[名稱].html`

## PWA 與品牌強化

- `favicon.ico` 為網站圖示
- `manifest.json` 設定網站名稱、主色與圖示
- HTML 頁面請在 `<head>` 加上：

```html
<link rel="icon" href="/favicon.ico" />
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0066cc" />
```

## 授權聲明

本專案由 AI 建構協助產出，使用者可自由部署於官網平台。