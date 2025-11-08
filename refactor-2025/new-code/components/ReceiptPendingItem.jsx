import React from 'react';

/**
 * 收据待完成项组件
 * 显示已开收据但任务未完成的提醒
 */
export function ReceiptPendingItem({ receipt }) {
  const { client_name, service_name, receipt_number, receipt_due_date, pending_tasks, total_tasks } = receipt;
  
  return (
    <div style={{
      padding: '12px',
      borderBottom: '1px solid #f3f4f6'
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: '4px'
      }}>
        {client_name} - {service_name}
      </div>
      
      <div style={{
        fontSize: '13px',
        color: '#6b7280',
        marginBottom: '6px'
      }}>
        收據 #{receipt_number} | 到期：{receipt_due_date || '—'}
      </div>
      
      <div style={{
        fontSize: '14px',
        color: '#d97706',
        fontWeight: '500'
      }}>
        待完成任務：{pending_tasks} / {total_tasks}
      </div>
    </div>
  );
}

/**
 * 收据待完成列表组件
 */
export function ReceiptPendingList({ receipts = [] }) {
  if (receipts.length === 0) {
    return (
      <div style={{
        padding: '16px',
        textAlign: 'center',
        color: '#9ca3af'
      }}>
        目前無待處理項目
      </div>
    );
  }
  
  return (
    <>
      {receipts.map((receipt, idx) => (
        <ReceiptPendingItem key={idx} receipt={receipt} />
      ))}
    </>
  );
}

export default ReceiptPendingItem;

