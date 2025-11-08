import React from 'react';
import { fmtTwd, fmtPct } from './utils/formatUtils';

/**
 * 财务状况卡片组件
 * 显示营收、成本、毛利、毛利率、应收账款等财务指标
 */
export function FinancialStatusCard({ data, mode = 'month' }) {
  const emptyData = {
    period: '',
    revenue: 0,
    cost: 0,
    profit: 0,
    margin: 0,
    ar: 0,
    paid: 0,
    overdue: 0,
    collectionRate: 0
  };
  
  const finData = data || emptyData;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 帐面数据：营收、成本、毛利、毛利率 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <FinancialMetricBox
          label="營收"
          value={fmtTwd(finData.revenue)}
        />
        <FinancialMetricBox
          label="成本"
          value={fmtTwd(finData.cost)}
        />
        <FinancialMetricBox
          label="毛利"
          value={fmtTwd(finData.profit)}
        />
        <FinancialMetricBox
          label="毛利率"
          value={fmtPct(finData.margin)}
        />
      </div>
      
      {/* 现金流数据：应收、已收、逾期、收款率 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <FinancialMetricBox
          label="應收帳款"
          value={fmtTwd(finData.ar)}
        />
        <FinancialMetricBox
          label="已收金額"
          value={fmtTwd(finData.paid)}
        />
        <FinancialMetricBox
          label="逾期未收"
          value={fmtTwd(finData.overdue)}
          isWarning={finData.overdue > 0}
        />
        <FinancialMetricBox
          label="收款率"
          value={fmtPct(finData.collectionRate)}
        />
      </div>
    </div>
  );
}

/**
 * 财务指标盒子组件
 */
function FinancialMetricBox({ label, value, isWarning = false }) {
  return (
    <div style={{
      padding: '12px',
      background: '#f9fafb',
      borderRadius: '6px'
    }}>
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '4px'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '18px',
        fontWeight: '600',
        color: isWarning ? '#dc2626' : '#1f2937'
      }}>
        {value}
      </div>
    </div>
  );
}

export default FinancialStatusCard;

