// ================================================================
// 內容管理系統 (CMS) API
// 檔案: src/cms.js
// 日期: 2025-10-25
// 描述: 文章和資源管理，整合現有前端頁面
// ================================================================

import { verifySession, getSessionToken } from './auth.js';
import { jsonResponse } from './utils.js';

// ============================================================
// 1. 文章管理 API (後台)
// ============================================================

/**
 * 獲取所有文章（後台）
 */
export async function getPosts(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    let query = `SELECT * FROM blog_posts WHERE 1=1`;
    const params = [];
    
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY updated_at DESC`;
    
    const stmt = params.length > 0 
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);
    
    const result = await stmt.all();
    
    return jsonResponse({ success: true, posts: result.results });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 刪除文章
 */
export async function deletePost(request, env, postId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    // 刪除文章標籤
    await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(postId).run();
    
    // 刪除文章
    await env.DB.prepare('DELETE FROM blog_posts WHERE id = ?').bind(postId).run();
    
    return jsonResponse({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 創建文章
 */
export async function createPost(request, env) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const data = await request.json();
    
    const query = `
      INSERT INTO blog_posts (
        title, slug, category, content, summary, cover_image,
        meta_title, meta_description, meta_keywords,
        status, published_at, reading_minutes, author_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await env.DB.prepare(query).bind(
      data.title,
      data.slug,
      data.category || null,
      data.content,
      data.summary || null,
      data.cover_image || null,
      data.meta_title || data.title,
      data.meta_description || data.summary,
      data.meta_keywords || null,
      data.status || 'draft',
      data.status === 'published' ? (new Date().toISOString()) : null,
      data.reading_minutes || null,
      sessionData.username
    ).run();
    
    const postId = result.meta.last_row_id;
    
    // 添加標籤
    if (data.tags && Array.isArray(data.tags)) {
      for (const tag of data.tags) {
        await env.DB.prepare(
          'INSERT INTO post_tags (post_id, tag) VALUES (?, ?)'
        ).bind(postId, tag).run();
      }
    }
    
    return jsonResponse({ success: true, id: postId, message: 'Post created successfully' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 更新文章
 */
export async function updatePost(request, env, postId) {
  const token = getSessionToken(request);
  const sessionData = await verifySession(env.DB, token);
  if (!sessionData) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  try {
    const data = await request.json();
    
    const query = `
      UPDATE blog_posts SET
        title = ?,
        slug = ?,
        category = ?,
        content = ?,
        summary = ?,
        cover_image = ?,
        meta_title = ?,
        meta_description = ?,
        meta_keywords = ?,
        status = ?,
        published_at = ?,
        reading_minutes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    await env.DB.prepare(query).bind(
      data.title,
      data.slug,
      data.category || null,
      data.content,
      data.summary || null,
      data.cover_image || null,
      data.meta_title || data.title,
      data.meta_description || data.summary,
      data.meta_keywords || null,
      data.status,
      data.status === 'published' && !data.published_at ? (new Date().toISOString()) : data.published_at,
      data.reading_minutes || null,
      postId
    ).run();
    
    // 更新標籤
    if (data.tags && Array.isArray(data.tags)) {
      await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?').bind(postId).run();
      
      for (const tag of data.tags) {
        await env.DB.prepare(
          'INSERT INTO post_tags (post_id, tag) VALUES (?, ?)'
        ).bind(postId, tag).run();
      }
    }
    
    return jsonResponse({ success: true, message: 'Post updated successfully' });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

// ============================================================
// 2. 公開 API（前台）
// ============================================================

/**
 * 獲取已發布文章（公開）
 */
export async function getPublicPosts(request, env) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit')) || 20;
    
    let query = `
      SELECT id, title, slug, category, summary, cover_image, 
             published_at, reading_minutes, views_count
      FROM blog_posts 
      WHERE status = 'published'
    `;
    
    const params = [];
    
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY published_at DESC LIMIT ?`;
    params.push(limit);
    
    const result = await env.DB.prepare(query).bind(...params).all();
    
    return new Response(JSON.stringify({ success: true, data: result.results }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 獲取單篇文章（公開）
 */
export async function getPublicPost(request, env, slug) {
  try {
    const query = `
      SELECT * FROM blog_posts 
      WHERE slug = ? AND status = 'published'
    `;
    
    const post = await env.DB.prepare(query).bind(slug).first();
    
    if (!post) { return jsonResponse({ success: false, error: 'Post not found' }, 404); }
    
    // 增加閱讀數
    await env.DB.prepare(
      'UPDATE blog_posts SET views_count = views_count + 1 WHERE id = ?'
    ).bind(post.id).run();
    
    // 獲取標籤
    const tags = await env.DB.prepare(
      'SELECT tag FROM post_tags WHERE post_id = ?'
    ).bind(post.id).all();
    
    post.tags = tags.results.map(t => t.tag);
    
    return new Response(JSON.stringify({ success: true, data: post }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

/**
 * 獲取已發布資源（公開）
 */
export async function getPublicResources(request, env) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const category = url.searchParams.get('category');
    
    let query = `SELECT * FROM resources WHERE status = 'published'`;
    const params = [];
    
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }
    
    query += ` ORDER BY updated_at DESC`;
    
    const stmt = params.length > 0 
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query);
    
    const result = await stmt.all();
    
    return new Response(JSON.stringify({ success: true, data: result.results }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' } });
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

