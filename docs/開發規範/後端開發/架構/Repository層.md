# Repository 層規範

**最後更新：** 2025年10月27日

---

## 職責

- ✅ 執行 SQL 查詢
- ✅ 資料庫 CRUD 操作
- ✅ 處理資料庫錯誤
- ❌ 業務邏輯驗證
- ❌ 權限檢查

---

## 基本範例

```typescript
export class ClientRepository {
  constructor(private db: D1Database) {}

  async findById(clientId: string): Promise<Client | null> {
    const result = await this.db
      .prepare('SELECT * FROM Clients WHERE client_id = ? AND is_deleted = 0')
      .bind(clientId)
      .first();
    
    return result as Client | null;
  }

  async create(data: CreateClientData, userId: number): Promise<Client> {
    const now = new Date().toISOString();
    
    await this.db
      .prepare(`
        INSERT INTO Clients (
          client_id, company_name, contact_person,
          created_at, updated_at, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.client_id,
        data.company_name,
        data.contact_person || null,
        now, now, userId, userId
      )
      .run();

    return this.findById(data.client_id) as Promise<Client>;
  }
}
```

---

## 檢查清單

- [ ] 只包含資料庫操作
- [ ] 無業務邏輯
- [ ] 使用參數化查詢
- [ ] 錯誤處理使用 AppError

---

**相關：** [Service層](./Service層.md) | [資料庫操作](../資料庫/)

