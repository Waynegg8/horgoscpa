import { jsonResponse, generateRequestId, corsPreflightResponse, getSessionUser, getCorsHeadersForRequest } from "./utils.js";
import { handleCMS } from "./api/cms.js";

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method.toUpperCase();
		const requestId = request.headers.get("X-Request-Id") || generateRequestId();

		const proxy = (host, newPath) => {
			const target = new URL(request.url);
			target.protocol = "https:";
			target.hostname = host;
			target.pathname = newPath;
			return fetch(new Request(target.toString(), request));
		};

		// CORS Preflight：處理 /api/v1/public/* 的 OPTIONS
		if (path.startsWith("/api/v1/public/") && method === "OPTIONS") {
			return corsPreflightResponse(request, env);
		}

		// Public API - 获取已发布文章列表（不需要登录）
		if (path === "/api/v1/public/articles" || path.startsWith("/api/v1/public/articles/")) {
			return handleCMS(request, env, null, requestId, url, path);
		}

		// 未匹配路徑
		return fetch(request);
	},

	// Scheduled Handler（Cron Triggers）
	async scheduled(event, env, ctx) {
		const requestId = crypto.randomUUID();
		console.log(JSON.stringify({ 
			level: "info", 
			requestId, 
			event: "cron_triggered", 
			scheduledTime: new Date(event.scheduledTime).toISOString(),
			cron: event.cron 
		}));
		// 内部系统相关的定时任务已移除
	},
};
