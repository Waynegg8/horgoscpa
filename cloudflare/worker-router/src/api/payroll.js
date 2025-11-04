import { jsonResponse, getCorsHeadersForRequest } from "../utils.js";
import { getSettingValue } from "./payroll-settings.js";

/**
 * 判断薪资项目是否应该在指定月份发放
 * @param {string} recurringType - 循环类型：'monthly', 'yearly', 'once'
 * @param {string|null} recurringMonths - 发放月份JSON数组，例如 "[6,9,12]"
 * @param {string} effectiveDate - 生效日期 YYYY-MM-DD
 * @param {string|null} expiryDate - 到期日期 YYYY-MM-DD
 * @param {string} targetMonth - 目标月份 YYYY-MM
 * @returns {boolean}
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
			console.error('Invalid recurring_months JSON:', recurringMonths);
			return false;
		}
	}
	
	return false;
}

/**
 * 计算员工的时薪基准
 * 时薪基准 = (底薪 + 经常性给与) ÷ 时薪除数（从系统设定读取，默认240）
 */
async function calculateHourlyRate(env, baseSalaryCents, regularPaymentCents) {
	const divisor = await getSettingValue(env, 'hourly_rate_divisor', 240);
	const totalCents = baseSalaryCents + regularPaymentCents;
	return Math.round(totalCents / divisor); // 四舍五入到整数（分）
}

/**
 * 读取工时月度统计数据
 * 从缓存或数据库读取已计算的统计数据
 * 返回 { total_hours, overtime_hours, weighted_hours, leave_hours }
 */
async function getTimesheetMonthlyStats(env, userId, month) {
	// 1. 尝试从 KV 缓存读取
	const cacheKey = `monthly_summary:${userId}:${month}`;
	try {
		const cached = await env.CACHE.get(cacheKey, 'json');
		if (cached) {
			console.log(`[Payroll] 从缓存读取工时统计: ${cacheKey}`);
			return cached;
		}
	} catch (err) {
		console.warn(`[Payroll] 读取工时统计缓存失败:`, err);
	}
	
	// 2. 缓存未命中，从数据库实时计算
	console.log(`[Payroll] 缓存未命中，从数据库计算工时统计`);
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
	
	const timelogs = await env.DATABASE.prepare(`
		SELECT work_date, work_type, hours
		FROM Timesheets
		WHERE user_id = ?
		  AND work_date >= ?
		  AND work_date <= ?
		  AND is_deleted = 0
		ORDER BY work_date, work_type
	`).bind(userId, firstDay, lastDayStr).all();
	
	// 工时类型定义（与 timesheets.js 一致）
	const WORK_TYPES = {
		1: { multiplier: 1.0, isOvertime: false },
		2: { multiplier: 1.34, isOvertime: true },
		3: { multiplier: 1.67, isOvertime: true },
		4: { multiplier: 1.34, isOvertime: true },
		5: { multiplier: 1.67, isOvertime: true },
		6: { multiplier: 2.67, isOvertime: true },
		7: { multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },  // 国定假日：月薪已含原本1日，加班费只算额外1日
		8: { multiplier: 1.34, isOvertime: true },
		9: { multiplier: 1.67, isOvertime: true },
		10: { multiplier: 1.0, isOvertime: true, special: 'fixed_8h' }, // 例假日：月薪已含原本1日，加班费只算额外1日
		11: { multiplier: 1.0, isOvertime: true },  // 例假日超过8h：同样只算额外1日
	};
	
	// 第一步：统计fixed_8h类型的每日总工时
	const dailyFixedTypeMap = {};
	for (const log of (timelogs.results || [])) {
		const date = log.work_date;
		const workTypeId = parseInt(log.work_type) || 1;
		const workType = WORK_TYPES[workTypeId];
		const hours = parseFloat(log.hours) || 0;
		
		if (workType && workType.special === 'fixed_8h') {
			const key = `${date}:${workTypeId}`;
			if (!dailyFixedTypeMap[key]) {
				dailyFixedTypeMap[key] = 0;
			}
			dailyFixedTypeMap[key] += hours;
		}
	}
	
	// 第二步：计算总工时、加班工时、加权工时
	let totalHours = 0;
	let overtimeHours = 0;
	let weightedHours = 0;
	const processedFixedKeys = new Set();
	
	for (const log of (timelogs.results || [])) {
		const date = log.work_date;
		const hours = parseFloat(log.hours) || 0;
		const workTypeId = parseInt(log.work_type) || 1;
		const workType = WORK_TYPES[workTypeId];
		
		if (workType) {
			totalHours += hours;
			if (workType.isOvertime) {
				overtimeHours += hours;
			}
			
			// 计算加权工时
			if (workType.special === 'fixed_8h') {
				// 同一天同类型的fixed_8h，只计算一次固定8h加权
				const key = `${date}:${workTypeId}`;
				if (!processedFixedKeys.has(key)) {
					weightedHours += 8.0; // 固定8h加权（不论实际工时多少）
					processedFixedKeys.add(key);
				}
			} else {
				weightedHours += hours * workType.multiplier;
			}
		}
	}
	
	return {
		total_hours: Math.round(totalHours * 10) / 10,
		overtime_hours: Math.round(overtimeHours * 10) / 10,
		weighted_hours: Math.round(weightedHours * 10) / 10,
	};
}

/**
 * 获取加班明细（按日期+类型显示，考虑补休扣减）
 * 返回每天的加班记录、补休使用情况、交通补贴明细、国定假日信息
 */
