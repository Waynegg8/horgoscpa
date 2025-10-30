import { jsonResponse, generateRequestId, corsPreflightResponse, getSessionUser, getCorsHeadersForRequest } from "./utils.js";
import { handleLogin, handleAuthMe } from "./auth.js";
import { handleClients } from "./api/clients.js";
import { handleTasks } from "./api/tasks.js";
import { handleTimesheets } from "./api/timesheets.js";
import { handleReceipts } from "./api/receipts.js";
import { handlePayroll } from "./api/payroll.js";
import { handleLeaves } from "./api/leaves.js";
import { handleDevSeeding } from "./api/dev.js";
import { handleOverhead } from "./api/overhead.js";
import { handleReports } from "./api/reports.js";
import { handleAttachments } from "./api/attachments.js";
import { handleSOP } from "./api/sop.js";
import { handleClientServices } from "./api/client_services.js";
import { handleCMS } from "./api/cms.js";
import { handleSettings } from "./api/settings.js";
import { handleDashboard } from "./api/dashboard.js";
import { handleAutomation } from "./api/automation.js";
import { handleHolidays } from "./api/holidays.js";
import { handleTags } from "./api/tags.js";

export default {
	async fetch(request, env) {
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

		// CORS Preflight：處理 /internal/api/* 的 OPTIONS
		if (path.startsWith("/internal/api/") && method === "OPTIONS") {
			return corsPreflightResponse(request, env);
		}

		// Auth routes
		if (path === "/internal/api/v1/auth/login") {
			return handleLogin(request, env, requestId);
		}
		if (path === "/internal/api/v1/auth/me") {
			return handleAuthMe(request, env, requestId);
		}

		// DEV routes (no session required, but env must not be prod)
		if (path.startsWith("/internal/api/v1/admin/dev-")) {
			return handleDevSeeding(request, env, requestId, path);
		}

		// Protected API routes we implement here
		if (path === "/internal/api/v1/clients" || path.startsWith("/internal/api/v1/clients/")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleClients(request, env, me, requestId, url);
		}
		if (path === "/internal/api/v1/tags" || path.startsWith("/internal/api/v1/tags/")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleTags(request, env, me, requestId, url);
		}
		if (path === "/internal/api/v1/tasks") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleTasks(request, env, me, requestId, url);
		}
		if (path === "/internal/api/v1/timesheets" || path === "/internal/api/v1/timelogs" || path === "/internal/api/v1/timelogs/batch") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleTimesheets(request, env, me, requestId, url);
		}
		if (path === "/internal/api/v1/receipts") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleReceipts(request, env, me, requestId, url);
		}
		if (path === "/internal/api/v1/attachments" || path === "/internal/api/v1/attachments/upload-sign" || path === "/internal/api/v1/attachments/upload-direct") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleAttachments(request, env, me, requestId, url, path);
		}
		if (path === "/internal/api/v1/leaves" || path === "/internal/api/v1/leaves/balances" || path === "/internal/api/v1/admin/cron/execute" || path === "/internal/api/v1/admin/cron/history") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleLeaves(request, env, me, requestId, url, path);
		}
		if (path === "/internal/api/v1/holidays") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleHolidays(request, env, me, requestId, url);
		}
		if (path.startsWith("/internal/api/v1/admin/payroll")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handlePayroll(request, env, me, requestId, url, path);
		}
		if (path.startsWith("/internal/api/v1/admin/overhead")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleOverhead(request, env, me, requestId, url, path);
		}
		if (path === "/internal/api/v1/admin/articles" || path === "/internal/api/v1/admin/faq" || path === "/internal/api/v1/admin/resources" || path === "/internal/api/v1/admin/services") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleCMS(request, env, me, requestId, url, path);
		}
		if (path.startsWith("/internal/api/v1/reports")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleReports(request, env, me, requestId, url, path);
		}

		if (path === "/internal/api/v1/sop") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleSOP(request, env, me, requestId, url, path);
		}

		if (path === "/internal/api/v1/dashboard") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleDashboard(request, env, me, requestId, url, path);
		}

		if (path === "/internal/api/v1/admin/automation-rules" || /\/internal\/api\/v1\/admin\/automation-rules\//.test(path)) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleAutomation(request, env, me, requestId, url, path);
		}

		// 系統設定（管理員）
		if (path === "/internal/api/v1/admin/settings" || path.startsWith("/internal/api/v1/admin/settings/")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleSettings(request, env, me, requestId, url, path);
		}

		if (path === "/internal/api/v1/client-services" || /\/internal\/api\/v1\/client-services\//.test(path)) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleClientServices(request, env, me, requestId, url, path);
		}

		// API 代理：/internal/api/* → <INTERNAL_API_HOST>/api/*
		if (path.startsWith("/internal/api/")) {
			return proxy(env.INTERNAL_API_HOST, path.replace("/internal", ""));
		}

		// 登入頁：/login → <INTERNAL_BASE_HOST>/login
		if (path === "/login" || path.startsWith("/login/")) {
			return proxy(env.INTERNAL_BASE_HOST, "/login");
		}

		// 其他內部頁面：/internal/* → 需要登入，否則導向 /login
		if (path.startsWith("/internal/")) {
			const row = await getSessionUser(request, env);
			if (!row) {
				const location = `/login?redirect=${encodeURIComponent(path)}`;
				return new Response(null, { status: 302, headers: { Location: location } });
			}
			return proxy(env.INTERNAL_BASE_HOST, path.replace("/internal", ""));
		}

		// 未匹配路徑（理論上不會因為 routes 只綁定特定路徑）
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

		try {
			// 執行補休到期轉加班費
			const now = new Date(event.scheduledTime);
			const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
			const lastDayOfLastMonth = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0));
			const expiryDate = `${lastDayOfLastMonth.getUTCFullYear()}-${String(lastDayOfLastMonth.getUTCMonth() + 1).padStart(2, '0')}-${String(lastDayOfLastMonth.getUTCDate()).padStart(2, '0')}`;
			const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

			// 掃描到期的補休記錄
			const expiredGrants = await env.DATABASE.prepare(
				`SELECT g.grant_id, g.user_id, g.hours_remaining, g.original_rate, u.base_salary
				 FROM CompensatoryLeaveGrants g
				 LEFT JOIN Users u ON g.user_id = u.user_id
				 WHERE g.expiry_date = ? AND g.status = 'active' AND g.hours_remaining > 0`
			).bind(expiryDate).all();

			let processedCount = 0;
			const grantIds = [];

			for (const grant of (expiredGrants?.results || [])) {
				const baseSalary = Number(grant.base_salary || 0);
				const hourlyRate = baseSalary / 240;
				const hours = Number(grant.hours_remaining || 0);
				const rate = Number(grant.original_rate || 1);
				const amountCents = Math.round(hours * hourlyRate * rate * 100);

				// 寫入加班費記錄
				await env.DATABASE.prepare(
					`INSERT INTO CompensatoryOvertimePay 
					 (user_id, year_month, hours_expired, amount_cents, source_grant_ids)
					 VALUES (?, ?, ?, ?, ?)`
				).bind(
					String(grant.user_id),
					currentMonth,
					hours,
					amountCents,
					JSON.stringify([grant.grant_id])
				).run();

				// 更新補休記錄狀態為 expired
				await env.DATABASE.prepare(
					`UPDATE CompensatoryLeaveGrants SET status = 'expired' WHERE grant_id = ?`
				).bind(grant.grant_id).run();

				grantIds.push(grant.grant_id);
				processedCount++;
			}

			// 記錄執行成功
			await env.DATABASE.prepare(
				`INSERT INTO CronJobExecutions 
				 (job_name, status, executed_at, details)
				 VALUES (?, 'success', datetime('now'), ?)`
			).bind('comp_leave_expiry', JSON.stringify({
				expiryDate,
				processedCount,
				grantIds,
				currentMonth,
				triggeredBy: 'cron'
			})).run();

			console.log(JSON.stringify({ 
				level: "info", 
				requestId, 
				event: "cron_completed", 
				processedCount,
				expiryDate,
				currentMonth
			}));

		} catch (err) {
			console.error(JSON.stringify({ 
				level: "error", 
				requestId, 
				event: "cron_failed", 
				error: String(err) 
			}));

			// 記錄執行失敗
			try {
				await env.DATABASE.prepare(
					`INSERT INTO CronJobExecutions 
					 (job_name, status, executed_at, error_message)
					 VALUES (?, 'failed', datetime('now'), ?)`
				).bind('comp_leave_expiry', String(err)).run();
			} catch (_) {
				console.error(JSON.stringify({ 
					level: "error", 
					requestId, 
					event: "failed_to_log_cron_error" 
				}));
			}
		}
	},
};



