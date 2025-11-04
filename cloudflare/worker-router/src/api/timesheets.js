import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { generateCacheKey, getCache, saveCache, invalidateCacheByType } from "../cache-helper.js";
import { getKVCache, saveKVCache, deleteKVCacheByPrefix } from "../kv-cache-helper.js";

/**
 * 工時類型定義（符合勞基法規定）
 */
const WORK_TYPES = {
	1: { name: '正常工時', multiplier: 1.0, isOvertime: false },
	2: { name: '平日加班（前2小時）', multiplier: 1.34, isOvertime: true },
	3: { name: '平日加班（後2小時）', multiplier: 1.67, isOvertime: true },
	4: { name: '休息日加班（前2小時）', multiplier: 1.34, isOvertime: true },
	5: { name: '休息日加班（第3-8小時）', multiplier: 1.67, isOvertime: true },
	6: { name: '休息日加班（第9-12小時）', multiplier: 2.67, isOvertime: true },
	7: { name: '國定假日加班（8小時內）', multiplier: 2.0, isOvertime: true, maxHours: 8, special: 'fixed_8h' },
	8: { name: '國定假日加班（第9-10小時）', multiplier: 1.34, isOvertime: true },
	9: { name: '國定假日加班（第11-12小時）', multiplier: 1.67, isOvertime: true },
	10: { name: '例假日加班（8小時內）', multiplier: 2.0, isOvertime: true, maxHours: 8, special: 'fixed_8h' },
	11: { name: '例假日加班（第9-10小時）', multiplier: 1.34, isOvertime: true },  // 修正：超过8h按平日加班
	12: { name: '例假日加班（第11-12小時）', multiplier: 1.67, isOvertime: true },  // 新增：11-12h按平日加班后2h
};

/**
 * 計算加權工時
 */
function calculateWeightedHours(workTypeId, hours) {
	const workType = WORK_TYPES[workTypeId];
	if (!workType) return hours;
	
	// 特殊情況：國定假日/例假日 8小時內類型，固定為 8.0 加權工時
	if (workType.special === 'fixed_8h') {
		return 8.0;
	}
	
	// 一般情況：實際工時 × 倍率
	return hours * workType.multiplier;
}

/**
 * ⚡ 失效指定周的缓存
 */
async function invalidateWeekCache(env, userId, weekStart) {
	try {
		await env.DATABASE.prepare(
			`UPDATE WeeklyTimesheetCache 
			 SET invalidated = 1 
			 WHERE user_id = ? AND week_start_date = ?`
		).bind(userId, weekStart).run();
		
		console.log('[WeekCache] ✓ 缓存已失效', { userId, week: weekStart });
	} catch (err) {
		console.error('[WeekCache] 失效缓存失败:', err);
	}
}

/**
 * ⚡ 检查并获取周缓存（基于数据变动）
 */
async function getWeekCache(env, userId, weekStart) {
	try {
		const cache = await env.DATABASE.prepare(
			`SELECT rows_data, last_updated_at, rows_count, total_hours, hit_count, data_version
			 FROM WeeklyTimesheetCache
			 WHERE user_id = ? AND week_start_date = ? AND invalidated = 0`
		).bind(userId, weekStart).first();
		
		if (!cache) return null;
		
		// 更新访问时间和命中次数
		await env.DATABASE.prepare(
			`UPDATE WeeklyTimesheetCache 
			 SET last_accessed_at = datetime('now'), 
			     hit_count = hit_count + 1 
			 WHERE user_id = ? AND week_start_date = ?`
		).bind(userId, weekStart).run();
		
		return {
			data: JSON.parse(cache.rows_data || '[]'),
			meta: {
				cached: true,
				rows_count: cache.rows_count,
				total_hours: cache.total_hours,
				last_updated: cache.last_updated_at,
				hit_count: (cache.hit_count || 0) + 1,
				version: cache.data_version
			}
		};
	} catch (err) {
		console.error('[WeekCache] 读取缓存失败:', err);
		return null;
	}
}

/**
 * GET /api/v1/timelogs - 查詢工時記錄（支持周缓存）
 */
