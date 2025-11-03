/**
 * ⚡ Cloudflare KV 缓存辅助模块
 * 优势：读取延迟<50ms（vs D1的100-200ms）
 * 注意：写入有60秒延迟（最终一致性）
 */

/**
 * 生成缓存键
 * @param {string} cacheType - 缓存类型
 * @param {object} params - 参数对象
 */
export function generateCacheKey(cacheType, params = {}) {
	if (!params || Object.keys(params).length === 0) {
		return cacheType;
	}
	
	const sortedParams = Object.keys(params)
		.sort()
		.map(k => `${k}=${params[k]}`)
		.join('&');
	
	return `${cacheType}:${sortedParams}`;
}

/**
 * 从KV获取缓存
 * @param {object} env - Cloudflare环境（包含CACHE绑定）
 * @param {string} cacheKey - 缓存键
 * @returns {Promise<object|null>} 缓存数据或null
 */
export async function getKVCache(env, cacheKey) {
	try {
		const cached = await env.CACHE.get(cacheKey, { type: 'json' });
		
		if (!cached) return null;
		
		// 更新访问统计（异步，不阻塞响应）
		const stats = {
			hit_count: (cached.meta?.hit_count || 0) + 1,
			last_accessed: new Date().toISOString()
		};
		
		env.CACHE.put(
			cacheKey,
			JSON.stringify({ ...cached, meta: { ...cached.meta, ...stats } }),
			{ expirationTtl: 3600 } // 1小时过期
		).catch(err => console.error('[KV Cache] 更新统计失败:', err));
		
		console.log('[KV Cache] ✓ 缓存命中', {
			key: cacheKey,
			hits: stats.hit_count,
			age: Math.round((Date.now() - new Date(cached.meta?.cached_at || 0).getTime()) / 1000) + 's'
		});
		
		return {
			data: cached.data,
			meta: {
				cached: true,
				hit_count: stats.hit_count,
				cached_at: cached.meta?.cached_at
			}
		};
	} catch (err) {
		console.error('[KV Cache] 读取失败:', err);
		return null;
	}
}

/**
 * 保存数据到KV
 * @param {object} env - Cloudflare环境
 * @param {string} cacheKey - 缓存键
 * @param {string} cacheType - 缓存类型
 * @param {any} data - 要缓存的数据
 * @param {object} options - 可选参数
 */
export async function saveKVCache(env, cacheKey, cacheType, data, options = {}) {
	try {
		const now = new Date().toISOString();
		const cacheData = {
			data,
			meta: {
				cached_at: now,
				cache_type: cacheType,
				hit_count: 0,
				version: 1,
				user_id: options.userId || null,
				scope_params: options.scopeParams || null
			}
		};
		
		const jsonData = JSON.stringify(cacheData);
		const dataSize = new TextEncoder().encode(jsonData).length;
		
		// KV默认写入有60秒延迟，但边缘读取极快
		await env.CACHE.put(cacheKey, jsonData, {
			expirationTtl: options.ttl || 3600, // 默认1小时过期
			metadata: {
				type: cacheType,
				size: dataSize,
				cached_at: now
			}
		});
		
		console.log('[KV Cache] ✓ 缓存已保存', {
			key: cacheKey,
			type: cacheType,
			size: `${(dataSize / 1024).toFixed(1)}KB`,
			ttl: `${options.ttl || 3600}s`
		});
		
		return true;
	} catch (err) {
		console.error('[KV Cache] 保存失败:', err);
		return false;
	}
}

/**
 * 删除缓存
 * @param {object} env - Cloudflare环境
 * @param {string} cacheKey - 缓存键
 */
export async function deleteKVCache(env, cacheKey) {
	try {
		await env.CACHE.delete(cacheKey);
		console.log('[KV Cache] ✓ 缓存已删除', { key: cacheKey });
	} catch (err) {
		console.error('[KV Cache] 删除失败:', err);
	}
}

/**
 * 批量删除缓存（按前缀）
 * @param {object} env - Cloudflare环境
 * @param {string} prefix - 缓存键前缀
 */
export async function deleteKVCacheByPrefix(env, prefix) {
	try {
		const list = await env.CACHE.list({ prefix });
		const deletePromises = list.keys.map(key => env.CACHE.delete(key.name));
		await Promise.all(deletePromises);
		
		console.log('[KV Cache] ✓ 批量删除完成', {
			prefix,
			count: list.keys.length
		});
	} catch (err) {
		console.error('[KV Cache] 批量删除失败:', err);
	}
}

/**
 * 混合缓存策略：优先KV，降级到D1
 * @param {object} env - Cloudflare环境
 * @param {string} cacheKey - 缓存键
 * @param {Function} fetchData - 获取数据的函数
 * @param {object} options - 选项
 */
export async function getHybridCache(env, cacheKey, fetchData, options = {}) {
	try {
		// 1. 先尝试KV（极快）
		const kvCached = await getKVCache(env, cacheKey);
		if (kvCached) {
			return { ...kvCached, source: 'kv' };
		}
		
		// 2. KV未命中，尝试D1（备份缓存）
		if (options.useD1Fallback) {
			const { getCache } = await import('./cache-helper.js');
			const d1Cached = await getCache(env, cacheKey);
			if (d1Cached) {
				// 异步同步回KV
				saveKVCache(env, cacheKey, options.cacheType, d1Cached.data, options)
					.catch(err => console.error('[Hybrid Cache] KV同步失败:', err));
				return { ...d1Cached, source: 'd1' };
			}
		}
		
		// 3. 都未命中，获取新数据
		const freshData = await fetchData();
		
		// 4. 并行保存到KV和D1
		const savePromises = [
			saveKVCache(env, cacheKey, options.cacheType, freshData, options)
		];
		
		if (options.useD1Fallback) {
			const { saveCache } = await import('./cache-helper.js');
			savePromises.push(
				saveCache(env, cacheKey, options.cacheType, freshData, options)
			);
		}
		
		await Promise.all(savePromises);
		
		return {
			data: freshData,
			meta: { cached: false, source: 'fresh' }
		};
	} catch (err) {
		console.error('[Hybrid Cache] 失败:', err);
		// 降级：直接获取数据
		const freshData = await fetchData();
		return {
			data: freshData,
			meta: { cached: false, source: 'error_fallback' }
		};
	}
}

