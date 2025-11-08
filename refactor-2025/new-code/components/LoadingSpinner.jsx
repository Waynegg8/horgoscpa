import React from 'react';

/**
 * 加载指示器组件
 * 显示全屏半透明遮罩和旋转动画
 */
export function LoadingSpinner({ message = '載入資料中...' }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        padding: '24px 32px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div className="spinner" />
        <div style={{
          fontSize: '16px',
          fontWeight: '500',
          color: '#333'
        }}>
          {message}
        </div>
      </div>
      
      <style jsx>{`
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * 骨架屏组件
 * 用于初始加载时显示占位内容
 */
export function SkeletonScreen() {
  return (
    <div className="card" style={{ padding: '16px' }}>
      載入中…
    </div>
  );
}

export default LoadingSpinner;

