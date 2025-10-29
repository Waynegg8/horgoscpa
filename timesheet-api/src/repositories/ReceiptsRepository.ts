/**
 * Receipts Repository
 * 規格來源：docs/開發指南/發票收款-完整規格.md L40-L66
 */

import { D1Database } from '@cloudflare/workers-types';
import { Receipt } from '../types';

export class ReceiptsRepository {
  constructor(private db: D1Database) {}

  /**
   * 查詢收據列表
   * 支持過濾：client_id, status, receipt_date範圍
   */
  async findAll(filters: {
    client_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<Receipt[]> {
    let query = 'SELECT * FROM Receipts WHERE is_deleted = 0';
    const params: any[] = [];

    if (filters.client_id) {
      query += ' AND client_id = ?';
      params.push(filters.client_id);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.start_date) {
      query += ' AND receipt_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND receipt_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY receipt_date DESC, receipt_id DESC';

    const stmt = this.db.prepare(query).bind(...params);
    const result = await stmt.all();
    return result.results as Receipt[];
  }

  /**
   * 根據 receipt_id 查詢收據
   */
  async findById(receiptId: string): Promise<Receipt | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM Receipts 
      WHERE receipt_id = ? AND is_deleted = 0
    `).bind(receiptId);
    
    const result = await stmt.first();
    return result as Receipt | null;
  }

  /**
   * 檢查收據號碼是否已存在
   * 規格來源：L264
   */
  async checkNumberExists(receiptId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT receipt_id FROM Receipts WHERE receipt_id = ?
    `).bind(receiptId);
    
    const result = await stmt.first();
    return !!result;
  }

  /**
   * 獲取收據詳情（含客戶資訊）
   * 規格來源：L264
   */
  async findByIdWithClient(receiptId: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT 
        r.*,
        c.client_name
      FROM Receipts r
      LEFT JOIN Clients c ON r.client_id = c.client_id
      WHERE r.receipt_id = ?
    `).bind(receiptId);
    
    return await stmt.first();
  }

  /**
   * 創建收據
   * 規格來源：L260
   */
  async create(data: {
    receipt_id: string;
    client_id: string;
    receipt_date: string;
    due_date?: string;
    total_amount: number;
    status?: string;
    is_auto_generated?: boolean;
    notes?: string;
    created_by: number;
  }): Promise<Receipt> {
    const stmt = this.db.prepare(`
      INSERT INTO Receipts (
        receipt_id, client_id, receipt_date, due_date, total_amount,
        status, is_auto_generated, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.receipt_id,
      data.client_id,
      data.receipt_date,
      data.due_date || null,
      data.total_amount,
      data.status || 'unpaid',
      data.is_auto_generated ?? true,
      data.notes || null,
      data.created_by
    );

    const result = await stmt.first();
    return result as Receipt;
  }

  /**
   * 更新收據
   * 規格來源：L262
   */
  async update(receiptId: string, data: Partial<Receipt>): Promise<Receipt> {
    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = [
      'client_id', 'receipt_date', 'due_date', 'total_amount',
      'status', 'notes'
    ];

    for (const field of allowedFields) {
      if (field in data) {
        updates.push(`${field} = ?`);
        params.push((data as any)[field]);
      }
    }

    if (updates.length === 0) {
      const existing = await this.findById(receiptId);
      if (!existing) throw new Error('Receipt not found');
      return existing;
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(receiptId);

    const stmt = this.db.prepare(`
      UPDATE Receipts 
      SET ${updates.join(', ')}
      WHERE receipt_id = ? AND is_deleted = 0
      RETURNING *
    `).bind(...params);

    const result = await stmt.first();
    if (!result) throw new Error('Receipt not found');
    return result as Receipt;
  }

  /**
   * 作廢收據（軟刪除）
   * 規格來源：L263, L53-L54
   */
  async delete(receiptId: string, deletedBy: number): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE Receipts 
      SET 
        is_deleted = 1,
        deleted_at = datetime('now'),
        deleted_by = ?,
        status = 'cancelled'
      WHERE receipt_id = ?
    `).bind(deletedBy, receiptId);

    await stmt.run();
  }

  /**
   * 更新收據狀態
   * 規格來源：L387-L408（自動更新邏輯）
   */
  async updateStatus(receiptId: string, status: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE Receipts 
      SET status = ?, updated_at = datetime('now')
      WHERE receipt_id = ?
    `).bind(status, receiptId);

    await stmt.run();
  }

  /**
   * 查詢應收帳款（未收/部分收款）
   * 規格來源：L64（idx_receipts_status索引）
   */
  async findUnpaidReceipts(filters: {
    client_id?: string;
    overdue_only?: boolean;
  } = {}): Promise<Receipt[]> {
    let query = `
      SELECT * FROM Receipts 
      WHERE is_deleted = 0 
        AND status IN ('unpaid', 'partial')
    `;
    const params: any[] = [];

    if (filters.client_id) {
      query += ' AND client_id = ?';
      params.push(filters.client_id);
    }

    if (filters.overdue_only) {
      query += ' AND due_date < date(\'now\')';
    }

    query += ' ORDER BY due_date ASC, receipt_id';

    const stmt = this.db.prepare(query).bind(...params);
    const result = await stmt.all();
    return result.results as Receipt[];
  }

  /**
   * 應收帳款帳齡分析
   * 規格來源：L575-L627
   */
  async getAgingAnalysis(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT 
        r.receipt_id,
        r.client_id,
        c.client_name,
        r.receipt_date,
        r.due_date,
        r.total_amount,
        r.status,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (r.total_amount - COALESCE(SUM(p.amount), 0)) as outstanding_amount,
        CASE
          WHEN r.due_date IS NULL THEN 0
          WHEN r.due_date >= date('now') THEN 0
          ELSE julianday('now') - julianday(r.due_date)
        END as days_overdue
      FROM Receipts r
      LEFT JOIN Clients c ON r.client_id = c.client_id
      LEFT JOIN Payments p ON r.receipt_id = p.receipt_id
      WHERE r.is_deleted = 0 
        AND r.status IN ('unpaid', 'partial')
      GROUP BY r.receipt_id
      ORDER BY days_overdue DESC, r.receipt_date
    `);

    const result = await stmt.all();
    return result.results || [];
  }
}

