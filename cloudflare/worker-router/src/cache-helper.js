/**
 * ⚡ 通用数据缓存辅助模块
 * 策略：缓存永久有效，直到数据变动时主动失效
 */

/**
 * 生成缓存键
 * @param {string} cacheType - 缓存类型（如 'clients_list', 'holidays_all'）
 * @param {object} params - 参数对象（可选）
 */
export function generateCacheKey(cacheType, params = {}) {
	if (!params || Object.keys(params).length === 0) {
		return cacheType;
	}
	
	// 按字母顺序排序参数，确保相同参数生成相同的key
	const sortedParams = Object.keys(params)
		.sort()
		.map(k => `${k}=${params[k]}`)
		.join('&');
	
	return `${cacheType}:${sortedParams}`;
}

/**
 * 获取缓存
 * @param {object} env - Cloudflare环境
 * @param {string} cacheKey - 缓存键
 * @returns {Promise<object|null>} 缓存数据或null
 */
export async function getCache(env, cacheKey) {
	try {
		const cache = await env.DATABASE.prepare(
			`SELECT cached_data, last_updated_at, hit_count, data_version
			 FROM UniversalDataCache
			 WHERE cache_key = ? AND invalidated = 0`
		).bind(cacheKey).first();
		
		if (!cache) return null;
		
		// 更新访问时间和命中次数
		await env.DATABASE.prepare(
			`UPDATE UniversalDataCache 
			 SET last_accessed_at = datetime('now'), 
			     hit_count = hit_count + 1 
			 WHERE cache_key = ?`
		).bind(cacheKey).run();
		
		const data = JSON.parse(cache.cached_data || '{}');
		
		console.log('[Cache] ✓ 缓存命中', {
			key: cacheKey,
			hits: (cache.hit_count || 0) + 1,
			version: cache.data_version,
			updated: cache.last_updated_at
		});
		
		return {
			data,
			meta: {
				cached: true,
				hit_count: (cache.hit_count || 0) + 1,
				version: cache.data_version,
				last_updated: cache.last_updated_at
			}
		};
	} catch (err) {
		console.error('[Cache] 读取失败:', err);
		return null;
	}
}

/**
 * 保存缓存
 * @param {object} env - Cloudflare环境
 * @param {string} cacheKey - 缓存键
 * @param {string} cacheType - 缓存类型
 * @param {any} data - 要缓存的数据
 * @param {object} options - 可选参数
 */
export async function saveCache(env, cacheKey, cacheType, data, options = {}) {
	try {
		const now = new Date().toISOString();
		const cachedData = JSON.stringify(data);
		const dataSize = new TextEncoder().encode(cachedData).length;
		const userId = options.userId || null;
		const scopeParams = options.scopeParams ? JSON.stringify(options.scopeParams) : null;
		
		// UPSERT：如果存在则更新，否则插入（同时递增版本号并重置失效标记）
		await env.DATABASE.prepare(
			`INSERT INTO UniversalDataCache (cache_key, cache_type, cached_data, data_version, invalidated, user_id, scope_params, data_size, last_updated_at, last_accessed_at, created_at)
			 VALUES (?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(cache_key) DO UPDATE SET
			   cached_data = excluded.cached_data,
			   data_version = data_version + 1,
			   invalidated = 0,
			   data_size = excluded.data_size,
			   last_updated_at = excluded.last_updated_at,
			   last_accessed_at = excluded.last_accessed_at`
		).bind(cacheKey, cacheType, cachedData, userId, scopeParams, dataSize, now, now, now).run();
		
		console.log('[Cache] ✓ 缓存已保存', {
			key: cacheKey,
			type: cacheType,
			size: `${(dataSize / 1024).toFixed(1)}KB`
		});
		
		return true;
	} catch (err) {
		console.error('[Cache] 保存失败:', err);
		return false;
	}
}

/**
 * 失效缓存（按缓存键）
 * @param {object} env - Cloudflare环境
 * @param {string} cacheKey - 缓存键
 */
export async function invalidateCache(env, cacheKey) {
	try {
		await env.DATABASE.prepare(
			`UPDATE UniversalDataCache 
			 SET invalidated = 1 
			 WHERE cache_key = ?`
		).bind(cacheKey).run();
		
		console.log('[Cache] ✓ 缓存已失效', { key: cacheKey });
	} catch (err) {
		console.error('[Cache] 失效失败:', err);
	}
}

/**
 * 批量失效缓存（按缓存类型）
 * @param {object} env - Cloudflare环境
 * @param {string} cacheType - 缓存类型
 * @param {object} filters - 过滤条件（可选）
 */
export async function invalidateCacheByType(env, cacheType, filters = {}) {
	try {
		let sql = `UPDATE UniversalDataCache SET invalidated = 1 WHERE cache_type = ?`;
		const binds = [cacheType];
		
		// 如果有 user_id 过滤
		if (filters.userId) {
			sql += ` AND user_id = ?`;
			binds.push(filters.userId);
		}
		
		const result = await env.DATABASE.prepare(sql).bind(...binds).run();
		
		console.log('[Cache] ✓ 批量失效', {
			type: cacheType,
			filters,
			affected: result.changes || 0
		});
	} catch (err) {
		console.error('[Cache] 批量失效失败:', err);
	}
}

/**
 * 清理过期的失效缓存（定期维护）
 * @param {object} env - Cloudflare环境
 * @param {number} daysOld - 保留天数（默认7天）
 */
export async function cleanupInvalidatedCache(env, daysOld = 7) {
	try {
		const result = await env.DATABASE.prepare(
			`DELETE FROM UniversalDataCache 
			 WHERE invalidated = 1 
			   AND datetime(last_updated_at) < datetime('now', '-' || ? || ' days')`
		).bind(daysOld).run();
		
		console.log('[Cache] ✓ 清理完成', {
			deleted: result.changes || 0,
			older_than_days: daysOld
		});
	} catch (err) {
		console.error('[Cache] 清理失败:', err);
	}
}

/**
 * 获取缓存统计信息
 * @param {object} env - Cloudflare环境
 */
export async function getCacheStats(env) {
	try {
		const stats = await env.DATABASE.prepare(
			`SELECT * FROM CacheStats`
		).all();
		
		return stats.results || [];
	} catch (err) {
		console.error('[Cache] 获取统计失败:', err);
		return [];
	}
}
