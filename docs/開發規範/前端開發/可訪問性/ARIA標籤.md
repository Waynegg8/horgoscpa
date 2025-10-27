# ARIA 標籤規範

**最後更新：** 2025年10月27日

---

## 表單欄位

```html
<label for="email">電子郵件</label>
<input
  id="email"
  type="email"
  aria-describedby="email-hint email-error"
  aria-invalid="false"
  aria-required="true"
/>
<small id="email-hint">請輸入有效的電子郵件</small>
<span id="email-error" role="alert">{{ error }}</span>
```

---

## ARIA 屬性

| 屬性 | 用途 | 範例 |
|------|------|------|
| `aria-label` | 提供文字標籤 | `<button aria-label="關閉">×</button>` |
| `aria-labelledby` | 引用其他元素作為標籤 | `<input aria-labelledby="label-id" />` |
| `aria-describedby` | 引用額外描述 | `<input aria-describedby="hint-id" />` |
| `aria-invalid` | 標記是否有效 | `<input aria-invalid="true" />` |
| `aria-required` | 標記是否必填 | `<input aria-required="true" />` |
| `aria-live` | 動態內容通知 | `<div aria-live="polite">...</div>` |
| `role` | 定義元素角色 | `<div role="alert">錯誤</div>` |

---

## 按鈕

```html
<!-- 有文字：不需要 aria-label -->
<button>儲存</button>

<!-- 僅圖示：需要 aria-label -->
<button aria-label="關閉">
  <svg>...</svg>
</button>
```

---

## 載入狀態

```html
<div v-if="isLoading" role="status" aria-live="polite">
  <span class="sr-only">載入中...</span>
  <LoadingSpinner />
</div>
```

---

**相關：** [鍵盤操作](./鍵盤操作.md) | [錯誤訊息](./錯誤訊息.md)

