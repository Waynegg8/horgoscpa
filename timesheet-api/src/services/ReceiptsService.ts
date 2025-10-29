/**
 * Receipts Service - 收據管理服務
 * 規格來源：docs/開發指南/發票收款-完整規格.md
 * 
 * 核心功能：
 * 1. 收據號碼自動生成（併發安全）
 * 2. 收據狀態自動更新
 * 3. 應收帳款帳齡分析
 */

import { D1Database } from '@cloudflare/workers-types';
import { ReceiptsRepository } from '../repositories/ReceiptsRepository';
import { ReceiptItemsRepository } from '../repositories/ReceiptItemsRepository';
import { ReceiptSequenceRepository } from '../repositories/ReceiptSequenceRepository';
import { PaymentsRepository } from '../repositories/PaymentsRepository';
import { Receipt, ReceiptItem } from '../types';

export class ReceiptsService {
  private receiptsRepo: ReceiptsRepository;
  private itemsRepo: ReceiptItemsRepository;
  private sequenceRepo: ReceiptSequenceRepository;
  private paymentsRepo: PaymentsRepository;

  constructor(private db: D1Database) {
    this.receiptsRepo = new ReceiptsRepository(db);
    this.itemsRepo = new ReceiptItemsRepository(db);
    this.sequenceRepo = new ReceiptSequenceRepository(db);
    this.paymentsRepo = new PaymentsRepository(db);
  }

  /**
   * 生成收據號碼（併發安全）
   * 規格來源：L154-L212
   * 
   * @param yearMonth - 指定年月（YYYYMM），不提供則使用當月
   * @param manualNumber - 手動指定號碼（可選）
   */
  async generateReceiptNumber(yearMonth?: string, manualNumber?: string): Promise<string> {
    // 1. 如果提供手動編號，直接使用 (L166-L181)
    if (manualNumber) {
      // 驗證格式 (L168-L169)
      if (!/^\d{6}-\d{3}$/.test(manualNumber)) {
        throw new Error('收據號碼格式錯誤（應為：YYYYMM-NNN）');
      }

      // 檢查是否已存在 (L173-L175)
      const exists = await this.receiptsRepo.checkNumberExists(manualNumber);
      if (exists) {
        throw new Error('收據號碼已存在');
      }

      return manualNumber;
    }

    // 2. 自動生成（使用原子操作，避免併發衝突）(L184-L196)
    const targetYearMonth = yearMonth || this.getCurrentYearMonth();

    // ⚠️ 使用 UPSERT + RETURNING 原子操作（併發安全）
    const nextSequence = await this.sequenceRepo.getNextSequence(targetYearMonth);

    // 檢查是否超過999（最大流水號）(L200-L206)
    if (nextSequence > 999) {
      throw new Error(
        '本月收據流水號已達上限（999張），請聯絡系統管理員升級流水號位數'
      );
    }

    // 生成收據號碼 (L209)
    const receiptNumber = `${targetYearMonth}-${String(nextSequence).padStart(3, '0')}`;

    return receiptNumber;
  }

  /**
   * 獲取當前年月（YYYYMM格式）
   */
  private getCurrentYearMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * 創建收據（含項目）
   * 規格來源：L367-L424
   */
  async createReceipt(data: {
    receipt_id?: string;
    is_auto_generated?: boolean;
    client_id: string;
    receipt_date: string;
    due_date?: string;
    items: {
      service_id?: number;
      description: string;
      quantity?: number;
      unit_price: number;
      amount: number;
    }[];
    notes?: string;
  }, created_by: number): Promise<any> {
    // 生成收據號碼 (L395-L397)
    const receipt_id = data.receipt_id || await this.generateReceiptNumber();

    // 計算總金額 (L406)
    const total_amount = data.items.reduce((sum, item) => sum + item.amount, 0);

    // 創建收據記錄 (L409-L417)
    const receipt = await this.receiptsRepo.create({
      receipt_id,
      client_id: data.client_id,
      receipt_date: data.receipt_date,
      due_date: data.due_date,
      total_amount,
      status: 'unpaid',
      is_auto_generated: data.is_auto_generated ?? true,
      notes: data.notes,
      created_by
    });

    // 批量創建收據項目 (L419-L420)
    const items = await this.itemsRepo.createBatch(
      data.items.map(item => ({
        receipt_id,
        ...item
      }))
    );

    return {
      ...receipt,
      items
    };
  }

  /**
   * 更新收據
   */
  async updateReceipt(receiptId: string, data: {
    receipt_date?: string;
    due_date?: string;
    items?: any[];
    notes?: string;
  }): Promise<any> {
    // 更新收據基本資訊
    const receipt = await this.receiptsRepo.update(receiptId, {
      receipt_date: data.receipt_date,
      due_date: data.due_date,
      notes: data.notes
    });

    // 如果有項目更新，重建項目
    if (data.items) {
      await this.itemsRepo.deleteByReceiptId(receiptId);
      const items = await this.itemsRepo.createBatch(
        data.items.map(item => ({
          receipt_id: receiptId,
          ...item
        }))
      );

      // 重新計算總金額
      const total_amount = items.reduce((sum: number, item) => sum + item.amount, 0);
      await this.receiptsRepo.update(receiptId, { total_amount });

      return {
        ...receipt,
        total_amount,
        items
      };
    }

    return receipt;
  }

