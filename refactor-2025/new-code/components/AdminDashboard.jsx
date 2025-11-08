import React from 'react';
import ListCard from './ListCard';
import { EmployeeHoursList } from './EmployeeHoursRow';
import { EmployeeTasksList } from './EmployeeTasksRow';
import FinancialStatusCard from './FinancialStatusCard';
import { ActivityList } from './ActivityItem';
import { ReceiptPendingList } from './ReceiptPendingItem';

/**
 * 管理员仪表板视图组件
 * 显示管理员的团队工时、任务、财务等信息
 */
export function AdminDashboard({ 
  data, 
  currentYm,
  financeYm,
  financeMode, 
  activityType,
  activityUserId,
  activityDays,
  onCurrentYmChange,
  onFinanceYmChange,
  onFinanceModeChange,
  onActivityTypeChange,
  onActivityUserIdChange,
  onActivityDaysChange
}) {
  console.log('=== RENDER ADMIN DASHBOARD ===');
  console.log('Full data object:', data);
  console.log('data.employeeHours:', data?.employeeHours);
  console.log('data.employeeTasks:', data?.employeeTasks);
  console.log('data.recentActivities:', data?.recentActivities);
  
  const employeeHours = Array.isArray(data?.employeeHours) ? data.employeeHours : [];
  const employeeTasks = Array.isArray(data?.employeeTasks) ? data.employeeTasks : [];
  const financialStatus = data?.financialStatus || {};
  const recentActivities = Array.isArray(data?.recentActivities) ? data.recentActivities : [];
  const teamMembers = Array.isArray(data?.teamMembers) ? data.teamMembers : [];
  const receiptsPending = Array.isArray(data?.receiptsPendingTasks) ? data.receiptsPendingTasks : [];
  
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
        {/* 最近动态 - 带活动筛选 */}
        <ListCard
          title="📋 最近動態"
          isEmpty={recentActivities.length === 0}
          emptyMessage={`最近 ${activityDays} 天沒有動態記錄`}
          showActivityFilter={true}
          activityType={activityType}
          activityUserId={activityUserId}
          activityDays={activityDays}
          teamMembers={teamMembers}
          onActivityTypeChange={onActivityTypeChange}
          onActivityUserIdChange={onActivityUserIdChange}
          onActivityDaysChange={onActivityDaysChange}
        >
          <ActivityList activities={recentActivities} />
        </ListCard>
      </div>
      
      <div id="rightColumn" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* 员工任务状态 - 带月份筛选 */}
        <ListCard
          title="各員工任務狀態"
          subtitle="<span style='font-size:12px;color:#6b7280;font-weight:400;'>(已完成僅顯示選定月份)</span>"
          isEmpty={employeeTasks.length === 0}
          showMonthDropdown={true}
          selectedMonth={currentYm}
          onMonthChange={onCurrentYmChange}
        >
          <EmployeeTasksList employees={employeeTasks} />
        </ListCard>
        
        {/* 员工工时 - 带月份筛选 */}
        <ListCard
          title={`各員工工時 (${currentYm || ''})`}
          isEmpty={employeeHours.length === 0}
          showMonthDropdown={true}
          selectedMonth={currentYm}
          onMonthChange={onCurrentYmChange}
        >
          <EmployeeHoursList employees={employeeHours} />
        </ListCard>
        
        {/* 收据已开但任务未完成提醒 */}
        <ListCard
          title="⚠️ 收據已開但任務未完成"
          isEmpty={receiptsPending.length === 0}
        >
          <ReceiptPendingList receipts={receiptsPending} />
        </ListCard>
        
        {/* 财务状况 - 带财务筛选 */}
        <ListCard
          title="財務狀況"
          isEmpty={false}
          showFinanceDropdown={true}
          financeYm={financeYm}
          financeMode={financeMode}
          onFinanceYmChange={onFinanceYmChange}
          onFinanceModeChange={onFinanceModeChange}
        >
          <FinancialStatusCard 
            data={financeMode === 'ytd' ? financialStatus.ytd : financialStatus.month}
            mode={financeMode}
          />
        </ListCard>
        
        {/* 其他内容将在后续步骤中添加 */}
      </div>
    </div>
  );
}

export default AdminDashboard;

