/**
 * 数字和金额格式化工具函数
 */

/**
 * 格式化数字
 * @param {number} n - 数字
 * @returns {string} 格式化后的字符串，0显示为"-"，非0显示带千分号
 */
export function fmtNum(n) {
  const val = Number(n || 0);
  if (val === 0) return '-';
  try {
    return val.toLocaleString('zh-TW');
  } catch (_) {
    return String(val);
  }
}

/**
 * 格式化台币金额
 * @param {number} n - 金额
 * @returns {string} 格式化后的字符串，0显示为"-"，非0显示带千分号且无小数位
 */
export function fmtTwd(n) {
  const val = Number(n || 0);
  if (val === 0) return '-';
  try {
    return val.toLocaleString('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  } catch (_) {
    return String(val);
  }
}

/**
 * 格式化百分比
 * @param {number} n - 数字（如50表示50%）
 * @returns {string} 格式化后的字符串，0显示为"-"，非0显示一位小数+%
 */
export function fmtPct(n) {
  const val = Number(n || 0);
  if (val === 0) return '-';
  return `${(Math.round(val * 10) / 10).toFixed(1)}%`;
}

