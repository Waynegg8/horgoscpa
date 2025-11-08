import React from 'react';

/**
 * 管理员仪表板视图组件
 * 显示管理员的团队工时、任务、财务等信息
 */
export function AdminDashboard({ data }) {
  console.log('=== RENDER ADMIN DASHBOARD ===');
  console.log('Full data object:', data);
  console.log('data.employeeHours:', data?.employeeHours);
  console.log('data.employeeTasks:', data?.employeeTasks);
  
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
        {/* 左侧内容将在后续步骤中添加 */}
      </div>
      
      <div id="rightColumn" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* 右侧内容将在后续步骤中添加 */}
      </div>
    </div>
  );
}

export default AdminDashboard;

