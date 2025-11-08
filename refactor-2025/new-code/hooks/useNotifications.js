import { useMemo } from 'react';

/**
 * 通知计算Hook
 * 根据数据计算需要显示的通知
 */
export function useNotifications(data, user) {
  const notifications = useMemo(() => {
    if (!data) return [];
    
    const notices = [];
    
    if (user?.isAdmin) {
      // 管理员通知：逾期任务
      const adminData = data.admin || {};
      const empTasks = Array.isArray(adminData.employeeTasks) ? adminData.employeeTasks : [];
      
      // 计算总逾期任务数
      const totalOverdue = empTasks.reduce((sum, emp) => {
        if (emp.overdue && typeof emp.overdue === 'object') {
          // overdue是对象 { "2024-11": 2, "2024-12": 3 }
          return sum + Object.values(emp.overdue).reduce((s, n) => s + n, 0);
        }
        // 如果是数字
        return sum + (emp.overdue || 0);
      }, 0);
      
      if (totalOverdue > 0) {
        notices.push({
          level: 'warning',
          text: `全公司共有 ${totalOverdue} 個逾期任務`,
          link: '/internal/tasks'
        });
      }
    } else {
      // 员工通知：紧急任务
      const employeeData = data.employee || {};
      const myTasks = employeeData.myTasks || {};
      const tasks = Array.isArray(myTasks.items) ? myTasks.items : [];
      
      // 计算紧急任务数
      const urgentCount = tasks.filter(t => t.urgency === 'urgent').length;
      
      if (urgentCount > 0) {
        notices.push({
          level: 'info',
          text: `今天有 ${urgentCount} 項任務即將到期`,
          link: '/internal/tasks'
        });
      }
    }
    
    return notices;
  }, [data, user]);
  
  return notifications;
}

export default useNotifications;

