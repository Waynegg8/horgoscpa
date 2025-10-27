# Route 層規範

**最後更新：** 2025年10月27日

---

## 職責

- ✅ 定義 API 端點
- ✅ 請求驗證
- ✅ 調用 Service
- ✅ 統一回應格式
- ❌ 業務邏輯
- ❌ 直接操作資料庫

---

## 基本範例

```typescript
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '@/middlewares/auth';

const app = new Hono();

app.use('*', authMiddleware);

app.post('/', async (c) => {
  // 1. 請求驗證
  const schema = z.object({
    client_id: z.string().length(8),
    company_name: z.string().min(2)
  });

  const body = await c.req.json();
  const data = schema.parse(body);

  // 2. 調用 Service
  const userId = c.get('userId');
  const service = new ClientService(
    new ClientRepository(c.env.DB)
  );

  const client = await service.createClient(data, userId);

  // 3. 統一回應
  return c.json({
    success: true,
    data: client
  }, 201);
});

export default app;
```

---

## 檢查清單

- [ ] 使用中間件處理認證/授權
- [ ] 請求驗證完整（Zod）
- [ ] 統一回應格式
- [ ] 調用 Service 執行業務邏輯

---

**相關：** [Service層](./Service層.md) | [API路由](../API/)

