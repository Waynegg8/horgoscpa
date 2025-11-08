import React from 'react';

/**
 * 统计卡片组件
 * 用于显示单个统计指标
 */
export function StatCard({ title, value, meta }) {
  return (
    <div className="card stat">
      <div className="stat-label">{title}</div>
      <div className="stat-value">{value}</div>
      {meta && <div className="stat-meta muted">{meta}</div>}
    </div>
  );
}

export default StatCard;

