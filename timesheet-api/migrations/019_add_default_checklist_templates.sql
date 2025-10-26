-- Migration 019: 添加預設服務檢查清單模板
-- 目的：為各種服務類型建立標準化的檢查清單模板
-- 日期：2025-10-26

-- 插入預設檢查清單模板

-- 1. 記帳服務 (accounting) 模板
INSERT OR REPLACE INTO service_checklist_templates (
  service_type, template_name, version, checklist_data, 
  is_active, is_default, created_by
) VALUES (
  'accounting',
  '標準記帳服務流程',
  1,
  json('[
    {
      "order": 1,
      "name": "收集憑證",
      "description": "收集本期所有進項、銷項發票及相關憑證",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "收集進項發票",
        "收集銷項發票",
        "收集費用憑證",
        "收集銀行對帳單",
        "確認發票齊全"
      ]
    },
    {
      "order": 2,
      "name": "發票檢查",
      "description": "檢查發票格式、金額、稅額是否正確",
      "estimated_hours": 0.5,
      "requires_approval": false,
      "checklist_items": [
        "檢查發票日期",
        "檢查統一編號",
        "檢查金額與稅額",
        "檢查發票品名",
        "發票核對無誤"
      ]
    },
    {
      "order": 3,
      "name": "資料輸入",
      "description": "將憑證資料輸入會計系統",
      "estimated_hours": 2.0,
      "requires_approval": false,
      "checklist_items": [
        "輸入進項發票",
        "輸入銷項發票",
        "輸入費用憑證",
        "輸入銀行往來",
        "確認科目正確"
      ]
    },
    {
      "order": 4,
      "name": "帳務調整",
      "description": "進行必要的帳務調整與分錄",
      "estimated_hours": 1.5,
      "requires_approval": false,
      "checklist_items": [
        "折舊提列",
        "費用分攤",
        "應計項目調整",
        "預付攤銷",
        "檢查借貸平衡"
      ]
    },
    {
      "order": 5,
      "name": "報表產出",
      "description": "產出財務報表並檢查合理性",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "產出試算表",
        "產出損益表",
        "產出資產負債表",
        "檢查科目餘額",
        "檢查報表勾稽"
      ]
    },
    {
      "order": 6,
      "name": "主管審核",
      "description": "提交主管審核確認",
      "estimated_hours": 0.5,
      "requires_approval": true,
      "checklist_items": [
        "整理審核資料",
        "提交主管審核",
        "回應審核意見",
        "修正錯誤",
        "取得核准"
      ]
    }
  ]'),
  1,
  1,
  1
);

-- 2. 營業稅申報 (vat) 模板
INSERT OR REPLACE INTO service_checklist_templates (
  service_type, template_name, version, checklist_data,
  is_active, is_default, created_by
) VALUES (
  'vat',
  '標準營業稅申報流程',
  1,
  json('[
    {
      "order": 1,
      "name": "發票彙整",
      "description": "彙整本期銷項與進項發票",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "彙整銷項發票",
        "彙整進項發票",
        "檢查發票期別",
        "發票分類統計",
        "零稅率發票整理"
      ]
    },
    {
      "order": 2,
      "name": "發票勾稽",
      "description": "與國稅局401申報資料勾稽",
      "estimated_hours": 1.5,
      "requires_approval": false,
      "checklist_items": [
        "下載401申報資料",
        "銷項發票勾稽",
        "進項發票勾稽",
        "差異分析",
        "異常發票處理"
      ]
    },
    {
      "order": 3,
      "name": "填寫申報書",
      "description": "填寫營業稅申報書及附表",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "填寫401申報書",
        "填寫銷項明細",
        "填寫進項明細",
        "計算應納稅額",
        "檢查計算正確"
      ]
    },
    {
      "order": 4,
      "name": "產出申報檔",
      "description": "產出電子申報媒體檔",
      "estimated_hours": 0.5,
      "requires_approval": false,
      "checklist_items": [
        "轉出媒體檔",
        "檢查檔案格式",
        "驗證檔案內容",
        "備份申報檔",
        "準備上傳"
      ]
    },
    {
      "order": 5,
      "name": "線上申報",
      "description": "透過財政部網站線上申報",
      "estimated_hours": 0.5,
      "requires_approval": false,
      "checklist_items": [
        "登入申報系統",
        "上傳申報檔案",
        "確認申報成功",
        "下載收執聯",
        "歸檔申報資料"
      ]
    },
    {
      "order": 6,
      "name": "稅款繳納",
      "description": "計算應納稅額並繳納",
      "estimated_hours": 0.5,
      "requires_approval": true,
      "checklist_items": [
        "計算應納稅額",
        "開立繳款書",
        "通知客戶繳款",
        "確認繳款完成",
        "歸檔繳款證明"
      ]
    }
  ]'),
  1,
  1,
  1
);

