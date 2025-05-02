# 導航欄包含使用指南

本項目使用了包含文件來統一導航欄，以下是各種使用方法。

## 方法1: 使用服務器端包含 (SSI)

對於支持SSI的服務器 (Apache, Nginx等)，使用以下代碼:

```html
<!-- 導航欄 (從navbar.html引入) -->
<!--#include virtual="/includes/navbar.html" -->
```

## 方法2: 使用PHP包含 

如果網站運行在PHP環境下，可使用:

```php
<?php include 'includes/navbar.php'; ?>
```

## 方法3: 使用JavaScript動態加載

在HTML中添加容器和腳本引用:

```html
<div id="navbar-container"></div>
<script src="/assets/js/navbar-loader.js"></script>
```

## 手動更新步驟

如果需要更新導航欄，只需修改以下文件:

1. `/includes/navbar.html` - 所有使用SSI或JS加載的頁面
2. `/includes/navbar.php` - 所有使用PHP include的頁面

修改後，所有頁面會自動使用新的導航欄結構。
