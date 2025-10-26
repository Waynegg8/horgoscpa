#!/usr/bin/env node
/**
 * 自動任務生成執行腳本
 * 用於 GitHub Actions 或手動執行
 */

import { generateAutomatedTasks } from '../src/automated-tasks.js';

// 解析命令行參數
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    targetDate: new Date()
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      options.targetDate = new Date(args[i + 1]);
      i++;
    }
  }
  
  return options;
}

async function main() {
  try {
    const options = parseArgs();
    
    console.log('');
    console.log('='.repeat(80));
    console.log('自動任務生成系統');
    console.log('='.repeat(80));
    console.log(`執行時間: ${new Date().toISOString()}`);
    console.log(`目標日期: ${options.targetDate.toISOString().split('T')[0]}`);
    console.log('');
    
    // 執行任務生成
    console.log('🚀 開始生成任務...');
    const results = await generateAutomatedTasks(options);
    
    console.log('');
    console.log('='.repeat(80));
    console.log('生成結果');
    console.log('='.repeat(80));
    console.log(`總服務數: ${results.total}`);
    console.log(`✅ 已生成: ${results.generated.length} 個任務`);
    console.log(`⏭️  已跳過: ${results.skipped.length} 個`);
    console.log(`❌ 錯誤: ${results.errors.length} 個`);
    console.log('');
    
    // 顯示生成的任務詳情
    if (results.generated.length > 0) {
      console.log('已生成任務:');
      results.generated.forEach((task, idx) => {
        console.log(`  ${idx + 1}. ${task.client_name} - ${task.service_type}`);
        console.log(`     期間: ${task.execution_period}`);
        console.log(`     負責: ${task.assigned_to || '未指定'}`);
        console.log(`     截止: ${task.due_date.toISOString().split('T')[0]}`);
        console.log('');
      });
    }
    
    // 顯示跳過的原因
    if (results.skipped.length > 0) {
      console.log('已跳過任務:');
      results.skipped.forEach((skip, idx) => {
        console.log(`  ${idx + 1}. ${skip.client_name} - ${skip.service_type}`);
        console.log(`     原因: ${skip.reason}`);
        console.log('');
      });
    }
    
    // 顯示錯誤
    if (results.errors.length > 0) {
      console.log('錯誤詳情:');
      results.errors.forEach((error, idx) => {
        console.log(`  ${idx + 1}. 服務 ID ${error.service_id}`);
        console.log(`     錯誤: ${error.error}`);
        console.log('');
      });
    }
    
    console.log('='.repeat(80));
    console.log('');
    
    // 根據結果設置退出碼
    if (results.errors.length > 0) {
      console.log('⚠️  任務生成完成但有錯誤');
      process.exit(1);
    } else {
      console.log('✅ 任務生成成功');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ 執行失敗');
    console.error('='.repeat(80));
    console.error(error.message);
    console.error(error.stack);
    console.error('');
    process.exit(1);
  }
}

// 執行
main();

