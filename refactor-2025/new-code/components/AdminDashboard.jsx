import React from 'react';
import ListCard from './ListCard';
import { EmployeeHoursList } from './EmployeeHoursRow';
import { EmployeeTasksList } from './EmployeeTasksRow';
import FinancialStatusCard from './FinancialStatusCard';

/**
 * 管理员仪表板视图组件
 * 显示管理员的团队工时、任务、财务等信息
 */
export function AdminDashboard({ data, currentYm, financeMode, financeYm }) {
  console.log('=== RENDER ADMIN DASHBOARD ===');
  console.log('Full data object:', data);
  console.log('data.employeeHours:', data?.employeeHours);
  console.log('data.employeeTasks:', data?.employeeTasks);
  
  const employeeHours = Array.isArray(data?.employeeHours) ? data.employeeHours : [];
  const employeeTasks = Array.isArray(data?.employeeTasks) ? data.employeeTasks : [];
  const financialStatus = data?.financialStatus || {};
  
  // 创建两列布局
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 3fr',
      gap: '24px',
      alignItems: 'start'
    }}>
      <div id="leftColumn" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* 员工工时 */}
        <ListCard
          title={`各員工工時 (${currentYm || ''})`}
          isEmpty={employeeHours.length === 0}
        >
          <EmployeeHoursList employees={employeeHours} />
        </ListCard>
        
        {/* 员工任务状态 */}
        <ListCard
          title="各員工任務狀態"
          isEmpty={employeeTasks.length === 0}
        >
          <EmployeeTasksList employees={employeeTasks} />
        </ListCard>
      </div>
      
      <div id="rightColumn" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* 财务状况 */}
        <div className="card list">
          <div className="card-title">財務狀況</div>
          <div className="list-body">
            <FinancialStatusCard 
              data={financeMode === 'ytd' ? financialStatus.ytd : financialStatus.month}
              mode={financeMode}
            />
          </div>
        </div>
        
        {/* 其他内容将在后续步骤中添加 */}
      </div>
    </div>
  );
}

export default AdminDashboard;

