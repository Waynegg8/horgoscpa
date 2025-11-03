import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

/**
 * 处理薪资系统设定相关请求
 */
export async function handlePayrollSettings(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);

	// 检查管理员权限
	if (!me || !me.is_admin) {
		return jsonResponse(403, {
			ok: false,
			code: "FORBIDDEN",
			message: "此功能仅限管理员使用",
			meta: { requestId }
		}, corsHeaders);
	}

	const method = request.method;

	try {
		// GET /admin/payroll-settings - 获取所有设定
		if (method === "GET" && path === "/internal/api/v1/admin/payroll-settings") {
			return await getPayrollSettings(env, requestId, corsHeaders);
		}

		// PUT /admin/payroll-settings - 批量更新设定
		if (method === "PUT" && path === "/internal/api/v1/admin/payroll-settings") {
			return await updatePayrollSettings(request, env, me, requestId, corsHeaders);
		}

		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "API 端点不存在",
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handlePayrollSettings] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 获取所有薪资系统设定
 */
async function getPayrollSettings(env, requestId, corsHeaders) {
	const settings = await env.DATABASE.prepare(`
		SELECT 
			setting_id,
			setting_key,
			setting_value,
			setting_type,
			category,
			display_name,
			description,
			updated_at
		FROM PayrollSettings
		ORDER BY category, setting_id
	`).all();

	const settingsData = (settings.results || []).map(s => ({
		settingId: s.setting_id,
		settingKey: s.setting_key,
		settingValue: s.setting_value,
		settingType: s.setting_type,
		category: s.category,
		displayName: s.display_name,
		description: s.description,
		updatedAt: s.updated_at
	}));

	// 按类别分组
	const grouped = {
		meal: settingsData.filter(s => s.category === 'meal'),
		transport: settingsData.filter(s => s.category === 'transport'),
		leave: settingsData.filter(s => s.category === 'leave'),
		general: settingsData.filter(s => s.category === 'general')
	};

	return jsonResponse(200, {
		ok: true,
		data: {
			settings: settingsData,
			grouped
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 批量更新薪资系统设定
 */
async function updatePayrollSettings(request, env, me, requestId, corsHeaders) {
	let body;
	try {
		body = await request.json();
	} catch (err) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_JSON",
			message: "请求数据格式错误",
			meta: { requestId }
		}, corsHeaders);
	}

	const { settings } = body; // settings: [{ settingKey, settingValue }]

	if (!Array.isArray(settings)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_DATA",
			message: "设定数据格式错误",
			meta: { requestId }
		}, corsHeaders);
	}

	try {
		// 更新每个设定
		for (const setting of settings) {
			if (!setting.settingKey || setting.settingValue === undefined) continue;

			await env.DATABASE.prepare(`
				UPDATE PayrollSettings 
				SET setting_value = ?, updated_by = ?, updated_at = datetime('now')
				WHERE setting_key = ?
			`).bind(setting.settingValue, me.user_id, setting.settingKey).run();
		}

		return jsonResponse(200, {
			ok: true,
			data: { message: "设定已更新" },
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[updatePayrollSettings] Database error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "更新失败",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 辅助函数：读取单个设定值
 * 供其他模块调用
 */
export async function getSettingValue(env, settingKey, defaultValue) {
	try {
		const setting = await env.DATABASE.prepare(
			`SELECT setting_value FROM PayrollSettings WHERE setting_key = ?`
		).bind(settingKey).first();

		if (!setting) return defaultValue;

		const value = setting.setting_value;
		
		// 尝试转换为数字
		const numValue = parseFloat(value);
		if (!isNaN(numValue)) return numValue;
		
		return value;
	} catch (error) {
		console.error(`[getSettingValue] Error reading ${settingKey}:`, error);
		return defaultValue;
	}
}