async function getOvertimeDetails(env, userId, month) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 查询当月国定假日
	const holidays = await env.DATABASE.prepare(`
		SELECT holiday_date, name
		FROM Holidays
		WHERE holiday_date >= ?
		  AND holiday_date <= ?
	`).bind(firstDay, lastDayStr).all();
	
	const holidayMap = {};
	for (const h of (holidays.results || [])) {
		holidayMap[h.holiday_date] = h.name;
	}

	// 工时类型定义
	const WORK_TYPES = {
		1: { name: '正常工時', multiplier: 1.0, isOvertime: false },
		2: { name: '平日加班（前2h）', multiplier: 1.34, isOvertime: true },
		3: { name: '平日加班（後2h）', multiplier: 1.67, isOvertime: true },
		4: { name: '休息日（前2h）', multiplier: 1.34, isOvertime: true },
		5: { name: '休息日（3-8h）', multiplier: 1.67, isOvertime: true },
		6: { name: '休息日（9-12h）', multiplier: 2.67, isOvertime: true },
		7: { name: '國定假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },  // 月薪已含原本1日，加班费只算额外1日
		8: { name: '國定假日（9-10h）', multiplier: 1.34, isOvertime: true },
		9: { name: '國定假日（11-12h）', multiplier: 1.67, isOvertime: true },
		10: { name: '例假日（8h內）', multiplier: 1.0, isOvertime: true, special: 'fixed_8h' },  // 月薪已含原本1日，加班费只算额外1日
		11: { name: '例假日（9-12h）', multiplier: 1.0, isOvertime: true },  // 例假日全时段加班费都只算额外1日
	};

	// 查询每日加班记录（按日期+类型）
	const timelogs = await env.DATABASE.prepare(`
		SELECT 
			work_date,
			work_type,
			hours
		FROM Timesheets
		WHERE user_id = ?
		  AND work_date >= ?
		  AND work_date <= ?
		  AND is_deleted = 0
		ORDER BY work_date, work_type
	`).bind(userId, firstDay, lastDayStr).all();

	// 查询补休使用记录（按日期）
	const compLeaves = await env.DATABASE.prepare(`
		SELECT 
			start_date,
			amount,
			unit
		FROM LeaveRequests
		WHERE user_id = ?
		  AND leave_type = 'compensatory'
		  AND status = 'approved'
		  AND start_date >= ?
		  AND start_date <= ?
		  AND is_deleted = 0
		ORDER BY start_date
	`).bind(userId, firstDay, lastDayStr).all();

	// 第一步：按日期+类型分组，计算fixed_8h类型的总工时
	const dailyFixedTypeMap = {}; // { "2024-11-01:10": { totalHours: 5, records: [...] } }
	
	for (const log of (timelogs.results || [])) {
		const date = log.work_date;
		const workTypeId = parseInt(log.work_type) || 1;
		const workType = WORK_TYPES[workTypeId];
		const hours = parseFloat(log.hours) || 0;
		
		if (!workType || !workType.isOvertime || hours === 0) continue;
		
		// 对于fixed_8h类型（例假日/国定假日8h内），需要先分组统计
		if (workType.special === 'fixed_8h') {
			const key = `${date}:${workTypeId}`;
			if (!dailyFixedTypeMap[key]) {
				dailyFixedTypeMap[key] = { totalHours: 0, records: [] };
			}
			dailyFixedTypeMap[key].totalHours += hours;
			dailyFixedTypeMap[key].records.push({ log, workType, hours });
		}
	}
	
	// 第二步：生成overtimeRecords，对fixed_8h类型按比例分配补休和加权
	const overtimeRecords = [];
	const processedFixedKeys = new Set(); // 防止重复处理
	
	for (const log of (timelogs.results || [])) {
		const date = log.work_date;
		const workTypeId = parseInt(log.work_type) || 1;
		const workType = WORK_TYPES[workTypeId];
		const hours = parseFloat(log.hours) || 0;
		
		if (!workType || !workType.isOvertime || hours === 0) continue;
		
		// 对于fixed_8h类型，按比例分配补休和加权
		if (workType.special === 'fixed_8h') {
			const key = `${date}:${workTypeId}`;
			const group = dailyFixedTypeMap[key];
			
			// 同一天同类型的所有记录，共享补休和8h加权（按比例分配）
			const totalHours = group.totalHours;
			const ratio = hours / totalHours; // 当前记录占比
			
			// 例假日（ID 10）：16h补休 + 8h加权
			// 国定假日（ID 7）：8h补休 + 8h加权
			const totalCompHours = workTypeId === 10 ? 16 : 8;
			const compHoursGenerated = totalCompHours * ratio;
			const fixedWeightedHours = 8 * ratio; // ⭐ 加权工时固定8h按比例分配
			
			console.log(`[DEBUG fixed_8h] ${date} ${workType.name}:`, {
				workTypeId,
				hours,
				totalHours,
				ratio,
				totalCompHours,
				compHoursGenerated,
				fixedWeightedHours
			});
			
			overtimeRecords.push({
				date: date,
				workType: workType.name,
				workTypeId: workTypeId,
				originalHours: hours, // 实际工作时数（用于显示）
				remainingHours: fixedWeightedHours, // ⭐ 用于FIFO扣减的是加权时数
				multiplier: workType.multiplier,
				isFixedType: true,
				compHoursGenerated: Math.round(compHoursGenerated * 100) / 100, // 按比例分配的补休
				fixedWeightedHours: Math.round(fixedWeightedHours * 100) / 100, // ⭐ 固定分配的加权时数
				totalDailyHours: totalHours, // 标记当天该类型的总工时（用于前端显示）
			});
		} else {
			// 非fixed_8h类型，正常处理
			overtimeRecords.push({
				date: date,
				workType: workType.name,
				workTypeId: workTypeId,
				originalHours: hours,
				remainingHours: hours,
				multiplier: workType.multiplier,
				isFixedType: false,
				compHoursGenerated: hours, // 实际工时=补休时数
				fixedWeightedHours: null, // 非固定类型没有这个字段
			});
		}
	}
	
	// 按日期排序（确保FIFO顺序）
	overtimeRecords.sort((a, b) => a.date.localeCompare(b.date));
	
	// 统计使用的补休总时数
	let totalCompHoursUsed = 0;
	for (const leave of (compLeaves.results || [])) {
		const amount = parseFloat(leave.amount) || 0;
		const hours = leave.unit === 'day' ? amount * 8 : amount;
		totalCompHoursUsed += hours;
	}
	
	// FIFO扣减补休：从最早的加班记录开始扣除
	let remainingCompToDeduct = totalCompHoursUsed;
	
	for (const record of overtimeRecords) {
		if (remainingCompToDeduct <= 0) break;
		
		if (remainingCompToDeduct >= record.remainingHours) {
			// 这条记录的加班时数全部被补休抵消
			remainingCompToDeduct -= record.remainingHours;
			record.compDeducted = record.remainingHours;
			record.remainingHours = 0;
		} else {
			// 部分扣除
			record.compDeducted = remainingCompToDeduct;
			record.remainingHours -= remainingCompToDeduct;
			remainingCompToDeduct = 0;
		}
	}
	
	// 按日期重新整理（用于显示）
	const dailyOvertimeMap = {};
	let totalOvertimeHours = 0;
	let totalWeightedHours = 0;
	let effectiveTotalWeightedHours = 0;
	
	for (const record of overtimeRecords) {
		if (!dailyOvertimeMap[record.date]) {
			// 计算星期几
			const dateObj = new Date(record.date + 'T00:00:00');
			const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()];
			
			dailyOvertimeMap[record.date] = {
				date: record.date,
				dayOfWeek: dayOfWeek,
				holidayName: holidayMap[record.date] || null,
				items: [],
				totalHours: 0,
				totalWeighted: 0,
				effectiveWeighted: 0
			};
		}
		
		// ⭐ 计算原始加权工时
		// 对于fixed_8h类型，使用固定分配的加权时数（确保总和8h）
		// 对于其他类型，按实际小时数 × 倍率
		const originalWeighted = record.isFixedType 
			? record.fixedWeightedHours  // 国定假日/例假日固定8h，按比例分配
			: record.originalHours * record.multiplier;
		
		// ⭐ 计算扣除补休后的有效加权工时
		// remainingHours对于fixed_8h类型已经是加权时数
		const effectiveWeighted = record.isFixedType
			? record.remainingHours  // 已经是加权时数
			: record.remainingHours * record.multiplier;
		
		if (record.isFixedType) {
			console.log(`[DEBUG 整理数据] ${record.date}:`, {
				isFixedType: record.isFixedType,
				fixedWeightedHours: record.fixedWeightedHours,
				compHoursGenerated: record.compHoursGenerated,
				originalWeighted,
				effectiveWeighted
			});
		}
		
		dailyOvertimeMap[record.date].items.push({
			workType: record.workType,
			workTypeId: record.workTypeId,
			originalHours: Math.round(record.originalHours * 10) / 10,
			remainingHours: Math.round(record.remainingHours * 10) / 10,
			compDeducted: Math.round((record.compDeducted || 0) * 10) / 10,
			compHoursGenerated: Math.round(record.compHoursGenerated * 10) / 10,  // 累积的补休时数
			isFixedType: record.isFixedType,  // 是否为固定类型（用于显示）
			totalDailyHours: record.totalDailyHours || null, // 当天该类型的总工时
			multiplier: record.multiplier,
			originalWeighted: Math.round(originalWeighted * 10) / 10,
			effectiveWeighted: Math.round(effectiveWeighted * 10) / 10
		});
		
		dailyOvertimeMap[record.date].totalHours += record.originalHours;
		dailyOvertimeMap[record.date].totalWeighted += originalWeighted;
		dailyOvertimeMap[record.date].effectiveWeighted += effectiveWeighted;
		
		totalOvertimeHours += record.originalHours;
		totalWeightedHours += originalWeighted;
		effectiveTotalWeightedHours += effectiveWeighted;
	}
	
	// 查询外出交通明细
	const trips = await env.DATABASE.prepare(`
		SELECT 
			trip_date,
			destination,
			distance_km,
			purpose
		FROM BusinessTrips
		WHERE user_id = ?
		  AND trip_date >= ?
		  AND trip_date <= ?
		  AND status = 'approved'
		  AND is_deleted = 0
		ORDER BY trip_date
	`).bind(userId, firstDay, lastDayStr).all();
	
	const tripDetails = (trips.results || []).map(t => ({
		date: t.trip_date,
		destination: t.destination,
		distanceKm: Math.round(parseFloat(t.distance_km) * 10) / 10,
		purpose: t.purpose || ''
	}));
	
	// 查询到期转加班费的补休
	const expiredComp = await env.DATABASE.prepare(`
		SELECT 
			hours_expired,
			amount_cents
		FROM CompensatoryOvertimePay
		WHERE user_id = ?
		  AND year_month = ?
	`).bind(userId, month).first();
	
	return {
		dailyOvertime: Object.values(dailyOvertimeMap),
		totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
		totalWeightedHours: Math.round(totalWeightedHours * 10) / 10,
		effectiveTotalWeightedHours: Math.round(effectiveTotalWeightedHours * 10) / 10,
		totalCompHoursUsed: Math.round(totalCompHoursUsed * 10) / 10,
		tripDetails: tripDetails,
		expiredCompHours: expiredComp ? Math.round(parseFloat(expiredComp.hours_expired) * 10) / 10 : 0,
		expiredCompPayCents: expiredComp ? (expiredComp.amount_cents || 0) : 0
	};
}