-- 3. 營所稅申報 (income_tax) 模板
INSERT OR REPLACE INTO service_checklist_templates (
  service_type, template_name, version, checklist_data,
  is_active, is_default, created_by
) VALUES (
  'income_tax',
  '標準營所稅申報流程',
  1,
  json('[
    {
      "order": 1,
      "name": "帳務結算",
      "description": "完成全年度帳務結算",
      "estimated_hours": 3.0,
      "requires_approval": false,
      "checklist_items": [
        "檢查全年交易",
        "調整帳務分錄",
        "確認資產負債",
        "確認損益項目",
        "產出年度報表"
      ]
    },
    {
      "order": 2,
      "name": "稅務調整",
      "description": "進行稅務會計調整",
      "estimated_hours": 2.0,
      "requires_approval": false,
      "checklist_items": [
        "永久性差異調整",
        "暫時性差異調整",
        "不可扣抵費用",
        "投資收益調整",
        "計算應稅所得"
      ]
    },
    {
      "order": 3,
      "name": "填寫申報書",
      "description": "填寫營所稅結算申報書",
      "estimated_hours": 2.0,
      "requires_approval": false,
      "checklist_items": [
        "填寫主申報書",
        "填寫各式附表",
        "計算應納稅額",
        "計算股東可扣抵稅額",
        "檢查數字勾稽"
      ]
    },
    {
      "order": 4,
      "name": "產出申報檔",
      "description": "產出電子申報媒體檔",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "轉出媒體檔",
        "驗證檔案格式",
        "檢查申報內容",
        "備份申報資料",
        "準備相關附件"
      ]
    },
    {
      "order": 5,
      "name": "線上申報",
      "description": "透過財政部網站申報",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "登入申報系統",
        "上傳申報檔案",
        "上傳電子簽章",
        "確認申報成功",
        "下載收執聯"
      ]
    },
    {
      "order": 6,
      "name": "稅款繳納",
      "description": "計算並繳納應納稅額",
      "estimated_hours": 0.5,
      "requires_approval": true,
      "checklist_items": [
        "計算應納稅額",
        "開立繳款書",
        "通知客戶繳款",
        "確認繳款完成",
        "歸檔完成"
      ]
    }
  ]'),
  1,
  1,
  1
);

