import React, { useState, useEffect } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import { formatLocalDate, getCurrentYm } from '../components/utils/dateUtils';

/**
 * Dashboard页面主组件
 * 功能：显示仪表板数据，包括工时、任务、财务等信息
 */
export function Dashboard() {
  // 状态管理
  const [me, setMe] = useState(null);
  const [userName, setUserName] = useState('—');
  const [today, setToday] = useState('—');
  const [notices, setNotices] = useState([]);
  const [hasPermission, setHasPermission] = useState(true);
  const [currentYm, setCurrentYm] = useState(getCurrentYm());
  const [financeMode, setFinanceMode] = useState('month');
  const [financeYm, setFinanceYm] = useState(getCurrentYm());
  const [activityDays, setActivityDays] = useState(3);
  const [activityUserId, setActivityUserId] = useState('');
  const [activityType, setActivityType] = useState('');

  // API基础URL配置
  const apiBase = window.location.hostname.endsWith('horgoscpa.com')
    ? '/internal/api/v1'
    : 'https://www.horgoscpa.com/internal/api/v1';

  // 初始化：设置日期
  useEffect(() => {
    const date = new Date();
    setToday(formatLocalDate(date));
  }, []);

  // 初始化：预加载系统
  useEffect(() => {
    if (window.DataCache && !window.DataCache.getPreloadStatus().isPreloading) {
      const status = window.DataCache.getPreloadStatus();
      if (status.completed.length === 0) {
        console.log('[Dashboard] 🚀 啟動背景預加載');
        window.DataCache.preloadAll({ adminMode: true });
      } else {
        console.log(`[Dashboard] ✅ 預加載已完成 ${status.completed.length}/${status.total} 項`);
      }
    }
  }, []);

  return (
    <>
      <DashboardHeader
        userName={userName}
        date={today}
        notices={notices}
        hasPermission={hasPermission}
      />
      
      <main className="dash-content">
        {/* 自適應網格：依角色顯示不同小部件 */}
        <section id="grid" className="dash-grid">
          {/* Grid内容将在后续步骤中添加 */}
        </section>
      </main>
    </>
  );
}

export default Dashboard;

