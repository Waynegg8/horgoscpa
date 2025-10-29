/**
 * Payments Service - 收款管理服務
 * 規格來源：docs/開發指南/發票收款-完整規格.md
 * 
 * 核心功能：
 * 1. 記錄收款並自動更新收據狀態
 * 2. 收款統計與查詢
 */

import { D1Database } from '@cloudflare/workers-types';
import { PaymentsRepository } from '../repositories/PaymentsRepository';
import { ReceiptsRepository } from '../repositories/ReceiptsRepository';

export class PaymentsService {
  private paymentsRepo: PaymentsRepository;
  private receiptsRepo: ReceiptsRepository;

  constructor(private db: D1Database) {
    this.paymentsRepo = new PaymentsRepository(db);
    this.receiptsRepo = new ReceiptsRepository(db);
  }

  /**
   * 記錄收款並自動更新收據狀態
   * 規格來源：L437-L518
   */
  async recordPayment(data: {
    receipt_id: string;
    payment_date: string;
    amount: number;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
  }, received_by: number): Promise<any> {
    // 1. 創建收款記錄 (L469-L477)
    const payment = await this.paymentsRepo.create({
      ...data,
      received_by
    });

    // 2. 自動更新收據狀態 (L480-L517)
    await this.updateReceiptStatus(data.receipt_id);

    // 3. 返回更新後的收據資訊
    const receipt = await this.receiptsRepo.findById(data.receipt_id);
    const totalPaid = await this.paymentsRepo.getTotalPaidAmount(data.receipt_id);
    const remaining = receipt ? receipt.total_amount - totalPaid : 0;

    return {
      payment,
      receipt: {
        ...receipt,
        paid_amount: totalPaid,
        remaining_amount: remaining
      }
    };
  }

  /**
   * 自動更新收據狀態（根據已收款金額）
   * 規格來源：L480-L517
   */
  private async updateReceiptStatus(receiptId: string): Promise<void> {
    // 查詢收據資訊
    const receipt = await this.receiptsRepo.findById(receiptId);
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // 計算已收款總額 (L491-L495)
    const totalPaid = await this.paymentsRepo.getTotalPaidAmount(receiptId);

    // 計算未收金額 (L498)
    const remaining = receipt.total_amount - totalPaid;

    // 自動更新狀態 (L501-L515)
    let newStatus: string;

    if (remaining <= 0.01) {  // 容許 1 分錢誤差（浮點數精度問題）
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'unpaid';
    }

    // 更新收據狀態
    if (newStatus !== receipt.status) {
      await this.receiptsRepo.update(receiptId, { status: newStatus });
    }
  }

  /**
   * 查詢收款記錄
   */
  async getPaymentsByReceipt(receiptId: string): Promise<any[]> {
    return await this.paymentsRepo.findByReceiptId(receiptId);
  }

  /**
   * 刪除收款記錄並重新計算收據狀態
   */
  async deletePayment(paymentId: number): Promise<void> {
    // 1. 查詢收款記錄（獲取 receipt_id）
    const payment = await this.paymentsRepo.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // 2. 刪除收款記錄
    await this.paymentsRepo.delete(paymentId);

    // 3. 重新計算收據狀態
    await this.updateReceiptStatus(payment.receipt_id);
  }

  /**
   * 更新收款記錄
   */
  async updatePayment(paymentId: number, data: {
    payment_date?: string;
    amount?: number;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
  }): Promise<any> {
    // 1. 查詢原記錄
    const oldPayment = await this.paymentsRepo.findById(paymentId);
    if (!oldPayment) {
      throw new Error('Payment not found');
    }

    // 2. 更新收款記錄
    const payment = await this.paymentsRepo.update(paymentId, data);

    // 3. 重新計算收據狀態（特別是金額變更時）
    if (data.amount !== undefined) {
      await this.updateReceiptStatus(oldPayment.receipt_id);
    }

    return payment;
  }

  /**
   * 收款統計（按收款方式分組）
   * 規格來源：L537-L572
   */
  async getPaymentStatistics(filters: {
    start_date?: string;
    end_date?: string;
  } = {}): Promise<any> {
    const byMethod = await this.paymentsRepo.getTotalByMethod(filters);

    // 計算總計
    const total = byMethod.reduce((sum, item) => ({
      total_count: sum.total_count + item.payment_count,
      total_amount: sum.total_amount + item.total_amount
    }), { total_count: 0, total_amount: 0 });

    return {
      by_method: byMethod,
      total
    };
  }

  /**
   * 收款明細查詢
   */
  async getPaymentDetails(paymentId: number): Promise<any> {
    const payment = await this.paymentsRepo.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const receipt = await this.receiptsRepo.findByIdWithClient(payment.receipt_id);

    return {
      ...payment,
      receipt
    };
  }

  /**
   * 批量收款（針對同一客戶的多張收據）
   */
  async recordBulkPayments(data: {
    client_id: string;
    payment_date: string;
    total_amount: number;
    payment_method?: string;
    reference_number?: string;
    allocations: {
      receipt_id: string;
      amount: number;
    }[];
  }, received_by: number): Promise<any[]> {
    const results = [];

    // 驗證總額是否匹配
    const allocatedTotal = data.allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(allocatedTotal - data.total_amount) > 0.01) {
      throw new Error('分配金額總和與收款總額不符');
    }

    // 逐筆記錄收款
    for (const allocation of data.allocations) {
      const result = await this.recordPayment({
        receipt_id: allocation.receipt_id,
        payment_date: data.payment_date,
        amount: allocation.amount,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        notes: `批量收款：${data.reference_number || ''}`
      }, received_by);

      results.push(result);
    }

    return results;
  }
}

