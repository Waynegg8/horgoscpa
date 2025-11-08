import { useState, useEffect, useCallback } from 'react';
import { getCurrentYm } from '../components/utils/dateUtils';

/**
 * Dashboard数据管理Hook
 * 负责获取和刷新仪表板数据
 */
export function useDashboardData(user, apiBase = '/internal/api/v1') {
  // 状态管理
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 筛选状态
  const [currentYm, setCurrentYm] = useState(getCurrentYm());
  const [financeYm, setFinanceYm] = useState(getCurrentYm());
  const [financeMode, setFinanceMode] = useState('month');
  const [activityDays, setActivityDays] = useState(7);
  const [activityUserId, setActivityUserId] = useState('');
  const [activityType, setActivityType] = useState('');
  
  /**
   * 刷新数据
   */
  const refresh = useCallback(async (forceRender = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // 构建查询参数
      const params = new URLSearchParams();
      
      if (user?.isAdmin) {
        // 管理员查询参数
        if (currentYm) params.set('ym', currentYm);
        if (financeYm) params.set('financeYm', financeYm);
        if (financeMode) params.set('financeMode', financeMode);
        if (activityDays) params.set('activity_days', activityDays);
        if (activityUserId) params.set('activity_user_id', activityUserId);
        if (activityType) params.set('activity_type', activityType);
      }
      
      // 发送API请求
      const url = `${apiBase}/dashboard${params.toString() ? '?' + params.toString() : ''}`;
      const startTime = Date.now();
      
      const response = await fetch(url, { credentials: 'include' });
      
      const fetchTime = Date.now() - startTime;
      console.log(`[Dashboard] ⏱ Fetch 耗时: ${fetchTime}ms`);
      
      // 401处理：重定向到登录页
      if (response.status === 401) {
        window.location.assign('/login?redirect=/internal/dashboard');
        return;
      }
      
      const json = await response.json();
      console.log('=== DASHBOARD API RESPONSE ===');
      console.log('Full Response:', JSON.stringify(json, null, 2));
      console.log('==============================');
      
      if (!response.ok || !json || json.ok !== true) {
        throw new Error('API响应错误');
      }
      
      const renderStartTime = Date.now();
      setData(json.data);
      
      const renderTime = Date.now() - renderStartTime;
      console.log(`[Dashboard] ⏱ 渲染耗时: ${renderTime}ms`);
      
    } catch (err) {
      console.error('Dashboard数据加载错误:', err);
      setError(err.message);
      // 错误时设置空数据，让组件渲染空状态
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    user,
    currentYm,
    financeYm,
    financeMode,
    activityDays,
    activityUserId,
    activityType,
    apiBase
  ]);
  
  /**
   * 财务模式变更处理
   */
  const handleFinanceModeChange = useCallback((newMode) => {
    setFinanceMode(newMode);
    
    // 如果切换到YTD模式，确保financeYm是当年的12月
    if (newMode === 'ytd' && financeYm) {
      const currentYear = financeYm.split('-')[0];
      setFinanceYm(`${currentYear}-12`);
    }
  }, [financeYm]);
  
  /**
   * 财务月份变更处理
   */
  const handleFinanceYmChange = useCallback((newYm) => {
    setFinanceYm(newYm);
    // 选择月份时自动切换回月度模式
    setFinanceMode('month');
  }, []);
  
  // 初始加载和依赖变更时刷新
  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);
  
  // 自动刷新：每5分钟刷新一次
  useEffect(() => {
    if (!user) return;
    
    const refreshInterval = setInterval(() => {
      console.log('[Dashboard] 自动刷新触发');
      refresh();
    }, 5 * 60 * 1000); // 5分钟
    
    return () => clearInterval(refreshInterval);
  }, [user, refresh]);
  
  // 窗口聚焦时刷新
  useEffect(() => {
    if (!user) return;
    
    const handleFocus = () => {
      console.log('[Dashboard] 窗口聚焦，刷新数据');
      refresh();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, refresh]);
  
  return {
    // 数据和状态
    data,
    loading,
    error,
    
    // 筛选状态
    currentYm,
    financeYm,
    financeMode,
    activityDays,
    activityUserId,
    activityType,
    
    // 状态更新函数
    setCurrentYm,
    setFinanceYm: handleFinanceYmChange,
    setFinanceMode: handleFinanceModeChange,
    setActivityDays,
    setActivityUserId,
    setActivityType,
    
    // 刷新函数
    refresh
  };
}

export default useDashboardData;

