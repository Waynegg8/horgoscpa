/**
 * 日期和时间相关的工具函数
 */

/**
 * 格式化日期为本地化格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
export function formatLocalDate(date) {
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      dateStyle: 'full',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }).format(date);
  } catch (_) {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * 格式化年月字符串
 * @param {string} ym - 年月字符串，格式：YYYY-MM
 * @returns {string} 格式化后的字符串，如 "2025年10月"
 */
export function formatYm(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

/**
 * 增加或减少月份
 * @param {string} ym - 年月字符串，格式：YYYY-MM
 * @param {number} delta - 月份变化量（正数为增加，负数为减少）
 * @returns {string} 新的年月字符串，格式：YYYY-MM
 */
export function addMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const newY = date.getFullYear();
  const newM = date.getMonth() + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

/**
 * 获取当前年月
 * @returns {string} 当前年月字符串，格式：YYYY-MM
 */
export function getCurrentYm() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