async function handleGetTimelogs(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	try {
		const params = url.searchParams;
		const startDate = (params.get("start_date") || "").trim();
		const endDate = (params.get("end_date") || "").trim();
		const useCache = params.get("use_cache") !== 'false'; // 默认使用缓存
		
		// ⚡ 尝试使用周缓存（仅当查询7天范围且非管理员时）
		if (useCache && !me.is_admin && startDate && endDate) {
			const start = new Date(startDate);
			const end = new Date(endDate);
			const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
			
			// 检查是否是完整的一周（7天）
			if (daysDiff === 6 && start.getDay() === 1) { // 周一开始
				const weekCache = await getWeekCache(env, me.user_id, startDate);
				if (weekCache) {
					console.log('[WeekCache] ✓ 缓存命中', { userId: me.user_id, week: startDate });
					return jsonResponse(200, { 
						ok: true, 
						code: "SUCCESS", 
						message: "查詢成功（使用缓存）", 
						data: weekCache.data, 
						meta: { requestId, ...weekCache.meta } 
					}, corsHeaders);
				}
			}
		}
		
		// 正常查询流程（缓存未命中或不适用）
		const where = ["t.is_deleted = 0"];
		const binds = [];
		
		// 權限控制：員工只能看自己的
		if (!me.is_admin) {
			where.push("t.user_id = ?");
			binds.push(String(me.user_id));
		}
		
		// 日期範圍篩選
		if (startDate) {
			where.push("t.work_date >= ?");
			binds.push(startDate);
		}
		if (endDate) {
			where.push("t.work_date <= ?");
			binds.push(endDate);
		}
		
		const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
		
		const rows = await env.DATABASE.prepare(
			`SELECT t.timesheet_id, t.user_id, t.work_date, t.client_id, t.service_id, t.service_item_id, t.service_name, t.work_type, t.hours, t.note,
			        u.name as user_name, u.username
			 FROM Timesheets t
			 LEFT JOIN Users u ON t.user_id = u.user_id
			 ${whereSql}
			 ORDER BY t.work_date ASC, t.timesheet_id ASC`
		).bind(...binds).all();
		
		const data = (rows?.results || []).map(r => ({
			log_id: r.timesheet_id,
			timesheet_id: r.timesheet_id,
			user_id: r.user_id,
			user_name: r.user_name || r.username || '未知',
			work_date: r.work_date,
			client_id: r.client_id || "",
			service_id: parseInt(r.service_id) || parseInt(r.service_name) || 1,
			service_item_id: parseInt(r.service_item_id) || 1,
			work_type_id: parseInt(r.work_type) || 1,
			hours: Number(r.hours || 0),
			notes: r.note || "",
		}));
		
		return jsonResponse(200, { 
			ok: true, 
			code: "SUCCESS", 
			message: "查詢成功", 
			data, 
			meta: { requestId, cached: false } 
		}, corsHeaders);
		
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, getCorsHeadersForRequest(request, env));
	}
}

/**
 * POST /api/v1/timelogs - 新增/更新工時（UPSERT）
 */
