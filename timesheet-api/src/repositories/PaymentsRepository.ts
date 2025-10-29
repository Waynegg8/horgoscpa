/**
 * Payments Repository
 * 規格來源：docs/開發指南/發票收款-完整規格.md L121-L138
 */

import { D1Database } from '@cloudflare/workers-types';
import { Payment } from '../types';

export class PaymentsRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢所有收款記錄
   * 支持過濾：receipt_id, payment_date範圍
   */
  async findAll(filters: {
    receipt_id?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<Payment[]> {
    let query = 'SELECT * FROM Payments WHERE 1=1';
    const params: any[] = [];

    if (filters.receipt_id) {
      query += ' AND receipt_id = ?';
      params.push(filters.receipt_id);
    }

    if (filters.start_date) {
      query += ' AND payment_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND payment_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY payment_date DESC, payment_id DESC';

    const stmt = this.db.prepare(query).bind(...params);
    const result = await stmt.all();
    return result.results as Payment[];
  }

  /**
   * 根據 payment_id 查詢收款記錄
   */
  async findById(paymentId: number): Promise<Payment | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM Payments WHERE payment_id = ?
    `).bind(paymentId);
    
    const result = await stmt.first();
    return result as Payment | null;
  }

  /**
   * 查詢指定收據的所有收款記錄
   * 規格來源：L136（idx_payments_receipt索引）
   */
  async findByReceiptId(receiptId: string): Promise<Payment[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM Payments 
      WHERE receipt_id = ?
      ORDER BY payment_date DESC, payment_id DESC
    `).bind(receiptId);
    
    const result = await stmt.all();
    return result.results as Payment[];
  }

  /**
   * 計算指定收據的已收款總額
   * 規格來源：L387-L408（自動更新狀態邏輯需要）
   */
  async getTotalPaidAmount(receiptId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM Payments
      WHERE receipt_id = ?
    `).bind(receiptId);

    const result = await stmt.first() as { total: number } | null;
    return result?.total || 0;
  }

  /**
   * 創建收款記錄
   * 規格來源：L410-L454
   */
  async create(data: {
    receipt_id: string;
    payment_date: string;
    amount: number;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
    received_by: number;
  }): Promise<Payment> {
    const stmt = this.db.prepare(`
      INSERT INTO Payments (
        receipt_id, payment_date, amount, payment_method,
        reference_number, notes, received_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.receipt_id,
      data.payment_date,
      data.amount,
      data.payment_method || null,
      data.reference_number || null,
      data.notes || null,
      data.received_by
    );

    const result = await stmt.first();
    return result as Payment;
  }

  /**
   * 更新收款記錄
   */
  async update(paymentId: number, data: Partial<Payment>): Promise<Payment> {
    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'payment_date', 'amount', 'payment_method', 'reference_number', 'notes'
    ];

    for (const field of allowedFields) {
      if (field in data) {
        updates.push(`${field} = ?`);
        params.push((data as any)[field]);
      }
    }

    if (updates.length === 0) {
      const existing = await this.findById(paymentId);
      if (!existing) throw new Error('Payment not found');
      return existing;
    }

    params.push(paymentId);

    const stmt = this.db.prepare(`
      UPDATE Payments 
      SET ${updates.join(', ')}
      WHERE payment_id = ?
      RETURNING *
    `).bind(...params);

    const result = await stmt.first();
    if (!result) throw new Error('Payment not found');
    return result as Payment;
  }

  /**
   * 刪除收款記錄（物理刪除，慎用）
   */
  async delete(paymentId: number): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM Payments WHERE payment_id = ?
    `).bind(paymentId);

    await stmt.run();
  }

  /**
   * 查詢收款統計（按日期範圍）
   * 規格來源：L629-L670
   */
  async getPaymentStatistics(filters: {
    start_date?: string;
    end_date?: string;
    client_id?: string;
  } = {}): Promise<any> {
    let query = `
      SELECT 
        COUNT(DISTINCT p.payment_id) as total_payments,
        COUNT(DISTINCT p.receipt_id) as receipts_with_payments,
        COALESCE(SUM(p.amount), 0) as total_amount,
        AVG(p.amount) as avg_payment_amount
      FROM Payments p
      LEFT JOIN Receipts r ON p.receipt_id = r.receipt_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.start_date) {
      query += ' AND p.payment_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND p.payment_date <= ?';
      params.push(filters.end_date);
    }

    if (filters.client_id) {
      query += ' AND r.client_id = ?';
      params.push(filters.client_id);
    }

    const stmt = this.db.prepare(query).bind(...params);
    return await stmt.first();
  }

  /**
   * 查詢收款明細（含客戶和收據資訊）
   * 規格來源：L455-L509
   */
  async findAllWithDetails(filters: {
    start_date?: string;
    end_date?: string;
    client_id?: string;
  } = {}): Promise<any[]> {
    let query = `
      SELECT 
        p.*,
        r.client_id,
        r.total_amount as receipt_total_amount,
        c.client_name
      FROM Payments p
      LEFT JOIN Receipts r ON p.receipt_id = r.receipt_id
      LEFT JOIN Clients c ON r.client_id = c.client_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.start_date) {
      query += ' AND p.payment_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND p.payment_date <= ?';
      params.push(filters.end_date);
    }

    if (filters.client_id) {
      query += ' AND r.client_id = ?';
      params.push(filters.client_id);
    }

    query += ' ORDER BY p.payment_date DESC, p.payment_id DESC';

    const stmt = this.db.prepare(query).bind(...params);
    const result = await stmt.all();
    return result.results || [];
  }
}