/**
 * 计算误餐费
 * 从 Timesheets 读取平日加班记录，统计满足条件的天数
 * 返回 { mealAllowanceCents, overtimeDays }
 */
async function calculateMealAllowance(env, userId, month) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 从系统设定读取误餐费条件
	const minOvertimeHours = await getSettingValue(env, 'meal_allowance_min_overtime_hours', 1.5);
	
	// 读取该月的平日加班记录（work_type = 2 或 3）
	const timesheets = await env.DATABASE.prepare(`
		SELECT 
			work_date,
			SUM(hours) as daily_overtime_hours
		FROM Timesheets
		WHERE user_id = ?
		  AND work_date >= ?
		  AND work_date <= ?
		  AND work_type IN ('2', '3')
		  AND is_deleted = 0
		GROUP BY work_date
	`).bind(userId, firstDay, lastDayStr).all();

	let mealAllowanceCount = 0;
	
	// 统计满足条件的天数
	for (const ts of (timesheets.results || [])) {
		const dailyHours = parseFloat(ts.daily_overtime_hours) || 0;
		if (dailyHours >= minOvertimeHours) {
			mealAllowanceCount++;
		}
	}

	// 从系统设定读取误餐费单价
	const mealAllowancePerTime = await getSettingValue(env, 'meal_allowance_per_time', 100);
	const mealAllowanceCents = mealAllowanceCount * (mealAllowancePerTime * 100); // 元转分

	return {
		mealAllowanceCents,
		overtimeDays: mealAllowanceCount
	};
}

/**
 * 计算交通补贴
 * 从 BusinessTrips 读取外出记录并按**单次**计算区间后汇总
 */
async function calculateTransportAllowance(env, userId, month) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 读取该月的外出记录（按单次计算区间）
	const tripsResult = await env.DATABASE.prepare(`
		SELECT trip_date, destination, distance_km, purpose
		FROM BusinessTrips
		WHERE user_id = ?
		  AND trip_date >= ?
		  AND trip_date <= ?
		  AND status = 'approved'
		  AND is_deleted = 0
		ORDER BY trip_date
	`).bind(userId, firstDay, lastDayStr).all();

	const trips = tripsResult.results || [];
	
	// 从系统设定读取交通补贴区间设定
	const amountPerInterval = await getSettingValue(env, 'transport_amount_per_interval', 60); // 每区间60元
	const kmPerInterval = await getSettingValue(env, 'transport_km_per_interval', 5); // 每5公里1个区间
	
	// 按单次计算区间并汇总
	let totalKm = 0;
	let totalIntervals = 0;
	const tripDetails = [];
	
	for (const trip of trips) {
		const km = trip.distance_km || 0;
		const intervals = km > 0 ? Math.ceil(km / kmPerInterval) : 0;
		totalKm += km;
		totalIntervals += intervals;
		
		tripDetails.push({
			date: trip.trip_date,
			destination: trip.destination,
			distance: km,
			purpose: trip.purpose,
			intervals: intervals,
			amount: intervals * amountPerInterval
		});
	}
	
	const transportCents = totalIntervals * amountPerInterval * 100; // 元转分

	return {
		transportCents,
		totalKm,
		intervals: totalIntervals,
		tripDetails
	};
}

/**
 * 计算请假扣款
 * 包含病假、事假、生理假的复杂逻辑
 * 
 * 生理假规则：
 * - 每月可请1天，全年前3天不并入病假额度，减半支薪，不影响全勤
 * - 超过3天的生理假并入病假额度，减半支薪，仍不影响全勤
 * - 所有生理假都减半发给，不影响全勤奖金
 */