async function handlePostTimelogs(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	let body;
	try { 
		body = await request.json(); 
	} catch (_) {
		return jsonResponse(400, { 
			ok: false, 
			code: "BAD_REQUEST", 
			message: "請求格式錯誤", 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	// 解析欄位
	const work_date = String(body?.work_date || "").trim();
	const client_id = String(body?.client_id || "").trim();
	const service_id = parseInt(body?.service_id) || 0;
	const service_item_id = parseInt(body?.service_item_id) || 0;
	const work_type_id = parseInt(body?.work_type_id) || 0;
	const hours = Number(body?.hours);
	const notes = String(body?.notes || "").trim();
	const timesheet_id = body?.timesheet_id ? parseInt(body.timesheet_id) : null;
	
	// 驗證
	const errors = [];
	
	if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
		errors.push({ field: "work_date", message: "日期格式必須為 YYYY-MM-DD" });
	}
	
	if (!client_id) {
		errors.push({ field: "client_id", message: "請選擇客戶" });
	}
	
	if (!service_id) {
		errors.push({ field: "service_id", message: "請選擇服務項目" });
	}
	
	if (!service_item_id) {
		errors.push({ field: "service_item_id", message: "請選擇服務子項目" });
	}
	
	if (!work_type_id || !WORK_TYPES[work_type_id]) {
		errors.push({ field: "work_type_id", message: "請選擇有效的工時類型" });
	}
	
	if (!Number.isFinite(hours) || hours <= 0) {
		errors.push({ field: "hours", message: "工時必須大於 0" });
	}
	
	// 檢查 0.5 倍數
	if (Math.abs(hours * 2 - Math.round(hours * 2)) > 1e-9) {
		errors.push({ field: "hours", message: "工時必須是 0.5 的倍數" });
	}
	
	// 檢查最大值限制
	const workType = WORK_TYPES[work_type_id];
	if (workType && workType.maxHours && hours > workType.maxHours) {
		errors.push({ 
			field: "hours", 
			message: `${workType.name}最多只能填 ${workType.maxHours} 小時` 
		});
	}
	
	if (hours > 12) {
		errors.push({ field: "hours", message: "工時不可超過 12 小時" });
	}
	
	if (errors.length) {
		return jsonResponse(422, { 
			ok: false, 
			code: "VALIDATION_ERROR", 
			message: "輸入有誤", 
			errors, 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	try {
		// 獲取工時類型
		const workType = WORK_TYPES[work_type_id];
		if (!workType) {
			return jsonResponse(422, {
				ok: false,
				code: "VALIDATION_ERROR",
				message: "無效的工時類型",
				errors: [{ field: "work_type_id", message: "工時類型不存在" }],
				meta: { requestId }
			}, corsHeaders);
		}
		
		// 獲取該日期的假日信息，判斷日期類型
		const holidayRow = await env.DATABASE.prepare(
			`SELECT is_national_holiday FROM Holidays WHERE holiday_date = ?`
		).bind(work_date).first();
		
		const date = new Date(work_date + 'T00:00:00');
		const dow = date.getDay();
		
		// 判斷日期類型
		let dateType = 'workday';
		if (holidayRow?.is_national_holiday === 1) {
			dateType = 'national_holiday';
		} else if (dow === 0) {
			dateType = 'weekly_restday'; // 週日（例假）
		} else if (dow === 6) {
			dateType = 'restday'; // 週六（休息日）
		}
		
		// 驗證工時類型是否適用於該日期類型
		const allowedTypes = {
			'workday': [1, 2, 3], // 一般、平日OT前2h、平日OT後2h
			'restday': [4, 5, 6], // 休息日前2h、休息日3-8h、休息日9-12h
			'weekly_restday': [10, 11], // 例假日加班
			'national_holiday': [7, 8, 9] // 國定假日加班
		};
		
		const dateTypeNames = {
			'workday': '工作日',
			'restday': '休息日',
			'weekly_restday': '例假日',
			'national_holiday': '國定假日'
		};
		
		if (!allowedTypes[dateType].includes(work_type_id)) {
			const dateTypeName = dateTypeNames[dateType] || dateType;
			return jsonResponse(422, {
				ok: false,
				code: "VALIDATION_ERROR",
				message: `${work_date}（${dateTypeName}）不可使用「${workType.name}」`,
				errors: [{ 
					field: "work_type_id", 
					message: `該日期類型為${dateTypeName}，請選擇適合的工時類型` 
				}],
				meta: { requestId, work_date, dateType, workType: workType.name }
			}, corsHeaders);
		}
		
		// 計算加權工時
		const weighted_hours = calculateWeightedHours(work_type_id, hours);
		
		let log_id;
		let isUpdate = false; // 追蹤是新建還是更新
		
		// 策略：如果提供了 timesheet_id，直接更新該記錄的所有欄位
		// 這樣可以支持修改 service_id/service_item_id 而不創建重複記錄，也不會觸發外鍵約束問題
		if (timesheet_id) {
			// 驗證該記錄屬於當前用戶
			const existingRow = await env.DATABASE.prepare(
				`SELECT timesheet_id FROM Timesheets 
				 WHERE timesheet_id = ? AND user_id = ? AND is_deleted = 0`
			).bind(timesheet_id, String(me.user_id)).first();
			
		if (existingRow) {
			// 直接更新所有欄位（包括 service_id, service_item_id, work_type, hours）
			log_id = timesheet_id;
			isUpdate = true;
			
			// 獲取舊的工時數據，用於驗證
			const oldData = await env.DATABASE.prepare(
				`SELECT hours, work_type FROM Timesheets WHERE timesheet_id = ?`
			).bind(log_id).first();
			
			const oldHours = Number(oldData?.hours || 0);
			const hoursDiff = hours - oldHours;  // 正數表示增加，負數表示減少
			
			// 驗證修改後當日總工時是否超過 12 小時
			if (hoursDiff > 0) {  // 只在增加工時時檢查
				const sumRow = await env.DATABASE.prepare(
					`SELECT COALESCE(SUM(hours), 0) AS s 
					 FROM Timesheets 
					 WHERE user_id = ? AND work_date = ? AND is_deleted = 0`
				).bind(String(me.user_id), work_date).first();
				
				const currentTotal = Number(sumRow?.s || 0);
				if (currentTotal + hoursDiff > 12 + 1e-9) {
					return jsonResponse(422, {
						ok: false,
						code: "VALIDATION_ERROR",
						message: "修改後每日工時合計不可超過 12 小時",
						errors: [{ field: "hours", message: "超過每日上限" }],
						meta: { requestId }
					}, corsHeaders);
				}
			}
			
			// 驗證修改後同一工時類型的累計是否超過上限
			if (workType.maxHours) {
				const workTypeSum = await env.DATABASE.prepare(
					`SELECT COALESCE(SUM(hours), 0) AS s 
					 FROM Timesheets 
					 WHERE user_id = ? AND work_date = ? AND work_type = ? AND is_deleted = 0`
				).bind(String(me.user_id), work_date, String(work_type_id)).first();
				
				const currentWorkTypeTotal = Number(workTypeSum?.s || 0);
				const newWorkTypeTotal = currentWorkTypeTotal - oldHours + hours;
				
				if (newWorkTypeTotal > workType.maxHours + 1e-9) {
					return jsonResponse(422, {
						ok: false,
						code: "VALIDATION_ERROR",
						message: `修改後「${workType.name}」當日累計不可超過 ${workType.maxHours} 小時`,
						errors: [{ 
							field: "hours", 
							message: `當日已有 ${currentWorkTypeTotal} 小時，修改後將變成 ${newWorkTypeTotal.toFixed(1)} 小時（超過上限）` 
						}],
						meta: { requestId }
					}, corsHeaders);
				}
			}
			
			await env.DATABASE.prepare(
				`UPDATE Timesheets 
				 SET client_id = ?, 
				     service_id = ?, 
				     service_item_id = ?, 
				     service_name = ?, 
				     work_type = ?, 
				     hours = ?, 
				     note = ?, 
				     updated_at = ?
				 WHERE timesheet_id = ?`
			).bind(
				client_id,
				service_id,
				service_item_id,
				String(service_id), // 保留舊欄位以向後相容
				String(work_type_id),
				hours,
				notes,
				new Date().toISOString(),
				log_id
			).run();
			
			// 已更新，跳過後續的插入邏輯
		} else {
				// 如果記錄不存在或不屬於當前用戶，將 timesheet_id 設為 null，允許新增
				log_id = null;
			}
		}
		
		// 如果沒有提供 timesheet_id，或者提供的 timesheet_id 無效，檢查是否已存在相同組合
		if (!log_id) {
			const duplicateRow = await env.DATABASE.prepare(
				`SELECT timesheet_id 
				 FROM Timesheets 
				 WHERE user_id = ? 
				   AND work_date = ? 
				   AND client_id = ? 
				   AND service_id = ? 
				   AND service_item_id = ? 
				   AND work_type = ? 
				   AND is_deleted = 0`
			).bind(
				String(me.user_id), 
				work_date, 
				client_id, 
				service_id,
				service_item_id,
				String(work_type_id)
			).first();
			
		if (duplicateRow) {
			// 如果已存在相同組合，累加工時（自動合併）
			log_id = duplicateRow.timesheet_id;
			isUpdate = true;
			
			// 獲取現有工時
			const existingRow = await env.DATABASE.prepare(
				`SELECT hours FROM Timesheets WHERE timesheet_id = ?`
			).bind(log_id).first();
			
			const existingHours = Number(existingRow?.hours || 0);
			const newTotalHours = existingHours + hours;
			
			// 驗證累加後是否超過工時類型的上限
			if (workType.maxHours && newTotalHours > workType.maxHours) {
				return jsonResponse(422, {
					ok: false,
					code: "VALIDATION_ERROR",
					message: `累加後「${workType.name}」工時為 ${newTotalHours} 小時，超過上限 ${workType.maxHours} 小時`,
					errors: [{ 
						field: "hours", 
						message: `該日已有 ${existingHours} 小時，最多還可填 ${workType.maxHours - existingHours} 小時` 
					}]
				}, corsHeaders);
			}
			
			// 驗證累加後當日總工時是否超過 12 小時
			const sumRow = await env.DATABASE.prepare(
				`SELECT COALESCE(SUM(hours), 0) AS s 
				 FROM Timesheets 
				 WHERE user_id = ? AND work_date = ? AND is_deleted = 0 AND timesheet_id != ?`
			).bind(String(me.user_id), work_date, log_id).first();
			
			const otherHoursTotal = Number(sumRow?.s || 0);
			const dailyTotal = otherHoursTotal + newTotalHours;
			
			if (dailyTotal > 12 + 1e-9) {
				return jsonResponse(422, {
					ok: false,
					code: "VALIDATION_ERROR",
					message: `累加後當日總工時為 ${dailyTotal.toFixed(1)} 小時，超過上限 12 小時`,
					errors: [{ 
						field: "hours", 
						message: `當日已有 ${otherHoursTotal.toFixed(1)} 小時，本記錄已有 ${existingHours} 小時，最多還可累加 ${Math.max(0, 12 - otherHoursTotal - existingHours).toFixed(1)} 小時` 
					}]
				}, corsHeaders);
			}
			
			// 累加工時
			await env.DATABASE.prepare(
				`UPDATE Timesheets 
				 SET hours = hours + ?, updated_at = ?
				 WHERE timesheet_id = ?`
			).bind(hours, new Date().toISOString(), log_id).run();
		}
		}
		
		// 如果還是沒有 log_id，表示需要新增記錄
		if (!log_id) {
			// INSERT：新增記錄
			// 先檢查單日總工時是否超過 12
			const sumRow = await env.DATABASE.prepare(
				`SELECT COALESCE(SUM(hours), 0) AS s 
				 FROM Timesheets 
				 WHERE user_id = ? AND work_date = ? AND is_deleted = 0`
			).bind(String(me.user_id), work_date).first();
			
		const currentTotal = Number(sumRow?.s || 0);
		if (currentTotal + hours > 12 + 1e-9) {
			return jsonResponse(422, { 
				ok: false, 
				code: "VALIDATION_ERROR", 
				message: "每日工時合計不可超過 12 小時", 
				errors: [{ field: "hours", message: "超過每日上限" }], 
				meta: { requestId } 
			}, corsHeaders);
		}
		
		// 檢查同一天同一工時類型的累計工時是否超過該類型的上限
		if (workType.maxHours) {
			const workTypeSum = await env.DATABASE.prepare(
				`SELECT COALESCE(SUM(hours), 0) AS s 
				 FROM Timesheets 
				 WHERE user_id = ? AND work_date = ? AND work_type = ? AND is_deleted = 0`
			).bind(String(me.user_id), work_date, String(work_type_id)).first();
			
			const existingWorkTypeTotal = Number(workTypeSum?.s || 0);
			const newWorkTypeTotal = existingWorkTypeTotal + hours;
			
			if (newWorkTypeTotal > workType.maxHours + 1e-9) {
				return jsonResponse(422, {
					ok: false,
					code: "VALIDATION_ERROR",
					message: `「${workType.name}」當日累計不可超過 ${workType.maxHours} 小時`,
					errors: [{ 
						field: "hours", 
						message: `該日已有 ${existingWorkTypeTotal} 小時「${workType.name}」，最多還可填 ${Math.max(0, workType.maxHours - existingWorkTypeTotal)} 小時` 
					}],
					meta: { requestId }
				}, corsHeaders);
			}
		}
		
		await env.DATABASE.prepare(
				`INSERT INTO Timesheets (user_id, work_date, client_id, service_id, service_item_id, service_name, work_type, hours, note, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).bind(
				String(me.user_id), 
				work_date, 
				client_id, 
				service_id,
				service_item_id,
				String(service_id), // 保留舊欄位以向後相容
				String(work_type_id),
				hours, 
				notes, 
				new Date().toISOString(), 
				new Date().toISOString()
			).run();
			
			const idRow = await env.DATABASE.prepare("SELECT last_insert_rowid() AS id").first();
			log_id = idRow?.id;
		}
		
		// 計算補休工時（如果是加班）
		const comp_hours_generated = workType.isOvertime ? (workType.special === 'fixed_8h' ? 8 : hours) : 0;
		
		// 如果是加班，寫入補休追蹤表
		if (comp_hours_generated > 0) {
			const generatedDate = work_date;
			// 計算到期日（當月底）
			const dateObj = new Date(work_date + 'T00:00:00Z');
			const year = dateObj.getUTCFullYear();
			const month = dateObj.getUTCMonth();
			const lastDay = new Date(Date.UTC(year, month + 1, 0));
			const expiryDate = `${lastDay.getUTCFullYear()}-${String(lastDay.getUTCMonth() + 1).padStart(2, '0')}-${String(lastDay.getUTCDate()).padStart(2, '0')}`;
			
			// 寫入 CompensatoryLeaveGrants (使用 timesheet_id 作為 source_timelog_id)
			await env.DATABASE.prepare(
				`INSERT INTO CompensatoryLeaveGrants 
				 (user_id, source_timelog_id, hours_generated, hours_remaining, generated_date, expiry_date, original_rate, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
			).bind(
				String(me.user_id),
				log_id,  // log_id 就是 timesheet_id
				comp_hours_generated,
				comp_hours_generated,  // 初始時 remaining = generated
				generatedDate,
				expiryDate,
				workType.multiplier
			).run();
		}
		
		console.log('[TIMELOG] 保存成功:', { log_id, weighted_hours, comp_hours_generated });
		
		// ⚡ 失效该周的缓存和月度统计缓存（不等待完成，避免阻塞响应）
		const workDateObj = new Date(work_date + 'T00:00:00');
		const dayOfWeek = workDateObj.getDay();
		const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周日是0，要往回6天到周一
		const monday = new Date(workDateObj);
		monday.setDate(monday.getDate() + mondayOffset);
		const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
		const workMonth = `${workDateObj.getFullYear()}-${String(workDateObj.getMonth() + 1).padStart(2, '0')}`;
		
		Promise.all([
			invalidateWeekCache(env, String(me.user_id), weekStart),
			invalidateCacheByType(env, 'monthly_summary', { userId: String(me.user_id) })
		]).catch(err => {
			console.error('[TIMELOG] 失效缓存失败（不影响保存）:', err);
		});
		
		return jsonResponse(200, { 
			ok: true, 
			code: "SUCCESS", 
			message: isUpdate ? "已更新" : "已建立", 
			data: { 
				log_id, 
				weighted_hours, 
				comp_hours_generated 
			}, 
			meta: { requestId } 
		}, corsHeaders);
		
	} catch (err) {
		console.error(JSON.stringify({ 
			level: "error", 
			requestId, 
			path: url.pathname, 
			err: String(err),
			stack: err.stack 
		}));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, corsHeaders);
	}
}

/**
 * DELETE /api/v1/timelogs/batch - 批次刪除工時（刪除整列）
 */
async function handleDeleteTimelogsBatch(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	let body;
	try { 
		body = await request.json(); 
	} catch (_) {
		return jsonResponse(400, { 
			ok: false, 
			code: "BAD_REQUEST", 
			message: "請求格式錯誤", 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	const start_date = String(body?.start_date || "").trim();
	const end_date = String(body?.end_date || "").trim();
	const client_id = String(body?.client_id || "").trim();
	const service_id = parseInt(body?.service_id) || 0;
	const service_item_id = parseInt(body?.service_item_id) || 0;
	const work_type_id = String(body?.work_type_id || "").trim();
	
	if (!start_date || !end_date || !client_id || !service_id || !service_item_id || !work_type_id) {
		return jsonResponse(400, { 
			ok: false, 
			code: "BAD_REQUEST", 
			message: "缺少必要參數", 
			meta: { requestId } 
		}, corsHeaders);
	}
	
	try {
		// 軟刪除符合條件的所有記錄
		const result = await env.DATABASE.prepare(
			`UPDATE Timesheets 
			 SET is_deleted = 1, updated_at = ?
			 WHERE user_id = ? 
			   AND work_date >= ? 
			   AND work_date <= ? 
			   AND client_id = ? 
			   AND service_id = ? 
			   AND service_item_id = ?
			   AND work_type = ?
			   AND is_deleted = 0`
		).bind(
			new Date().toISOString(),
			String(me.user_id), 
			start_date, 
			end_date, 
			client_id, 
			service_id,
			service_item_id,
			work_type_id
		).run();
		
		const deleted_count = result.changes || 0;
		
		// ⚡ 失效该日期范围内所有周的缓存
		if (deleted_count > 0) {
			const startDateObj = new Date(start_date + 'T00:00:00');
			const endDateObj = new Date(end_date + 'T00:00:00');
			
			// 计算需要失效的所有周（周一）
			const weeksToInvalidate = new Set();
			let currentDate = new Date(startDateObj);
			
			while (currentDate <= endDateObj) {
				const dayOfWeek = currentDate.getDay();
				const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
				const monday = new Date(currentDate);
				monday.setDate(monday.getDate() + mondayOffset);
				const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
				weeksToInvalidate.add(weekStart);
				
				// 移动到下一周
				currentDate.setDate(currentDate.getDate() + 7);
			}
			
			// 并发失效所有周
			Promise.all([...weeksToInvalidate].map(weekStart => 
				invalidateWeekCache(env, String(me.user_id), weekStart)
			)).catch(err => {
				console.error('[TIMELOG] 批量失效缓存失败（不影响删除）:', err);
			});
		}
		
		return jsonResponse(200, { 
			ok: true, 
			code: "SUCCESS", 
			message: `已刪除 ${deleted_count} 筆記錄`, 
			data: { deleted_count }, 
			meta: { requestId } 
		}, corsHeaders);
		
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, corsHeaders);
	}
}

/**
 * GET /api/v1/timelogs/summary - 月統計
 */
async function handleGetMonthlySummary(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	try {
		const params = url.searchParams;
		const month = (params.get("month") || "").trim(); // 格式：YYYY-MM
		
		// 驗證月份格式
		if (!month || !/^\d{4}-\d{2}$/.test(month)) {
			return jsonResponse(400, {
				ok: false,
				code: "INVALID_MONTH",
				message: "月份格式錯誤，應為 YYYY-MM",
				meta: { requestId }
			}, corsHeaders);
		}
		
		// 計算月份起始和結束日期
		const [year, monthNum] = month.split('-');
		const startDate = `${year}-${monthNum}-01`;
		const nextMonth = parseInt(monthNum) === 12 ? `${parseInt(year) + 1}-01` : `${year}-${String(parseInt(monthNum) + 1).padStart(2, '0')}`;
		const endDate = `${nextMonth}-01`;
		
	// 權限控制：員工只能查詢自己的，管理員可以指定 user_id
	let userId = me.user_id;
	if (me.is_admin && params.get("user_id")) {
		userId = parseInt(params.get("user_id"));
	}
		
		// ⚡ 优先尝试从KV缓存读取（极快<50ms）
		const cacheKey = generateCacheKey('monthly_summary', { userId, month });
		console.log('[MONTHLY_SUMMARY] 🔍 查询缓存', { userId, month, cacheKey });
		const kvCached = await getKVCache(env, cacheKey);
		
		if (kvCached && kvCached.data) {
			return jsonResponse(200, {
				ok: true,
				code: "SUCCESS",
				message: "查詢成功（KV缓存）⚡",
				data: kvCached.data,
				meta: { requestId, month, userId, ...kvCached.meta, cache_source: 'kv' }
			}, corsHeaders);
		}
		
		// ⚡ KV未命中，尝试D1缓存（备份）
		const d1Cached = await getCache(env, cacheKey);
		if (d1Cached && d1Cached.data) {
			// 异步同步到KV
			saveKVCache(env, cacheKey, 'monthly_summary', d1Cached.data, {
				userId: String(userId),
				scopeParams: { userId, month },
				ttl: 3600
			}).catch(err => console.error('[TIMELOGS] KV同步失败:', err));
			
			return jsonResponse(200, {
				ok: true,
				code: "SUCCESS",
				message: "查詢成功（D1缓存）",
				data: d1Cached.data,
				meta: { requestId, month, userId, ...d1Cached.meta, cache_source: 'd1' }
			}, corsHeaders);
		}
		
		// 查詢當月工時記錄
		const timelogs = await env.DATABASE.prepare(
			`SELECT work_type, hours
			 FROM Timesheets
			 WHERE user_id = ?
			   AND work_date >= ?
			   AND work_date < ?
			   AND is_deleted = 0`
		).bind(userId, startDate, endDate).all();
		
		// 計算統計數據
		let totalHours = 0;
		let overtimeHours = 0;
		let weightedHours = 0;
		
		timelogs.results.forEach(log => {
			const hours = parseFloat(log.hours) || 0;
			const workTypeId = parseInt(log.work_type) || 1;
			const workType = WORK_TYPES[workTypeId];
			
			if (workType) {
				totalHours += hours;
				
				if (workType.isOvertime) {
					overtimeHours += hours;
				}
				
				weightedHours += calculateWeightedHours(workTypeId, hours);
			}
		});
		
	// 查詢當月請假時數（需要根據 unit 轉換）
	const leaveRows = await env.DATABASE.prepare(
		`SELECT unit, amount
		 FROM LeaveRequests
		 WHERE user_id = ?
		   AND start_date >= ?
		   AND start_date < ?
		   AND status = 'approved'
		   AND is_deleted = 0`
	).bind(userId, startDate, endDate).all();
	
	// 計算總請假時數（day 換算為 8 小時）
	let leaveHours = 0;
	if (leaveRows.results) {
		leaveRows.results.forEach(row => {
			const amount = parseFloat(row.amount) || 0;
			if (row.unit === 'hour') {
				leaveHours += amount;
			} else if (row.unit === 'day') {
				leaveHours += amount * 8; // 1天 = 8小時
			}
		});
	}
		
		const summaryData = {
			month,
			total_hours: Math.round(totalHours * 10) / 10,
			overtime_hours: Math.round(overtimeHours * 10) / 10,
			weighted_hours: Math.round(weightedHours * 10) / 10,
			leave_hours: Math.round(leaveHours * 10) / 10
		};
		
		// ⚡ 并行保存到KV（极快）和D1（备份）
		try {
			await Promise.all([
				saveKVCache(env, cacheKey, 'monthly_summary', summaryData, {
					userId: String(userId),
					scopeParams: { userId, month },
					ttl: 3600 // 1小时
				}),
				saveCache(env, cacheKey, 'monthly_summary', summaryData, {
					userId: String(userId),
					scopeParams: { userId, month }
				})
			]);
			console.log('[TIMELOGS] ✓ 月度统计缓存已保存（KV+D1）');
		} catch (err) {
			console.error('[TIMELOGS] ✗ 月度统计缓存保存失败:', err);
		}
		
		// 回傳統計結果
		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: "查詢成功",
			data: summaryData,
			meta: { requestId }
		}, corsHeaders);
		
	} catch (err) {
		console.error(JSON.stringify({ level: "error", requestId, path: url.pathname, err: String(err) }));
		const body = { ok: false, code: "INTERNAL_ERROR", message: "伺服器錯誤", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, corsHeaders);
	}
}

/**
 * ⚡ POST /api/v1/timelogs/week-cache - 保存周缓存
 */
async function handleSaveWeekCache(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	
	let body;
	try {
		body = await request.json();
	} catch (_) {
		return jsonResponse(400, {
			ok: false,
			code: "BAD_REQUEST",
			message: "請求格式錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
	
	const weekStart = String(body?.week_start || "").trim();
	const rowsData = body?.rows_data || [];
	
	// 验证
	if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_DATE",
			message: "日期格式錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
	
	if (!Array.isArray(rowsData)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_DATA",
			message: "數據格式錯誤",
			meta: { requestId }
		}, corsHeaders);
	}
	
	try {
		const now = new Date().toISOString();
		const rowsJson = JSON.stringify(rowsData);
		const rowsCount = rowsData.length;
		const totalHours = rowsData.reduce((sum, row) => {
			const rowTotal = (row.hours || []).reduce((s, h) => s + (Number(h) || 0), 0);
			return sum + rowTotal;
		}, 0);
		
		// UPSERT：如果存在则更新，否则插入（同时递增版本号并重置失效标记）
		await env.DATABASE.prepare(
			`INSERT INTO WeeklyTimesheetCache (user_id, week_start_date, rows_data, rows_count, total_hours, data_version, invalidated, last_updated_at, created_at)
			 VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?)
			 ON CONFLICT(user_id, week_start_date) DO UPDATE SET
			   rows_data = excluded.rows_data,
			   rows_count = excluded.rows_count,
			   total_hours = excluded.total_hours,
			   data_version = data_version + 1,
			   invalidated = 0,
			   last_updated_at = excluded.last_updated_at`
		).bind(me.user_id, weekStart, rowsJson, rowsCount, totalHours, now, now).run();
		
		console.log('[WeekCache] ✓ 缓存已保存', {
			userId: me.user_id,
			week: weekStart,
			rows: rowsCount,
			hours: totalHours
		});
		
		return jsonResponse(200, {
			ok: true,
			code: "SUCCESS",
			message: "緩存已保存",
			data: {
				week_start: weekStart,
				rows_count: rowsCount,
				total_hours: totalHours
			},
			meta: { requestId }
		}, corsHeaders);
		
	} catch (err) {
		console.error('[WeekCache] 保存缓存失败:', err);
		const body = { ok: false, code: "INTERNAL_ERROR", message: "保存緩存失敗", meta: { requestId } };
		if (env.APP_ENV && env.APP_ENV !== "prod") body.error = String(err);
		return jsonResponse(500, body, corsHeaders);
	}
}

/**
 * 主路由處理
 */
export async function handleTimesheets(request, env, me, requestId, url) {
	const corsHeaders = getCorsHeadersForRequest(request, env);
	const method = request.method.toUpperCase();
	
	// POST /api/v1/timelogs/week-cache - 保存周缓存
	if (method === "POST" && url.pathname.endsWith("/week-cache")) {
		return handleSaveWeekCache(request, env, me, requestId, url);
	}
	
	// GET /api/v1/timelogs/monthly-summary 或 /summary - 月統計
	if (method === "GET" && (url.pathname.endsWith("/monthly-summary") || url.pathname.endsWith("/summary"))) {
		return handleGetMonthlySummary(request, env, me, requestId, url);
	}
	
	// GET /api/v1/timelogs
	if (method === "GET") {
		return handleGetTimelogs(request, env, me, requestId, url);
	}
	
	// POST /api/v1/timelogs
	if (method === "POST") {
		return handlePostTimelogs(request, env, me, requestId, url);
	}
	
	// DELETE /api/v1/timelogs/batch
	if (method === "DELETE" && url.pathname.endsWith("/batch")) {
		return handleDeleteTimelogsBatch(request, env, me, requestId, url);
	}
	
	return jsonResponse(405, { 
		ok: false, 
		code: "METHOD_NOT_ALLOWED", 
		message: "方法不允許", 
		meta: { requestId } 
	}, corsHeaders);
}
