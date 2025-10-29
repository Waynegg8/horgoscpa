# OpenAPI / Swagger 規範

**給 AI：** API 文檔自動生成方案

---

## 📋 OpenAPI 3.0 基礎配置

### openapi.yaml

```yaml
openapi: 3.0.3
info:
  title: 會計師事務所內部管理系統 API
  description: |
    完整的內部管理系統 API 文檔
    
    **功能模塊：**
    - 認證系統
    - 客戶管理
    - 工時管理
    - 假期管理
    - 任務管理
    - 業務規則管理
    
  version: 1.0.0
  contact:
    name: API Support
    email: support@example.com

servers:
  - url: https://api.horgoscpa.pages.dev/api/v1
    description: 生產環境
  - url: https://api-staging.horgoscpa.pages.dev/api/v1
    description: 測試環境
  - url: http://localhost:8787/api/v1
    description: 本地開發

tags:
  - name: 認證
    description: 用戶登入登出相關
  - name: 客戶管理
    description: 客戶 CRUD 操作
  - name: 工時管理
    description: 工時記錄和補休管理
  - name: 假期管理
    description: 請假申請和假期餘額

components:
  securitySchemes:
    cookieAuth:
      type: apiKey
      in: cookie
      name: token
      
  schemas:
    Error:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              example: "VALIDATION_ERROR"
            message:
              type: string
              example: "公司名稱為必填"
              
    Client:
      type: object
      required:
        - client_id
        - company_name
        - assignee_user_id
      properties:
        client_id:
          type: string
          example: "12345678"
          description: 統一編號
        company_name:
          type: string
          example: "測試會計事務所"
          maxLength: 255
        tax_registration_number:
          type: string
          example: "12345678"
        business_status:
          type: string
          enum: [營業中, 暫停營業, 已結束營業]
          default: 營業中
        assignee_user_id:
          type: integer
          example: 1
          description: 負責員工 ID
        phone:
          type: string
          example: "02-1234-5678"
        email:
          type: string
          format: email
          example: "client@example.com"
        tags:
          type: array
          items:
            type: string
          example: ["VIP", "長期合作"]
        created_at:
          type: string
          format: date-time
          example: "2025-10-28T15:30:00Z"
          
    TimeLog:
      type: object
      required:
        - user_id
        - work_date
        - hours
        - work_type_id
      properties:
        log_id:
          type: integer
          example: 1
        user_id:
          type: integer
          example: 1
        work_date:
          type: string
          format: date
          example: "2025-10-28"
        client_id:
          type: string
          example: "12345678"
          nullable: true
        service_id:
          type: integer
          example: 1
          nullable: true
        work_type_id:
          type: integer
          example: 1
          description: 1=正常, 2=平日加班, 3=休息日加班, 4=國定假日加班
        hours:
          type: number
          format: float
          example: 8.5
          minimum: 0
          maximum: 24
        weighted_hours:
          type: number
          format: float
          example: 8.5
          description: 加權工時（自動計算）
        notes:
          type: string
          example: "整理傳票"
          maxLength: 500

security:
  - cookieAuth: []
```

---

## 🔌 API 端點定義

### 認證 API

