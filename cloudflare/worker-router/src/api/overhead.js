import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { invalidateCacheByType } from "../cache-helper.js";

/**
 * 判断薪资项目是否应该在指定月份发放
 */
function shouldPayInMonth(recurringType, recurringMonths, effectiveDate, expiryDate, targetMonth) {
	const [targetYear, targetMonthNum] = targetMonth.split('-');
	const currentMonthInt = parseInt(targetMonthNum);
	
	// 检查是否在有效期内
	const firstDay = `${targetYear}-${targetMonthNum}-01`;
	const lastDay = new Date(parseInt(targetYear), parseInt(targetMonthNum), 0).getDate();
	const lastDayStr = `${targetYear}-${targetMonthNum}-${String(lastDay).padStart(2, '0')}`;
	
	if (effectiveDate > lastDayStr) return false; // 还未生效
	if (expiryDate && expiryDate < firstDay) return false; // 已过期
	
	// 根据循环类型判断
	if (recurringType === 'monthly') {
		return true; // 每月都发放
	}
	
	if (recurringType === 'once') {
		// 仅一次：只在生效月份发放
		const [effYear, effMonth] = effectiveDate.split('-');
		return effYear === targetYear && effMonth === targetMonthNum;
	}
	
	if (recurringType === 'yearly') {
		// 每年指定月份：检查当前月份是否在列表中
		if (!recurringMonths) return false;
		try {
			const months = JSON.parse(recurringMonths);
			return Array.isArray(months) && months.includes(currentMonthInt);
		} catch (e) {
			return false;
		}
	}
	
	return false;
}

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
			const codeInput = String(body?.cost_code || body?.code || "").trim().toUpperCase();
			const name = String(body?.cost_name || body?.name || "").trim();
			let category = String(body?.category || "").trim();
			let methodVal = String(body?.allocation_method || body?.allocationMethod || "").trim();

			// 寬鬆映射：允許傳中文或駝峰鍵名，統一轉為有效值
			const catMap = { 'fixed':'fixed', 'variable':'variable', '固定':'fixed', '變動':'variable' };
			const methodMap = { 'per_employee':'per_employee', 'per_hour':'per_hour', 'per_revenue':'per_revenue', '按員工數':'per_employee', '按工時':'per_hour', '按收入':'per_revenue' };
			category = catMap[category] || category;
			methodVal = methodMap[methodVal] || methodVal;
			const description = (body?.description || "").trim();
			const errors = [];
			if (!name || name.length > 50) errors.push({ field:"cost_name", message:"必填且 ≤ 50" });
			if (!["fixed","variable"].includes(category)) errors.push({ field:"category", message:"不合法" });
			if (!["per_employee","per_hour","per_revenue"].includes(methodVal)) errors.push({ field:"allocation_method", message:"不合法" });
			if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);

			function generateCodeFromName(n, attempt) {
				let base = String(n || "").toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
				if (!base) base = "COST";
				const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
				// 確保總長度 ≤ 20
				const maxBaseLen = Math.max(1, 20 - 1 - rand.length);
				base = base.slice(0, maxBaseLen);
				return `${base}_${rand}${attempt ? String(attempt) : ""}`.slice(0, 20);
			}

			let code = /^[A-Z0-9_]{1,20}$/.test(codeInput) ? codeInput : "";
			let inserted = false; let newId = null; let lastErr = null;
			for (let i = 0; i < 6 && !inserted; i++) {
				const candidate = code || generateCodeFromName(name, i || "");
				try {
					await env.DATABASE.prepare(
						"INSERT INTO OverheadCostTypes (cost_code, cost_name, category, allocation_method, description, is_active) VALUES (?, ?, ?, ?, ?, 1)"
					).bind(candidate, name, category, methodVal, description).run();
					const row = await env.DATABASE.prepare("SELECT cost_type_id FROM OverheadCostTypes WHERE cost_code = ?").bind(candidate).first();
					newId = row?.cost_type_id; code = candidate; inserted = true;
				} catch (err) {
					lastErr = err;
					const msg = String(err || "");
					if (msg.includes("UNIQUE") && msg.includes("cost_code")) {
						// 碰撞則清空 code，重試生成
						code = "";
						continue;
					}
					break;
				}
			}
			if (!inserted) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(lastErr) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"建立失敗", meta:{ requestId } }, corsHeaders);
			}
			return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ id: newId, code, name, category, allocationMethod: methodVal }, meta:{ requestId } }, corsHeaders);
		}
	}
	
	// PUT /admin/overhead-types/:id - 更新成本項目
	if (path.match(/^\/internal\/api\/v1\/admin\/overhead-types\/\d+$/)) {
		const id = parseInt(path.split('/').pop(), 10);
		if (method === "PUT") {
			let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
			const name = String(body?.cost_name || body?.name || "").trim();
			const category = String(body?.category || "").trim();
			const methodVal = String(body?.allocation_method || body?.allocationMethod || "").trim();
			const description = (body?.description || "").trim();
			const isActive = body?.is_active != null ? (body.is_active ? 1 : 0) : undefined;
			
			const updates = [];
			const binds = [];
			if (name) { updates.push("cost_name = ?"); binds.push(name); }
			if (["fixed","variable"].includes(category)) { updates.push("category = ?"); binds.push(category); }
			if (["per_employee","per_hour","per_revenue"].includes(methodVal)) { updates.push("allocation_method = ?"); binds.push(methodVal); }
			if (description !== undefined) { updates.push("description = ?"); binds.push(description); }
			if (isActive !== undefined) { updates.push("is_active = ?"); binds.push(isActive); }
			
			if (updates.length === 0) {
				return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"沒有可更新的欄位", meta:{ requestId } }, corsHeaders);
			}
			
			updates.push("updated_at = datetime('now')");
			binds.push(id);
			
			try {
				await env.DATABASE.prepare(
					`UPDATE OverheadCostTypes SET ${updates.join(", ")} WHERE cost_type_id = ?`
				).bind(...binds).run();
				
				// 失效成本相关缓存
				invalidateCacheByType(env, 'overhead', {}).catch(err => console.warn('[Overhead] 缓存失效失败:', err));
				
				return jsonResponse(200, { ok:true, code:"OK", message:"已更新", meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"更新失敗", meta:{ requestId } }, corsHeaders);
			}
		}
		
		// DELETE /admin/overhead-types/:id - 刪除成本項目（軟刪除）
		if (method === "DELETE") {
			try {
				await env.DATABASE.prepare(
					"UPDATE OverheadCostTypes SET is_active = 0, updated_at = datetime('now') WHERE cost_type_id = ?"
				).bind(id).run();
				
				// 失效成本相关缓存
				invalidateCacheByType(env, 'overhead', {}).catch(err => console.warn('[Overhead] 缓存失效失败:', err));
				
				return jsonResponse(200, { ok:true, code:"OK", message:"已刪除", meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"刪除失敗", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	// ============ 成本項目模板（循環） ============
	if (path === "/internal/api/v1/admin/overhead-templates") {
		if (method === "GET") {
			try {
				const params = url.searchParams;
				const isActive = params.get("is_active");
				const where = [];
				const binds = [];
				if (isActive === "0" || isActive === "1") { where.push("is_active = ?"); binds.push(parseInt(isActive,10)); }
				const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
				const rows = await env.DATABASE.prepare(
					`SELECT template_id, cost_type_id, amount, notes, recurring_type, recurring_months, effective_from, effective_to, is_active, created_at, updated_at
					 FROM OverheadRecurringTemplates ${whereSql}
					 ORDER BY template_id DESC`
				).bind(...binds).all();
				const data = (rows?.results||[]).map(r => ({
					templateId: r.template_id,
					costTypeId: r.cost_type_id,
					amount: Number(r.amount||0),
					notes: r.notes||"",
					recurringType: r.recurring_type||'monthly',
					recurringMonths: r.recurring_months||null,
					effectiveFrom: r.effective_from||null,
					effectiveTo: r.effective_to||null,
					isActive: r.is_active === 1,
					createdAt: r.created_at,
					updatedAt: r.updated_at
				}));
				return jsonResponse(200, { ok:true, code:"OK", data, meta:{ requestId, count: data.length } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
		if (method === "POST") {
			let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
			const cost_type_id = parseInt(body?.cost_type_id, 10);
			const amount = Number(body?.amount);
			const notes = String(body?.notes||"").trim();
			let recurring_type = String(body?.recurring_type||'monthly').trim();
			const recurring_months = body?.recurring_months ? String(body.recurring_months) : null;
			const effective_from = body?.effective_from ? String(body.effective_from) : null;
			const effective_to = body?.effective_to ? String(body.effective_to) : null;
			const errors = [];
			if (!Number.isFinite(cost_type_id)) errors.push({ field:"cost_type_id", message:"必填" });
			if (!Number.isFinite(amount) || amount <= 0) errors.push({ field:"amount", message:"需大於 0" });
			if (!['monthly','yearly','once'].includes(recurring_type)) recurring_type = 'monthly';
			if (errors.length) return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"輸入有誤", errors, meta:{ requestId } }, corsHeaders);
			try {
				await env.DATABASE.prepare(
					`INSERT INTO OverheadRecurringTemplates (cost_type_id, amount, notes, recurring_type, recurring_months, effective_from, effective_to, created_by)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(cost_type_id, amount, notes, recurring_type, recurring_months, effective_from, effective_to, String(me.user_id)).run();
				const row = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
				return jsonResponse(201, { ok:true, code:"CREATED", message:"已建立", data:{ id: String(row?.id) }, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}
	
	// GET /admin/overhead-templates/by-type/:id - 获取模板
	// PUT /admin/overhead-templates/by-type/:id - 创建或更新模板
	if (path.match(/^\/internal\/api\/v1\/admin\/overhead-templates\/by-type\/\d+$/)) {
		const costTypeId = parseInt(path.split("/").pop());
		
		if (method === "GET") {
			try {
				const row = await env.DATABASE.prepare(
					`SELECT template_id, cost_type_id, amount, notes, recurring_type, recurring_months, 
					 effective_from, effective_to, is_active, created_at, updated_at
					 FROM OverheadRecurringTemplates WHERE cost_type_id = ? LIMIT 1`
				).bind(costTypeId).first();
				
				if (!row) {
					return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"模板不存在", meta:{ requestId } }, corsHeaders);
				}
				
				const data = {
					templateId: row.template_id,
					costTypeId: row.cost_type_id,
					amount: Number(row.amount || 0),
					notes: row.notes || '',
					recurringType: row.recurring_type || 'monthly',
					recurringMonths: row.recurring_months,
					effectiveFrom: row.effective_from,
					effectiveTo: row.effective_to,
					isActive: row.is_active === 1,
					createdAt: row.created_at,
					updatedAt: row.updated_at
				};
				
				console.log(`[Template GET] cost_type_id=${costTypeId}, template=`, data);
				return jsonResponse(200, { ok:true, code:"OK", message:"成功", data, meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
		
		if (method === "PUT") {
			try {
				let body; try { body = await request.json(); } catch (_) { body = {}; }
				const amount = body.amount != null ? Number(body.amount) : null;
				const notes = body.notes != null ? String(body.notes) : null;
				// 确保 recurring_type 有默认值 'monthly'
				const recurring_type = body.recurring_type ? String(body.recurring_type) : 'monthly';
				const recurring_months = body.recurring_months != null ? String(body.recurring_months) : null;
				const effective_from = body.effective_from != null ? String(body.effective_from) : null;
				const effective_to = body.effective_to != null ? String(body.effective_to) : null;
				const is_active = body.is_active == null ? 1 : (body.is_active ? 1 : 0);
				
				console.log(`[Template UPSERT] cost_type_id=${costTypeId}, recurring_type=${recurring_type}, amount=${amount}, effective_from=${effective_from}`);
				
				const row = await env.DATABASE.prepare("SELECT template_id, recurring_type FROM OverheadRecurringTemplates WHERE cost_type_id = ? LIMIT 1").bind(costTypeId).first();
				if (row) {
					console.log(`[Template UPSERT] 更新現有模板 ${row.template_id}, 原 recurring_type=${row.recurring_type}`);
					await env.DATABASE.prepare(
						`UPDATE OverheadRecurringTemplates SET 
						 amount = COALESCE(?, amount),
						 notes = COALESCE(?, notes),
						 recurring_type = ?,
						 recurring_months = COALESCE(?, recurring_months),
						 effective_from = COALESCE(?, effective_from),
						 effective_to = COALESCE(?, effective_to),
						 is_active = ?,
						 updated_at = datetime('now')
						WHERE cost_type_id = ?`
					).bind(amount, notes, recurring_type, recurring_months, effective_from, effective_to, is_active, costTypeId).run();
					console.log(`[Template UPSERT] 模板已更新，recurring_type=${recurring_type}`);
				} else {
					console.log(`[Template UPSERT] 創建新模板，recurring_type=${recurring_type}`);
					await env.DATABASE.prepare(
						`INSERT INTO OverheadRecurringTemplates (cost_type_id, amount, notes, recurring_type, recurring_months, effective_from, effective_to, is_active, created_by)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
					).bind(costTypeId, amount||0, notes||'', recurring_type, recurring_months, effective_from, effective_to, is_active, String(me.user_id)).run();
					console.log(`[Template UPSERT] 新模板已創建`);
				}
				return jsonResponse(200, { ok:true, code:"OK", message:"已保存", meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
			}
		}
	}

	// ============ 依模板自動生成當月記錄 ============
	if (path === "/internal/api/v1/admin/overhead-costs/generate") {
		if (method !== "POST") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const params = url.searchParams;
			const year = parseInt(params.get("year") || String((new Date()).getUTCFullYear()), 10);
			const month = parseInt(params.get("month") || String((new Date()).getUTCMonth()+1), 10);
			if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
			}
			const ym = `${year}-${String(month).padStart(2,'0')}`;

			function withinRange(from, to, target) {
				console.log(`[withinRange] 檢查範圍: from=${from}, to=${to}, target=${target}`);
				if (from && String(from) > target) {
					console.log(`[withinRange] 失敗: from(${from}) > target(${target})`);
					return false;
				}
				if (to && String(to) < target) {
					console.log(`[withinRange] 失敗: to(${to}) < target(${target})`);
					return false;
				}
				console.log(`[withinRange] 通過`);
				return true;
			}
			function shouldApply(recurringType, recurringMonths, effFrom, effTo, y, m) {
				const target = `${y}-${String(m).padStart(2,'0')}`;
				console.log(`[shouldApply] 開始檢查: recurringType=${recurringType}, target=${target}`);
				
				const rangeOk = withinRange(effFrom, effTo, target);
				if (!rangeOk) {
					console.log(`[shouldApply] withinRange 失敗`);
					return false;
				}
				
				if (recurringType === 'monthly') {
					console.log(`[shouldApply] monthly 類型，通過`);
					return true;
				}
				if (recurringType === 'once') {
					console.log(`[shouldApply] once 類型，通過`);
					return true;
				}
				if (recurringType === 'yearly') {
					if (!recurringMonths) {
						console.log(`[shouldApply] yearly 類型但無 recurringMonths，失敗`);
						return false;
					}
					try {
						const arr = Array.isArray(recurringMonths) ? recurringMonths : JSON.parse(String(recurringMonths));
						const includes = arr.includes(m);
						console.log(`[shouldApply] yearly 類型，月份檢查: ${m} in ${JSON.stringify(arr)} = ${includes}`);
						return includes;
					} catch (err) {
						console.log(`[shouldApply] yearly 類型，解析失敗:`, err);
						return false;
					}
				}
				console.log(`[shouldApply] 未知類型，失敗`);
				return false;
			}

			// 讀取啟用模板
			const tplRows = await env.DATABASE.prepare(
				`SELECT template_id, cost_type_id, amount, notes, recurring_type, recurring_months, effective_from, effective_to
				 FROM OverheadRecurringTemplates WHERE is_active = 1`
			).all();
			let templates = tplRows?.results || [];
			// 可選擇特定模板
			let body; try { body = await request.json(); } catch (_) { body = null; }
			if (body && Array.isArray(body.template_ids) && body.template_ids.length) {
				const set = new Set(body.template_ids.map(x => parseInt(x,10)));
				templates = templates.filter(t => set.has(t.template_id));
			}
			let created = 0, skipped = 0, duplicates = 0;
			const records = [];
			console.log(`[Generate] 總共 ${templates.length} 個模板待處理`);
			console.log(`[Generate] 目標年月: ${year}-${String(month).padStart(2,'0')}`);
			for (const t of templates) {
				console.log(`[Generate] 檢查模板 ${t.template_id}:`, {
					cost_type_id: t.cost_type_id,
					recurring_type: t.recurring_type,
					effective_from: t.effective_from,
					effective_to: t.effective_to,
					target_month: `${year}-${String(month).padStart(2,'0')}`
				});
				const shouldApplyResult = shouldApply(t.recurring_type, t.recurring_months, t.effective_from, t.effective_to, year, month);
				console.log(`[Generate] 模板 ${t.template_id} shouldApply 結果:`, shouldApplyResult);
				if (!shouldApplyResult) { 
					console.log(`[Generate] 跳過模板 ${t.template_id}`);
					skipped++; 
					continue; 
				}
				try {
					// 先检查是否已存在（不考虑 is_deleted，因为 UNIQUE 约束也不考虑）
					const exists = await env.DATABASE.prepare(
						`SELECT overhead_id, is_deleted FROM MonthlyOverheadCosts WHERE cost_type_id = ? AND year = ? AND month = ?`
					).bind(t.cost_type_id, year, month).first();
					
					if (exists) {
						if (exists.is_deleted === 1) {
							// 记录存在但已删除，恢复并更新
							console.log(`[Generate] 恢復已刪除記錄: overhead_id=${exists.overhead_id}, cost_type_id=${t.cost_type_id}`);
							await env.DATABASE.prepare(
								`UPDATE MonthlyOverheadCosts SET amount = ?, notes = ?, is_deleted = 0, recorded_by = ?, recorded_at = datetime('now'), updated_at = datetime('now') WHERE overhead_id = ?`
							).bind(Number(t.amount||0), t.notes || '[auto]', String(me.user_id), exists.overhead_id).run();
							created++;
							records.push({
								overhead_id: exists.overhead_id,
								cost_type_id: t.cost_type_id,
								year, month,
								amount: Number(t.amount||0)
							});
						} else {
							// 记录存在且未删除，跳过
							console.log(`[Generate] 記錄已存在: overhead_id=${exists.overhead_id}, cost_type_id=${t.cost_type_id}`);
							duplicates++;
						}
						continue;
					}
					
					// 记录不存在，插入新记录
					const result = await env.DATABASE.prepare(
						`INSERT INTO MonthlyOverheadCosts (cost_type_id, year, month, amount, notes, recorded_by)
						 VALUES (?, ?, ?, ?, ?, ?)`
					).bind(t.cost_type_id, year, month, Number(t.amount||0), t.notes || '[auto]', String(me.user_id)).run();
					
					console.log(`[Generate] 插入成功: cost_type_id=${t.cost_type_id}, overhead_id=${result.meta.last_row_id}`);
					created++;
					records.push({
						overhead_id: result.meta.last_row_id,
						cost_type_id: t.cost_type_id,
						year, month,
						amount: Number(t.amount||0)
					});
				} catch (err) {
					// 检查是否是 UNIQUE 约束错误
					const errMsg = String(err);
					if (errMsg.includes('UNIQUE constraint failed') || errMsg.includes('SQLITE_CONSTRAINT')) {
						console.error(`[Generate] UNIQUE 約束失敗（記錄重複）: cost_type_id=${t.cost_type_id}, year=${year}, month=${month}`);
						duplicates++;
					} else {
						console.error('[Generate] 插入失敗:', err, err.stack);
						skipped++;
					}
				}
			}
			console.log(`[Generate] 完成: created=${created}, skipped=${skipped}, duplicates=${duplicates}, total templates=${templates.length}`);
			
			// 如果有创建新记录，失效成本相关缓存
			if (created > 0) {
				invalidateCacheByType(env, 'overhead', {}).catch(err => console.warn('[Overhead] 缓存失效失败:', err));
			}
			
			return jsonResponse(200, { ok:true, code:"OK", message:"已生成", data:{ year, month, created, skipped, duplicates, records }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤", meta:{ requestId } }, corsHeaders);
		}
	}

	// 預覽：列出本月符合模板的候選清單
	if (path === "/internal/api/v1/admin/overhead-costs/generate/preview") {
		if (method !== "GET") return jsonResponse(405, { ok:false, code:"METHOD_NOT_ALLOWED", message:"方法不允許", meta:{ requestId } }, corsHeaders);
		try {
			const params = url.searchParams;
			const year = parseInt(params.get("year") || String((new Date()).getUTCFullYear()), 10);
			const month = parseInt(params.get("month") || String((new Date()).getUTCMonth()+1), 10);
			if (!Number.isFinite(year) || year < 2000 || month < 1 || month > 12) {
				return jsonResponse(422, { ok:false, code:"VALIDATION_ERROR", message:"year/month 不合法", meta:{ requestId } }, corsHeaders);
			}
			const ym = `${year}-${String(month).padStart(2,'0')}`;
			
			console.log(`[Preview] 查询模板，year=${year}, month=${month}`);
			
			const rows = await env.DATABASE.prepare(
				`SELECT t.template_id, t.cost_type_id, t.amount, t.notes, t.recurring_type, t.recurring_months, t.effective_from, t.effective_to,
				 c.cost_name
				 FROM OverheadRecurringTemplates t 
				 LEFT JOIN OverheadCostTypes c ON c.cost_type_id = t.cost_type_id
				 WHERE t.is_active = 1`
			).all();
			
			console.log(`[Preview] 找到 ${rows?.results?.length || 0} 个模板`);
			
			const candidates = [];
			for (const r of (rows?.results||[])) {
				try {
					const exists = await env.DATABASE.prepare(
						`SELECT 1 FROM MonthlyOverheadCosts WHERE cost_type_id = ? AND year = ? AND month = ? AND is_deleted = 0 LIMIT 1`
					).bind(r.cost_type_id, year, month).first();
					candidates.push({
						templateId: r.template_id,
						costTypeId: r.cost_type_id,
						costName: r.cost_name || `[ID:${r.cost_type_id}]`,
						amount: Number(r.amount||0),
						notes: r.notes||'',
						alreadyExists: !!exists
					});
				} catch (err) {
					console.error(`[Preview] 检查模板 ${r.template_id} 失败:`, err);
				}
			}
			
			console.log(`[Preview] 返回 ${candidates.length} 个候选项`);
			
			return jsonResponse(200, { ok:true, code:"OK", data:{ year, month, items:candidates }, meta:{ requestId } }, corsHeaders);
		} catch (err) {
			console.error(JSON.stringify({ level:"error", requestId, path, err:String(err), stack: err.stack }));
			return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"伺服器錯誤: " + String(err), meta:{ requestId } }, corsHeaders);
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
	
	// PUT /admin/overhead-costs/:id - 更新月度記錄
	if (path.match(/^\/internal\/api\/v1\/admin\/overhead-costs\/\d+$/)) {
		const id = parseInt(path.split('/').pop(), 10);
		if (method === "PUT") {
			let body; try { body = await request.json(); } catch (_) { return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"請求格式錯誤", meta:{ requestId } }, corsHeaders); }
			const amount = body?.amount != null ? Number(body.amount) : null;
			const notes = body?.notes != null ? String(body.notes).trim() : null;
			
			const updates = [];
			const binds = [];
			if (amount != null && Number.isFinite(amount) && amount > 0) { updates.push("amount = ?"); binds.push(amount); }
			if (notes != null) { updates.push("notes = ?"); binds.push(notes); }
			
			if (updates.length === 0) {
				return jsonResponse(400, { ok:false, code:"BAD_REQUEST", message:"沒有可更新的欄位", meta:{ requestId } }, corsHeaders);
			}
			
			updates.push("updated_at = datetime('now')");
			binds.push(id);
			
			try {
				await env.DATABASE.prepare(
					`UPDATE MonthlyOverheadCosts SET ${updates.join(", ")} WHERE overhead_id = ?`
				).bind(...binds).run();
				
				// 失效成本相关缓存
				invalidateCacheByType(env, 'overhead', {}).catch(err => console.warn('[Overhead] 缓存失效失败:', err));
				
				return jsonResponse(200, { ok:true, code:"OK", message:"已更新", meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"更新失敗", meta:{ requestId } }, corsHeaders);
			}
		}
		
		// DELETE /admin/overhead-costs/:id - 刪除月度記錄（軟刪除）
		if (method === "DELETE") {
			try {
				await env.DATABASE.prepare(
					"UPDATE MonthlyOverheadCosts SET is_deleted = 1, updated_at = datetime('now') WHERE overhead_id = ?"
				).bind(id).run();
				
				// 失效成本相关缓存
				invalidateCacheByType(env, 'overhead', {}).catch(err => console.warn('[Overhead] 缓存失效失败:', err));
				
				return jsonResponse(200, { ok:true, code:"OK", message:"已刪除", meta:{ requestId } }, corsHeaders);
			} catch (err) {
				console.error(JSON.stringify({ level:"error", requestId, path, err:String(err) }));
				return jsonResponse(500, { ok:false, code:"INTERNAL_ERROR", message:"刪除失敗", meta:{ requestId } }, corsHeaders);
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

			// 構建員工時薪快取（以 Users.base_salary 與年度特休計算）
			const usersRateRows = await env.DATABASE.prepare(
				"SELECT user_id, base_salary FROM Users WHERE is_deleted = 0"
			).all();
			const leaveRows = await env.DATABASE.prepare(
				"SELECT user_id, annual_leave_balance FROM LeaveBalances WHERE year = ?"
			).bind(year).all();
			const leavesMap = new Map();
			(leaveRows?.results || []).forEach(r => { leavesMap.set(r.user_id, Number(r.annual_leave_balance || 0)); });
			const hourlyRatesMap = {};
			(usersRateRows?.results || []).forEach(u => {
				const monthlySalary = Number(u.base_salary || 0);
				const annualHours = 2080;
				const annualLeaveHours = Number(leavesMap.get(u.user_id) || 0);
				const actualHours = Math.max(0, annualHours - annualLeaveHours);
				const monthlyBaseHours = actualHours / 12;
				hourlyRatesMap[u.user_id] = monthlyBaseHours > 0 ? (monthlySalary / monthlyBaseHours) : 0;
			});
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

			// 1. 獲取所有員工（含月薪）
			const usersRows = await env.DATABASE.prepare(
				"SELECT user_id, name, start_date as hire_date, base_salary FROM Users WHERE is_deleted = 0 ORDER BY name ASC"
			).all();
			const users = usersRows?.results || [];
			const employeeCount = users.length;

			// 2. 獲取本月管理費用明細（按分攤方式分組）
			const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
			const overheadDetailsRows = await env.DATABASE.prepare(
				`SELECT m.cost_type_id, m.amount, t.allocation_method
				 FROM MonthlyOverheadCosts m
				 LEFT JOIN OverheadCostTypes t ON m.cost_type_id = t.cost_type_id
				 WHERE m.year = ? AND m.month = ? AND m.is_deleted = 0 AND t.is_deleted = 0`
			).bind(year, month).all();
			const overheadDetails = overheadDetailsRows?.results || [];
			
			// 計算各分攤方式的總金額
			let totalPerEmployee = 0;
			let totalPerHour = 0;
			let totalPerRevenue = 0;
			
			for (const detail of overheadDetails) {
				const amount = Number(detail.amount || 0);
				if (detail.allocation_method === 'per_employee') {
					totalPerEmployee += amount;
				} else if (detail.allocation_method === 'per_hour') {
					totalPerHour += amount;
				} else if (detail.allocation_method === 'per_revenue') {
					totalPerRevenue += amount;
				}
			}
			
			// 3. 計算本月總工時（用於按工時分攤）
			const totalMonthHoursRow = await env.DATABASE.prepare(
				`SELECT SUM(hours) as total FROM Timesheets 
				 WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0`
			).bind(yearMonth).first();
			const totalMonthHours = Number(totalMonthHoursRow?.total || 0);
			
			// 4. 計算本月總營收（用於按營收分攤）- 暫時設為 0，待收據系統完善後實作
			const totalMonthRevenue = 0;

			const employees = [];
			
			for (const user of users) {
				const userId = user.user_id;
				const monthlySalary = Number(user.base_salary || 0);
				
				// 2. 實際計算本月薪資成本
				let totalLaborCostCents = monthlySalary * 100; // 底薪
				
				// 2.1 查詢並計算固定薪資項目（津貼、獎金等）
				const salaryItems = await env.DATABASE.prepare(
					`SELECT item_type, amount_cents, recurring_type, recurring_months, effective_date, expiry_date
					 FROM SalaryItems
					 WHERE user_id = ? AND is_deleted = 0`
				).bind(userId).all();
				
				const items = salaryItems?.results || [];
				for (const item of items) {
					const shouldPay = shouldPayInMonth(item.recurring_type, item.recurring_months, item.effective_date, item.expiry_date, yearMonth);
					if (shouldPay && (item.item_type === 'allowance' || item.item_type === 'bonus')) {
						totalLaborCostCents += Number(item.amount_cents || 0);
					}
				}
				
				// 2.2 計算本月產生的補休時數
				const [y, m] = yearMonth.split('-');
				const firstDay = `${y}-${m}-01`;
				const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
				const lastDayStr = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
				
				const compGrantsRows = await env.DATABASE.prepare(
					`SELECT hours FROM CompensatoryLeaveGrants
					 WHERE user_id = ? AND generated_date >= ? AND generated_date <= ? AND is_deleted = 0`
				).bind(userId, firstDay, lastDayStr).all();
				const totalCompHoursGenerated = (compGrantsRows?.results || []).reduce((sum, g) => sum + Number(g.hours || 0), 0);
				
				// 2.3 計算本月使用的補休時數
				const compUsedRows = await env.DATABASE.prepare(
					`SELECT amount, unit FROM LeaveRequests
					 WHERE user_id = ? AND leave_type = 'compensatory' AND status = 'approved'
					   AND start_date >= ? AND start_date <= ? AND is_deleted = 0`
				).bind(userId, firstDay, lastDayStr).all();
				let totalCompHoursUsed = 0;
				for (const leave of (compUsedRows?.results || [])) {
					totalCompHoursUsed += leave.unit === 'days' ? Number(leave.amount) * 8 : Number(leave.amount);
				}
				
				// 2.4 計算未使用補休轉加班費（簡化：使用時薪240基準）
				const unusedCompHours = Math.max(0, totalCompHoursGenerated - totalCompHoursUsed);
				const hourlyRateCents = Math.round(monthlySalary / 240 * 100);
				const expiredCompPayCents = Math.round(unusedCompHours * hourlyRateCents * 1.34); // 簡化使用平均倍率
				
				totalLaborCostCents += expiredCompPayCents;
				
				const totalLaborCost = Math.round(totalLaborCostCents / 100);
				const expiredCompPay = Math.round(expiredCompPayCents / 100);
				
				// 4. 獲取本月實際工時記錄（用於計算工時分攤）
				const timesheetRows = await env.DATABASE.prepare(
					`SELECT SUM(hours) as total
					 FROM Timesheets 
					 WHERE user_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
				).bind(userId, yearMonth).all();
				const monthHours = Number(timesheetRows?.results?.[0]?.total || 0);
				
				// 10. 計算分攤管理費用（根據各成本項目的分攤方式）
				let overheadAllocation = 0;
				
				// 10.1 按員工數分攤（每人平均）
				if (totalPerEmployee > 0 && employeeCount > 0) {
					overheadAllocation += Math.round(totalPerEmployee / employeeCount);
				}
				
				// 10.2 按工時比例分攤
				if (totalPerHour > 0 && totalMonthHours > 0) {
					overheadAllocation += Math.round(totalPerHour * (monthHours / totalMonthHours));
				}
				
				// 10.3 按營收比例分攤（待實作）
				if (totalPerRevenue > 0 && totalMonthRevenue > 0) {
					// TODO: 計算該員工的營收貢獻，按比例分攤
					// const employeeRevenue = ...;
					// overheadAllocation += Math.round(totalPerRevenue * (employeeRevenue / totalMonthRevenue));
				}
				
				// 計算實際時薪（包含管理費分攤）
				const totalCost = totalLaborCost + overheadAllocation;
				const actualHourlyRate = monthHours > 0 ? Math.round(totalCost / monthHours) : 0;
				
				employees.push({
					userId,
					name: user.name,
					baseSalary: monthlySalary, // 底薪
					totalCompHoursGenerated: Math.round(totalCompHoursGenerated * 10) / 10, // 本月產生補休
					totalCompHoursUsed: Math.round(totalCompHoursUsed * 10) / 10, // 本月使用補休
					unusedCompHours: Math.round(unusedCompHours * 10) / 10, // 未使用補休
					expiredCompPay, // 未使用補休轉加班費
					monthHours: Math.round(monthHours * 10) / 10, // 本月總工時
					laborCost: totalLaborCost, // 薪資成本（包括底薪、津贴、奖金、加班费等所有项目）
					overheadAllocation, // 分攤管理費用
					totalCost, // 總成本（薪資 + 管理費）
					actualHourlyRate // 實際時薪（包含管理費分攤）= 總成本 / 工時
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
			console.error(`[Overhead] 員工成本分析錯誤:`, err);
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

			// 構建員工時薪快取（以 Users.base_salary 與年度特休計算）
			const usersRateRows = await env.DATABASE.prepare(
				"SELECT user_id, base_salary FROM Users WHERE is_deleted = 0"
			).all();
			const leaveRows = await env.DATABASE.prepare(
				"SELECT user_id, total FROM LeaveBalances WHERE year = ? AND leave_type = 'annual'"
			).bind(year).all();
			const leavesMap = new Map();
			(leaveRows?.results || []).forEach(r => { leavesMap.set(r.user_id, Number(r.total || 0)); });
			const hourlyRatesMap = {};
			(usersRateRows?.results || []).forEach(u => {
				const monthlySalary = Number(u.base_salary || 0);
				const annualHours = 2080;
				const annualLeaveDays = Number(leavesMap.get(u.user_id) || 0);
				const annualLeaveHours = annualLeaveDays * 8;
				const actualHours = Math.max(0, annualHours - annualLeaveHours);
				const monthlyBaseHours = actualHours / 12;
				hourlyRatesMap[u.user_id] = monthlyBaseHours > 0 ? (monthlySalary / monthlyBaseHours) : 0;
			});

			// 1. 獲取所有客戶
			const clientsRows = await env.DATABASE.prepare(
				"SELECT client_id, company_name FROM Clients WHERE is_deleted = 0 ORDER BY company_name ASC"
			).all();
			const clientsList = clientsRows?.results || [];

			const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
			const clients = [];

			for (const client of clientsList) {
				const clientId = client.client_id;
				
				// 2. 獲取該客戶本月所有工時記錄（包含work_type和work_date）
				const timesheetRows = await env.DATABASE.prepare(
					`SELECT user_id, work_type, work_date, hours
					 FROM Timesheets
					 WHERE client_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
				).bind(clientId, yearMonth).all();
				const timesheets = timesheetRows?.results || [];
				
				if (timesheets.length === 0) continue;
				
				let totalHours = 0;
				let weightedHours = 0;
				let laborCost = 0;
				const taskCount = new Set();
				const userHourlyRates = {}; // 快取員工時薪
				const processedFixedKeys = new Set(); // 追踪已处理的 fixed_8h 类型（国定假日/例假日）
				
				// 3. 計算每筆工時的成本
				for (const ts of timesheets) {
					if (!ts.user_id) continue;
					taskCount.add(ts.task_id);
					
					const hours = Number(ts.hours || 0);
					const date = ts.work_date || '';
					const workTypeId = parseInt(ts.work_type) || 1;
					const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0;
					
					totalHours += hours;
					
					// 計算加權工時
					let tsWeightedHours;
					if (workTypeId === 7 || workTypeId === 10) {
						// 國定假日和例假日：同一天同类型只计算一次8h加权（与薪资页面逻辑一致）
						const key = `${date}:${workTypeId}`;
						if (!processedFixedKeys.has(key)) {
							tsWeightedHours = 8.0;
							processedFixedKeys.add(key);
						} else {
							tsWeightedHours = 0; // 同一天同类型的后续记录不计入加权
						}
					} else {
						tsWeightedHours = hours * multiplier;
					}
					weightedHours += tsWeightedHours;
					
					// 獲取員工時薪（以 base_salary 推導）
					if (!userHourlyRates[ts.user_id]) {
						userHourlyRates[ts.user_id] = Number(hourlyRatesMap[ts.user_id] || 0);
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
					 WHERE substr(work_date, 1, 7) = ? AND is_deleted = 0`
				).bind(yearMonth).first();
				const totalMonthHours = Number(totalMonthHoursRow?.total || 0);
				
				const overheadAllocation = totalMonthHours > 0 
					? Math.round(totalOverhead * (totalHours / totalMonthHours))
					: 0;
				
				// 5. 獲取本月收入（按收據日期月份彙總）
				const revenueRow = await env.DATABASE.prepare(
					`SELECT SUM(total_amount) as total FROM Receipts 
					 WHERE client_id = ? AND substr(receipt_date, 1, 7) = ? AND is_deleted = 0`
				).bind(clientId, yearMonth).first();
				const revenue = Number(revenueRow?.total || 0);
				
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
			const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
			
			// 構建員工時薪快取（以 Users.base_salary 與年度特休計算）
			const usersRateRows = await env.DATABASE.prepare(
				"SELECT user_id, base_salary FROM Users WHERE is_deleted = 0"
			).all();
			const leaveRows = await env.DATABASE.prepare(
				"SELECT user_id, total FROM LeaveBalances WHERE year = ? AND leave_type = 'annual'"
			).bind(year).all();
			const leavesMap = new Map();
			(leaveRows?.results || []).forEach(r => { leavesMap.set(r.user_id, Number(r.total || 0)); });
			const hourlyRatesMap = {};
			(usersRateRows?.results || []).forEach(u => {
				const monthlySalary = Number(u.base_salary || 0);
				const annualHours = 2080;
				const annualLeaveDays = Number(leavesMap.get(u.user_id) || 0);
				const annualLeaveHours = annualLeaveDays * 8;
				const actualHours = Math.max(0, annualHours - annualLeaveHours);
				const monthlyBaseHours = actualHours / 12;
				hourlyRatesMap[u.user_id] = monthlyBaseHours > 0 ? (monthlySalary / monthlyBaseHours) : 0;
			});

			// 1. 獲取所有有工時記錄的客戶（按客戶分組，因為 Timesheets 沒有 task_id）
			const clientRows = await env.DATABASE.prepare(
				`SELECT DISTINCT
					c.client_id,
					c.company_name
				 FROM Clients c
				 JOIN Timesheets ts ON ts.client_id = c.client_id AND substr(ts.work_date, 1, 7) = ? AND ts.is_deleted = 0
				 WHERE c.is_deleted = 0
				 ORDER BY c.company_name ASC`
			).bind(yearMonth).all();
			const clientList = clientRows?.results || [];

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

			const clients = [];
			
			// 3. 為每個客戶計算成本
			for (const client of clientList) {
				// 獲取該客戶的所有工時記錄（包含work_date用于去重）
				const timesheetRows = await env.DATABASE.prepare(
					`SELECT user_id, work_type, work_date, hours
					 FROM Timesheets 
					 WHERE client_id = ? AND substr(work_date, 1, 7) = ? AND is_deleted = 0`
				).bind(client.client_id, yearMonth).all();
				const timesheets = timesheetRows?.results || [];
				
				let hours = 0;
				let weightedHours = 0;
				const processedFixedKeys = new Set(); // 追踪已处理的 fixed_8h 类型（国定假日/例假日）
				
				// 第一遍：计算加权工时
				for (const ts of timesheets) {
					const tsHours = Number(ts.hours || 0);
					const date = ts.work_date || '';
					const workTypeId = parseInt(ts.work_type) || 1;
					const multiplier = WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0;
					
					hours += tsHours;
					
					// 計算加權工時
					if (workTypeId === 7 || workTypeId === 10) {
						// 國定假日和例假日：同一天同类型只计算一次8h加权（与薪资页面逻辑一致）
						const key = `${date}:${workTypeId}`;
						if (!processedFixedKeys.has(key)) {
							weightedHours += 8.0;
							processedFixedKeys.add(key);
						}
					} else {
						weightedHours += tsHours * multiplier;
					}
				}
				
				// 第二遍：使用每筆時錄對應員工之時薪計算人力成本
				let laborCost = 0;
				processedFixedKeys.clear(); // 重置，用于第二遍计算
				
				for (const ts of timesheets) {
					const date = ts.work_date || '';
					const workTypeId = parseInt(ts.work_type) || 1;
					let tsWeightedHours;
					
					if (workTypeId === 7 || workTypeId === 10) {
						// 國定假日和例假日：同一天同类型只计算一次8h加权
						const key = `${date}:${workTypeId}`;
						if (!processedFixedKeys.has(key)) {
							tsWeightedHours = 8.0;
							processedFixedKeys.add(key);
						} else {
							tsWeightedHours = 0; // 同一天同类型的后续记录不计入
						}
					} else {
						tsWeightedHours = Number(ts.hours || 0) * (WORK_TYPE_MULTIPLIERS[workTypeId] || 1.0);
					}
					const rate = Number(hourlyRatesMap[ts.user_id] || 0);
					laborCost += Math.round(rate * tsWeightedHours);
				}
				
				// 按工時比例分攤管理費用
				const overheadAllocation = totalMonthHours > 0 
					? Math.round(totalOverhead * (hours / totalMonthHours))
					: 0;
				
				clients.push({
					clientId: client.client_id,
					clientName: client.company_name,
					totalHours: hours,
					weightedHours,
					laborCost,
					overheadAllocation,
					totalCost: laborCost + overheadAllocation,
					taskCount: 0,  // 由于没有 task_id，无法统计任务数
					revenue: 0      // 需要从其他地方获取收入数据
				});
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

	return jsonResponse(404, { ok:false, code:"NOT_FOUND", message:"不存在", meta:{ requestId } }, corsHeaders);
}



