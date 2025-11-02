/**
 * ⚡ 通用缓存助手
 * 提供统一的缓存读写接口
 */

/**
 * 获取缓存
 * @param {Object} env - Cloudflare环境对象
 * @param {string} cacheKey - 缓存键
 * @returns {Promise<Object|null>} - 缓存数据或null
 */
export async function getCache(env, cacheKey) {
	try {
		const cache = await env.DATABASE.prepare(
			`SELECT cached_data, expires_at, hit_count
			 FROM UniversalDataCache
			 WHERE cache_key = ?`
		).bind(cacheKey).first();
		
		if (!cache) {
			return null;
		}
		
		// 检查是否过期
		const now = new Date();
		const expiresAt = new Date(cache.expires_at);
		
		if (now > expiresAt) {
			console.log(`[Cache] ⚠ 缓存已过期: ${cacheKey}`);
			// 删除过期缓存
			await env.DATABASE.prepare(
				`DELETE FROM UniversalDataCache WHERE cache_key = ?`
			).bind(cacheKey).run();
			return null;
		}
		
		// 更新命中次数和最后访问时间
		await env.DATABASE.prepare(
			`UPDATE UniversalDataCache 
			 SET hit_count = hit_count + 1, last_accessed_at = ?
			 WHERE cache_key = ?`
		).bind(now.toISOString(), cacheKey).run();
		
		const data = JSON.parse(cache.cached_data || '{}');
		console.log(`[Cache] ✓ 缓存命中: ${cacheKey} (命中次数: ${cache.hit_count + 1})`);
		
		return data;
	} catch (err) {
		console.error(`[Cache] 读取缓存失败 (${cacheKey}):`, err);
		return null;
	}
}

/**
 * 设置缓存
 * @param {Object} env - Cloudflare环境对象
 * @param {string} cacheKey - 缓存键
 * @param {string} cacheType - 缓存类型
 * @param {Object} data - 要缓存的数据
 * @param {Object} options - 选项
 * @param {number} options.ttlMinutes - 生存时间（分钟），默认60
 * @param {number} options.userId - 用户ID（可选）
 */
export async function setCache(env, cacheKey, cacheType, data, options = {}) {
	try {
		const now = new Date();
		const ttlMinutes = options.ttlMinutes || 60;
		const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
		const cachedJson = JSON.stringify(data);
		const dataSize = new Blob([cachedJson]).size;
		
		// UPSERT
		await env.DATABASE.prepare(
			`INSERT INTO UniversalDataCache (
				cache_key, cache_type, cached_data, user_id, data_size, 
				ttl_minutes, created_at, last_accessed_at, expires_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(cache_key) DO UPDATE SET
				cached_data = excluded.cached_data,
				data_size = excluded.data_size,
				last_accessed_at = excluded.last_accessed_at,
				expires_at = excluded.expires_at,
				hit_count = 0`
		).bind(
			cacheKey,
			cacheType,
			cachedJson,
			options.userId || null,
			dataSize,
			ttlMinutes,
			now.toISOString(),
			now.toISOString(),
			expiresAt.toISOString()
		).run();
		
		console.log(`[Cache] ✓ 缓存已保存: ${cacheKey} (${(dataSize / 1024).toFixed(2)}KB, TTL: ${ttlMinutes}min)`);
	} catch (err) {
		console.error(`[Cache] 保存缓存失败 (${cacheKey}):`, err);
	}
}

/**
 * 删除缓存
 * @param {Object} env - Cloudflare环境对象
 * @param {string} cacheKey - 缓存键或模式（支持LIKE）
 */
export async function deleteCache(env, cacheKey) {
	try {
		if (cacheKey.includes('%')) {
			// 批量删除（使用LIKE）
			await env.DATABASE.prepare(
				`DELETE FROM UniversalDataCache WHERE cache_key LIKE ?`
			).bind(cacheKey).run();
			console.log(`[Cache] ✓ 批量删除缓存: ${cacheKey}`);
		} else {
			// 单个删除
			await env.DATABASE.prepare(
				`DELETE FROM UniversalDataCache WHERE cache_key = ?`
			).bind(cacheKey).run();
			console.log(`[Cache] ✓ 删除缓存: ${cacheKey}`);
		}
	} catch (err) {
		console.error(`[Cache] 删除缓存失败 (${cacheKey}):`, err);
	}
}

/**
 * 清理过期缓存（定期执行）
 * @param {Object} env - Cloudflare环境对象
 */
export async function cleanExpiredCache(env) {
	try {
		const result = await env.DATABASE.prepare(
			`DELETE FROM UniversalDataCache WHERE datetime(expires_at) <= datetime('now')`
		).run();
		
		const deletedCount = result?.meta?.changes || 0;
		if (deletedCount > 0) {
			console.log(`[Cache] ✓ 清理过期缓存: ${deletedCount} 项`);
		}
		return deletedCount;
	} catch (err) {
		console.error('[Cache] 清理过期缓存失败:', err);
		return 0;
	}
}

