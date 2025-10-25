// ================================================================
// 媒體檔案管理 API（整合 R2）
// 檔案: src/media.js
// 日期: 2025-10-25
// 描述: 統一的媒體上傳與管理，供 SOP、CMS 等功能使用
// ================================================================

import { verifySession, getSessionToken } from './auth.js';

// ============================================================
// 圖片上傳
// ============================================================

/**
 * 上傳圖片到 R2
 */
export async function uploadImage(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No file provided' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 驗證檔案類型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid file type. Only JPEG, PNG, GIF, WebP are allowed.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 驗證檔案大小（5MB）
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'File too large. Maximum size is 5MB.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 生成唯一檔名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomStr}.${ext}`;
    const key = `images/${fileName}`;

    // 上傳到 R2
    await env.MEDIA_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 記錄到資料庫
    await env.DB.prepare(`
      INSERT INTO media_library (filename, file_url, file_type, file_size, mime_type, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      fileName,
      key,
      'image',
      file.size,
      file.type,
      sessionData.username
    ).run();

    // 生成公開 URL（使用 R2 public URL 或自訂域名）
    const publicUrl = `https://media.horgoscpa.com/${key}`;

    return new Response(JSON.stringify({ 
      success: true,
      url: publicUrl,
      filename: fileName,
      size: file.size
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 獲取媒體列表
 */
export async function getMediaList(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'image';
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    const query = `
      SELECT * FROM media_library
      WHERE file_type = ?
      ORDER BY uploaded_at DESC
      LIMIT ?
    `;
    
    const result = await env.DB.prepare(query).bind(type, limit).all();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.results 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 刪除媒體檔案
 */
export async function deleteMedia(request, env, mediaId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData || sessionData.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 獲取檔案資訊
    const media = await env.DB.prepare(
      'SELECT * FROM media_library WHERE id = ?'
    ).bind(mediaId).first();

    if (!media) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Media not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 從 R2 刪除
    await env.MEDIA_BUCKET.delete(media.file_url);

    // 從資料庫刪除
    await env.DB.prepare('DELETE FROM media_library WHERE id = ?')
      .bind(mediaId)
      .run();

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Media deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

