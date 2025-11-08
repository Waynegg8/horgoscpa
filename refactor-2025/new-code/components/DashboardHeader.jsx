import React from 'react';

/**
 * Dashboard页面头部组件
 * 显示欢迎信息、日期、通知列表和权限提示
 */
export function DashboardHeader({ userName, date, notices = [], hasPermission = true }) {
  const formatNoticeLevel = (level) => {
    return level === 'warning' ? '警告' : '資訊';
  };

  return (
    <header className="dash-header">
      <div className="dash-top">
        <div className="dash-welcome">
          <span className="welcome-text">
            歡迎回來，<span className="user-name">{userName || '—'}</span>
          </span>
          <span className="separator">•</span>
          <span className="dash-date">{date || '—'}</span>
        </div>
        
        {notices.length > 0 && (
          <div className="notice-list-inline" aria-label="通知">
            {notices.map((notice, idx) => (
              <div key={idx} className={`notice ${notice.level || 'info'}`}>
                <span className="notice-label">
                  {formatNoticeLevel(notice.level)}
                </span>
                <span className="notice-text">{notice.text || ''}</span>
                {notice.link && (
                  <a className="link" href={notice.link}>查看</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {!hasPermission && (
        <div className="info-bar" role="alert">
          您沒有權限檢視此內容
        </div>
      )}
    </header>
  );
}

export default DashboardHeader;