async function calculateLeaveDeductions(env, userId, month, baseSalaryCents, regularAllowanceCents) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
	const yearFirstDay = `${year}-01-01`;

	// 读取该月的请假记录（病假、事假、生理假）- 分别按单位汇总
	const leavesMonth = await env.DATABASE.prepare(`
		SELECT 
			leave_type,
			unit,
			SUM(amount) as total_amount
		FROM LeaveRequests
		WHERE user_id = ?
		  AND start_date <= ?
		  AND end_date >= ?
		  AND status = 'approved'
		  AND leave_type IN ('sick', 'personal', 'menstrual')
		GROUP BY leave_type, unit
	`).bind(userId, lastDayStr, firstDay).all();

	// 读取该月的请假记录详细列表（用于显示日期）
	const leaveDetails = await env.DATABASE.prepare(`
		SELECT 
			leave_type,
			start_date,
			end_date,
			amount,
			unit,
			reason
		FROM LeaveRequests
		WHERE user_id = ?
		  AND start_date <= ?
		  AND end_date >= ?
		  AND status = 'approved'
		  AND leave_type IN ('sick', 'personal', 'menstrual')
		ORDER BY start_date
	`).bind(userId, lastDayStr, firstDay).all();

	// 读取今年累计的生理假天数（用于判断是否超过3天）
	const menstrualYearResult = await env.DATABASE.prepare(`
		SELECT SUM(amount) as total_menstrual
		FROM LeaveRequests
		WHERE user_id = ?
		  AND start_date >= ?
		  AND start_date <= ?
		  AND status = 'approved'
		  AND leave_type = 'menstrual'
	`).bind(userId, yearFirstDay, lastDayStr).first();
	
	const yearMenstrualDays = menstrualYearResult?.total_menstrual || 0;

	// 统一按小时汇总（天数转换为小时）
	let sickHours = 0;
	let personalHours = 0;
	let menstrualHours = 0;

	for (const leave of (leavesMonth.results || [])) {
		const amount = leave.total_amount || 0;
		const unit = leave.unit || 'day';
		const hours = unit === 'day' ? amount * 8 : amount; // 天数转小时
		
		if (leave.leave_type === 'sick') {
			sickHours += hours;
		} else if (leave.leave_type === 'personal') {
			personalHours += hours;
		} else if (leave.leave_type === 'menstrual') {
			menstrualHours += hours;
		}
	}
	
	// 保留天数字段用于全勤判定（按原始天数）
	const sickDays = sickHours / 8;
	const personalDays = personalHours / 8;
	const menstrualDays = menstrualHours / 8;

	// 从系统设定读取日薪计算除数和扣款比例
	const dailySalaryDivisor = await getSettingValue(env, 'leave_daily_salary_divisor', 30);
	const sickLeaveRate = await getSettingValue(env, 'sick_leave_deduction_rate', 0.5); // 病假扣50%
	const personalLeaveRate = await getSettingValue(env, 'personal_leave_deduction_rate', 1.0); // 事假扣100%
	const menstrualLeaveRate = 0.5; // 生理假固定扣50%（减半发给）

	// 日薪 = (底薪 + 经常性给与) / 除数
	const totalBase = baseSalaryCents + regularAllowanceCents;
	const dailySalaryCents = Math.round(totalBase / dailySalaryDivisor);
	
	// 计算时薪（用于请假扣款的精确计算）
	// 时薪 = (底薪 + 经常性给与) / 240
	const hourlyRateCents = Math.round(totalBase / 240);
	
	// 生理假扣款计算
	let menstrualDeductionCents = 0;
	let menstrualFreeDays = 0; // 前3天不并入病假的生理假
	let menstrualMergedDays = 0; // 超过3天并入病假的生理假
	
	if (menstrualDays > 0) {
		// 判断今年累计是否已超过3天
		const previousMenstrualDays = yearMenstrualDays - menstrualDays;
		
		if (previousMenstrualDays < 3) {
			// 本月的生理假部分或全部在前3天内
			menstrualFreeDays = Math.min(menstrualDays, 3 - previousMenstrualDays);
			menstrualMergedDays = menstrualDays - menstrualFreeDays;
		} else {
			// 今年前3天已用完，全部并入病假
			menstrualMergedDays = menstrualDays;
		}
		
		// 请假扣款 = 小时数 × 时薪 × 扣除比例
		menstrualDeductionCents = Math.round(menstrualHours * hourlyRateCents * menstrualLeaveRate);
	}
	
	// 请假扣款 = 小时数 × 时薪 × 扣除比例
	const sickDeductionCents = Math.round(sickHours * hourlyRateCents * sickLeaveRate);
	const personalDeductionCents = Math.round(personalHours * hourlyRateCents * personalLeaveRate);

	// 整理请假详细记录列表
	const leaveDetailsList = (leaveDetails.results || []).map(leave => ({
		leaveType: leave.leave_type,
		startDate: leave.start_date,
		endDate: leave.end_date,
		amount: leave.amount,
		unit: leave.unit,
		reason: leave.reason || ''
	}));

	return {
		leaveDeductionCents: sickDeductionCents + personalDeductionCents + menstrualDeductionCents,
		sickDays,
		personalDays,
		menstrualDays,
		sickHours,           // 病假小时数
		personalHours,       // 事假小时数
		menstrualHours,      // 生理假小时数
		menstrualFreeDays, // 不扣全勤的生理假天数
		menstrualMergedDays, // 并入病假计算的生理假天数
		dailySalaryCents,
		hourlyRateCents,     // 时薪（用于前端显示计算公式）
		leaveDetails: leaveDetailsList // 详细的请假记录列表
	};
}

/**
 * 判定是否全勤
 * 规则：
 * - 有病假或事假则不全勤
 * - 生理假不影响全勤（无论是前3天还是超过3天的）
 */
async function checkFullAttendance(env, userId, month) {
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;

	// 检查是否有病假或事假
	const leaves = await env.DATABASE.prepare(`
		SELECT COUNT(*) as count
		FROM LeaveRequests
		WHERE user_id = ?
		  AND start_date <= ?
		  AND end_date >= ?
		  AND status = 'approved'
		  AND leave_type IN ('sick', 'personal')
	`).bind(userId, lastDayStr, firstDay).first();

	return (leaves?.count || 0) === 0; // 无病假或事假，则全勤
}

/**
 * 计算单个员工的月度薪资
 */
