/**
 * 收入分摊模块（应计制）
 * 
 * 核心原则：收入按服务提供月份确认，而非开票月份
 * 对于跨月服务，按工时比例分摊到各服务月份
 */

/**
 * 为单张收据计算跨月收入分摊
 * 
 * @param {Object} receipt - 收据信息 { client_id, total_amount, service_start_month, service_end_month }
 * @param {Object} env - Cloudflare环境对象
 * @returns {Array} 分摊结果 [{ month: '2025-01', amount: 10000, hours: 50 }, ...]
 */
export async function allocateReceiptRevenue(receipt, env) {
	const { client_id, total_amount, service_start_month, service_end_month } = receipt;
	
	// 如果没有指定服务期间，返回空
	if (!service_start_month) {
		return [];
	}
	
	// 如果是单月服务，直接返回全部金额
	if (!service_end_month || service_start_month === service_end_month) {
		return [{
			month: service_start_month,
			amount: Number(total_amount),
			hours: 0 // 稍后填充
		}];
	}
	
	// 跨月服务：获取各月工时
	const months = getMonthsBetween(service_start_month, service_end_month);
	const monthlyHours = {};
	let totalHours = 0;
	
	for (const month of months) {
		const hoursResult = await env.DATABASE.prepare(`
			SELECT SUM(hours) as total
			FROM Timesheets
			WHERE client_id = ?
				AND substr(work_date, 1, 7) = ?
				AND is_deleted = 0
		`).bind(client_id, month).first();
		
		const hours = Number(hoursResult?.total || 0);
		monthlyHours[month] = hours;
		totalHours += hours;
	}
	
	// 按工时比例分摊收入
	const allocations = [];
	
	if (totalHours === 0) {
		// 如果没有工时记录，平均分摊
		const avgAmount = total_amount / months.length;
		for (const month of months) {
			allocations.push({
				month,
				amount: Number(avgAmount.toFixed(2)),
				hours: 0,
				allocationMethod: 'average'
			});
		}
	} else {
		// 按工时比例分摊
		for (const month of months) {
			const hours = monthlyHours[month] || 0;
			const ratio = hours / totalHours;
			const amount = total_amount * ratio;
			
			allocations.push({
				month,
				amount: Number(amount.toFixed(2)),
				hours,
				allocationMethod: 'hours_based'
			});
		}
	}
	
	return allocations;
}

/**
 * 获取某个月所有客户的收入（含跨月分摊）
 * 
 * @param {string} targetMonth - 目标月份 (YYYY-MM)
 * @param {Object} env - Cloudflare环境对象
 * @returns {Object} { clientId: revenue, ... }
 */
export async function getMonthlyRevenueByClient(targetMonth, env) {
	const clientRevenue = {};
	
	// 获取所有可能影响该月的收据：
	// 1. service_start_month = targetMonth (单月或跨月起始)
	// 2. service_start_month < targetMonth AND service_end_month >= targetMonth (跨月包含该月)
	const receiptsResult = await env.DATABASE.prepare(`
		SELECT 
			receipt_id,
			client_id,
			total_amount,
			service_start_month,
			service_end_month,
			service_month
		FROM Receipts
		WHERE is_deleted = 0
			AND status != 'cancelled'
			AND (
				(service_start_month IS NOT NULL AND service_start_month <= ? AND (service_end_month IS NULL OR service_end_month >= ?))
				OR (service_start_month IS NULL AND service_month = ?)
			)
	`).bind(targetMonth, targetMonth, targetMonth).all();
	
	const receipts = receiptsResult?.results || [];
	
	for (const receipt of receipts) {
		// 兼容旧数据：如果没有service_start_month，使用service_month
		const startMonth = receipt.service_start_month || receipt.service_month;
		const endMonth = receipt.service_end_month || receipt.service_month;
		
		if (!startMonth) continue;
		
		const allocations = await allocateReceiptRevenue({
			client_id: receipt.client_id,
			total_amount: receipt.total_amount,
			service_start_month: startMonth,
			service_end_month: endMonth
		}, env);
		
		// 只取目标月份的分摊
		const targetAllocation = allocations.find(a => a.month === targetMonth);
		if (targetAllocation) {
			const clientId = receipt.client_id;
			if (!clientRevenue[clientId]) {
				clientRevenue[clientId] = 0;
			}
			clientRevenue[clientId] += targetAllocation.amount;
		}
	}
	
	return clientRevenue;
}

/**
 * 获取某年度所有客户的收入（含跨月分摊）
 * 
 * @param {number} year - 目标年份
 * @param {Object} env - Cloudflare环境对象
 * @returns {Object} { clientId: revenue, ... }
 */
export async function getAnnualRevenueByClient(year, env) {
	const clientRevenue = {};
	
	// 获取该年度所有可能相关的收据
	const receiptsResult = await env.DATABASE.prepare(`
		SELECT 
			receipt_id,
			client_id,
			total_amount,
			service_start_month,
			service_end_month,
			service_month
		FROM Receipts
		WHERE is_deleted = 0
			AND status != 'cancelled'
			AND (
				(service_start_month LIKE ? OR service_end_month LIKE ?)
				OR (service_start_month IS NULL AND service_month LIKE ?)
			)
	`).bind(`${year}-%`, `${year}-%`, `${year}-%`).all();
	
	const receipts = receiptsResult?.results || [];
	
	for (const receipt of receipts) {
		const startMonth = receipt.service_start_month || receipt.service_month;
		const endMonth = receipt.service_end_month || receipt.service_month;
		
		if (!startMonth) continue;
		
		const allocations = await allocateReceiptRevenue({
			client_id: receipt.client_id,
			total_amount: receipt.total_amount,
			service_start_month: startMonth,
			service_end_month: endMonth
		}, env);
		
		// 聚合该年度内的所有月份收入
		for (const allocation of allocations) {
			if (allocation.month.startsWith(`${year}-`)) {
				const clientId = receipt.client_id;
				if (!clientRevenue[clientId]) {
					clientRevenue[clientId] = 0;
				}
				clientRevenue[clientId] += allocation.amount;
			}
		}
	}
	
	return clientRevenue;
}

