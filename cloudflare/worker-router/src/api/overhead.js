import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";

export async function handleOverhead(request, env, me, requestId, url, path) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();

	if (path === "/internal/api/v1/admin/overhead-types") {
		if (method === "GET") {
			try {
				const params = url.searchParams;
				const page = Math.max(1, parseInt(params.get("page") || "1", 10));
				const perPage = Math.min(100, Math.max(1, parseInt(params.get("perPage") || "50", 10)));
				const offset = (page - 1) * perPage;
				const q = (params.get("q") || "").trim();
				const category = (params.get("category") || "").trim();
				const isActive = params.get("is_active");
				const where = [];
				const binds = [];
				if (q) { where.push("(cost_code LIKE ? OR cost_name LIKE ?)"); binds.push(`%${q}%`, `%${q}%`); }
				if (category && ["fixed","variable"].includes(category)) { where.push("category = ?"); binds.push(category); }
				if (isActive === "0" || isActive === "1") { where.push("is_active = ?"); binds.push(parseInt(isActive,10)); }
				const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
				const countRow = await env.DATABASE.prepare(`SELECT COUNT(1) AS total FROM OverheadCostTypes ${whereSql}`).bind(...binds).first();
				const total = Number(countRow?.total || 0);
				const rows = await env.DATABASE.prepare(
					`SELECT cost_type_id, cost_code, cost_name, category, allocation_method, description, is_active, display_order, created_at, updated_at
					 FROM OverheadCostTypes
					 ${whereSql}
					 ORDER BY display_order ASC, cost_code ASC
					 LIMIT ? OFFSET ?`
				).bind(...binds, perPage, offset).all();
				const data = (rows?.results || []).map(r => ({
					id: r.cost_type_id,
					code: r.cost_code,
					name: r.cost_name,
					category: r.category,
					allocationMethod: r.allocation_method,
					description: r.description || "",
					isActive: r.is_active === 1,
					displayOrder: Number(r.display_order || 0),
					createdAt: r.created_at,
					updatedAt: r.updated_at,
				}));
				return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId, page, perPage, total } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
		if (method === "POST") {
			let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
			const code = String(body?.cost_code || body?.code || "").trim();
			const name = String(body?.cost_name || body?.name || "").trim();
			const category = String(body?.category || "").trim();
			const methodVal = String(body?.allocation_method || body?.allocationMethod || "").trim();
			const description = (body?.description || "").trim();
			const errors = [];
			if (!/^[A-Z0-9_]{1,20}$/.test(code)) errors.push({ field:"cost_code", message:"格式需為 A-Z0-9_，≤20" });
			if (!name || name.length > 50) errors.push({ field:"cost_name", message:"必填且 ≤ 50" });
			if (!["fixed","variable"].includes(category)) errors.push({ field:"category", message:"不合法" });
			if (!["per_employee","per_hour","per_revenue"].includes(methodVal)) errors.push({ field:"allocation_method", message:"不合法" });
			if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
			try {
				await env.DATABASE.prepare(
					"INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description, is_active) VALUES (?, ?, ?, ?, ?, 1)"
				).bind(code, name, category, methodVal, description).run();
				const row = await env.DATABASE.prepare("SELECT cost_type_id FROM OverheadCostTypes WHERE cost_code = ?").bind(code).first();
				return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ id: row?.cost_type_id, code, name, category, allocationMethod: methodVal }, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				const msg = String(err || "");
				if (msg.includes("UNIQUE") && msg.includes("cost_code")) {
					return jsonResponse(409, { ok:false, code:"CONFLICT", message:"代碼已存在", meta:{ requestId } }, corsHeaders);
				}
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	if (path === "/internal/api/v1/admin/overhead-costs") {
		if (method === "GET") {
			try {
				const params = url.searchParams;
				const year = parseInt(params.get("year") || "0", 10);
				const month = parseInt(params.get("month") || "0", 10);
				if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
					return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
				}
				const q = (params.get("q") || "").trim();
				const where = ["m.is_deleted = 0", "m.year = ?", "m.month = ?"];
				const binds = [year, month];
				if (q) { where.push("(t.cost_code LIKE ? OR t.cost_name LIKE ? OR m.notes LIKE ?)"); binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
				const whereSql = `WHERE ${where.join(" AND ")}`;
				const rows = await env.DATABASE.prepare(
					`SELECT m.overhead_id, m.cost_type_id, t.cost_name, t.cost_code, t.category, t.allocation_method, m.amount, m.notes, m.recorded_by, m.recorded_at, m.updated_at
					 FROM MonthlyOverheadCosts m
					 JOIN OverheadCostTypes t ON t.cost_type_id = m.cost_type_id
					 ${whereSql}
					 ORDER BY t.display_order ASC, t.cost_code ASC`
				).bind(...binds).all();
				const items = (rows?.results || []).map(r => ({
					id: r.overhead_id,
					costTypeId: r.cost_type_id,
					costName: r.cost_name,
					costCode: r.cost_code,
					category: r.category,
					allocationMethod: r.allocation_method,
					amount: Number(r.amount || 0),
					notes: r.notes || "",
					recordedBy: r.recorded_by,
					recordedAt: r.recorded_at,
					updatedAt: r.updated_at,
				}));
				const total = items.reduce((s, x) => s + x.amount, 0);
				const totalFixed = items.filter(x => x.category === 'fixed').reduce((s, x) => s + x.amount, 0);
				const totalVariable = total - totalFixed;
				return jsonResponse(200, { ok:true, code:"OK", message:"成功", data:{ year, month, items, total, totalFixed, totalVariable }, meta:{ requestId, count: items.length } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
		if (method === "POST") {
			let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
			const cost_type_id = parseInt(body?.cost_type_id, 10);
			const year = parseInt(body?.year, 10);
			const month = parseInt(body?.month, 10);
			const amount = Number(body?.amount);
			const notes = (body?.notes || "").trim();
			const errors = [];
			if (!Number.isFinite(cost_type_id)) errors.push({ field:"cost_type_id", message:"必填" });
			if (!Number.isFinite(year) || year < 2000) errors.push({ field:"year", message:"不合法" });
			if (!Number.isFinite(month) || month < 1 || month > 12) errors.push({ field:"month", message:"不合法" });
			if (!Number.isFinite(amount) || amount <= 0 || amount > 1e9) errors.push({ field:"amount", message:"需介於 0 ~ 1e9" });
			if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
			try {
				const t = await env.DATABASE.prepare("SELECT cost_type_id FROM OverheadCostTypes WHERE cost_type_id = ? AND is_active = 1 LIMIT 1").bind(cost_type_id).first();
				if (!t) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"成本項目不存在或未啟用", errors:[{ field:"cost_type_id", message:"不存在或未啟用" }], meta:{ requestId } }, corsHeaders);
				await env.DATABASE.prepare(
					"INSERT INTO MonthlyOverheadCosts (cost_type_id, year, month, amount, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?)"
				).bind(cost_type_id, year, month, amount, notes, String(me.user_id)).run();
				const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
				return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ id:String(idRow?.id) }, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				const msg = String(err || "");
				if (msg.includes("UNIQUE") && msg.includes("MonthlyOverheadCosts")) {
					return jsonResponse(409, { ok:false, code:"CONFLICT", message:"該月份已有此項目記錄", meta:{ requestId } }, corsHeaders);
				}
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	if (path === "/internal/api/v1/admin/overhead-summary" || path === "/internal/api/v1/admin/overhead-analysis") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const params = url.searchParams;
			const year = parseInt(params.get("year") || "0", 10);
			const month = parseInt(params.get("month") || "0", 10);
			if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
			}
			const rows = await env.DATABASE.prepare(
				`SELECT t.category, t.cost_type_id, t.cost_name, SUM(m.amount) AS amt
				 FROM MonthlyOverheadCosts m JOIN OverheadCostTypes t ON t.cost_type_id = m.cost_type_id
				 WHERE m.is_deleted = 0 AND m.year = ? AND m.month = ?
				 GROUP BY t.category, t.cost_type_id, t.cost_name`
			).bind(year, month).all();
			const list = rows?.results || [];
			const total = list.reduce((s, r) => s + Number(r.amt || 0), 0);
			const byCategory = { fixed: 0, variable: 0 };
			for (const r of list) { byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amt || 0); }
			const typeBreakdown = list.map(r => ({ costTypeId: r.cost_type_id, costName: r.cost_name, amount: Number(r.amt || 0), percentage: total ? Number((Number(r.amt||0)/total*100).toFixed(1)) : 0 }));
			const empRow = await env.DATABASE.prepare("SELECT COUNT(1) AS c FROM Users WHERE is_deleted = 0").first();
			const employeeCount = Number(empRow?.c || 0);
			const overheadPerEmployee = employeeCount ? Math.round(total / employeeCount) : 0;
			const data = { year, month, total_overhead: total, employee_count: employeeCount, overhead_per_employee: overheadPerEmployee, breakdown_by_category: byCategory, breakdown_by_type: typeBreakdown };
			return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// ============ 員工成本分析 ============
	if (path === "/internal/api/v1/admin/costs/employee") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const params = url.searchParams;
			const year = parseInt(params.get("year") || "0", 10);
			const month = parseInt(params.get("month") || "0", 10);
			if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
			}

			// 1. 獲取所有員工
			const usersRows = await env.DATABASE.prepare(
				"SELECT user_id, full_name, hire_date FROM Users WHERE is_deleted = 0 ORDER BY full_name ASC"
			).all();
			const users = usersRows?.results || [];

			const employees = [];
			
			for (const user of users) {
				const userId = user.user_id;
				
				// 2. 計算年度總薪資（假設從系統設定中獲取，這裡暫時使用固定值40000月薪 * 12）
				// TODO: 從薪資設定表中獲取實際薪資
				const annualSalary = 40000 * 12; // 暫時固定值
				
				// 3. 計算年度總工時（2080小時 = 40小時/週 × 52週）
				const annualHours = 2080;
				
				// 4. 計算年度特休時數
				const leaveBalanceRow = await env.DATABASE.prepare(
					"SELECT annual_leave_balance FROM LeaveBalances WHERE user_id = ? AND year = ?"
				).bind(userId, year).first();
				const annualLeaveHours = Number(leaveBalanceRow?.annual_leave_balance || 0);
				
				// 5. 計算實際工時
				const actualHours = annualHours - annualLeaveHours;
				
				// 6. 計算員工時薪
				const hourlyRate = actualHours > 0 ? annualSalary / actualHours : 0;
				
				// 7. 獲取本月實際工時記錄
				const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
				const timesheetRows = await env.DATABASE.prepare(
					`SELECT work_type, hours
					 FROM Timesheets 
					 WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
				).bind(userId, yearMonth).all();
				const timesheets = timesheetRows?.results || [];
				
				// 工時類型倍率對照表
				const WORK_TYPE_MULTIPLIERS = {
					1: 1.0,   // 正常工時
					2: 1.34,  // 平日加班（前2小時）
					3: 1.67,  // 平日加班（後2小時）
					4: 1.34,  // 休息日加班（前2小時）
					5: 1.67,  // 休息日加班（第3-8小時）
					6: 2.67,  // 休息日加班（第9-12小時）
					7: 1.0,   // 國定假日加班（8小時內）- 月薪已含原本1日，加班费只算额外1日
					8: 1.34,  // 國定假日加班（第9-10小時）
					9: 1.67,  // 國定假日加班（第11-12小時）
					10: 1.0,  // 例假日加班（8小時內）- 月薪已含原本1日，加班费只算额外1日
					11: 1.0   // 例假日加班（第9-12小時）- 例假日全时段都只算额外1日
				};
				
				// 必須給補休的工時類型（需要雙重計算成本）
				const MANDATORY_COMP_LEAVE_TYPES = [7, 10]; // 國定假日和例假日8小時內
				
				// 8. 計算總工時和加權工時
				let monthHours = 0;
				let weightedHours = 0;
				
				for (const ts of timesheets) {
					const hours = Number(ts.hours || 0);
					const workTypeId = parseInt(ts.work_type) || 1;
					const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0;
					
					monthHours += hours;
					
					// 特殊情況：國定假日/例假日 8小時內類型
					// 需要支付加班費 + 強制給補休，所以成本是雙倍
					if (MANDATORY_COMP_LEAVE_TYPES.includes(workTypeId)) {
						// 加班費成本（固定8小時加權）+ 強制補休成本（8小時）
						weightedHours += 8.0 + 8.0; // = 16.0
					} else {
						// 一般情況：實際工時 × 倍率
						weightedHours += hours * multiplier;
					}
				}
				
				// 9. 計算本月實際成本
				// 注意：使用補休不減少加權工時成本，因為補休是用之前加班的成本抵銷
				// 補休使用只影響實際工作時數，不影響成本計算
				const laborCost = Math.round(hourlyRate * weightedHours);
				
				// 10. 獲取本月補休到期轉加班費（需要額外計入成本）
				const expiredCompRow = await env.DATABASE.prepare(
					`SELECT SUM(amount_cents) as expired_amount 
					 FROM CompensatoryOvertimePay 
					 WHERE user_id = ? AND year_month = ?`
				).bind(userId, `${year}-${String(month).padStart(2, '0')}`).first();
				const expiredCompCost = Math.round(Number(expiredCompRow?.expired_amount || 0) / 100);
				
				// 最終薪資成本 = 本月工時成本 + 補休到期轉加班費
				const totalLaborCost = laborCost + expiredCompCost;
				
				// 11. 計算分攤管理費用
				// 按工時比例分攤
				const overheadRow = await env.DATABASE.prepare(
					`SELECT SUM(m.amount) as total FROM MonthlyOverheadCosts m
					 WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0`
				).bind(year, month).first();
				const totalOverhead = Number(overheadRow?.total || 0);
				
				const totalMonthHoursRow = await env.DATABASE.prepare(
					`SELECT SUM(hours) as total FROM Timesheets 
					 WHERE year = ? AND month = ? AND is_deleted = 0`
				).bind(year, month).first();
				const totalMonthHours = Number(totalMonthHoursRow?.total || 0);
				
				const overheadAllocation = totalMonthHours > 0 
					? Math.round(totalOverhead * (monthHours / totalMonthHours))
					: 0;
				
				employees.push({
					userId,
					name: user.full_name,
					annualSalary,
					annualHours,
					annualLeaveHours,
					actualHours,
					hourlyRate: Math.round(hourlyRate),
					monthHours,
					weightedHours,
					laborCost: totalLaborCost,
					expiredCompCost, // 補休到期轉加班費
					overheadAllocation,
					totalCost: totalLaborCost + overheadAllocation
				});
			}

			return jsonResponse(200, { 
				ok:true, 
				code:"OK", 
				message:"成功", 
				data:{ year, month, employees }, 
				meta:{ requestId, count: employees.length } 
			}, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// ============ 客戶成本彙總 ============
	if (path === "/internal/api/v1/admin/costs/client") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const params = url.searchParams;
			const year = parseInt(params.get("year") || "0", 10);
			const month = parseInt(params.get("month") || "0", 10);
			if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
			}

			// 工時類型倍率對照表
			const WORK_TYPE_MULTIPLIERS = {
				1: 1.0, 2: 1.34, 3: 1.67, 4: 1.34, 5: 1.67, 
				6: 2.67, 7: 2.0, 8: 1.34, 9: 1.67, 10: 2.0, 11: 2.0
			};

			// 1. 獲取所有客戶
			const clientsRows = await env.DATABASE.prepare(
				"SELECT client_id, company_name FROM Clients WHERE is_deleted = 0 ORDER BY company_name ASC"
			).all();
			const clientsList = clientsRows?.results || [];

			const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
			const clients = [];

			for (const client of clientsList) {
				const clientId = client.client_id;
				
				// 2. 獲取該客戶本月所有任務的工時記錄（包含work_type）
				const timesheetRows = await env.DATABASE.prepare(
					`SELECT ts.user_id, ts.work_type, ts.hours, ts.task_id
					 FROM Timesheets ts
					 JOIN Tasks t ON t.task_id = ts.task_id
					 WHERE t.client_id = ? AND substr(ts.work_date, 1, 7) = ? 
					   AND ts.is_deleted = 0 AND t.is_deleted = 0`
				).bind(clientId, yearMonth).all();
				const timesheets = timesheetRows?.results || [];
				
				if (timesheets.length === 0) continue;
				
				let totalHours = 0;
				let weightedHours = 0;
				let laborCost = 0;
				const taskCount = new Set();
				const userHourlyRates = {}; // 快取員工時薪
				
				// 3. 計算每筆工時的成本
				for (const ts of timesheets) {
					if (!ts.user_id) continue;
					taskCount.add(ts.task_id);
					
					const hours = Number(ts.hours || 0);
					const workTypeId = parseInt(ts.work_type) || 1;
					const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0;
					
					totalHours += hours;
					
					// 計算加權工時
					let tsWeightedHours;
					if (MANDATORY_COMP_LEAVE_TYPES.includes(workTypeId)) {
						// 特殊情況：國定假日/例假日 8小時內（強制補休）
						// 成本 = 加班費 + 強制補休
						tsWeightedHours = 8.0 + 8.0; // = 16.0
					} else {
						tsWeightedHours = hours * multiplier;
					}
					weightedHours += tsWeightedHours;
					
					// 獲取或計算員工時薪
					if (!userHourlyRates[ts.user_id]) {
						// 簡化計算：使用固定時薪
						// TODO: 從員工成本分析獲取實際時薪（考慮年薪和特休）
						userHourlyRates[ts.user_id] = 200;
					}
					
					laborCost += Math.round(userHourlyRates[ts.user_id] * tsWeightedHours);
				}
				
				// 4. 計算分攤管理費用（按工時比例）
				const overheadRow = await env.DATABASE.prepare(
					`SELECT SUM(m.amount) as total FROM MonthlyOverheadCosts m
					 WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0`
				).bind(year, month).first();
				const totalOverhead = Number(overheadRow?.total || 0);
				
				const totalMonthHoursRow = await env.DATABASE.prepare(
					`SELECT SUM(hours) as total FROM Timesheets 
					 WHERE year = ? AND month = ? AND is_deleted = 0`
				).bind(year, month).first();
				const totalMonthHours = Number(totalMonthHoursRow?.total || 0);
				
				const overheadAllocation = totalMonthHours > 0 
					? Math.round(totalOverhead * (totalHours / totalMonthHours))
					: 0;
				
				// 5. 獲取本月收入（從收據系統）
				const revenueRow = await env.DATABASE.prepare(
					`SELECT SUM(amount_cents) as total FROM Receipts 
					 WHERE client_id = ? AND year = ? AND month = ? AND is_deleted = 0`
				).bind(clientId, year, month).first();
				const revenue = Math.round(Number(revenueRow?.total || 0) / 100);
				
				if (totalHours > 0 || revenue > 0) {
					clients.push({
						clientId,
						clientName: client.company_name,
						taskCount: taskCount.size,
						totalHours,
						weightedHours,
						laborCost,
						overheadAllocation,
						totalCost: laborCost + overheadAllocation,
						revenue
					});
				}
			}

			return jsonResponse(200, { 
				ok:true, 
				code:"OK", 
				message:"成功", 
				data:{ year, month, clients }, 
				meta:{ requestId, count: clients.length } 
			}, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// ============ 任務成本明細 ============
	if (path === "/internal/api/v1/admin/costs/task") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const params = url.searchParams;
			const year = parseInt(params.get("year") || "0", 10);
			const month = parseInt(params.get("month") || "0", 10);
			if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
			}

			// 工時類型倍率對照表
			const WORK_TYPE_MULTIPLIERS = {
				1: 1.0, 2: 1.34, 3: 1.67, 4: 1.34, 5: 1.67, 
				6: 2.67, 7: 2.0, 8: 1.34, 9: 1.67, 10: 2.0, 11: 2.0
			};
			
			// 必須給補休的工時類型
			const MANDATORY_COMP_LEAVE_TYPES = [7, 10];

			const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
			
			// 1. 獲取所有有工時記錄的任務
			const taskRows = await env.DATABASE.prepare(
				`SELECT DISTINCT
					t.task_id, 
					t.title, 
					t.client_id,
					c.company_name,
					t.assigned_to,
					u.full_name as assignee_name
				 FROM Tasks t
				 JOIN Clients c ON c.client_id = t.client_id
				 LEFT JOIN Users u ON u.user_id = t.assigned_to
				 JOIN Timesheets ts ON ts.task_id = t.task_id AND substr(ts.work_date, 1, 7) = ? AND ts.is_deleted = 0
				 WHERE t.is_deleted = 0 AND c.is_deleted = 0
				 ORDER BY c.company_name ASC, t.title ASC`
			).bind(yearMonth).all();
			const taskList = taskRows?.results || [];

			// 2. 獲取總工時和總管理費用用於分攤
			const totalHoursRow = await env.DATABASE.prepare(
				`SELECT SUM(hours) as total FROM Timesheets 
				 WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0`
			).bind(yearMonth).first();
			const totalMonthHours = Number(totalHoursRow?.total || 0);
			
			const overheadRow = await env.DATABASE.prepare(
				`SELECT SUM(m.amount) as total FROM MonthlyOverheadCosts m
				 WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0`
			).bind(year, month).first();
			const totalOverhead = Number(overheadRow?.total || 0);

			const tasks = [];
			
			// 3. 為每個任務計算成本
			for (const task of taskList) {
				// 獲取該任務的所有工時記錄
				const timesheetRows = await env.DATABASE.prepare(
					`SELECT work_type, hours
					 FROM Timesheets 
					 WHERE task_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
				).bind(task.task_id, yearMonth).all();
				const timesheets = timesheetRows?.results || [];
				
				let hours = 0;
				let weightedHours = 0;
				
				for (const ts of timesheets) {
					const tsHours = Number(ts.hours || 0);
					const workTypeId = parseInt(ts.work_type) || 1;
					const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0;
					
					hours += tsHours;
					
					// 計算加權工時
					if (MANDATORY_COMP_LEAVE_TYPES.includes(workTypeId)) {
						// 國定假日/例假日8小時內：加班費 + 強制補休
						weightedHours += 8.0 + 8.0; // = 16.0
					} else {
						weightedHours += tsHours * multiplier;
					}
				}
				
				// 簡化計算：使用固定時薪
				const hourlyRate = 200; // TODO: 從員工成本分析獲取實際時薪
				const laborCost = Math.round(hourlyRate * weightedHours);
				
				// 按工時比例分攤管理費用
				const overheadAllocation = totalMonthHours > 0 
					? Math.round(totalOverhead * (hours / totalMonthHours))
					: 0;
				
				tasks.push({
					taskId: task.task_id,
					taskTitle: task.title,
					clientId: task.client_id,
					clientName: task.company_name,
					assigneeId: task.assigned_to,
					assigneeName: task.assignee_name || '未指派',
					hours,
					weightedHours,
					laborCost,
					overheadAllocation,
					totalCost: laborCost + overheadAllocation
				});
			}

			return jsonResponse(200, { 
				ok:true, 
				code:"OK", 
				message:"成功", 
				data:{ year, month, tasks }, 
				meta:{ requestId, count: tasks.length } 
			}, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}



