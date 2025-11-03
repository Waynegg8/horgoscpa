import { jsonResponse, generateRequestId, corsPreflightResponse, getSessionUser, getCorsHeadersForRequest } from "./utils.js";
import { handleLogin, handleAuthMe, handleLogout } from "./auth.js";
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
import { handleFAQRequest } from "./api/faq.js";
import { handleDocumentsRequest } from "./api/documents.js";
import { handleClientServices } from "./api/client_services.js";
import { handleCMS } from "./api/cms.js";
import { handleSettings } from "./api/settings.js";
import { handleDashboard } from "./api/dashboard.js";
import { handleAutomation } from "./api/automation.js";
import { handleHolidays } from "./api/holidays.js";
import { handleTags } from "./api/tags.js";
import { handleBilling } from "./api/billing.js";
import { handleTaskTemplates } from "./api/task_templates.js";
import { handleServices } from "./api/services.js";
import { handleServiceComponents } from "./api/service_components.js";
import { handleManualGeneration } from "./api/task_generator.js";
import { handleTimesheetStats } from "./api/timesheet_stats.js";

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

		// CORS Preflight：處理 /internal/api/* 的 OPTIONS
		if (path.startsWith("/internal/api/") && method === "OPTIONS") {
			return corsPreflightResponse(request, env);
		}

	// ⚡ Cache Test Endpoint (for debugging)
	if (path === "/internal/api/v1/cache-test") {
		const { generateCacheKey, getCache, saveCache } = await import("./cache-helper.js");
		const corsHeaders = getCorsHeadersForRequest(request, env);
		
		try {
			const testKey = 'test_cache_key';
			const testData = { message: 'Hello Cache!', timestamp: new Date().toISOString() };
			
			// 尝试保存
			await saveCache(env, testKey, 'test', testData, {});
			
			// 尝试读取
			const cached = await getCache(env, testKey);
			
			return jsonResponse(200, {
				ok: true,
				message: '缓存测试成功',
				saved: testData,
				retrieved: cached,
				test_passed: cached && cached.data && cached.data.message === testData.message
			}, corsHeaders);
		} catch (err) {
			return jsonResponse(500, {
				ok: false,
				message: '缓存测试失败',
				error: String(err),
				stack: err.stack
			}, corsHeaders);
		}
	}
	
	// ⚡ Clients Cache Debug Endpoint
	if (path === "/internal/api/v1/cache-debug-clients") {
		const { generateCacheKey, getCache, saveCache } = await import("./cache-helper.js");
		const corsHeaders = getCorsHeadersForRequest(request, env);
		
		try {
			const cacheKey = generateCacheKey('clients_list', { page: 1, perPage: 50, q: '', tag_id: '' });
			
			// 1. 检查缓存是否存在
			const cached = await getCache(env, cacheKey);
			
			// 2. 如果不存在，创建一个测试数据并保存
			if (!cached) {
				const testData = {
					list: [{ clientId: 'test_001', companyName: 'Test Company' }],
					meta: { page: 1, perPage: 50, total: 1 }
				};
				
				await saveCache(env, cacheKey, 'clients_list', testData, {
					scopeParams: { page: 1, perPage: 50, q: '', tag_id: '' }
				});
				
				// 再次读取
				const recached = await getCache(env, cacheKey);
				
				return jsonResponse(200, {
					ok: true,
					message: '缓存调试：已创建测试数据',
					cacheKey,
					saved: testData,
					retrieved_after_save: recached
				}, corsHeaders);
			}
			
			// 3. 如果存在，返回缓存内容
			return jsonResponse(200, {
				ok: true,
				message: '缓存调试：缓存已存在',
				cacheKey,
				cached: cached
			}, corsHeaders);
		} catch (err) {
			return jsonResponse(500, {
				ok: false,
				message: '缓存调试失败',
				error: String(err),
				stack: err.stack
			}, corsHeaders);
		}
	}
	
	// ⚡ KV缓存预热端点（手动触发KV写入）
	if (path === "/internal/api/v1/kv-warmup" && method === "POST") {
		const corsHeaders = getCorsHeadersForRequest(request, env);
		const { saveKVCache } = await import("./kv-cache-helper.js");
		
		try {
			const me = await getSessionUser(request, env);
			if (!me || !me.is_admin) {
				return jsonResponse(403, {
					ok: false,
					message: '需要管理员权限'
				}, corsHeaders);
			}
			
			const warmupResults = [];
			
			// 1. 预热客户列表（使用perPage=100，匹配实际调用）
			const clientsRows = await env.DATABASE.prepare(
				`SELECT client_id, company_name, tax_registration_number, contact_person_1, 
				        phone, email, created_at, assignee_user_id
				 FROM Clients
				 WHERE is_deleted = 0
				 ORDER BY created_at DESC
				 LIMIT 100`
			).all();
			
			const clientsData = {
				list: (clientsRows?.results || []).map(r => ({
					clientId: r.client_id,
					companyName: r.company_name,
					taxId: r.tax_registration_number,
					contact_person_1: r.contact_person_1 || "",
					assigneeName: "",
					tags: [],
					phone: r.phone || "",
					email: r.email || "",
					createdAt: r.created_at,
					year_total: 0
				})),
				meta: { page: 1, perPage: 100, total: clientsRows?.results?.length || 0 }
			};
			
			const { generateCacheKey } = await import("./kv-cache-helper.js");
			const clientsCacheKey = generateCacheKey('clients_list', { page: 1, perPage: 100, q: '', tag_id: '' });
			await saveKVCache(env, clientsCacheKey, 'clients_list', clientsData, { ttl: 3600 });
			warmupResults.push({ type: 'clients_list', key: clientsCacheKey, count: clientsData.list.length });
			
			// 2. 预热假日数据（预热当前周和未来4周的假日数据）
			const today = new Date();
			const monday = new Date(today);
			monday.setDate(today.getDate() - today.getDay() + 1); // 本周一
			
			// 预热接下来5周的假日数据
			for (let weekOffset = 0; weekOffset < 5; weekOffset++) {
				const weekStart = new Date(monday);
				weekStart.setDate(monday.getDate() + (weekOffset * 7));
				const weekEnd = new Date(weekStart);
				weekEnd.setDate(weekStart.getDate() + 6);
				
				const startStr = weekStart.toISOString().substring(0, 10);
				const endStr = weekEnd.toISOString().substring(0, 10);
				
				const weekHolidaysRows = await env.DATABASE.prepare(
					`SELECT holiday_date, name, is_national_holiday, is_weekly_restday, is_makeup_workday
					 FROM Holidays
					 WHERE holiday_date BETWEEN ? AND ?
					 ORDER BY holiday_date ASC`
				).bind(startStr, endStr).all();
				
				const weekHolidaysData = (weekHolidaysRows?.results || []).map(r => ({
					holiday_date: r.holiday_date,
					date: r.holiday_date,
					name: r.name || "",
					is_national_holiday: Boolean(r.is_national_holiday),
					is_weekly_restday: Boolean(r.is_weekly_restday),
					is_makeup_workday: Boolean(r.is_makeup_workday),
				}));
				
				const weekHolidaysCacheKey = generateCacheKey('holidays_all', { start: startStr, end: endStr });
				await saveKVCache(env, weekHolidaysCacheKey, 'holidays_all', weekHolidaysData, { ttl: 3600 });
				
				if (weekOffset === 0) {
					warmupResults.push({ 
						type: 'holidays_all', 
						key: weekHolidaysCacheKey, 
						count: weekHolidaysData.length,
						week: `${startStr} to ${endStr}`
					});
				}
			}
			
			// 3. 预热请假余额（当前用户，当前年份）
			const currentYear = new Date().getFullYear();
			const leaveBalancesRows = await env.DATABASE.prepare(
				"SELECT leave_type, year, total, used, remain FROM LeaveBalances WHERE user_id = ? AND year = ? AND leave_type != 'comp'"
			).bind(String(me.user_id), currentYear).all();
			
			const leaveBalancesData = (leaveBalancesRows?.results || []).map(r => ({
				type: r.leave_type,
				year: Number(r.year),
				total: Number(r.total),
				used: Number(r.used),
				remain: Number(r.remain)
			}));
			
			const leaveBalancesCacheKey = generateCacheKey('leaves_balances', { userId: String(me.user_id), year: currentYear });
			await saveKVCache(env, leaveBalancesCacheKey, 'leaves_balances', leaveBalancesData, { ttl: 3600 });
			warmupResults.push({ type: 'leaves_balances', key: leaveBalancesCacheKey, count: leaveBalancesData.length });
			
			// 4. 预热月度统计（当前用户，当前月份）
			const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
			const [year, monthNum] = currentMonth.split('-');
			const startDate = `${year}-${monthNum}-01`;
			const nextMonth = parseInt(monthNum) === 12 ? `${parseInt(year) + 1}-01` : `${year}-${String(parseInt(monthNum) + 1).padStart(2, '0')}`;
			const endDate = `${nextMonth}-01`;
			
			const monthlyTimelogsRows = await env.DATABASE.prepare(
				`SELECT work_type, hours FROM Timesheets
				 WHERE user_id = ? AND work_date >= ? AND work_date < ? AND is_deleted = 0`
			).bind(me.user_id, startDate, endDate).all();
			
			let totalHours = 0, overtimeHours = 0;
			(monthlyTimelogsRows?.results || []).forEach(log => {
				const hours = parseFloat(log.hours) || 0;
				totalHours += hours;
				if (log.work_type && log.work_type > 1) { // 加班类型
					overtimeHours += hours;
				}
			});
			
			const monthlySummaryData = {
				month: currentMonth,
				total_hours: Math.round(totalHours * 10) / 10,
				overtime_hours: Math.round(overtimeHours * 10) / 10,
				weighted_hours: Math.round(totalHours * 10) / 10,
				leave_hours: 0
			};
			
			const monthlySummaryCacheKey = generateCacheKey('monthly_summary', { userId: me.user_id, month: currentMonth });
			console.log('[KV Warmup] 🔥 预热月度统计', { userId: me.user_id, month: currentMonth, cacheKey: monthlySummaryCacheKey, data: monthlySummaryData });
			await saveKVCache(env, monthlySummaryCacheKey, 'monthly_summary', monthlySummaryData, { ttl: 3600 });
			warmupResults.push({ type: 'monthly_summary', key: monthlySummaryCacheKey, month: currentMonth });
			
			// 5. 预热所有活跃客户的服务项目（解决渲染慢的核心问题）
			const allClientsRows = await env.DATABASE.prepare(
				`SELECT DISTINCT client_id FROM Clients WHERE is_deleted = 0 LIMIT 100`
			).all();
			
			let servicesWarmedCount = 0;
			for (const clientRow of (allClientsRows?.results || [])) {
				const clientId = clientRow.client_id;
				
				// 查询该客户的服务项目
				const clientServicesRows = await env.DATABASE.prepare(
					`SELECT DISTINCT cs.service_id
					 FROM ClientServices cs
					 WHERE cs.client_id = ? AND cs.is_deleted = 0 AND cs.service_id IS NOT NULL`
				).bind(clientId).all();
				
				let servicesData;
				if (clientServicesRows.results && clientServicesRows.results.length > 0) {
					const serviceIds = clientServicesRows.results.map(r => r.service_id);
					const placeholders = serviceIds.map(() => '?').join(',');
					const servicesRows = await env.DATABASE.prepare(
						`SELECT service_id, service_name, service_code, description
						 FROM Services
						 WHERE service_id IN (${placeholders}) AND is_active = 1
						 ORDER BY sort_order ASC, service_id ASC`
					).bind(...serviceIds).all();
					
					servicesData = (servicesRows?.results || []).map(s => ({
						service_id: s.service_id,
						service_name: s.service_name,
						service_code: s.service_code,
						description: s.description || ""
					}));
				} else {
					const allServicesRows = await env.DATABASE.prepare(
						`SELECT service_id, service_name, service_code, description
						 FROM Services
						 WHERE is_active = 1
						 ORDER BY sort_order ASC, service_id ASC`
					).all();
					servicesData = (allServicesRows?.results || []).map(s => ({
						service_id: s.service_id,
						service_name: s.service_name,
						service_code: s.service_code,
						description: s.description || ""
					}));
				}
				
				const clientServicesCacheKey = generateCacheKey('client_services', { clientId });
				await saveKVCache(env, clientServicesCacheKey, 'client_services', servicesData, { ttl: 3600 });
				servicesWarmedCount++;
			}
			
			warmupResults.push({ 
				type: 'client_services', 
				count: servicesWarmedCount, 
				note: '批量预热所有客户服务项目' 
			});
			
			return jsonResponse(200, {
				ok: true,
				message: '✅ KV缓存预热完成（需要60秒全球同步）',
				warmup: warmupResults,
				note: '请等待60秒后刷新页面测试，渲染速度将从1766ms降到<50ms！'
			}, corsHeaders);
		} catch (err) {
			console.error('[KV Warmup] 失败:', err);
			return jsonResponse(500, {
				ok: false,
				message: 'KV预热失败',
				error: String(err)
			}, corsHeaders);
		}
	}
	
	// Auth routes
	if (path === "/internal/api/v1/auth/login") {
		return handleLogin(request, env, requestId);
	}
	if (path === "/internal/api/v1/auth/me") {
		return handleAuthMe(request, env, requestId);
	}
	if (path === "/internal/api/v1/auth/logout") {
		return handleLogout(request, env, requestId);
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
		
		// 收费明细API
		if (path.startsWith("/internal/api/v1/billing/")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleBilling(request, env, me, requestId, url, path);
		}
		
	// 任务模板API
	if (path.startsWith("/internal/api/v1/task-templates")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		return handleTaskTemplates(request, env, me, requestId, url, path);
	}
	
	// 服务项目API（必须精确匹配，避免与/clients/.../services冲突）
	if (path === "/internal/api/v1/services" || 
	    path === "/internal/api/v1/services/items" ||
	    /^\/internal\/api\/v1\/services\/\d+(\/|$)/.test(path) ||
	    /^\/internal\/api\/v1\/services\/\d+\/items/.test(path)) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		return handleServices(request, env, me, requestId, url, path);
	}
	
	// 服务组成部分API
	if (path.includes("/client-services/") && path.includes("/components") || 
	    path.includes("/service-components/")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		const result = await handleServiceComponents(request, env, path);
		if (result) return result;
	}
	
	if (path === "/internal/api/v1/tasks" || path.startsWith("/internal/api/v1/tasks/")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		return handleTasks(request, env, me, requestId, url);
	}
	if (path === "/internal/api/v1/timesheets" || path.startsWith("/internal/api/v1/timelogs")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		return handleTimesheets(request, env, me, requestId, url);
	}
	
	// 工时统计和成本分析
	if (path === "/internal/api/v1/timesheets/my-stats" || path === "/internal/api/v1/admin/cost-analysis") {
		const result = await handleTimesheetStats(request, env, path);
		if (result) return result;
	}
	if (path === "/internal/api/v1/receipts" || path.startsWith("/internal/api/v1/receipts/")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		return handleReceipts(request, env, me, requestId, url);
	}
	if (path === "/internal/api/v1/attachments" || path.startsWith("/internal/api/v1/attachments/")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		return handleAttachments(request, env, me, requestId, url, path);
	}
		if (path === "/internal/api/v1/leaves" || path === "/internal/api/v1/leaves/balances" || path === "/internal/api/v1/leaves/life-events" || path === "/internal/api/v1/admin/cron/execute" || path === "/internal/api/v1/admin/cron/history") {
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
		if (path.startsWith("/internal/api/v1/admin/overhead") || path.startsWith("/internal/api/v1/admin/costs")) {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleOverhead(request, env, me, requestId, url, path);
		}
		// 手动触发任务生成
		if (path === "/internal/api/v1/admin/tasks/generate-from-components" && method === "POST") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			if (!me.is_admin) return jsonResponse(403, { ok:false, code:"FORBIDDEN", message:"沒有權限", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleManualGeneration(request, env);
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

	if (path === "/internal/api/v1/sop" || path.startsWith("/internal/api/v1/sop/")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		return handleSOP(request, env, me, requestId, url, path);
	}
	
	// FAQ API
	if (path === "/internal/api/v1/faq" || path.startsWith("/internal/api/v1/faq/")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		const result = await handleFAQRequest(request, env, null, path, me);
		if (result) return result;
	}
	
	// 内部文档资源中心 API
	if (path === "/internal/api/v1/documents" || path.startsWith("/internal/api/v1/documents/")) {
		const me = await getSessionUser(request, env);
		if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
		const result = await handleDocumentsRequest(request, env, null, path, me);
		if (result) return result;
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

		// 用戶列表（所有登录用户可访问）
		if (path === "/internal/api/v1/users") {
			const me = await getSessionUser(request, env);
			if (!me) return jsonResponse(401, { ok:false, code:"UNAUTHORIZED", message:"未登入", meta:{ requestId } }, getCorsHeadersForRequest(request, env));
			return handleSettings(request, env, me, requestId, url, path);
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



