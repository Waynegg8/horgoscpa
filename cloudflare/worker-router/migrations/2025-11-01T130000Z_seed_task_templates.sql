-- 删除测试模板
DELETE FROM TaskTemplates WHERE template_name = '111';

-- 插入实用的任务模板

-- 1. 月度记账服务模板
INSERT INTO TaskTemplates (
  template_name, service_id, description, 
  default_due_date_rule, default_due_date_value, default_advance_days,
  is_active
) VALUES (
  '月度记账服务', 1, '每月例行记账作业流程',
  'end_of_month', NULL, 7,
  1
);

-- 获取刚插入的模板ID并插入阶段
INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '收集凭证', 1, '向客户收集本月交易凭证、发票、收据', 1.0
FROM TaskTemplates WHERE template_name = '月度记账服务';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '整理分类', 2, '整理凭证并按类别分类', 2.0
FROM TaskTemplates WHERE template_name = '月度记账服务';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '账务录入', 3, '录入会计系统并编制分录', 3.0
FROM TaskTemplates WHERE template_name = '月度记账服务';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '核对调整', 4, '核对银行账户、调整差异', 1.5
FROM TaskTemplates WHERE template_name = '月度记账服务';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '产出报表', 5, '产出月度财务报表并寄送客户', 0.5
FROM TaskTemplates WHERE template_name = '月度记账服务';

-- 2. 营业税申报模板（双月）
INSERT INTO TaskTemplates (
  template_name, service_id, description,
  default_due_date_rule, default_due_date_value, default_advance_days,
  is_active
) VALUES (
  '营业税申报', 2, '双月营业税申报作业',
  'next_month_day', 15, 10,
  1
);

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '确认销项', 1, '确认本期销项发票及金额', 1.0
FROM TaskTemplates WHERE template_name = '营业税申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '确认进项', 2, '确认可扣抵进项税额', 1.0
FROM TaskTemplates WHERE template_name = '营业税申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '编制申报书', 3, '编制营业税申报书', 1.5
FROM TaskTemplates WHERE template_name = '营业税申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '网络申报', 4, '透过财政部网站完成申报', 0.5
FROM TaskTemplates WHERE template_name = '营业税申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '缴纳税款', 5, '协助客户缴纳税款并存档', 0.5
FROM TaskTemplates WHERE template_name = '营业税申报';

-- 3. 营所税结算申报模板（年度）
INSERT INTO TaskTemplates (
  template_name, service_id, description,
  default_due_date_rule, default_due_date_value, default_advance_days,
  is_active
) VALUES (
  '营所税结算申报', 2, '年度营利事业所得税结算申报',
  'specific_day', 31, 30,
  1
);

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '年度结账', 1, '完成全年账务结账及调整', 4.0
FROM TaskTemplates WHERE template_name = '营所税结算申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '编制财报', 2, '编制年度财务报表', 3.0
FROM TaskTemplates WHERE template_name = '营所税结算申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '税务调整', 3, '进行税务调整并计算应纳税额', 3.0
FROM TaskTemplates WHERE template_name = '营所税结算申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '编制申报书', 4, '编制营所税申报书及附件', 2.0
FROM TaskTemplates WHERE template_name = '营所税结算申报';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '网络申报', 5, '完成网络申报并取得收据', 1.0
FROM TaskTemplates WHERE template_name = '营所税结算申报';

-- 4. 工商登记变更模板（一次性）
INSERT INTO TaskTemplates (
  template_name, service_id, description,
  default_due_date_rule, default_due_date_value, default_advance_days,
  is_active
) VALUES (
  '工商登记变更', 3, '公司工商登记事项变更',
  'days_after_start', 30, 3,
  1
);

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '确认变更事项', 1, '与客户确认变更内容及所需文件', 0.5
FROM TaskTemplates WHERE template_name = '工商登记变更';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '准备文件', 2, '准备变更登记申请书及相关文件', 2.0
FROM TaskTemplates WHERE template_name = '工商登记变更';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '送件申请', 3, '至经济部商业司或地方政府送件', 1.0
FROM TaskTemplates WHERE template_name = '工商登记变更';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '领取证明', 4, '领取变更登记表及相关证明文件', 0.5
FROM TaskTemplates WHERE template_name = '工商登记变更';

-- 5. 薪资处理模板（月度）
INSERT INTO TaskTemplates (
  template_name, service_id, description,
  default_due_date_rule, default_due_date_value, default_advance_days,
  is_active
) VALUES (
  '月度薪资处理', 1, '每月薪资计算及申报',
  'specific_day', 5, 5,
  1
);

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '收集考勤', 1, '收集本月员工出缺勤资料', 0.5
FROM TaskTemplates WHERE template_name = '月度薪资处理';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '计算薪资', 2, '计算薪资、加班费、扣款项目', 1.5
FROM TaskTemplates WHERE template_name = '月度薪资处理';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '编制薪资单', 3, '产出薪资明细表及转账清单', 1.0
FROM TaskTemplates WHERE template_name = '月度薪资处理';

INSERT INTO TaskTemplateStages (template_id, stage_name, stage_order, description, estimated_hours)
SELECT template_id, '扣缴申报', 4, '计算并申报扣缴税款', 0.5
FROM TaskTemplates WHERE template_name = '月度薪资处理';