async function calculateEmployeePayroll(env, userId, month) {
	// 1. 读取员工基本信息
	const user = await env.DATABASE.prepare(
		`SELECT user_id, username, name, base_salary FROM Users WHERE user_id = ? AND is_deleted = 0`
	).bind(userId).first();

	if (!user) {
		return null;
	}

	const baseSalaryCents = (user.base_salary || 0) * 100; // 转换为分

	// 2. 计算该月的日期范围
	const [year, monthNum] = month.split('-');
	const firstDay = `${year}-${monthNum}-01`;
	const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
	const lastDayStr = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
	
	// 2.1 自动处理当月底到期的补休（当月产生、当月未用完、当月转加班费）
	// 查询该月底到期且尚未转换的补休
	const expiredGrants = await env.DATABASE.prepare(`
		SELECT grant_id, hours_remaining, original_rate
		FROM CompensatoryLeaveGrants
		WHERE user_id = ? 
		  AND expiry_date = ?
		  AND status = 'active'
		  AND hours_remaining > 0
	`).bind(userId, lastDayStr).all();
	
	if (expiredGrants.results && expiredGrants.results.length > 0) {
		console.log(`[Payroll] 用户${userId}在${month}有${expiredGrants.results.length}笔到期补休需要转换`);
		
		// 检查是否已经转换过了
		const existing = await env.DATABASE.prepare(`
			SELECT pay_id FROM CompensatoryOvertimePay
			WHERE user_id = ? AND year_month = ?
		`).bind(userId, month).first();
		
		if (!existing) {
			// 还没转换，现在转换
			const hourlyRate = (user.base_salary || 0) / 240;
			let totalExpiredHours = 0;
			let totalExpiredCents = 0;
			const grantIds = [];
			
			for (const grant of expiredGrants.results) {
				const hours = Number(grant.hours_remaining || 0);
				const rate = Number(grant.original_rate || 1);
				const amountCents = Math.round(hours * hourlyRate * rate * 100);
				
				totalExpiredHours += hours;
				totalExpiredCents += amountCents;
				grantIds.push(grant.grant_id);
				
				// 更新补休状态为 expired
				await env.DATABASE.prepare(
					`UPDATE CompensatoryLeaveGrants SET status = 'expired' WHERE grant_id = ?`
				).bind(grant.grant_id).run();
			}
			
			// 写入到期转加班费记录
			await env.DATABASE.prepare(`
				INSERT INTO CompensatoryOvertimePay 
				(user_id, year_month, hours_expired, amount_cents, source_grant_ids)
				VALUES (?, ?, ?, ?, ?)
			`).bind(
				userId,
				month,
				totalExpiredHours,
				totalExpiredCents,
				JSON.stringify(grantIds)
			).run();
			
			console.log(`[Payroll] 已自动转换${totalExpiredHours}小时到期补休为${totalExpiredCents}分加班费`);
		}
	}

	// 3. 读取该月有效的薪资项目

	const salaryItems = await env.DATABASE.prepare(`
		SELECT 
			esi.amount_cents,
			esi.recurring_type,
			esi.recurring_months,
			esi.effective_date,
			esi.expiry_date,
			sit.category,
			sit.item_name,
			sit.item_code,
			sit.is_regular_payment
		FROM EmployeeSalaryItems esi
		JOIN SalaryItemTypes sit ON sit.item_type_id = esi.item_type_id
		WHERE esi.user_id = ?
		  AND esi.is_active = 1
		  AND sit.is_active = 1
		  AND esi.effective_date <= ?
		  AND (esi.expiry_date IS NULL OR esi.expiry_date >= ?)
	`).bind(userId, lastDayStr, firstDay).all();

	// 3. 分类统计薪资项目（根据循环类型过滤）
	let regularAllowanceCents = 0;  // 经常性津贴（计入时薪）
	let allowanceCents = 0;          // 非经常性津贴
	let bonusCents = 0;              // 奖金
	let deductionCents = 0;          // 扣款总额
	const hourlyRateBaseItems = [];  // 记录计入时薪的项目
	const allowanceItems = [];       // 所有津贴项目明细
	const bonusItems = [];           // 所有奖金项目明细
	const deductionItems = [];       // 记录所有扣款项目明细（劳保、健保等）

	const items = salaryItems.results || [];
	console.log(`[Payroll] 员工 ${userId} 查询到 ${items.length} 个薪资项目`);
	
	for (const item of items) {
		console.log(`[Payroll] 项目: ${item.item_name}, 类型: ${item.recurring_type}, 金额: ${item.amount_cents}`);
		
		try {
			// 判断是否应该在当月发放
			const recurringType = item.recurring_type || 'monthly';
			const shouldPay = shouldPayInMonth(
				recurringType,
				item.recurring_months,
				item.effective_date,
				item.expiry_date,
				month
			);
			
			console.log(`[Payroll] ${item.item_name} shouldPay=${shouldPay}, recurringType=${recurringType}`);
			
			if (!shouldPay) {
				console.log(`[Payroll] ✗ 跳过 ${item.item_name}（不在发放月份）`);
				continue; // 不在发放月份，跳过
			}
		} catch (error) {
			console.error('[calculateEmployeePayroll] Error checking recurring:', error, item);
			// 如果判断失败，默认发放（向下兼容）
		}
		
		const amount = item.amount_cents || 0;
		
		if (item.category === 'deduction') {
			// 扣款类别：累加到扣款总额，并记录详细项目
			deductionCents += amount;
			deductionItems.push({
				name: item.item_name,
				amountCents: amount,
				itemCode: item.item_code || ''
			});
		} else if (item.category === 'bonus') {
			// 奖金类别
			const isFullAttendanceBonus = item.item_code && item.item_code.toUpperCase().includes('FULL'); // 识别全勤奖金
			
			bonusCents += amount;
			bonusItems.push({
				name: item.item_name,
				amountCents: amount,
				category: 'bonus',
				isRegularPayment: !!item.is_regular_payment,
				itemCode: item.item_code || '',
				isFullAttendanceBonus: isFullAttendanceBonus
			});
			// 如果是经常性给与的奖金（如全勤），也计入时薪基准
			if (item.is_regular_payment) {
				regularAllowanceCents += amount;
				hourlyRateBaseItems.push({
					name: item.item_name,
					amountCents: amount,
					category: 'bonus'
				});
			}
		} else if (item.category === 'allowance') {
			// 津贴类别
			allowanceItems.push({
				name: item.item_name,
				amountCents: amount,
				category: 'allowance',
				isRegularPayment: !!item.is_regular_payment,
				itemCode: item.item_code || ''
			});
			// 如果是经常性给与，计入时薪基准
			if (item.is_regular_payment) {
				regularAllowanceCents += amount;
				hourlyRateBaseItems.push({
					name: item.item_name,
					amountCents: amount,
					category: 'allowance'
				});
			} else {
				// 非经常性津贴（如误餐费）也计入津贴总额
				allowanceCents += amount;
			}
		}
	}

	// 4. 计算时薪基准（用于加班费计算）
	const hourlyRateCents = await calculateHourlyRate(env, baseSalaryCents, regularAllowanceCents);

	// 5. 判定全勤
	const isFullAttendance = await checkFullAttendance(env, userId, month);
	
	// 5.1 重新计算奖金总额和经常性给与（排除未达标的全勤奖金）
	let actualBonusCents = 0;
	let actualRegularAllowanceCents = baseSalaryCents; // 重新计算，从底薪开始
	
	// 重新计算津贴的经常性给与部分
	for (const allowanceItem of allowanceItems) {
		if (allowanceItem.isRegularPayment) {
			actualRegularAllowanceCents += allowanceItem.amountCents || 0;
		}
	}
	
	// 重新计算奖金总额，并处理经常性给与的奖金
	for (const bonusItem of bonusItems) {
		// 如果是全勤奖金且未达标，则不计入
		if (bonusItem.isFullAttendanceBonus && !isFullAttendance) {
			continue;
		}
		actualBonusCents += bonusItem.amountCents || 0;
		// 如果是经常性给与的奖金（且不是未达标的全勤），计入时薪基准
		if (bonusItem.isRegularPayment) {
			actualRegularAllowanceCents += bonusItem.amountCents || 0;
		}
	}
	
	bonusCents = actualBonusCents; // 更新为实际发放的奖金总额
	regularAllowanceCents = actualRegularAllowanceCents - baseSalaryCents; // 减去底薪，得到纯津贴/奖金部分

	// 6. 计算误餐费（仅统计平日加班）
	const mealResult = await calculateMealAllowance(env, userId, month);
	const mealAllowanceCents = mealResult.mealAllowanceCents;
	const overtimeDays = mealResult.overtimeDays;
	
	// 7. 从工时统计读取加权工时，并获取详细明细
	const timesheetStats = await getTimesheetMonthlyStats(env, userId, month);
	const weightedHours = timesheetStats?.weighted_hours || 0;
	const actualOvertimeHours = timesheetStats?.overtime_hours || 0;
	
	// 获取加班明细（按日期+类型）+ 补休使用情况 + 交通明细
	const detailResult = await getOvertimeDetails(env, userId, month);
	const dailyOvertime = detailResult.dailyOvertime || [];
	const totalCompHoursUsed = detailResult.totalCompHoursUsed || 0;
	const effectiveWeightedHours = detailResult.effectiveTotalWeightedHours || 0;
	const expiredCompHours = detailResult.expiredCompHours || 0;
	const expiredCompPayCents = detailResult.expiredCompPayCents || 0;
	
	// 加班费 = 有效加权工时（已按FIFO扣除补休）× 时薪 + 到期补休转加班费
	const overtimeCents = Math.round(effectiveWeightedHours * hourlyRateCents) + expiredCompPayCents;

	// 8. 计算交通补贴
	const transportResult = await calculateTransportAllowance(env, userId, month);
	const transportCents = transportResult.transportCents;
	const totalKm = transportResult.totalKm;
	const transportIntervals = transportResult.intervals || 0;
	const tripDetails = transportResult.tripDetails || [];

	// 9. 计算请假扣款
	const leaveResult = await calculateLeaveDeductions(env, userId, month, baseSalaryCents, regularAllowanceCents);
	const leaveDeductionCents = leaveResult.leaveDeductionCents;
	const sickDays = leaveResult.sickDays;
	const personalDays = leaveResult.personalDays;
	const menstrualDays = leaveResult.menstrualDays || 0;
	const sickHours = leaveResult.sickHours || 0;
	const personalHours = leaveResult.personalHours || 0;
	const menstrualHours = leaveResult.menstrualHours || 0;
	const menstrualFreeDays = leaveResult.menstrualFreeDays || 0;
	const menstrualMergedDays = leaveResult.menstrualMergedDays || 0;
	const dailySalaryCents = leaveResult.dailySalaryCents || 0;
	const leaveDetails = leaveResult.leaveDetails || []; // 详细的请假记录列表

	// 10. 检查绩效奖金调整（如果有月度调整，优先使用调整后的金额）
	const bonusAdjustment = await env.DATABASE.prepare(`
		SELECT bonus_amount_cents 
		FROM MonthlyBonusAdjustments 
		WHERE user_id = ? AND month = ?
	`).bind(userId, month).first();

	let performanceBonusCents = 0;
	if (bonusAdjustment) {
		// 使用调整后的绩效奖金
		performanceBonusCents = bonusAdjustment.bonus_amount_cents || 0;
		console.log(`[Payroll] 使用調整後績效獎金: ${performanceBonusCents / 100} 元`);
	} else {
		// 使用默认的绩效奖金（从薪资项目中提取，通过item_code识别）
		const perfItem = items.find(i => i.item_code === 'PERFORMANCE');
		if (perfItem) {
			performanceBonusCents = perfItem.amount_cents || 0;
			console.log(`[Payroll] 使用預設績效獎金: ${performanceBonusCents / 100} 元`);
		} else {
			console.log(`[Payroll] 未找到績效獎金項目 (item_code = 'PERFORMANCE')`);
		}
	}

	// 11. 计算总薪资
	// 应发 = 底薪 + 经常性津贴 + 奖金 + 加班费 + 误餐费 + 交通补贴 + 绩效奖金
	const grossSalaryCents = baseSalaryCents + regularAllowanceCents + bonusCents + 
	                          overtimeCents + mealAllowanceCents + transportCents + performanceBonusCents;
	
	// 总扣款 = 固定扣款 + 请假扣款
	const totalDeductionCents = deductionCents + leaveDeductionCents;
	
	// 实发 = 应发 - 总扣款
	const netSalaryCents = grossSalaryCents - totalDeductionCents;

	return {
		userId: user.user_id,
		username: user.username,
		name: user.name,
		baseSalaryCents,
		regularAllowanceCents,
		allowanceCents,           // 非经常性津贴总额
		bonusCents,
		overtimeCents,
		mealAllowanceCents,
		transportCents,
		performanceBonusCents,
		deductionCents,           // 固定扣款总额
		deductionItems,           // 固定扣款明细（劳保、健保等）
		allowanceItems,           // 所有津贴项目明细
		bonusItems,               // 所有奖金项目明细
		leaveDeductionCents,      // 请假扣款
		totalDeductionCents,      // 总扣款
		grossSalaryCents,         // 应发薪资（扣款前）
		netSalaryCents,           // 实发薪资（扣款后）
		isFullAttendance,
		hourlyRateCents,
		hourlyRateBaseItems,      // 计入时薪的项目明细
		// 附加信息
		overtimeDays,             // 满足误餐费条件的天数
		weightedHours,            // 原始加权工时（计算前）
		effectiveWeightedHours,   // 有效加权工时（扣除补休后）
		dailyOvertime,            // 每日加班明细（按日期+类型+周几+国定假日）
		totalCompHoursUsed,       // 当月使用的补休时数
		expiredCompHours,         // 到期转加班费的补休时数
		expiredCompPayCents,      // 到期补休转换的加班费
		tripDetails,              // 外出交通明细（按日期）
		totalKm,
		transportIntervals,
		sickDays,
		personalDays,
		menstrualDays,            // 生理假天数
		sickHours,                // 病假小时数（用于显示）
		personalHours,            // 事假小时数（用于显示）
		menstrualHours,           // 生理假小时数（用于显示）
		menstrualFreeDays,        // 不扣全勤的生理假天数（前3天）
		menstrualMergedDays,      // 并入病假的生理假天数（超过3天）
		dailySalaryCents,         // 日薪（用于请假扣款计算）
		leaveDetails,             // 详细的请假记录列表（包含日期）
	};
}

