/**
 * ExternalImages Repository - 外部圖片資料訪問層
 * 規格來源：docs/開發指南/外部內容管理-完整規格.md L86-L103
 */

import { D1Database } from '@cloudflare/workers-types';

export interface ExternalImage {
  image_id: number;
  title?: string | null;
  image_url: string;
  alt_text?: string | null;
  category?: string | null;
  file_size?: number | null;
  width?: number | null;
  height?: number | null;
  uploaded_by: number;
  uploaded_at: string;
  is_deleted: boolean;
}

export class ExternalImagesRepository {
  constructor(private db: D1Database) {}

  async findAll(options: {
    category?: string;
  } = {}): Promise<ExternalImage[]> {
    const { category } = options;

    let sql = 'SELECT * FROM ExternalImages WHERE is_deleted = 0';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY uploaded_at DESC';

    const result = await this.db.prepare(sql).bind(...params).all<ExternalImage>();
    return result.results || [];
  }

  async findById(imageId: number): Promise<ExternalImage | null> {
    const result = await this.db.prepare(`
      SELECT * FROM ExternalImages
      WHERE image_id = ? AND is_deleted = 0
    `).bind(imageId).first<ExternalImage>();
    return result || null;
  }

  async create(data: Omit<ExternalImage, 'image_id' | 'uploaded_at' | 'is_deleted'>): Promise<ExternalImage> {
    const result = await this.db.prepare(`
      INSERT INTO ExternalImages (
        title, image_url, alt_text, category, file_size, width, height, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      data.title || null, data.image_url, data.alt_text || null,
      data.category || null, data.file_size || null,
      data.width || null, data.height || null, data.uploaded_by
    ).first<ExternalImage>();

    if (!result) throw new Error('Failed to create image');
    return result;
  }

  async delete(imageId: number): Promise<void> {
    await this.db.prepare(`
      UPDATE ExternalImages
      SET is_deleted = 1
      WHERE image_id = ?
    `).bind(imageId).run();
  }

  async getCategories(): Promise<string[]> {
    const result = await this.db.prepare(`
      SELECT DISTINCT category
      FROM ExternalImages
      WHERE is_deleted = 0 AND category IS NOT NULL
      ORDER BY category
    `).all<{ category: string }>();

    return (result.results || []).map(r => r.category);
  }
}

