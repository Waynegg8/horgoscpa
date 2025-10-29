/**
 * ReceiptItems Repository
 * 規格來源：docs/開發指南/發票收款-完整規格.md L83-L97
 */

import { D1Database } from '@cloudflare/workers-types';
import { ReceiptItem } from '../types';

export class ReceiptItemsRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢指定收據的所有項目
   */
  async findByReceiptId(receiptId: string): Promise<ReceiptItem[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM ReceiptItems 
      WHERE receipt_id = ?
      ORDER BY item_id
    `).bind(receiptId);
    
    const result = await stmt.all();
    return result.results as ReceiptItem[];
  }

  /**
   * 根據 item_id 查詢單一項目
   */
  async findById(itemId: number): Promise<ReceiptItem | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM ReceiptItems WHERE item_id = ?
    `).bind(itemId);
    
    const result = await stmt.first();
    return result as ReceiptItem | null;
  }

  /**
   * 創建收據項目
   * 規格來源：L83-L94
   */
  async create(data: {
    receipt_id: string;
    service_id?: number;
    description: string;
    quantity?: number;
    unit_price: number;
    amount: number;
  }): Promise<ReceiptItem> {
    const stmt = this.db.prepare(`
      INSERT INTO ReceiptItems (
        receipt_id, service_id, description, quantity, unit_price, amount
      ) VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.receipt_id,
      data.service_id || null,
      data.description,
      data.quantity || 1,
      data.unit_price,
      data.amount
    );

    const result = await stmt.first();
    return result as ReceiptItem;
  }

  /**
   * 批量創建收據項目
   * 規格來源：L315-L329（開立收據時需要批量插入項目）
   */
  async createBatch(items: {
    receipt_id: string;
    service_id?: number;
    description: string;
    quantity?: number;
    unit_price: number;
    amount: number;
  }[]): Promise<ReceiptItem[]> {
    const results: ReceiptItem[] = [];

    for (const item of items) {
      const created = await this.create(item);
      results.push(created);
    }

    return results;
  }

  /**
   * 更新收據項目
   */
  async update(itemId: number, data: Partial<ReceiptItem>): Promise<ReceiptItem> {
    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'service_id', 'description', 'quantity', 'unit_price', 'amount'
    ];

    for (const field of allowedFields) {
      if (field in data) {
        updates.push(`${field} = ?`);
        params.push((data as any)[field]);
      }
    }

    if (updates.length === 0) {
      const existing = await this.findById(itemId);
      if (!existing) throw new Error('Receipt item not found');
      return existing;
    }

    params.push(itemId);

    const stmt = this.db.prepare(`
      UPDATE ReceiptItems 
      SET ${updates.join(', ')}
      WHERE item_id = ?
      RETURNING *
    `).bind(...params);

    const result = await stmt.first();
    if (!result) throw new Error('Receipt item not found');
    return result as ReceiptItem;
  }

  /**
   * 刪除收據項目
   */
  async delete(itemId: number): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM ReceiptItems WHERE item_id = ?
    `).bind(itemId);

    await stmt.run();
  }

  /**
   * 刪除指定收據的所有項目（用於更新收據時重建項目）
   */
  async deleteByReceiptId(receiptId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM ReceiptItems WHERE receipt_id = ?
    `).bind(receiptId);

    await stmt.run();
  }

  /**
   * 計算收據項目總額（用於驗證）
   */
  async calculateTotalAmount(receiptId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM ReceiptItems
      WHERE receipt_id = ?
    `).bind(receiptId);

    const result = await stmt.first() as { total: number } | null;
    return result?.total || 0;
  }
}