/**
 * 按服务类型分摊客户收入（使用加权工时）
 * 
 * @param {string} clientId - 客户ID
 * @param {string} targetMonth - 目标月份 (YYYY-MM)
 * @param {number} totalRevenue - 客户该月总收入
 * @param {Object} env - Cloudflare环境对象
 * @returns {Array} 服务类型明细 [{ serviceId, serviceName, hours, weightedHours, revenue }, ...]
 */
export async function allocateRevenueByServiceType(clientId, targetMonth, totalRevenue, env) {
	// 工时类型定义（与reports.js保持一致）
	const WORK_TYPE_MULTIPLIERS = {
		1: 1.0,    // 正常工时
		2: 1.34,   // 平日加班（前2h）
		3: 1.67,   // 平日加班（后2h）
		4: 1.34,   // 休息日（前2h）
		5: 1.67,   // 休息日（3-8h）
		6: 2.67,   // 休息日（9-12h）
		7: 1.0,    // 国定假日（8h内，特殊处理）
		8: 1.34,   // 国定假日（9-10h）
		9: 1.67,   // 国定假日（11-12h）
		10: 1.0,   // 例假日（8h内，特殊处理）
		11: 1.34,  // 例假日（9-10h）
		12: 1.67   // 例假日（11-12h）
	};
	
	// 获取该客户该月的所有工时记录（按服务类型分组）
	const timesheetsResult = await env.DATABASE.prepare(`
		SELECT 
			t.service_id,
			t.work_type,
			t.work_date,
			SUM(t.hours) as total_hours,
			COALESCE(s.service_name, '未分类') as service_name
		FROM Timesheets t
		LEFT JOIN Services s ON t.service_id = s.service_id
		WHERE t.client_id = ?
			AND substr(t.work_date, 1, 7) = ?
			AND t.is_deleted = 0
		GROUP BY t.service_id, t.work_type, t.work_date
	`).bind(clientId, targetMonth).all();
	
	const timesheets = timesheetsResult?.results || [];
	
	// 按服务类型汇总加权工时
	const serviceMap = new Map();
	const processedFixed = new Set(); // 追踪fixed_8h类型
	let totalWeightedHours = 0;
	
	for (const ts of timesheets) {
		const serviceId = ts.service_id || 0;
		const serviceName = ts.service_name;
		const hours = Number(ts.total_hours || 0);
		const workType = parseInt(ts.work_type) || 1;
		const workDate = ts.work_date;
		
		// 计算加权工时
		let weightedHours;
		if (workType === 7 || workType === 10) {
			// 国定假日/例假日：每天固定8小时（不重复计算）
			const key = `${workDate}:${workType}`;
			if (!processedFixed.has(key)) {
				weightedHours = 8.0;
				processedFixed.add(key);
			} else {
				weightedHours = 0;
			}
		} else {
			// 其他类型：按倍率计算
			const multiplier = WORK_TYPE_MULTIPLIERS[workType] || 1.0;
			weightedHours = hours * multiplier;
		}
		
		// 汇总到服务类型
		if (!serviceMap.has(serviceId)) {
			serviceMap.set(serviceId, {
				serviceId,
				serviceName,
				hours: 0,
				weightedHours: 0,
				revenue: 0
			});
		}
		
		const service = serviceMap.get(serviceId);
		service.hours += hours;
		service.weightedHours += weightedHours;
		totalWeightedHours += weightedHours;
	}
	
	// 按加权工时比例分摊收入
	const serviceDetails = [];
	
	if (totalWeightedHours === 0) {
		// 如果没有工时记录，返回空数组
		return serviceDetails;
	}
	
	for (const [serviceId, service] of serviceMap) {
		const ratio = service.weightedHours / totalWeightedHours;
		const revenue = totalRevenue * ratio;
		
		serviceDetails.push({
			serviceId,
			serviceName: service.serviceName,
			hours: Number(service.hours.toFixed(1)),
			weightedHours: Number(service.weightedHours.toFixed(1)),
			revenue: Number(revenue.toFixed(2)),
			revenuePercentage: Number((ratio * 100).toFixed(1))
		});
	}
	
	// 按收入降序排序
	serviceDetails.sort((a, b) => b.revenue - a.revenue);
	
	return serviceDetails;
}

/**
 * 辅助函数：获取两个月份之间的所有月份（含首尾）
 * 
 * @param {string} startMonth - 开始月份 (YYYY-MM)
 * @param {string} endMonth - 结束月份 (YYYY-MM)
 * @returns {Array<string>} 月份数组
 */
function getMonthsBetween(startMonth, endMonth) {
	const months = [];
	const [startYear, startM] = startMonth.split('-').map(Number);
	const [endYear, endM] = endMonth.split('-').map(Number);
	
	let year = startYear;
	let month = startM;
	
	while (year < endYear || (year === endYear && month <= endM)) {
		months.push(`${year}-${String(month).padStart(2, '0')}`);
		
		month++;
		if (month > 12) {
			month = 1;
			year++;
		}
	}
	
	return months;
}

