#!/usr/bin/env node

/**
 * 自動任務生成腳本
 * 用於 GitHub Actions 定時執行或手動觸發
 * 
 * 使用方式:
 *   node scripts/generate-tasks.js                    # 生成今天應該生成的任務
 *   node scripts/generate-tasks.js --preview          # 預覽模式（不實際生成）
 *   node scripts/generate-tasks.js --date 2025-11-01  # 指定日期
 *   node scripts/generate-tasks.js --service-type vat # 只生成特定服務類型
 */

import { config } from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 設置 __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入環境變數
config({ path: path.join(__dirname, '../.env') });

// 配置
const API_URL = process.env.API_URL || 'https://timesheet-api.hergscpa.workers.dev';
const LOG_DIR = path.join(__dirname, '../logs');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// 解析命令行參數
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    preview: false,
    date: null,
    serviceType: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--preview') {
      options.preview = true;
    } else if (arg === '--date' && args[i + 1]) {
      options.date = args[i + 1];
      i++;
    } else if (arg === '--service-type' && args[i + 1]) {
      options.serviceType = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }
  
  return options;
}

function showHelp() {
  console.log(`
${colors.cyan}🔧 自動任務生成腳本${colors.reset}

使用方式:
  node scripts/generate-tasks.js [選項]

選項:
  --preview              預覽模式，不實際生成任務
  --date YYYY-MM-DD      指定目標日期（預設：今天）
  --service-type TYPE    只生成特定服務類型的任務
  -h, --help             顯示此幫助訊息

範例:
  # 預覽今天應該生成的任務
  node scripts/generate-tasks.js --preview

  # 生成今天的任務
  node scripts/generate-tasks.js

  # 生成指定日期的營業稅任務
  node scripts/generate-tasks.js --date 2025-11-15 --service-type vat

服務類型:
  accounting    記帳服務
  vat           營業稅申報
  income_tax    營所稅申報
  withholding   扣繳申報
  prepayment    暫繳申報
  dividend      盈餘分配
  audit         財務簽證
`);
}

// 確保日誌目錄存在
async function ensureLogDir() {
  try {
    await fs.access(LOG_DIR);
  } catch {
    await fs.mkdir(LOG_DIR, { recursive: true });
  }
}

// 寫入日誌文件
async function writeLog(data) {
  await ensureLogDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const logFile = path.join(LOG_DIR, `task-generation-${timestamp}.json`);
  
  try {
    let logs = [];
    try {
      const existing = await fs.readFile(logFile, 'utf8');
      logs = JSON.parse(existing);
    } catch {
      // 文件不存在或無法解析，創建新的
    }
    
    logs.push({
      timestamp: new Date().toISOString(),
      ...data
    });
    
    await fs.writeFile(logFile, JSON.stringify(logs, null, 2), 'utf8');
    logInfo(`日誌已寫入: ${logFile}`);
  } catch (error) {
    logError(`寫入日誌失敗: ${error.message}`);
  }
}

// 預覽將要生成的任務
async function previewTasks(options) {
  logInfo('📋 預覽模式：查看將要生成的任務');
  
  try {
    const params = new URLSearchParams();
    if (options.date) {
      params.append('date', options.date);
    }
    
    const url = `${API_URL}/api/automated-tasks/preview?${params}`;
    logInfo(`API URL: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '預覽失敗');
    }
    
    console.log('');
    logInfo(`預覽日期: ${data.preview_date}`);
    logInfo(`待生成任務數: ${data.tasks_to_generate}`);
    console.log('');
    
    if (data.tasks_to_generate === 0) {
      logWarning('目前沒有需要生成的任務');
      return { success: true, count: 0 };
    }
    
    console.log(`${colors.bright}待生成任務清單:${colors.reset}`);
    console.log('─'.repeat(80));
    
    data.tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.client_name} - ${task.service_type}`);
      console.log(`   負責人: ${task.assigned_to || '未指派'}`);
      console.log(`   執行日期: ${task.execution_date}`);
      console.log(`   執行期間: ${task.execution_period}`);
      console.log('');
    });
    
    return { success: true, count: data.tasks_to_generate, tasks: data.tasks };
    
  } catch (error) {
    logError(`預覽失敗: ${error.message}`);
    throw error;
  }
}

