/**
 * Attachments Service - 附件管理服務
 * 規格來源：docs/開發指南/附件系統-完整規格.md
 * 
 * 核心功能：
 * 1. 文件上傳（含大小、類型驗證）
 * 2. 文件下載
 * 3. 文件刪除（R2 + 資料庫軟刪除）
 * 4. 附件列表查詢
 */

import { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { AttachmentsRepository } from '../repositories/AttachmentsRepository';

/**
 * 檔案上傳限制
 * 規格來源：L58-L92
 */
const FILE_UPLOAD_LIMITS = {
  // 單檔大小限制：10MB
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB = 10,485,760 bytes
  
  // 允許的檔案類型（MIME Type）
  ALLOWED_MIME_TYPES: [
    'application/pdf',                        // PDF
    'image/jpeg',                             // JPG/JPEG
    'image/png',                              // PNG
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // XLSX
    'application/vnd.ms-excel',               // XLS
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // DOCX
    'application/msword'                      // DOC
  ],
  
  // 允許的副檔名
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.docx', '.doc'],
  
  // 每個實體的附件數量限制
  MAX_FILES_PER_ENTITY: {
    client: 20,
    receipt: 5,
    sop: 10,
    task: 10
  } as { [key: string]: number }
};

export class AttachmentsService {
  private repository: AttachmentsRepository;

  constructor(private db: D1Database, private r2: R2Bucket) {
    this.repository = new AttachmentsRepository(db);
  }

  /**
   * 驗證上傳檔案
   * 規格來源：L94-L135
   */
  private async validateUploadFile(
    file: File,
    entityType: string,
    entityId: string
  ): Promise<{ valid: boolean; error?: string }> {
    // 1. 檔案大小驗證 (L106-L109)
    if (file.size > FILE_UPLOAD_LIMITS.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `檔案過大，最大限制為 ${FILE_UPLOAD_LIMITS.MAX_FILE_SIZE / 1024 / 1024}MB`
      };
    }

    // 2. MIME Type 驗證 (L112-L115)
    if (!FILE_UPLOAD_LIMITS.ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `不支援的檔案類型：${file.type}`
      };
    }

    // 3. 副檔名驗證 (L118-L124)
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!FILE_UPLOAD_LIMITS.ALLOWED_EXTENSIONS.includes(fileExt)) {
      return {
        valid: false,
        error: `不支援的檔案副檔名：${fileExt}`
      };
    }

    // 4. 數量限制檢查 (L127-L132)
    const currentCount = await this.repository.countByEntity(entityType, entityId);
    const maxCount = FILE_UPLOAD_LIMITS.MAX_FILES_PER_ENTITY[entityType] || 10;

    if (currentCount >= maxCount) {
      return {
        valid: false,
        error: `已達到附件數量上限（${maxCount}個）`
      };
    }

    return { valid: true };
  }

  /**
   * 清理檔名（移除不安全字元）
   * 規格來源：L137-L154
   */
  private sanitizeFileName(fileName: string): string {
    // 移除路徑符號和特殊字元 (L147-L150)
    return fileName
      .replace(/[\/\\:*?"<>|]/g, '_')  // 替換不安全字元
      .replace(/\s+/g, '_')             // 空白替換為底線
      .substring(0, 255);               // 限制檔名長度
  }

  /**
   * 生成 R2 儲存路徑
   * 規格來源：L156-L171
   */
  private generateR2Path(entityType: string, entityId: string, fileName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = this.sanitizeFileName(fileName);
    
    // 格式：{entity_type}/{entity_id}/{timestamp}_{random}_{filename}
    return `${entityType}/${entityId}/${timestamp}_${randomStr}_${sanitizedFileName}`;
  }

  /**
   * 上傳附件
   * 規格來源：L173-L228
   */
  async uploadFile(data: {
    entity_type: string;
    entity_id: string;
    file: File;
  }, uploaded_by: number): Promise<any> {
    // 1. 驗證檔案 (L185-L189)
    const validation = await this.validateUploadFile(
      data.file,
      data.entity_type,
      data.entity_id
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. 生成 R2 路徑 (L192-L193)
    const r2Path = this.generateR2Path(
      data.entity_type,
      data.entity_id,
      data.file.name
    );

    // 3. 上傳到 R2 (L196-L200)
    await this.r2.put(r2Path, data.file.stream(), {
      httpMetadata: {
        contentType: data.file.type
      }
    });

    // 4. 記錄到資料庫 (L204-L217)
    const attachment = await this.repository.create({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      file_name: data.file.name,
      file_path: r2Path,
      file_size: data.file.size,
      mime_type: data.file.type,
      uploaded_by
    });

    return {
      attachment_id: attachment.attachment_id,
      file_name: attachment.file_name,
      file_path: attachment.file_path,
      file_size: attachment.file_size
    };
  }

  /**
   * 獲取附件資訊
   */
  async getAttachment(attachmentId: number): Promise<any> {
    const attachment = await this.repository.findById(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }
    return attachment;
  }

  /**
   * 下載附件
   * 規格來源：L231-L260
   */
  async downloadFile(attachmentId: number): Promise<{
    file: R2ObjectBody;
    metadata: any;
  }> {
    // 1. 查詢附件資訊 (L237-L243)
    const attachment = await this.repository.findById(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // 2. 從 R2 獲取檔案 (L246-L250)
    const file = await this.r2.get(attachment.file_path);
    if (!file) {
      throw new Error('File not found in storage');
    }

    return {
      file,
      metadata: {
        file_name: attachment.file_name,
        mime_type: attachment.mime_type,
        file_size: attachment.file_size
      }
    };
  }

  /**
   * 刪除附件（R2 + 資料庫軟刪除）
   * 規格來源：L262-L286
   */
  async deleteFile(attachmentId: number): Promise<void> {
    // 1. 查詢附件資訊 (L268-L274)
    const attachment = await this.repository.findById(attachmentId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // 2. 從 R2 刪除檔案 (L277)
    await this.r2.delete(attachment.file_path);

    // 3. 軟刪除資料庫記錄 (L280-L282)
    await this.repository.delete(attachmentId);
  }

  /**
   * 查詢實體的所有附件
   */
  async listByEntity(entityType: string, entityId: string): Promise<any[]> {
    return await this.repository.findByEntity(entityType, entityId);
  }

  /**
   * 查詢附件列表（含分頁）
   */
  async listAll(filters: {
    entity_type?: string;
    uploaded_by?: number;
    page?: number;
    page_size?: number;
  } = {}): Promise<any> {
    const page = filters.page || 1;
    const page_size = filters.page_size || 20;
    const offset = (page - 1) * page_size;

    const items = await this.repository.findAll({
      entity_type: filters.entity_type,
      uploaded_by: filters.uploaded_by,
      limit: page_size,
      offset
    });

    const total = await this.repository.count({
      entity_type: filters.entity_type,
      uploaded_by: filters.uploaded_by
    });

    return {
      items,
      pagination: {
        page,
        page_size,
        total,
        total_pages: Math.ceil(total / page_size)
      }
    };
  }

  /**
   * 統計附件數量
   */
  async getStatistics(): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT 
        entity_type,
        COUNT(*) as count,
        COALESCE(SUM(file_size), 0) as total_size
      FROM Attachments
      WHERE is_deleted = 0
      GROUP BY entity_type
    `);

    const result = await stmt.all();

    return {
      by_type: result.results,
      total: result.results.reduce((sum: number, item: any) => sum + item.count, 0),
      total_size: result.results.reduce((sum: number, item: any) => sum + item.total_size, 0)
    };
  }
}

