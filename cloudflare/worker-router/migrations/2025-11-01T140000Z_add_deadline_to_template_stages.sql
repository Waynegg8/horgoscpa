-- 为任务模板阶段添加期限规则字段

ALTER TABLE TaskTemplateStages ADD COLUMN due_date_rule TEXT CHECK(due_date_rule IN ('end_of_month', 'specific_day', 'next_month_day', 'days_after_start'));
ALTER TABLE TaskTemplateStages ADD COLUMN due_date_value INTEGER CHECK(due_date_value IS NULL OR (due_date_value >= 1 AND due_date_value <= 31));
ALTER TABLE TaskTemplateStages ADD COLUMN due_date_offset_days INTEGER DEFAULT 0;
ALTER TABLE TaskTemplateStages ADD COLUMN advance_days INTEGER DEFAULT 7 CHECK(advance_days >= 0);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_template_stages_due_rule ON TaskTemplateStages(due_date_rule);

-- 更新现有模板阶段，添加默认期限规则
-- 月度记账服务 - 按流程顺序设置期限
UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 5,
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 1;  -- 收集凭证：每月5日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 10,
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 2;  -- 整理分类：每月10日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 20,
  advance_days = 5
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 3;  -- 账务录入：每月20日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 28,
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 4;  -- 核对调整：每月28日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'end_of_month',
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度記帳服務') 
  AND stage_order = 5;  -- 产出报表：月底

-- 营业税申报 - 次月15日前完成所有步骤
UPDATE TaskTemplateStages SET 
  due_date_rule = 'next_month_day', 
  due_date_value = 5,
  advance_days = 5
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 1;  -- 确认销项：次月5日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'next_month_day', 
  due_date_value = 8,
  advance_days = 5
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 2;  -- 确认进项：次月8日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'next_month_day', 
  due_date_value = 12,
  advance_days = 5
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 3;  -- 编制申报书：次月12日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'next_month_day', 
  due_date_value = 14,
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 4;  -- 网络申报：次月14日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'next_month_day', 
  due_date_value = 15,
  advance_days = 2
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營業稅申報') 
  AND stage_order = 5;  -- 缴纳税款：次月15日（法定期限）

-- 营所税结算申报 - 5月31日前完成
UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 10,
  advance_days = 20
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 1;  -- 年度结账：5月10日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 15,
  advance_days = 15
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 2;  -- 编制财报：5月15日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 22,
  advance_days = 10
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 3;  -- 税务调整：5月22日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 28,
  advance_days = 5
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 4;  -- 编制申报书：5月28日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 31,
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '營所稅結算申報') 
  AND stage_order = 5;  -- 网络申报：5月31日（法定期限）

-- 工商登记变更 - 相对天数
UPDATE TaskTemplateStages SET 
  due_date_rule = 'days_after_start', 
  due_date_value = 3,
  advance_days = 1
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 1;  -- 确认变更事项：3天

UPDATE TaskTemplateStages SET 
  due_date_rule = 'days_after_start', 
  due_date_value = 10,
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 2;  -- 准备文件：10天

UPDATE TaskTemplateStages SET 
  due_date_rule = 'days_after_start', 
  due_date_value = 20,
  advance_days = 3
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 3;  -- 送件申请：20天

UPDATE TaskTemplateStages SET 
  due_date_rule = 'days_after_start', 
  due_date_value = 30,
  advance_days = 2
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '工商登記變更') 
  AND stage_order = 4;  -- 领取证明：30天

-- 月度薪资处理 - 每月5日前完成
UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 1,
  advance_days = 2
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 1;  -- 收集考勤：每月1日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 3,
  advance_days = 2
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 2;  -- 计算薪资：每月3日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 4,
  advance_days = 2
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 3;  -- 编制薪资单：每月4日

UPDATE TaskTemplateStages SET 
  due_date_rule = 'specific_day', 
  due_date_value = 5,
  advance_days = 2
WHERE template_id = (SELECT template_id FROM TaskTemplates WHERE template_name = '月度薪資處理') 
  AND stage_order = 4;  -- 扣缴申报：每月5日

