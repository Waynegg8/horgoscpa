-- Migration 021: 添加任務範本市場 (10+ 預設模板)
-- 目的：建立標準化的任務範本供快速創建任務使用
-- 日期：2025-10-26

-- 插入多階段任務範本

-- 1. 公司設立流程（工商登記）
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '公司設立完整流程',
  'business',
  '從名稱預查到稅籍登記的完整公司設立流程',
  8,
  1,
  1
);

INSERT OR IGNORE INTO template_stages (template_id, stage_order, stage_name, stage_description, checklist, estimated_hours, requires_approval)
SELECT t.id, 1, '前置作業與諮詢', '收集設立所需資料並進行初步諮詢', json('["確認公司名稱", "確認營業項目", "確認資本額", "確認股東結構", "確認登記地址"]'), 2.0, 0
FROM multi_stage_templates t WHERE t.template_name = '公司設立完整流程' AND NOT EXISTS (SELECT 1 FROM template_stages ts WHERE ts.template_id = t.id AND ts.stage_order = 1);

INSERT OR IGNORE INTO template_stages (template_id, stage_order, stage_name, stage_description, checklist, estimated_hours, requires_approval)
SELECT t.id, 2, '名稱預查申請', '向經濟部申請公司名稱預查', json('["準備預查資料", "線上申請預查", "等待審核結果", "取得預查核准", "保留名稱"]'), 1.0, 0
FROM multi_stage_templates t WHERE t.template_name = '公司設立完整流程' AND NOT EXISTS (SELECT 1 FROM template_stages ts WHERE ts.template_id = t.id AND ts.stage_order = 2);

INSERT OR IGNORE INTO template_stages (template_id, stage_order, stage_name, stage_description, checklist, estimated_hours, requires_approval)
SELECT t.id, 3, '文件準備', '準備所有登記所需文件', json('["草擬公司章程", "股東會議事錄", "董事會議事錄", "股東身分證明", "登記申請書"]'), 3.0, 0
FROM multi_stage_templates t WHERE t.template_name = '公司設立完整流程' AND NOT EXISTS (SELECT 1 FROM template_stages ts WHERE ts.template_id = t.id AND ts.stage_order = 3);

-- 2. 財務簽證流程
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '年度財務簽證',
  'finance',
  '標準的年度財務報表查核簽證流程',
  10,
  1,
  1
);

-- 3. 營業稅申報（簡化版）
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '營業稅申報（雙月）',
  'finance',
  '標準的營業稅401申報流程',
  6,
  1,
  1
);

-- 4. 營所稅申報
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '營所稅結算申報',
  'finance',
  '年度營利事業所得稅結算申報',
  8,
  1,
  1
);

-- 5. 公司變更登記
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '公司變更登記',
  'business',
  '公司地址、董監事、資本額等變更登記',
  5,
  1,
  1
);

-- 6. 扣繳申報
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '扣繳憑單申報',
  'finance',
  '各類所得扣繳憑單申報流程',
  5,
  1,
  1
);

-- 7. 暫繳申報
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '暫繳稅額申報',
  'finance',
  '營所稅暫繳申報流程',
  4,
  1,
  1
);

-- 8. 盈餘分配
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '股東盈餘分配',
  'finance',
  '年度盈餘分配與股東可扣抵稅額計算',
  6,
  1,
  1
);

-- 9. 公司解散清算
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '公司解散清算',
  'business',
  '公司解散登記到清算完結流程',
  7,
  1,
  1
);

-- 10. 稅務查核
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '稅務查核案件',
  'finance',
  '國稅局稅務查核應對流程',
  8,
  1,
  1
);

-- 11. 記帳結帳（月度）
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '月度記帳結帳',
  'recurring',
  '標準的月度記帳結帳流程',
  6,
  1,
  1
);

-- 12. 客戶服務導入
INSERT OR IGNORE INTO multi_stage_templates (
  template_name, category, description, total_stages, is_active, created_by
) VALUES (
  '新客戶服務導入',
  'general',
  '新客戶簽約後的服務導入流程',
  5,
  1,
  1
);

-- 完成提示
SELECT '✅ 已成功建立 12 個任務範本' AS message;
SELECT COUNT(*) as template_count FROM multi_stage_templates;