// 生成任務
async function generateTasks(options) {
  logInfo('🚀 開始生成任務');
  
  try {
    const payload = {};
    
    if (options.date) {
      payload.date = options.date;
    }
    
    if (options.serviceType) {
      payload.service_type = options.serviceType;
    }
    
    logInfo(`API URL: ${API_URL}/api/automated-tasks/generate`);
    logInfo(`請求內容: ${JSON.stringify(payload)}`);
    
    const response = await fetch(`${API_URL}/api/automated-tasks/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '生成失敗');
    }
    
    const { results } = data;
    
    console.log('');
    console.log(`${colors.bright}=== 任務生成結果 ===${colors.reset}`);
    console.log('');
    
    logSuccess(`總服務數: ${results.total}`);
    logSuccess(`成功生成: ${results.generated.length} 個任務`);
    
    if (results.skipped.length > 0) {
      logWarning(`跳過: ${results.skipped.length} 個`);
    }
    
    if (results.errors.length > 0) {
      logError(`錯誤: ${results.errors.length} 個`);
    }
    
    console.log('');
    
    // 顯示成功生成的任務
    if (results.generated.length > 0) {
      console.log(`${colors.green}✅ 成功生成的任務:${colors.reset}`);
      console.log('─'.repeat(80));
      results.generated.forEach((task, index) => {
        console.log(`${index + 1}. ${task.client_name} - ${task.service_type}`);
        console.log(`   任務ID: ${task.task_id}`);
        console.log(`   負責人: ${task.assigned_to || '未指派'}`);
        console.log(`   執行期間: ${task.execution_period}`);
        console.log(`   截止日期: ${new Date(task.due_date).toISOString().split('T')[0]}`);
        console.log('');
      });
    }
    
    // 顯示跳過的任務
    if (results.skipped.length > 0) {
      console.log(`${colors.yellow}⏭️  跳過的任務:${colors.reset}`);
      console.log('─'.repeat(80));
      results.skipped.forEach((item, index) => {
        console.log(`${index + 1}. ${item.client_name} - ${item.service_type}`);
        console.log(`   原因: ${item.reason}`);
        console.log('');
      });
    }
    
    // 顯示錯誤
    if (results.errors.length > 0) {
      console.log(`${colors.red}❌ 錯誤:${colors.reset}`);
      console.log('─'.repeat(80));
      results.errors.forEach((item, index) => {
        console.log(`${index + 1}. 服務ID: ${item.service_id}`);
        console.log(`   錯誤: ${item.error}`);
        console.log('');
      });
    }
    
    // 寫入日誌
    await writeLog({
      action: 'generate',
      options,
      results: {
        total: results.total,
        generated: results.generated.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      },
      details: results
    });
    
    return {
      success: true,
      generated: results.generated.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      hasErrors: results.errors.length > 0
    };
    
  } catch (error) {
    logError(`生成失敗: ${error.message}`);
    
    await writeLog({
      action: 'generate',
      options,
      error: error.message,
      stack: error.stack
    });
    
    throw error;
  }
}

// 主函數
async function main() {
  console.log('');
  console.log(`${colors.cyan}${colors.bright}╔═══════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║   自動任務生成系統                    ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}║   霍爾果斯會計師事務所                ║${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}╚═══════════════════════════════════════╝${colors.reset}`);
  console.log('');
  
  const options = parseArgs();
  
  logInfo(`執行時間: ${new Date().toISOString()}`);
  logInfo(`模式: ${options.preview ? '預覽' : '生成'}`);
  if (options.date) {
    logInfo(`目標日期: ${options.date}`);
  }
  if (options.serviceType) {
    logInfo(`服務類型: ${options.serviceType}`);
  }
  console.log('');
  
  try {
    if (options.preview) {
      // 預覽模式
      const result = await previewTasks(options);
      
      if (result.count === 0) {
        process.exit(0);
      }
      
      console.log('');
      logInfo('這是預覽模式，未實際生成任務');
      logInfo('若要實際生成，請移除 --preview 參數');
      
    } else {
      // 生成模式
      const result = await generateTasks(options);
      
      console.log('');
      console.log('═'.repeat(80));
      
      if (result.errors === 0) {
        logSuccess(`任務生成完成！共生成 ${result.generated} 個任務`);
        process.exit(0);
      } else {
        logWarning(`任務生成完成，但有 ${result.errors} 個錯誤`);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.log('');
    console.log('═'.repeat(80));
    logError(`執行失敗: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// 執行主函數
main().catch(error => {
  logError(`未捕獲的錯誤: ${error.message}`);
  console.error(error);
  process.exit(1);
});
