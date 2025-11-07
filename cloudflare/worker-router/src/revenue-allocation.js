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