/**
 * 处理薪资相关请求
 */
export async function handlePayroll(request, env, me, requestId, url, path) {
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

	// 调试日志
	console.log(`[Payroll] Method: ${method}, Path: ${path}, URL: ${url.pathname}`);

	try {
		// GET /admin/payroll/preview - 薪资预览（不保存）
		if (method === "GET" && path === "/internal/api/v1/admin/payroll/preview") {
			console.log('[Payroll] Matched: preview');
			return await previewPayroll(env, requestId, corsHeaders, url);
		}

		// POST /admin/payroll/finalize - 产制月结（保存版本快照）
		if (method === "POST" && path === "/internal/api/v1/admin/payroll/finalize") {
			console.log('[Payroll] Matched: finalize');
			return await finalizePayroll(request, env, me, requestId, corsHeaders);
		}

		// GET /admin/payroll/snapshots - 获取月结版本列表
		if (method === "GET" && path === "/internal/api/v1/admin/payroll/snapshots") {
			console.log('[Payroll] Matched: get snapshots');
			return await getPayrollSnapshots(env, requestId, corsHeaders, url);
		}

		// GET /admin/payroll/snapshots/:id - 获取特定版本详情
		if (method === "GET" && path.match(/^\/internal\/api\/v1\/admin\/payroll\/snapshots\/\d+$/)) {
			console.log('[Payroll] Matched: get snapshot by id');
			const snapshotId = parseInt(path.split('/').pop());
			return await getPayrollSnapshotById(env, snapshotId, requestId, corsHeaders);
		}

		// GET /admin/payroll/snapshots/:id/download - 下载版本数据
		if (method === "GET" && path.match(/^\/internal\/api\/v1\/admin\/payroll\/snapshots\/\d+\/download$/)) {
			console.log('[Payroll] Matched: download snapshot');
			const snapshotId = parseInt(path.split('/')[path.split('/').length - 2]);
			return await downloadPayrollSnapshot(env, snapshotId, requestId, corsHeaders);
		}

		// GET /admin/payroll - 查询已产制的薪资（旧API，兼容）
		if (method === "GET" && path === "/internal/api/v1/admin/payroll") {
			console.log('[Payroll] Matched: get run');
			return await getPayrollRun(env, requestId, corsHeaders, url);
		}

		console.log('[Payroll] No route matched! Returning 404');
		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: `API 端点不存在: ${method} ${path}`,
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[handlePayroll] Error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "INTERNAL_ERROR",
			message: "服务器内部错误",
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 薪资预览（不保存到数据库）
 */
async function previewPayroll(env, requestId, corsHeaders, url) {
	const month = url.searchParams.get('month');
	
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_MONTH",
			message: "月份格式错误，应为 YYYY-MM",
			meta: { requestId }
		}, corsHeaders);
	}

	// 获取所有活跃员工
	const users = await env.DATABASE.prepare(
		`SELECT user_id FROM Users WHERE is_deleted = 0 ORDER BY user_id`
	).all();

	const results = [];
	for (const user of (users.results || [])) {
		try {
			console.log(`[Payroll] 计算员工 ${user.user_id} 的薪资`);
			const payroll = await calculateEmployeePayroll(env, user.user_id, month);
			if (payroll) {
				results.push(payroll);
				console.log(`[Payroll] ✓ 员工 ${user.user_id} 计算成功`);
			}
		} catch (err) {
			console.error(`[Payroll] ✗ 员工 ${user.user_id} 计算失败:`, err.message);
			// 继续处理其他员工
		}
	}

	console.log(`[Payroll] 预览完成，共 ${results.length} 名员工`);

	return jsonResponse(200, {
		ok: true,
		data: {
			month,
			users: results,
			total: results.length
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 计算两个版本之间的差异
 */
function calculatePayrollChanges(previousData, currentData) {
	const changes = {
		employeesChanged: [],
		summary: {
			totalEmployees: currentData.length,
			changedEmployees: 0,
			totalDifferenceCents: 0
		}
	};

	// 创建上一版本的映射（按 userId）
	const previousMap = new Map();
	if (previousData) {
		previousData.forEach(emp => {
			previousMap.set(emp.userId, emp);
		});
	}

	// 对比每个员工的数据
	currentData.forEach(current => {
		const previous = previousMap.get(current.userId);
		
		if (!previous) {
			// 新增员工
			changes.employeesChanged.push({
				userId: current.userId,
				name: current.name,
				changeType: 'added',
				netSalaryDiff: current.netSalaryCents
			});
			changes.summary.changedEmployees++;
			changes.summary.totalDifferenceCents += current.netSalaryCents;
		} else {
			// 检查是否有变化
			const diff = current.netSalaryCents - previous.netSalaryCents;
			if (diff !== 0 || current.isFullAttendance !== previous.isFullAttendance) {
				const changeDetails = [];
				if (current.baseSalaryCents !== previous.baseSalaryCents) {
					changeDetails.push(`底薪: ${previous.baseSalaryCents/100} → ${current.baseSalaryCents/100}`);
				}
				if (current.overtimeCents !== previous.overtimeCents) {
					changeDetails.push(`加班費: ${previous.overtimeCents/100} → ${current.overtimeCents/100}`);
				}
				if (current.bonusCents !== previous.bonusCents) {
					changeDetails.push(`獎金: ${previous.bonusCents/100} → ${current.bonusCents/100}`);
				}
				if (current.leaveDeductionCents !== previous.leaveDeductionCents) {
					changeDetails.push(`請假扣款: ${previous.leaveDeductionCents/100} → ${current.leaveDeductionCents/100}`);
				}
				if (current.isFullAttendance !== previous.isFullAttendance) {
					changeDetails.push(`全勤: ${previous.isFullAttendance ? '是' : '否'} → ${current.isFullAttendance ? '是' : '否'}`);
				}
				
				changes.employeesChanged.push({
					userId: current.userId,
					name: current.name,
					changeType: 'modified',
					netSalaryDiff: diff,
					previousNetSalary: previous.netSalaryCents,
					currentNetSalary: current.netSalaryCents,
					details: changeDetails
				});
				changes.summary.changedEmployees++;
				changes.summary.totalDifferenceCents += diff;
			}
		}
	});

	return changes;
}

/**
 * 产制月结（保存版本快照）
 * 允许重复产制，每次产制创建新版本
 */
async function finalizePayroll(request, env, me, requestId, corsHeaders) {
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

	const { month, notes } = body;

	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_MONTH",
			message: "月份格式错误，应为 YYYY-MM",
			meta: { requestId }
		}, corsHeaders);
	}

	// 查询该月份的最新版本号
	const latestVersion = await env.DATABASE.prepare(
		`SELECT version, snapshot_data FROM PayrollSnapshots WHERE month = ? ORDER BY version DESC LIMIT 1`
	).bind(month).first();

	const newVersion = latestVersion ? latestVersion.version + 1 : 1;

	// 计算所有员工薪资
	const users = await env.DATABASE.prepare(
		`SELECT user_id FROM Users WHERE is_deleted = 0 ORDER BY user_id`
	).all();

	const results = [];
	for (const user of (users.results || [])) {
		const payroll = await calculateEmployeePayroll(env, user.user_id, month);
		if (payroll) {
			results.push(payroll);
		}
	}

	// 对比上一版本，计算变更摘要
	let changesSummary = null;
	if (latestVersion && latestVersion.snapshot_data) {
		try {
			const previousData = JSON.parse(latestVersion.snapshot_data);
			changesSummary = calculatePayrollChanges(previousData.users || [], results);
		} catch (err) {
			console.error('[finalizePayroll] 解析上一版本数据失败:', err);
		}
	}

	// 准备快照数据
	const snapshotData = {
		month,
		version: newVersion,
		createdAt: new Date().toISOString(),
		createdBy: me.user_id,
		createdByName: me.full_name || me.username,
		totalEmployees: results.length,
		users: results
	};

	// 保存到数据库
	try {
		const result = await env.DATABASE.prepare(`
			INSERT INTO PayrollSnapshots (month, version, created_by, snapshot_data, changes_summary, notes)
			VALUES (?, ?, ?, ?, ?, ?)
		`).bind(
			month,
			newVersion,
			me.user_id,
			JSON.stringify(snapshotData),
			changesSummary ? JSON.stringify(changesSummary) : null,
			notes || null
		).run();

		return jsonResponse(201, {
			ok: true,
			data: {
				snapshotId: result.meta.last_row_id,
				month,
				version: newVersion,
				totalEmployees: results.length,
				changes: changesSummary
			},
			meta: { requestId }
		}, corsHeaders);

	} catch (error) {
		console.error("[finalizePayroll] Database error:", error);
		return jsonResponse(500, {
			ok: false,
			code: "DATABASE_ERROR",
			message: "保存失败: " + error.message,
			meta: { requestId }
		}, corsHeaders);
	}
}

