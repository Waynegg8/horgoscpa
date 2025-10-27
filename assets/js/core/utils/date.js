/**
 * Date Utils
 * 日期处理工具函数
 */

export class DateUtils {
  /**
   * 格式化日期
   */
  static formatDate(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * 格式化日期时间
   */
  static formatDateTime(date) {
    return this.formatDate(date, 'YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 相对时间（多久之前）
   */
  static timeAgo(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now - d;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    return '刚刚';
  }

  /**
   * 是否逾期
   */
  static isPastDue(dueDate) {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    return due < new Date();
  }

  /**
   * 获取今天日期（YYYY-MM-DD）
   */
  static today() {
    return this.formatDate(new Date());
  }

  /**
   * 获取本月第一天
   */
  static monthStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * 获取本月最后一天
   */
  static monthEnd(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
}

// 导出到全局
window.DateUtils = DateUtils;

export default DateUtils;