-- 4. 扣繳申報 (withholding) 模板
INSERT OR REPLACE INTO service_checklist_templates (
  service_type, template_name, version, checklist_data,
  is_active, is_default, created_by
) VALUES (
  'withholding',
  '標準扣繳申報流程',
  1,
  json('[
    {
      "order": 1,
      "name": "資料彙整",
      "description": "彙整本期扣繳資料",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "彙整薪資所得",
        "彙整執行業務所得",
        "彙整租賃所得",
        "彙整利息所得",
        "其他應扣繳所得"
      ]
    },
    {
      "order": 2,
      "name": "計算扣繳稅額",
      "description": "計算各項所得應扣繳稅額",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "查詢扣繳率",
        "計算扣繳稅額",
        "檢查免扣繳額度",
        "分類所得類別",
        "確認計算正確"
      ]
    },
    {
      "order": 3,
      "name": "填寫申報書",
      "description": "填寫扣繳憑單申報書",
      "estimated_hours": 1.5,
      "requires_approval": false,
      "checklist_items": [
        "填寫各式扣繳憑單",
        "填寫彙總表",
        "檢查受領人資料",
        "檢查金額正確",
        "產出申報媒體檔"
      ]
    },
    {
      "order": 4,
      "name": "線上申報",
      "description": "透過財政部網站申報",
      "estimated_hours": 0.5,
      "requires_approval": false,
      "checklist_items": [
        "登入申報系統",
        "上傳申報檔案",
        "確認申報成功",
        "下載收執聯",
        "列印扣繳憑單"
      ]
    },
    {
      "order": 5,
      "name": "繳納與寄發",
      "description": "繳納稅款並寄發憑單",
      "estimated_hours": 1.0,
      "requires_approval": true,
      "checklist_items": [
        "繳納扣繳稅款",
        "寄發扣繳憑單",
        "確認收件",
        "歸檔申報資料",
        "完成結案"
      ]
    }
  ]'),
  1,
  1,
  1
);

-- 5. 公司設立登記 (company_setup) 模板
INSERT OR REPLACE INTO service_checklist_templates (
  service_type, template_name, version, checklist_data,
  is_active, is_default, created_by
) VALUES (
  'company_setup',
  '標準公司設立流程',
  1,
  json('[
    {
      "order": 1,
      "name": "前置作業",
      "description": "收集設立所需文件與資料",
      "estimated_hours": 2.0,
      "requires_approval": false,
      "checklist_items": [
        "確認公司名稱",
        "確認營業項目",
        "確認資本額",
        "確認股東結構",
        "確認登記地址"
      ]
    },
    {
      "order": 2,
      "name": "名稱預查",
      "description": "向經濟部申請公司名稱預查",
      "estimated_hours": 1.0,
      "requires_approval": false,
      "checklist_items": [
        "準備名稱預查資料",
        "線上申請預查",
        "等待審核結果",
        "取得預查核准",
        "保留名稱"
      ]
    },
    {
      "order": 3,
      "name": "文件準備",
      "description": "準備公司登記所需文件",
      "estimated_hours": 3.0,
      "requires_approval": false,
      "checklist_items": [
        "草擬公司章程",
        "股東會議事錄",
        "董事會議事錄",
        "股東身分證明",
        "登記申請書"
      ]
    },
    {
      "order": 4,
      "name": "資本額驗證",
      "description": "辦理資本額存款與驗資",
      "estimated_hours": 2.0,
      "requires_approval": false,
      "checklist_items": [
        "開立籌備處帳戶",
        "股東存入資本額",
        "取得存款證明",
        "會計師驗資",
        "取得驗資報告"
      ]
    },
    {
      "order": 5,
      "name": "經濟部登記",
      "description": "向經濟部申請公司登記",
      "estimated_hours": 2.0,
      "requires_approval": false,
      "checklist_items": [
        "送件經濟部",
        "繳納登記規費",
        "等待審核",
        "補件處理",
        "取得登記核准函"
      ]
    },
    {
      "order": 6,
      "name": "稅籍登記",
      "description": "向國稅局辦理稅籍登記",
      "estimated_hours": 1.5,
      "requires_approval": false,
      "checklist_items": [
        "填寫稅籍登記表",
        "送件國稅局",
        "取得統一編號",
        "領取扣繳單位設立登記表",
        "登記營業人"
      ]
    },
    {
      "order": 7,
      "name": "後續作業",
      "description": "完成其他必要登記與設定",
      "estimated_hours": 2.0,
      "requires_approval": true,
      "checklist_items": [
        "刻製公司印鑑",
        "開立公司帳戶",
        "辦理勞健保",
        "設置會計帳簿",
        "交付客戶文件"
      ]
    }
  ]'),
  1,
  1,
  1
);

-- 完成提示
SELECT '✅ 已成功建立 5 個預設服務檢查清單模板' AS message;

