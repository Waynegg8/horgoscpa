import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 格式化月份详情
 * @param {Object} monthObj - 月份对象，格式：{ "2025-01": 3, "2024-12": 2 }
 * @returns {string} 格式化后的字符串，如 " (1月:3件、12月:2件)"
 */
function formatMonthDetails(monthObj) {
  if (!monthObj || Object.keys(monthObj).length === 0) return '';
  
  const details = Object.entries(monthObj)
    .sort((a, b) => b[0].localeCompare(a[0])) // 按月份倒序排列
    .map(([month, count]) => {
      const [y, m] = month.split('-');
      return `${parseInt(m)}月:${count}件`;
    })
    .join('、');
  
  return ` (${details})`;
}

/**
 * 员工任务状态行组件
 * 显示单个员工的任务统计，可点击跳转到该员工的任务列表
 */
export function EmployeeTasksRow({ employee }) {
  const { userId, name, completed = 0, inProgress = {}, overdue = {} } = employee;
  
  // 计算总数
  const overdueTotal = Object.values(overdue).reduce((sum, n) => sum + n, 0);
  const inProgressTotal = Object.values(inProgress).reduce((sum, n) => sum + n, 0);
  
  // 构建状态徽章
  const badges = [];
  
  if (overdueTotal > 0) {
    const details = formatMonthDetails(overdue);
    badges.push(
      <span
        key="overdue"
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: '#fee2e2',
          color: '#dc2626',
          fontSize: '13px',
          fontWeight: '500'
        }}
      >
        逾期 {overdueTotal}{details}
      </span>
    );
  }
  
  if (inProgressTotal > 0) {
    const details = formatMonthDetails(inProgress);
    badges.push(
      <span
        key="inProgress"
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: '#dbeafe',
          color: '#2563eb',
          fontSize: '13px',
          fontWeight: '500'
        }}
      >
        進行中 {inProgressTotal}{details}
      </span>
    );
  }
  
  if (completed > 0) {
    badges.push(
      <span
        key="completed"
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          background: '#d1fae5',
          color: '#059669',
          fontSize: '13px',
          fontWeight: '500'
        }}
      >
        已完成 {completed}
      </span>
    );
  }
  
  const summary = badges.length > 0 ? badges : (
    <span style={{ color: '#9ca3af' }}>無任務</span>
  );
  
  return (
    <Link
      to={`/internal/tasks?assignee=${userId}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        borderBottom: '1px solid #f3f4f6',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.15s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
    >
      <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
        {name || '未命名'}
      </span>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {summary}
      </div>
    </Link>
  );
}

/**
 * 员工任务列表组件
 */
export function EmployeeTasksList({ employees = [] }) {
  if (employees.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
        尚無任務
      </div>
    );
  }
  
  return (
    <>
      {employees.map((emp, idx) => (
        <EmployeeTasksRow key={emp.userId || idx} employee={emp} />
      ))}
    </>
  );
}

export default EmployeeTasksRow;

