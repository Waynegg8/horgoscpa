/**
 * 系統配置文件
 * 集中管理API URL、常量等配置
 */

// API 基礎 URL（根據環境自動切換）
const CONFIG = {
    // API配置
    API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8787'
        : 'https://timesheet-api.hergscpa.workers.dev',
    
    // 認證配置
    SESSION_TOKEN_KEY: 'session_token',
    SESSION_EXPIRY_DAYS: 7,
    
    // 自動保存配置
    AUTO_SAVE_INTERVAL: 3000, // 3秒
    MAX_DRAFT_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_DRAFTS_KEPT: 3, // 最多保留3個草稿
    
    // API超時配置
    API_TIMEOUT: 30000, // 30秒
    
    // 分頁配置
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    
    // 服務類型映射
    SERVICE_TYPE_NAMES: {
        'accounting': '記帳服務',
        'vat': '營業稅申報',
        'income_tax': '營所稅申報',
        'withholding': '扣繳申報',
        'prepayment': '暫繳申報',
        'dividend': '盈餘分配',
        'nhi': '二代健保補充保費',
        'shareholder_tax': '股東可扣抵稅額',
        'audit': '財務簽證',
        'company_setup': '公司設立登記'
    },
    
    // 頻率映射
    FREQUENCY_NAMES: {
        'monthly': '每月',
        'bimonthly': '雙月',
        'quarterly': '每季',
        'biannual': '半年',
        'annual': '年度'
    },
    
    // 任務狀態映射
    TASK_STATUS_NAMES: {
        'pending': '待處理',
        'in_progress': '進行中',
        'on_hold': '暫停',
        'completed': '已完成',
        'not_started': '未開始',
        'cancelled': '已取消'
    },
    
    // 任務分類映射
    TASK_CATEGORY_NAMES: {
        'recurring': '周期任務',
        'business': '工商登記',
        'finance': '財稅簽證',
        'client_service': '客戶服務',
        'project': '專案任務',
        'general': '一般任務'
    },
    
    // 優先級映射
    PRIORITY_NAMES: {
        'low': '低',
        'medium': '中',
        'high': '高'
    },
    
    // 難度等級描述
    DIFFICULTY_DESCRIPTIONS: {
        1: '簡單 - 發票少、帳務單純',
        2: '普通 - 一般企業',
        3: '中等 - 交易頻繁或科目複雜',
        4: '困難 - 多角化經營或特殊行業',
        5: '極難 - 大型企業或跨國業務'
    }
};

// 導出配置供全局使用
window.CONFIG = CONFIG;
window.WORKER_URL = CONFIG.API_BASE;
window.API_BASE = CONFIG.API_BASE;

