# Service 層規範

**最後更新：** 2025年10月27日

---

## 職責

- ✅ 業務邏輯驗證
- ✅ 協調多個 Repository
- ✅ 交易處理
- ✅ 資料轉換
- ❌ 直接操作資料庫
- ❌ HTTP 請求處理

---

## 基本範例

```typescript
export class ClientService {
  constructor(
    private clientRepo: ClientRepository,
    private tagRepo: TagRepository
  ) {}

  async createClient(data: CreateClientRequest, userId: number): Promise<Client> {
    // 1. 業務邏輯驗證
    if (data.company_name.length < 2) {
      throw new AppError('VALIDATION_ERROR', '公司名稱至少需要2個字元', 400);
    }

    // 2. 檢查重複
    const existing = await this.clientRepo.findById(data.client_id);
    if (existing) {
      throw new AppError('CLIENT_EXISTS', '客戶已存在', 409);
    }

    // 3. 創建客戶
    const client = await this.clientRepo.create(data, userId);

    // 4. 處理標籤
    if (data.tags?.length > 0) {
      await this.tagRepo.assignTags(client.client_id, data.tags, userId);
    }

    return client;
  }
}
```

---

## 檢查清單

- [ ] 包含業務邏輯驗證
- [ ] 調用 Repository 操作資料
- [ ] 不直接操作資料庫
- [ ] 協調多個 Repository

---

**相關：** [Repository層](./Repository層.md) | [Route層](./Route層.md)

