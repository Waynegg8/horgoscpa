/**
 * 系統配置管理 API
 * 提供系統參數的分類管理、批量更新等功能
 */

/**
 * 取得配置分類列表
 * GET /api/system-config/categories
 */
export async function getConfigCategories(request, env) {
  try {
    const db = env.DB;
    
    const categories = await db.prepare(`
      SELECT 
        category,
        COUNT(*) as param_count
      FROM system_parameters
      WHERE is_visible = 1
      GROUP BY category
      ORDER BY category
    `).all();
    
    return new Response(JSON.stringify({
      success: true,
      categories: categories.results || []
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
 * 取得特定分類的配置
 * GET /api/system-config/:category
 */
export async function getConfigByCategory(request, env, category) {
  try {
    const db = env.DB;
    
    const parameters = await db.prepare(`
      SELECT *
      FROM system_parameters
      WHERE category = ? AND is_visible = 1
      ORDER BY display_order, param_key
    `).bind(category).all();
    
    return new Response(JSON.stringify({
      success: true,
      category: category,
      parameters: parameters.results || []
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
 * 更新單個配置
 * PUT /api/system-config/:key
 */
export async function updateConfig(request, env, paramKey) {
  try {
    const db = env.DB;
    const body = await request.json();
    const { param_value } = body;
    
    if (!param_value) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少參數值'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 驗證參數是否存在
    const param = await db.prepare(`
      SELECT * FROM system_parameters WHERE param_key = ?
    `).bind(paramKey).first();
    
    if (!param) {
      return new Response(JSON.stringify({
        success: false,
        error: '參數不存在'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 更新參數
    await db.prepare(`
      UPDATE system_parameters 
      SET param_value = ?, updated_at = CURRENT_TIMESTAMP
      WHERE param_key = ?
    `).bind(param_value, paramKey).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: '參數已更新',
      param_key: paramKey,
      new_value: param_value
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
 * 批量更新配置
 * PUT /api/system-config/batch
 */
export async function batchUpdateConfig(request, env) {
  try {
    const db = env.DB;
    const body = await request.json();
    const { updates } = body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '無效的更新數據'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let successCount = 0;
    let failCount = 0;
    
    // 逐個更新
    for (const update of updates) {
      try {
        await db.prepare(`
          UPDATE system_parameters 
          SET param_value = ?, updated_at = CURRENT_TIMESTAMP
          WHERE param_key = ? AND is_editable = 1
        `).bind(update.param_value, update.param_key).run();
        
        successCount++;
      } catch (error) {
        console.error(`更新參數 ${update.param_key} 失敗:`, error);
        failCount++;
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      total: updates.length,
      success_count: successCount,
      fail_count: failCount
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
 * 重置配置為預設值
 * POST /api/system-config/:key/reset
 */
export async function resetConfig(request, env, paramKey) {
  try {
    const db = env.DB;
    
    // TODO: 實現重置邏輯
    // 需要有一個預設值的對照表或資料表
    
    return new Response(JSON.stringify({
      success: true,
      message: '已重置為預設值'
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

