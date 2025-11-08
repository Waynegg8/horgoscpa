import React from 'react';
import { fmtNum } from './utils/formatUtils';

/**
 * 员工工时行组件
 * 显示单个员工的工时信息（总工时、正常工时、加班工时）
 */
export function EmployeeHoursRow({ employee }) {
  const { name, total, normal, overtime } = employee;
  const totalStr = fmtNum(total || 0);
  const hasMeta = total && total > 0;
  const meta = hasMeta ? `正常 ${fmtNum(normal)} ｜ 加班 ${fmtNum(overtime)}` : '';
  
  return (
    <div className="emp-row">
      <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
        {name || '未命名'}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {meta && (
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            {meta}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '20px', fontWeight: '600', color: '#2563eb' }}>
            {totalStr}
          </span>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            小時
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 员工工时列表组件
 */
export function EmployeeHoursList({ employees = [] }) {
  if (employees.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
        尚無員工資料
      </div>
    );
  }
  
  return (
    <>
      {employees.map((emp, idx) => (
        <EmployeeHoursRow key={idx} employee={emp} />
      ))}
    </>
  );
}

export default EmployeeHoursRow;

