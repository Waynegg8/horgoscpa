import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 任务行组件
 * 显示单个任务的信息，包括紧急程度、状态信息等
 */
export function TaskRow({ task }) {
  const { id, name, dueDate, urgency, blockerReason, overdueReason, statusNote } = task;
  
  // 确定样式类名
  const className = urgency === 'overdue' ? 'danger' : (urgency === 'urgent' ? 'warn' : '');
  
  // 确定徽章
  const badge = urgency === 'overdue' 
    ? <span className="badge danger">逾期</span>
    : urgency === 'urgent' 
    ? <span className="badge warn">急</span>
    : null;
  
  // 状态信息
  let statusInfo = null;
  if (blockerReason) {
    statusInfo = (
      <div style={{
        marginTop: '4px',
        padding: '6px 8px',
        background: '#fef2f2',
        borderLeft: '3px solid #dc2626',
        fontSize: '13px',
        color: '#991b1b'
      }}>
        🚫 {blockerReason}
      </div>
    );
  } else if (overdueReason) {
    statusInfo = (
      <div style={{
        marginTop: '4px',
        padding: '6px 8px',
        background: '#fef2f2',
        borderLeft: '3px solid #dc2626',
        fontSize: '13px',
        color: '#991b1b'
      }}>
        ⏰ {overdueReason}
      </div>
    );
  } else if (statusNote) {
    statusInfo = (
      <div style={{
        marginTop: '4px',
        padding: '6px 8px',
        background: '#f0fdf4',
        borderLeft: '3px solid #16a34a',
        fontSize: '13px',
        color: '#166534'
      }}>
        💬 {statusNote}
      </div>
    );
  }
  
  return (
    <Link 
      to={`/internal/task-detail?id=${id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className={`task-row ${className}`}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>
            <span className="name">{name || ''}</span>
            <span className="muted" style={{ marginLeft: '8px' }}>
              到期：{dueDate || '—'}
            </span>
            {badge && <> {badge}</>}
          </div>
          {statusInfo}
        </div>
      </div>
    </Link>
  );
}

/**
 * 收据待办任务警告行组件
 */
export function ReceiptPendingTaskRow({ receipt }) {
  const { client_name, service_name, receipt_number, receipt_due_date, pending_tasks, total_tasks } = receipt;
  
  return (
    <div className="task-row warn">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="name">{client_name} - {service_name}</span>
        <div className="muted" style={{ fontSize: '12px' }}>
          收據 #{receipt_number} | 到期：{receipt_due_date || '—'}
        </div>
        <div style={{ fontSize: '13px', color: '#d97706' }}>
          待完成任務：{pending_tasks} / {total_tasks}
        </div>
      </div>
    </div>
  );
}

export default TaskRow;

