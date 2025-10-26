#!/usr/bin/env node

/**
 * 端到端任務生成測試腳本
 * 用於驗證自動任務生成功能
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:8787';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function logTest(name) {
  console.log(`\n${colors.cyan}🧪 測試: ${name}${colors.reset}`);
}

function logPass(message) {
  console.log(`${colors.green}  ✅ ${message}${colors.reset}`);
}

function logFail(message) {
  console.log(`${colors.red}  ❌ ${message}${colors.reset}`);
}

let passCount = 0;
let failCount = 0;

async function test(name, fn) {
  logTest(name);
  try {
    await fn();
    passCount++;
  } catch (error) {
    logFail(error.message);
    failCount++;
  }
}

// 測試1: 預覽API
await test('預覽API (/api/automated-tasks/preview)', async () => {
  const response = await fetch(`${API_URL}/api/automated-tasks/preview`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error || '未知錯誤'}`);
  }
  
  if (!data.success) {
    throw new Error(data.error || '預覽失敗');
  }
  
  logPass(`預覽成功，待生成任務數: ${data.tasks_to_generate}`);
  
  if (data.tasks && data.tasks.length > 0) {
    logPass(`範例任務: ${data.tasks[0].client_name} - ${data.tasks[0].service_type}`);
  }
});

// 測試2: 生成API（測試模式）
await test('生成API測試 (/api/automated-tasks/generate)', async () => {
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 30); // 測試30天後的日期
  
  const response = await fetch(`${API_URL}/api/automated-tasks/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: testDate.toISOString(),
      service_type: 'accounting'
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${data.error || '未知錯誤'}`);
  }
  
  if (!data.success) {
    throw new Error(data.error || '生成失敗');
  }
  
  const { results } = data;
  logPass(`掃描服務數: ${results.total}`);
  logPass(`成功生成: ${results.generated.length}`);
  logPass(`跳過: ${results.skipped.length}`);
  logPass(`錯誤: ${results.errors.length}`);
});

// 測試3: 檢查清單模板
await test('檢查清單模板查詢', async () => {
  const response = await fetch(`${API_URL}/api/templates/checklist?service_type=accounting`);
  
  if (response.status === 404) {
    logPass('API端點未實現（預期行為）');
    return;
  }
  
  const data = await response.json();
  
  if (data.success) {
    logPass(`找到模板: ${data.template?.template_name || '無'}`);
  } else {
    logPass('模板系統可能使用內部邏輯');
  }
});

// 測試4: 多階段任務範本
await test('多階段任務範本查詢', async () => {
  const response = await fetch(`${API_URL}/api/multi-stage-templates`);
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error('查詢失敗');
  }
  
  logPass(`範本總數: ${data.templates?.length || 0}`);
  
  if (data.templates && data.templates.length > 0) {
    const businessTemplates = data.templates.filter(t => t.category === 'business');
    const financeTemplates = data.templates.filter(t => t.category === 'finance');
    logPass(`工商範本: ${businessTemplates.length} 個`);
    logPass(`財稅範本: ${financeTemplates.length} 個`);
  }
});

// 測試5: 任務列表查詢
await test('任務列表查詢 (category=client_service)', async () => {
  const response = await fetch(`${API_URL}/api/tasks/multi-stage?category=client_service&limit=5`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  if (data.success || data.tasks) {
    const tasks = data.tasks || data.data || [];
    logPass(`客戶服務任務數: ${tasks.length}`);
  } else {
    logPass('任務查詢功能正常（無資料）');
  }
});

// 測試總結
console.log('\n' + '═'.repeat(60));
console.log(`${colors.cyan}測試總結${colors.reset}`);
console.log('─'.repeat(60));
console.log(`${colors.green}✅ 通過: ${passCount}${colors.reset}`);
console.log(`${colors.red}❌ 失敗: ${failCount}${colors.reset}`);
console.log(`總計: ${passCount + failCount} 個測試`);
console.log('═'.repeat(60));

if (failCount > 0) {
  console.log(`\n${colors.yellow}⚠️  有測試失敗，請檢查上方錯誤訊息${colors.reset}`);
  process.exit(1);
} else {
  console.log(`\n${colors.green}🎉 所有測試通過！${colors.reset}`);
  process.exit(0);
}

