/**
 * ReceiptSequence Repository
 * 規格來源：docs/開發指南/發票收款-完整規格.md L102-L116
 */

import { D1Database } from '@cloudflare/workers-types';

export class ReceiptSequenceRepository {
  constructor(private db: D1Database) {}

  /**
   * 獲取指定年月的流水號
   */
  async findByYearMonth(yearMonth: string): Promise<{ year_month: string; last_sequence: number } | null> {
    const stmt = this.db.prepare(`
      SELECT year_month, last_sequence 
      FROM ReceiptSequence 
      WHERE year_month = ?
    `).bind(yearMonth);
    
    const result = await stmt.first();
    return result as { year_month: string; last_sequence: number } | null;
  }

  /**
   * 生成下一個流水號（原子操作，併發安全）
   * 規格來源：L187-L196（UPSERT + RETURNING）
   */
  async getNextSequence(yearMonth: string): Promise<number> {
    const stmt = this.db.prepare(`
      INSERT INTO ReceiptSequence (year_month, last_sequence, updated_at)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(year_month) 
      DO UPDATE SET 
        last_sequence = last_sequence + 1,
        updated_at = datetime('now')
      RETURNING last_sequence
    `).bind(yearMonth);

    const result = await stmt.first() as { last_sequence: number } | null;
    if (!result) {
      throw new Error('Failed to generate sequence number');
    }

    return result.last_sequence;
  }

  /**
   * 創建新的年月流水號記錄
   */
  async create(yearMonth: string, lastSequence: number = 0): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO ReceiptSequence (year_month, last_sequence)
      VALUES (?, ?)
      ON CONFLICT(year_month) DO NOTHING
    `).bind(yearMonth, lastSequence);

    await stmt.run();
  }

  /**
   * 查詢所有流水號記錄（用於管理和統計）
   */
  async findAll(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM ReceiptSequence 
      ORDER BY year_month DESC
    `);
    
    const result = await stmt.all();
    return result.results || [];
  }

  /**
   * 重置指定年月的流水號（慎用，僅限管理員維護）
   */
  async reset(yearMonth: string, newSequence: number): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE ReceiptSequence 
      SET last_sequence = ?, updated_at = datetime('now')
      WHERE year_month = ?
    `).bind(newSequence, yearMonth);

    await stmt.run();
  }
}

