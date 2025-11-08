import React from 'react';
import StatCard from './StatCard';
import ListCard from './ListCard';
import { TaskRow, ReceiptPendingTaskRow } from './TaskRow';
import { fmtNum, fmtPct } from './utils/formatUtils';

/**
 * 员工仪表板视图组件
 * 显示员工的工时、任务、假期余额等信息
 */
export function EmployeeDashboard({ data }) {
  // 工时数据
  const hours = data?.myHours || { 
    total: 0, 
    normal: 0, 
    overtime: 0, 
    completionRate: 0 
  };
  
  const hoursMeta = `正常：${fmtNum(hours.normal)}｜加班：${fmtNum(hours.overtime)}｜達成率：${fmtPct(hours.completionRate)}`;
  
  // 任务数据
  const tasks = Array.isArray(data?.myTasks?.items) ? data.myTasks.items : [];
  
  // 假期余额数据
  const leaves = data?.myLeaves || { 
    balances: { annual: 0, sick: 0, compHours: 0 }, 
    recent: [] 
  };
  
  // 收据待办任务
  const receiptsPending = Array.isArray(data?.employee?.receiptsPendingTasks) 
    ? data.employee.receiptsPendingTasks 
    : [];
  
  return (
    <div className="dash-grid">
      {/* 工时统计卡片 */}
      <StatCard 
        title="本月總工時" 
        value={fmtNum(hours.total)} 
        meta={hoursMeta} 
      />
      
      {/* 任务列表 */}
      <ListCard 
        title="我的任務（待辦/進行中）" 
        isEmpty={tasks.length === 0}
      >
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ListCard>
      
      {/* 假期余额 */}
      <div className="card list">
        <div className="card-title">假期餘額</div>
        <div className="list-body">
          <div className="kv">
            <span>特休剩餘</span>
            <b>{fmtNum(leaves.balances?.annual || 0)} 天</b>
          </div>
          <div className="kv">
            <span>病假剩餘</span>
            <b>{fmtNum(leaves.balances?.sick || 0)} 天</b>
          </div>
          <div className="kv">
            <span>補休</span>
            <b>{fmtNum(leaves.balances?.compHours || 0)} 小時</b>
          </div>
        </div>
      </div>
      
      {/* 收据待办任务警告 */}
      {receiptsPending.length > 0 && (
        <ListCard 
          title="⚠️ 收據已開但任務未完成"
          isEmpty={false}
        >
          {receiptsPending.map((receipt, idx) => (
            <ReceiptPendingTaskRow key={idx} receipt={receipt} />
          ))}
        </ListCard>
      )}
    </div>
  );
}

export default EmployeeDashboard;

