/**
 * R2 Bucket工具函數
 * 規格來源：docs/開發指南/外部內容管理-完整規格.md L590-L643
 */

import { R2Bucket } from '@cloudflare/workers-types';

// 文件大小限制（bytes）
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (L641)
export const MAX_RESOURCE_SIZE = 10 * 1024 * 1024; // 10MB (L642)

// 支持的文件類型
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
export const ALLOWED_RESOURCE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/zip'
];

/**
 * 上傳文件到 R2 Bucket (L612-L624)
 */
export async function uploadToR2(
  bucket: R2Bucket,
  file: File,
  path: string,
  cdnBaseUrl: string
): Promise<{ fileUrl: string; r2Key: string }> {
  // 生成唯一文件名
  const timestamp = Date.now();
  const sanitizedFileName = sanitizeFileName(file.name);
  const r2Key = `${path}/${timestamp}-${sanitizedFileName}`;

  // 上傳到 R2
  await bucket.put(r2Key, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  });

  // 返回公開 URL
  const fileUrl = `${cdnBaseUrl}/${r2Key}`;
  return { fileUrl, r2Key };
}

/**
 * 從 R2 Bucket 獲取文件
 */
export async function getFromR2(bucket: R2Bucket, r2Key: string): Promise<R2ObjectBody | null> {
  return await bucket.get(r2Key);
}

/**
 * 從 R2 Bucket 刪除文件
 */
export async function deleteFromR2(bucket: R2Bucket, r2Key: string): Promise<void> {
  await bucket.delete(r2Key);
}

/**
 * 驗證圖片文件
 */
export function validateImageFile(file: File): void {
  // 驗證文件類型 (L481-L483)
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid image type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  // 驗證文件大小 (L485-L488, L641)
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image size exceeds maximum limit of ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
  }
}

/**
 * 驗證資源文件
 */
export function validateResourceFile(file: File): void {
  // 驗證文件類型
  if (!ALLOWED_RESOURCE_TYPES.includes(file.type)) {
    throw new Error(`Invalid resource type. Allowed types: PDF, Excel, Word, ZIP`);
  }

  // 驗證文件大小 (L436-L439, L642)
  if (file.size > MAX_RESOURCE_SIZE) {
    throw new Error(`Resource size exceeds maximum limit of ${MAX_RESOURCE_SIZE / 1024 / 1024}MB`);
  }
}

/**
 * 驗證並標準化 Slug (L635-L638)
 */
export function validateSlug(slug: string): void {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens (e.g., company-setup-guide)');
  }
}

/**
 * 清理文件名（移除特殊字符）
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/--+/g, '-')
    .toLowerCase();
}

/**
 * 獲取圖片尺寸 (L494-L495)
 * 注意：在 Workers 環境中需要使用不同的方法
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  // 在 Cloudflare Workers 環境中，我們無法直接獲取圖片尺寸
  // 這裡返回默認值，前端應該在上傳前提供
  // 或者可以使用第三方庫解析圖片 buffer
  return { width: 0, height: 0 };
}

/**
 * 驗證 SEO 優化欄位 (L645-L648)
 */
export function validateSEO(seoTitle?: string, seoDescription?: string): void {
  if (seoTitle && (seoTitle.length < 50 || seoTitle.length > 60)) {
    console.warn('SEO Title should be 50-60 characters for best results');
  }

  if (seoDescription && (seoDescription.length < 150 || seoDescription.length > 160)) {
    console.warn('SEO Description should be 150-160 characters for best results');
  }
}