  /**
   * 查詢收據詳情（含項目和收款記錄）
   */
  async getReceiptDetails(receiptId: string): Promise<any> {
    const receipt = await this.receiptsRepo.findById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    const items = await this.itemsRepo.findByReceiptId(receiptId);
    const payments = await this.paymentsRepo.findByReceiptId(receiptId);

    const paid_amount = await this.paymentsRepo.getTotalPaidAmount(receiptId);
    const remaining_amount = receipt.total_amount - paid_amount;

    return {
      ...receipt,
      items,
      payments,
      paid_amount,
      remaining_amount
    };
  }

  /**
   * 作廢收據
   * 規格來源：L53-L54
   */
  async deleteReceipt(receiptId: string, deletedBy: number): Promise<void> {
    await this.receiptsRepo.delete(receiptId, deletedBy);
  }

  /**
   * 檢查收據號碼是否可用
   * 規格來源：L264, L267-L293
   */
  async checkReceiptNumberAvailable(number: string): Promise<{
    available: boolean;
    existing_receipt?: any;
  }> {
    // 驗證格式 (L168-L169)
    if (!/^\d{6}-\d{3}$/.test(number)) {
      throw new Error('收據號碼格式錯誤（應為：YYYYMM-NNN）');
    }

    const exists = await this.receiptsRepo.checkNumberExists(number);

    if (exists) {
      const receipt = await this.receiptsRepo.findByIdWithClient(number);
      return {
        available: false,
        existing_receipt: receipt
      };
    }

    return {
      available: true
    };
  }

  /**
   * 查詢應收帳款列表（含客戶資訊）
   */
  async getUnpaidReceipts(filters: {
    client_id?: string;
    overdue_only?: boolean;
  } = {}): Promise<any[]> {
    return await this.receiptsRepo.findUnpaidReceipts(filters);
  }

  /**
   * 應收帳款帳齡分析
   * 規格來源：L575-L627, L770-L845
   */
  async getAgingAnalysis(): Promise<any> {
    const details = await this.receiptsRepo.getAgingAnalysis();

    // 計算帳齡分類 (L799-L825)
    const aging_summary = {
      current: { count: 0, amount: 0 },          // 未到期
      overdue_1_30: { count: 0, amount: 0 },     // 逾期1-30天
      overdue_31_60: { count: 0, amount: 0 },    // 逾期31-60天
      overdue_61_90: { count: 0, amount: 0 },    // 逾期61-90天
      overdue_over_90: { count: 0, amount: 0 }   // 逾期90天以上
    };

    const by_client: { [key: string]: any } = {};

    for (const item of details) {
      const days_overdue = item.days_overdue || 0;
      const outstanding = item.outstanding_amount || 0;

      // 分類統計
      if (days_overdue <= 0) {
        aging_summary.current.count++;
        aging_summary.current.amount += outstanding;
      } else if (days_overdue <= 30) {
        aging_summary.overdue_1_30.count++;
        aging_summary.overdue_1_30.amount += outstanding;
      } else if (days_overdue <= 60) {
        aging_summary.overdue_31_60.count++;
        aging_summary.overdue_31_60.amount += outstanding;
      } else if (days_overdue <= 90) {
        aging_summary.overdue_61_90.count++;
        aging_summary.overdue_61_90.amount += outstanding;
      } else {
        aging_summary.overdue_over_90.count++;
        aging_summary.overdue_over_90.amount += outstanding;
      }

      // 按客戶分組
      const client_id = item.client_id;
      if (!by_client[client_id]) {
        by_client[client_id] = {
          client_id,
          client_name: item.client_name,
          total_outstanding: 0,
          receipts: []
        };
      }

      by_client[client_id].total_outstanding += outstanding;
      by_client[client_id].receipts.push(item);
    }

    return {
      aging_summary,
      by_client: Object.values(by_client),
      details
    };
  }

  /**
   * 收據統計
   */
  async getReceiptStatistics(filters: {
    year?: number;
    month?: number;
  } = {}): Promise<any> {
    let query = `
      SELECT 
        COUNT(*) as total_receipts,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid_count,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN total_amount ELSE 0 END), 0) as unpaid_amount
      FROM Receipts
      WHERE is_deleted = 0
    `;

    const params: any[] = [];

    if (filters.year && filters.month) {
      query += ` AND strftime('%Y', receipt_date) = ? AND strftime('%m', receipt_date) = ?`;
      params.push(filters.year.toString(), String(filters.month).padStart(2, '0'));
    }

    const stmt = this.db.prepare(query).bind(...params);
    return await stmt.first();
  }
}

