-- 更新任務模板為繁體中文

-- 更新模板名稱和描述
UPDATE TaskTemplates SET 
  template_name = '月度記帳服務',
  description = '每月例行記帳作業流程'
WHERE template_name = '月度记账服务';

UPDATE TaskTemplates SET 
  template_name = '營業稅申報',
  description = '雙月營業稅申報作業'
WHERE template_name = '营业税申报';

UPDATE TaskTemplates SET 
  template_name = '營所稅結算申報',
  description = '年度營利事業所得稅結算申報'
WHERE template_name = '营所税结算申报';

UPDATE TaskTemplates SET 
  template_name = '工商登記變更',
  description = '公司工商登記事項變更'
WHERE template_name = '工商登记变更';

UPDATE TaskTemplates SET 
  template_name = '月度薪資處理',
  description = '每月薪資計算及申報'
WHERE template_name = '月度薪资处理';

-- 更新月度記帳服務的階段
UPDATE TaskTemplateStages SET 
  stage_name = '收集憑證',
  description = '向客戶收集本月交易憑證、發票、收據'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 1;

UPDATE TaskTemplateStages SET 
  stage_name = '整理分類',
  description = '整理憑證並按類別分類'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 2;

UPDATE TaskTemplateStages SET 
  stage_name = '帳務錄入',
  description = '錄入會計系統並編製分錄'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 3;

UPDATE TaskTemplateStages SET 
  stage_name = '核對調整',
  description = '核對銀行帳戶、調整差異'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 4;

UPDATE TaskTemplateStages SET 
  stage_name = '產出報表',
  description = '產出月度財務報表並寄送客戶'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 5;

-- 更新營業稅申報的階段
UPDATE TaskTemplateStages SET 
  stage_name = '確認銷項',
  description = '確認本期銷項發票及金額'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 1;

UPDATE TaskTemplateStages SET 
  stage_name = '確認進項',
  description = '確認可扣抵進項稅額'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 2;

UPDATE TaskTemplateStages SET 
  stage_name = '編製申報書',
  description = '編製營業稅申報書'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 3;

UPDATE TaskTemplateStages SET 
  stage_name = '網路申報',
  description = '透過財政部網站完成申報'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 4;

UPDATE TaskTemplateStages SET 
  stage_name = '繳納稅款',
  description = '協助客戶繳納稅款並存檔'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 5;

-- 更新營所稅結算申報的階段
UPDATE TaskTemplateStages SET 
  stage_name = '年度結帳',
  description = '完成全年帳務結帳及調整'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 1;

UPDATE TaskTemplateStages SET 
  stage_name = '編製財報',
  description = '編製年度財務報表'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 2;

UPDATE TaskTemplateStages SET 
  stage_name = '稅務調整',
  description = '進行稅務調整並計算應納稅額'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 3;

UPDATE TaskTemplateStages SET 
  stage_name = '編製申報書',
  description = '編製營所稅申報書及附件'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 4;

UPDATE TaskTemplateStages SET 
  stage_name = '網路申報',
  description = '完成網路申報並取得收據'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 5;

-- 更新工商登記變更的階段
UPDATE TaskTemplateStages SET 
  stage_name = '確認變更事項',
  description = '與客戶確認變更內容及所需文件'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 1;

UPDATE TaskTemplateStages SET 
  stage_name = '準備文件',
  description = '準備變更登記申請書及相關文件'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 2;

UPDATE TaskTemplateStages SET 
  stage_name = '送件申請',
  description = '至經濟部商業司或地方政府送件'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 3;

UPDATE TaskTemplateStages SET 
  stage_name = '領取證明',
  description = '領取變更登記表及相關證明文件'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 4;

-- 更新月度薪資處理的階段
UPDATE TaskTemplateStages SET 
  stage_name = '收集考勤',
  description = '收集本月員工出缺勤資料'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 1;

UPDATE TaskTemplateStages SET 
  stage_name = '計算薪資',
  description = '計算薪資、加班費、扣款項目'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 2;

UPDATE TaskTemplateStages SET 
  stage_name = '編製薪資單',
  description = '產出薪資明細表及轉帳清單'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 3;

UPDATE TaskTemplateStages SET 
  stage_name = '扣繳申報',
  description = '計算並申報扣繳稅款'
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 4;

