/**
 * Knowledge Service - 知識管理服務
 * 核心功能：SOP 管理、客戶 SOP 關聯、知識庫管理
 */

import { D1Database } from '@cloudflare/workers-types';
import { SOPRepository, SOP } from '../repositories/SOPRepository';
import { KnowledgeRepository, KnowledgeArticle } from '../repositories/KnowledgeRepository';
import { ValidationError, ForbiddenError, NotFoundError, User, AppError } from '../types';
import { validateRequired } from '../utils/validation';
import { createAuditLog } from '../middleware/logger';

export class KnowledgeService {
  private sopRepo: SOPRepository;
  private knowledgeRepo: KnowledgeRepository;

  constructor(private db: D1Database) {
    this.sopRepo = new SOPRepository(db);
    this.knowledgeRepo = new KnowledgeRepository(db);
  }

  // ==================== SOP 文件管理 ====================

  /**
   * 查詢 SOP 列表
   */
  async getSOPs(filters: any, user: User): Promise<{ sops: any[]; total: number }> {
    return await this.sopRepo.findAll(filters);
  }

  /**
   * 創建 SOP（⭐ 小型事務所彈性設計：所有人可用）
   */
  async createSOP(data: { title: string; content: string; category?: string; tags?: string }, user: User): Promise<SOP> {
    validateRequired(data.title, '標題');
    validateRequired(data.content, '內容');

    const sop = await this.sopRepo.create({
      ...data,
      version: 1,
      is_published: false,
      created_by: user.user_id,
    });

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'CREATE',
      table_name: 'SOPDocuments',
      record_id: sop.sop_id!.toString(),
      changes: JSON.stringify(data),
    });

    return sop;
  }

  /**
   * 查詢 SOP 詳情
   */
  async getSOPById(sopId: number, user: User): Promise<SOP> {
    const sop = await this.sopRepo.findById(sopId);
    if (!sop) throw new NotFoundError('SOP 不存在');
    return sop;
  }

  /**
   * 更新 SOP（⭐ 小型事務所彈性設計：所有人可用，版本號自動+1）
   */
  async updateSOP(sopId: number, updates: Partial<SOP>, user: User): Promise<SOP> {
    const sop = await this.sopRepo.findById(sopId);
    if (!sop) throw new NotFoundError('SOP 不存在');

    const updated = await this.sopRepo.update(sopId, updates);

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'UPDATE',
      table_name: 'SOPDocuments',
      record_id: sopId.toString(),
      changes: JSON.stringify(updates),
    });

    return updated;
  }

  /**
   * 刪除 SOP（僅管理員）
   */
  async deleteSOP(sopId: number, user: User): Promise<void> {
    if (!user.is_admin) {
      throw new ForbiddenError('僅管理員可刪除 SOP');
    }

    const sop = await this.sopRepo.findById(sopId);
    if (!sop) throw new NotFoundError('SOP 不存在');

    await this.sopRepo.delete(sopId, user.user_id);

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'DELETE',
      table_name: 'SOPDocuments',
      record_id: sopId.toString(),
      changes: JSON.stringify({ deleted: true }),
    });
  }

  /**
   * 發布 SOP（⭐ 小型事務所彈性設計：所有人可用）
   */
  async publishSOP(sopId: number, user: User): Promise<void> {
    const sop = await this.sopRepo.findById(sopId);
    if (!sop) throw new NotFoundError('SOP 不存在');

    await this.sopRepo.publish(sopId);

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'UPDATE',
      table_name: 'SOPDocuments',
      record_id: sopId.toString(),
      changes: JSON.stringify({ is_published: true }),
    });
  }

  // ==================== 客戶專屬 SOP ====================

  /**
   * 查詢客戶關聯的 SOP
   */
  async getClientSOPs(clientId: string, user: User): Promise<any[]> {
    const result = await this.db.prepare(`
      SELECT 
        csl.*,
        sop.title,
        sop.category,
        sop.version,
        sop.is_published,
        u.name as assigned_by_name
      FROM ClientSOPLinks csl
      JOIN SOPDocuments sop ON csl.sop_id = sop.sop_id
      JOIN Users u ON csl.assigned_by = u.user_id
      WHERE csl.client_id = ? AND sop.is_deleted = 0
      ORDER BY csl.assigned_at DESC
    `).bind(clientId).all();

    return result.results || [];
  }

  /**
   * 關聯 SOP 到客戶（⭐ 小型事務所彈性設計：所有人可用）
   */
  async assignSOPToClient(clientId: string, sopId: number, notes: string | undefined, user: User): Promise<any> {
    // 1. 驗證客戶存在
    const client = await this.db.prepare(`
      SELECT * FROM Clients WHERE client_id = ? AND is_deleted = 0
    `).bind(clientId).first();

    if (!client) throw new NotFoundError('客戶不存在');

    // 2. 驗證 SOP 存在
    const sop = await this.sopRepo.findById(sopId);
    if (!sop) throw new NotFoundError('SOP 不存在');

    // 3. 檢查是否已關聯
    const existing = await this.db.prepare(`
      SELECT * FROM ClientSOPLinks
      WHERE client_id = ? AND sop_id = ?
    `).bind(clientId, sopId).first();

    if (existing) {
      throw new AppError(422, 'ALREADY_LINKED', '此 SOP 已關聯到該客戶');
    }

    // 4. 創建關聯
    await this.db.prepare(`
      INSERT INTO ClientSOPLinks (client_id, sop_id, assigned_by, notes)
      VALUES (?, ?, ?, ?)
    `).bind(clientId, sopId, user.user_id, notes || null).run();

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'CREATE',
      table_name: 'ClientSOPLinks',
      changes: JSON.stringify({ client_id: clientId, sop_id: sopId }),
    });

    return { message: '關聯成功' };
  }

  /**
   * 移除客戶 SOP 關聯（⭐ 小型事務所彈性設計：所有人可用）
   */
  async removeClientSOP(clientId: string, sopId: number, user: User): Promise<void> {
    const link = await this.db.prepare(`
      SELECT * FROM ClientSOPLinks
      WHERE client_id = ? AND sop_id = ?
    `).bind(clientId, sopId).first();

    if (!link) throw new NotFoundError('未找到關聯');

    await this.db.prepare(`
      DELETE FROM ClientSOPLinks
      WHERE client_id = ? AND sop_id = ?
    `).bind(clientId, sopId).run();

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'DELETE',
      table_name: 'ClientSOPLinks',
      changes: JSON.stringify({ client_id: clientId, sop_id: sopId }),
    });
  }

  // ==================== 知識庫 ====================

  /**
   * 查詢知識庫列表
   */
  async getKnowledge(filters: any, user: User): Promise<{ articles: any[]; total: number }> {
    return await this.knowledgeRepo.findAll(filters);
  }

  /**
   * 創建知識文章（⭐ 小型事務所彈性設計：所有人可用）
   */
  async createKnowledge(data: { title: string; content: string; category?: string; tags?: string }, user: User): Promise<KnowledgeArticle> {
    validateRequired(data.title, '標題');
    validateRequired(data.content, '內容');

    const article = await this.knowledgeRepo.create({
      ...data,
      is_published: false,
      created_by: user.user_id,
    });

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'CREATE',
      table_name: 'KnowledgeArticles',
      record_id: article.article_id!.toString(),
      changes: JSON.stringify(data),
    });

    return article;
  }

  /**
   * 查詢知識文章詳情（並增加瀏覽次數）
   */
  async getKnowledgeById(articleId: number, user: User): Promise<KnowledgeArticle> {
    const article = await this.knowledgeRepo.findById(articleId, true);
    if (!article) throw new NotFoundError('知識文章不存在');
    return article;
  }

  /**
   * 更新知識文章（⭐ 小型事務所彈性設計：所有人可用）
   */
  async updateKnowledge(articleId: number, updates: Partial<KnowledgeArticle>, user: User): Promise<KnowledgeArticle> {
    const article = await this.knowledgeRepo.findById(articleId);
    if (!article) throw new NotFoundError('知識文章不存在');

    const updated = await this.knowledgeRepo.update(articleId, updates);

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'UPDATE',
      table_name: 'KnowledgeArticles',
      record_id: articleId.toString(),
      changes: JSON.stringify(updates),
    });

    return updated;
  }

  /**
   * 刪除知識文章（僅管理員）
   */
  async deleteKnowledge(articleId: number, user: User): Promise<void> {
    if (!user.is_admin) {
      throw new ForbiddenError('僅管理員可刪除知識文章');
    }

    const article = await this.knowledgeRepo.findById(articleId);
    if (!article) throw new NotFoundError('知識文章不存在');

    await this.knowledgeRepo.delete(articleId, user.user_id);

    await createAuditLog(this.db, {
      user_id: user.user_id,
      action: 'DELETE',
      table_name: 'KnowledgeArticles',
      record_id: articleId.toString(),
      changes: JSON.stringify({ deleted: true }),
    });
  }

  /**
   * 搜尋知識庫
   */
  async searchKnowledge(query: string, user: User): Promise<any[]> {
    const result = await this.knowledgeRepo.findAll({
      search: query,
      is_published: true,
      limit: 100,
    });

    return result.articles;
  }
}

