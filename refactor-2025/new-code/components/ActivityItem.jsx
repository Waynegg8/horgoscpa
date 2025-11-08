import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 活动项组件
 * 显示不同类型的最近动态（期限调整、状态更新、假期申请、工时提醒）
 */
export function ActivityItem({ activity }) {
  const { activity_type } = activity;
  
  switch (activity_type) {
    case 'due_date_adjustment':
      return <DueDateAdjustmentActivity activity={activity} />;
    case 'status_update':
      return <StatusUpdateActivity activity={activity} />;
    case 'leave_application':
      return <LeaveApplicationActivity activity={activity} />;
    case 'timesheet_reminder':
      return <TimesheetReminderActivity activity={activity} />;
    default:
      return null;
  }
}

/**
 * 期限调整活动项
 */
function DueDateAdjustmentActivity({ activity }) {
  const { taskName, clientName, serviceName, change, assigneeName, reason, time, link } = activity;
  
  return (
    <Link to={link || '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          padding: '14px',
          borderBottom: '1px solid #f3f4f6',
          cursor: 'pointer',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '6px'
        }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
            📅 {taskName}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{time}</div>
        </div>
        
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px' }}>
          {clientName} · {serviceName}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <span style={{ color: '#3b82f6', fontWeight: '500' }}>{change}</span>
          <span style={{ color: '#6b7280' }}>{assigneeName}</span>
        </div>
        
        {reason && (
          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '6px',
            lineHeight: '1.5',
            padding: '8px',
            background: '#fffbeb',
            borderRadius: '4px'
          }}>
            {reason}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * 状态更新活动项
 */
function StatusUpdateActivity({ activity }) {
  const { taskName, clientName, serviceName, change, assigneeName, note, time, link } = activity;
  
  // 根据note的开头判断背景色
  const noteBackground = note?.startsWith('🚫') || note?.startsWith('⏰')
    ? '#fef2f2'
    : '#f0fdf4';
  
  return (
    <Link to={link || '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          padding: '14px',
          borderBottom: '1px solid #f3f4f6',
          cursor: 'pointer',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '6px'
        }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
            📝 {taskName}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{time}</div>
        </div>
        
        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '6px' }}>
          {clientName} · {serviceName}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <span style={{ color: '#10b981', fontWeight: '500' }}>{change}</span>
          <span style={{ color: '#6b7280' }}>{assigneeName}</span>
        </div>
        
        {note && (
          <div style={{
            fontSize: '13px',
            color: '#4b5563',
            marginTop: '6px',
            lineHeight: '1.5',
            padding: '8px',
            background: noteBackground,
            borderRadius: '4px'
          }}>
            {note}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * 假期申请活动项
 */
function LeaveApplicationActivity({ activity }) {
  const { text, period, leaveDays, leaveUnit, reason, time, link } = activity;
  
  // 根据单位决定显示文本
  let unitText = '天';
  if (leaveUnit === 'hour') {
    unitText = '小時';
  } else if (leaveUnit === 'half') {
    unitText = '半天';
  }
  
  return (
    <Link to={link || '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          padding: '14px',
          borderBottom: '1px solid #f3f4f6',
          cursor: 'pointer',
          transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '6px'
        }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
            🏖️ {text}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{time}</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <span style={{ color: '#6b7280' }}>{period}</span>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            background: '#dbeafe',
            color: '#2563eb',
            fontWeight: '500'
          }}>
            {leaveDays}{unitText}
          </span>
        </div>
        
        {reason && (
          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '6px',
            lineHeight: '1.5'
          }}>
            {reason}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * 工时提醒活动项
 */
function TimesheetReminderActivity({ activity }) {
  const { text, missingCount, missingDates, time, link } = activity;
  
  return (
    <Link to={link || '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          padding: '14px',
          borderBottom: '1px solid #f3f4f6',
          cursor: 'pointer',
          transition: 'background 0.15s',
          background: '#fef2f2'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '6px'
        }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#dc2626' }}>
            ⚠️ {text}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>{time}</div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            background: '#fee2e2',
            color: '#dc2626',
            fontWeight: '500'
          }}>
            {missingCount}天未填
          </span>
          <span style={{ color: '#6b7280' }}>{missingDates}</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * 活动列表组件
 */
export function ActivityList({ activities = [] }) {
  if (activities.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
        尚無動態
      </div>
    );
  }
  
  return (
    <>
      {activities.map((activity, idx) => (
        <ActivityItem key={idx} activity={activity} />
      ))}
    </>
  );
}

export default ActivityItem;