/**
 * 查询已产制的薪资记录
 */
async function getPayrollRun(env, requestId, corsHeaders, url) {
	const month = url.searchParams.get('month');
	
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_MONTH",
			message: "月份格式错误，应为 YYYY-MM",
			meta: { requestId }
		}, corsHeaders);
	}

	const run = await env.DATABASE.prepare(
		`SELECT run_id, month, created_at FROM PayrollRuns WHERE month = ?`
	).bind(month).first();

	if (!run) {
		return jsonResponse(404, {
		ok: false, 
			code: "NOT_FOUND",
			message: "该月份尚未产制",
			meta: { requestId }
		}, corsHeaders);
	}

	return jsonResponse(200, {
		ok: true,
		data: {
			runId: run.run_id,
			month: run.month,
			createdAt: run.created_at
		},
		meta: { requestId } 
	}, corsHeaders);
}

/**
 * 获取薪资月结版本列表
 */
async function getPayrollSnapshots(env, requestId, corsHeaders, url) {
	const month = url.searchParams.get('month');
	
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return jsonResponse(400, {
			ok: false,
			code: "INVALID_MONTH",
			message: "月份格式错误，应为 YYYY-MM",
			meta: { requestId }
		}, corsHeaders);
	}

	// 获取该月的所有版本，包含创建人信息
	const snapshots = await env.DATABASE.prepare(`
		SELECT 
			ps.snapshot_id, 
			ps.month, 
			ps.version, 
			ps.created_at, 
			ps.created_by,
			ps.changes_summary,
			ps.notes,
			u.full_name as creator_name
		FROM PayrollSnapshots ps
		LEFT JOIN Users u ON ps.created_by = u.user_id
		WHERE ps.month = ?
		ORDER BY ps.version DESC
	`).bind(month).all();

	// 解析 changes_summary
	const results = (snapshots.results || []).map(snap => {
		let changesSummary = null;
		if (snap.changes_summary) {
			try {
				changesSummary = JSON.parse(snap.changes_summary);
			} catch (err) {
				console.error('[getPayrollSnapshots] 解析changes_summary失败:', err);
			}
		}
		
		return {
			snapshotId: snap.snapshot_id,
			month: snap.month,
			version: snap.version,
			createdAt: snap.created_at,
			createdBy: snap.created_by,
			creatorName: snap.creator_name || '未知',
			notes: snap.notes,
			changesSummary
		};
	});

	return jsonResponse(200, {
		ok: true,
		data: {
			month,
			snapshots: results,
			total: results.length
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 获取特定版本的详细数据
 */
async function getPayrollSnapshotById(env, snapshotId, requestId, corsHeaders) {
	const snapshot = await env.DATABASE.prepare(`
		SELECT 
			ps.snapshot_id,
			ps.month,
			ps.version,
			ps.created_at,
			ps.created_by,
			ps.snapshot_data,
			ps.changes_summary,
			ps.notes,
			u.full_name as creator_name
		FROM PayrollSnapshots ps
		LEFT JOIN Users u ON ps.created_by = u.user_id
		WHERE ps.snapshot_id = ?
	`).bind(snapshotId).first();

	if (!snapshot) {
		return jsonResponse(404, {
			ok: false,
			code: "NOT_FOUND",
			message: "找不到该版本",
			meta: { requestId }
		}, corsHeaders);
	}

	// 解析 JSON 数据
	let snapshotData = null;
	let changesSummary = null;
	
	try {
		if (snapshot.snapshot_data) {
			snapshotData = JSON.parse(snapshot.snapshot_data);
		}
		if (snapshot.changes_summary) {
			changesSummary = JSON.parse(snapshot.changes_summary);
		}
	} catch (err) {
		console.error('[getPayrollSnapshotById] JSON解析失败:', err);
		return jsonResponse(500, {
			ok: false,
			code: "PARSE_ERROR",
			message: "数据解析失败",
			meta: { requestId }
		}, corsHeaders);
	}

	return jsonResponse(200, {
		ok: true,
		data: {
			snapshotId: snapshot.snapshot_id,
			month: snapshot.month,
			version: snapshot.version,
			createdAt: snapshot.created_at,
			createdBy: snapshot.created_by,
			creatorName: snapshot.creator_name || '未知',
			notes: snapshot.notes,
			data: snapshotData,
			changes: changesSummary
		},
		meta: { requestId }
	}, corsHeaders);
}

/**
 * 下载薪资月结版本数据（JSON格式）
 */
async function downloadPayrollSnapshot(env, snapshotId, requestId, corsHeaders) {
	const snapshot = await env.DATABASE.prepare(`
		SELECT 
			ps.snapshot_id,
			ps.month,
			ps.version,
			ps.created_at,
			ps.created_by,
			ps.snapshot_data,
			ps.changes_summary,
			ps.notes,
			u.full_name as creator_name
		FROM PayrollSnapshots ps
		LEFT JOIN Users u ON ps.created_by = u.user_id
		WHERE ps.snapshot_id = ?
	`).bind(snapshotId).first();

	if (!snapshot) {
		return jsonResponse(404, {
		ok: false, 
			code: "NOT_FOUND",
			message: "找不到该版本",
		meta: { requestId } 
	}, corsHeaders);
	}

	// 准备下载数据
	let snapshotData = null;
	let changesSummary = null;
	
	try {
		if (snapshot.snapshot_data) {
			snapshotData = JSON.parse(snapshot.snapshot_data);
		}
		if (snapshot.changes_summary) {
			changesSummary = JSON.parse(snapshot.changes_summary);
		}
	} catch (err) {
		console.error('[downloadPayrollSnapshot] JSON解析失败:', err);
	}

	const downloadData = {
		snapshotId: snapshot.snapshot_id,
		month: snapshot.month,
		version: snapshot.version,
		createdAt: snapshot.created_at,
		createdBy: snapshot.created_by,
		creatorName: snapshot.creator_name || '未知',
		notes: snapshot.notes,
		payrollData: snapshotData,
		changes: changesSummary,
		downloadedAt: new Date().toISOString()
	};

	// 返回 JSON 文件
	const filename = `payroll_${snapshot.month}_v${snapshot.version}_${Date.now()}.json`;
	
	return new Response(JSON.stringify(downloadData, null, 2), {
		status: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'],
			'Access-Control-Allow-Credentials': corsHeaders['Access-Control-Allow-Credentials']
		}
	});
}

