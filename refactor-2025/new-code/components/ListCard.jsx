import React from 'react';

/**
 * 基础列表卡片组件
 */
export function ListCard({ title, children, isEmpty = false }) {
  return (
    <div className="card list">
      <div className="card-title">{title}</div>
      <div className="list-body">
        {isEmpty ? (
          <div className="muted">尚無資料</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * 带活动筛选器的列表卡片组件
 */
export function ListCardWithActivityFilter({
  title,
  children,
  users = [],
  activityType,
  activityUserId,
  activityDays,
  onTypeChange,
  onUserChange,
  onDaysChange,
  isEmpty = false
}) {
  return (
    <div className="card list">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div className="card-title">{title}</div>
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <select
            id="activityTypeFilter"
            value={activityType}
            onChange={(e) => onTypeChange?.(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '13px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: '#fff'
            }}
          >
            <option value="">全部類型</option>
            <option value="status_update">任務更新</option>
            <option value="due_date_adjustment">期限調整</option>
            <option value="leave_application">假期申請</option>
            <option value="timesheet_reminder">工時提醒</option>
          </select>
          
          <select
            id="activityUserFilter"
            value={activityUserId}
            onChange={(e) => onUserChange?.(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '13px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: '#fff'
            }}
          >
            <option value="">全部員工</option>
            {users.map(u => (
              <option key={u.userId} value={u.userId}>
                {u.name}
              </option>
            ))}
          </select>
          
          <select
            id="activityDaysFilter"
            value={activityDays}
            onChange={(e) => onDaysChange?.(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              fontSize: '13px',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              background: '#fff'
            }}
          >
            <option value="3">3天內</option>
            <option value="7">7天內</option>
            <option value="14">14天內</option>
            <option value="30">30天內</option>
          </select>
        </div>
      </div>
      <div className="list-body" style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {isEmpty ? (
          <div className="muted">尚無資料</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * 带月份下拉选择器的列表卡片组件
 */
export function ListCardWithMonthDropdown({
  title,
  children,
  currentYm,
  onMonthChange,
  isEmpty = false
}) {
  return (
    <div className="card list">
      <div className="card-title" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{title}</span>
        <MonthSelector
          selectedYm={currentYm}
          onChange={onMonthChange}
        />
      </div>
      <div className="list-body">
        {isEmpty ? (
          <div className="muted">尚無資料</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * 带财务月份下拉选择器的列表卡片组件
 */
export function ListCardWithFinanceDropdown({
  title,
  children,
  currentYm,
  mode,
  onMonthChange,
  onModeToggle,
  isEmpty = false
}) {
  return (
    <div className="card list">
      <div className="card-title" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MonthSelector
            selectedYm={currentYm}
            onChange={onMonthChange}
            disabled={mode === 'ytd'}
          />
          <button
            type="button"
            className="ytd-btn"
            onClick={onModeToggle}
            style={{
              padding: '6px 14px',
              cursor: 'pointer',
              border: `1px solid ${mode === 'ytd' ? '#3498db' : '#ddd'}`,
              background: mode === 'ytd' ? '#3498db' : '#fff',
              color: mode === 'ytd' ? '#fff' : '#333',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            本年累計
          </button>
        </div>
      </div>
      <div className="list-body">
        {isEmpty ? (
          <div className="muted">尚無資料</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

/**
 * 月份选择器组件
 */
function MonthSelector({ selectedYm, onChange, disabled = false }) {
  // 生成最近12个月的选项
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const [y, m] = ym.split('-');
      const label = `${y}年${parseInt(m)}月`;
      options.push({ value: ym, label });
    }
    return options;
  };

  const options = generateMonthOptions();

  return (
    <select
      className="month-dropdown"
      value={selectedYm}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        background: '#fff',
        fontSize: '14px',
        fontWeight: '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        transition: 'border-color 0.2s',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto'
      }}
      onFocus={(e) => e.target.style.borderColor = '#3498db'}
      onBlur={(e) => e.target.style.borderColor = '#ddd'}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default ListCard;