```yaml
paths:
  /auth/login:
    post:
      tags:
        - 認證
      summary: 用戶登入
      description: 使用帳號密碼登入系統，返回 JWT Token
      operationId: login
      security: []  # 不需要認證
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - password
              properties:
                username:
                  type: string
                  example: "admin"
                password:
                  type: string
                  format: password
                  example: "password123"
      responses:
        '200':
          description: 登入成功
          headers:
            Set-Cookie:
              schema:
                type: string
                example: token=eyJhbGc...; Path=/; HttpOnly
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      user:
                        type: object
                        properties:
                          user_id:
                            type: integer
                            example: 1
                          username:
                            type: string
                            example: "admin"
                          name:
                            type: string
                            example: "張管理"
                          is_admin:
                            type: boolean
                            example: true
        '401':
          description: 帳號或密碼錯誤
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '403':
          description: 帳號已鎖定
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

### 客戶管理 API

```yaml
  /clients:
    get:
      tags:
        - 客戶管理
      summary: 查詢客戶列表
      description: |
        查詢客戶列表，支持搜尋和分頁
        - 管理員可查看所有客戶
        - 員工只能查看自己負責的客戶
      operationId: getClients
      parameters:
        - name: company_name
          in: query
          description: 公司名稱搜尋（模糊匹配）
          schema:
            type: string
        - name: assignee_user_id
          in: query
          description: 負責員工 ID（管理員可用）
          schema:
            type: integer
        - name: limit
          in: query
          description: 每頁數量
          schema:
            type: integer
            default: 50
            maximum: 100
        - name: offset
          in: query
          description: 偏移量
          schema:
            type: integer
            default: 0
        - name: fields
          in: query
          description: 返回字段（逗號分隔）
          schema:
            type: string
            example: "client_id,company_name,tags"
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Client'
                  pagination:
                    type: object
                    properties:
                      total:
                        type: integer
                        example: 150
                      limit:
                        type: integer
                        example: 50
                      offset:
                        type: integer
                        example: 0
        '401':
          description: 未登入
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
                
    post:
      tags:
        - 客戶管理
      summary: 新增客戶
      description: 新增客戶（僅管理員）
      operationId: createClient
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Client'
      responses:
        '201':
          description: 創建成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/Client'
        '403':
          description: 權限不足
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '422':
          description: 驗證錯誤
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
```

---

## 🛠️ 自動生成工具

### 1. 使用 TypeScript 裝飾器自動生成

```typescript
import { OpenAPIRoute, OpenAPIRouteSchema } from '@cloudflare/itty-router-openapi';

export class ClientList extends OpenAPIRoute {
  static schema: OpenAPIRouteSchema = {
    tags: ['客戶管理'],
    summary: '查詢客戶列表',
    parameters: {
      company_name: {
        description: '公司名稱搜尋',
        type: 'string',
        required: false
      },
      limit: {
        description: '每頁數量',
        type: 'integer',
        default: 50,
        maximum: 100
      }
    },
    responses: {
      200: {
        description: '成功',
        schema: {
          success: true,
          data: [ClientSchema],
          pagination: PaginationSchema
        }
      }
    }
  };
  
  async handle(request: Request, env: any, context: any, data: any) {
    // 實現邏輯
  }
}
```

### 2. 從代碼生成 OpenAPI 規範

```bash
# 安裝工具
npm install -D swagger-jsdoc swagger-ui-express

# 生成 openapi.json
npx swagger-jsdoc -d swaggerDef.js -o openapi.json src/**/*.ts
```

### 3. Swagger UI 集成

```typescript
// 提供 Swagger UI 界面
app.get('/api/docs', async (c) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui',
          });
        }
      </script>
    </body>
    </html>
  `;
  return c.html(html);
});

// 提供 OpenAPI JSON
app.get('/api/openapi.json', async (c) => {
  return c.json(openapiSpec);
});
```

---

## 📚 自動生成客戶端 SDK

### TypeScript SDK

```bash
# 使用 openapi-generator
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o ./sdk/typescript
```

### 使用生成的 SDK

```typescript
import { ClientsApi, Configuration } from './sdk/typescript';

const config = new Configuration({
  basePath: 'https://api.horgoscpa.pages.dev/api/v1',
  credentials: 'include'  // 包含 Cookie
});

const clientsApi = new ClientsApi(config);

// 查詢客戶
const clients = await clientsApi.getClients({
  company_name: '測試',
  limit: 50
});

// 新增客戶
const newClient = await clientsApi.createClient({
  clientCreateRequest: {
    client_id: '12345678',
    company_name: '新公司',
    assignee_user_id: 1
  }
});
```

---

## ✅ API 文檔最佳實踐

### 1. 完整的描述

```yaml
description: |
  ## 使用說明
  此 API 用於查詢客戶列表
  
  **權限：**
  - 管理員：可查看所有客戶
  - 員工：只能查看自己負責的客戶
  
  **搜尋：**
  - 支持模糊搜尋公司名稱
  - 支持多條件組合查詢
```

### 2. 豐富的示例

```yaml
examples:
  成功查詢:
    value:
      success: true
      data: [...]
  搜尋結果為空:
    value:
      success: true
      data: []
      pagination: { total: 0, limit: 50, offset: 0 }
```

### 3. 詳細的錯誤碼

```yaml
responses:
  422:
    description: 驗證錯誤
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/Error'
        examples:
          必填欄位缺失:
            value:
              success: false
              error:
                code: "VALIDATION_ERROR"
                message: "公司名稱為必填"
```

---

**使用 OpenAPI 規範可以自動生成文檔、驗證請求/響應，並生成客戶端 SDK。**

