/**
 * 初始化知識庫 - 將SOP和文檔通過API導入系統
 * 使用方法: node scripts/init-knowledge-base.js
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://www.horgoscpa.com/internal/api/v1';
const EMAIL = 'admin@horgoscpa.com'; // 請替換為您的管理員帳號
const PASSWORD = 'your-password'; // 請替換為您的密碼

let sessionCookie = '';

// 1. 登入獲取session
async function login() {
  console.log('🔐 正在登入...');
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  
  if (!response.ok) {
    throw new Error('登入失敗');
  }
  
  // 獲取cookie
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    sessionCookie = setCookie.split(';')[0];
  }
  
  console.log('✅ 登入成功');
}

// 2. 創建SOP
async function createSOP(title, category, content, tags = []) {
  console.log(`📝 創建SOP: ${title}`);
  
  const response = await fetch(`${API_BASE}/sop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      title,
      category,
      content,
      tags
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`創建SOP失敗: ${error}`);
  }
  
  const result = await response.json();
  console.log(`✅ SOP創建成功: ${result.data.sop_id}`);
  return result.data;
}

// 3. 創建FAQ
async function createFAQ(question, category, answer, tags = []) {
  console.log(`❓ 創建FAQ: ${question}`);
  
  const response = await fetch(`${API_BASE}/faq`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      question,
      category,
      answer,
      tags
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`創建FAQ失敗: ${error}`);
  }
  
  const result = await response.json();
  console.log(`✅ FAQ創建成功: ${result.data.faq_id}`);
  return result.data;
}

// 4. 讀取並創建SOP
async function initSOPs() {
  console.log('\n📚 開始初始化SOP...\n');
  
  const sopDir = path.join(__dirname, '..', 'templates', 'sop');
  const sopFiles = fs.readdirSync(sopDir).filter(f => f.endsWith('.md'));
  
  for (const file of sopFiles) {
    const filePath = path.join(sopDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 從文件名提取標題
    let title = file.replace('.md', '');
    let category = 'internal';
    let tags = [];
    
    if (file.includes('記帳')) {
      category = 'accounting';
      tags = ['記帳', '作業流程', '月結'];
    } else if (file.includes('營業稅')) {
      category = 'tax';
      tags = ['稅務', '申報', '營業稅'];
    } else if (file.includes('客戶')) {
      category = 'internal';
      tags = ['客戶管理', '建檔', '流程'];
    }
    
    try {
      await createSOP(title, category, content, tags);
    } catch (error) {
      console.error(`❌ ${file} 創建失敗:`, error.message);
    }
  }
}

// 5. 創建FAQ範例
async function initFAQs() {
  console.log('\n❓ 開始初始化FAQ...\n');
  
  const faqs = [
    {
      question: '如何申請特別休假？',
      category: 'hr',
      answer: '<p>特別休假申請流程：</p><ol><li>填寫請假單</li><li>主管簽核</li><li>人事部門核准</li><li>系統登記</li></ol><p>注意事項：請假應提前3日申請，緊急情況請電話告知。</p>',
      tags: ['請假', '特休', '人事']
    },
    {
      question: '營業稅申報期限是什麼時候？',
      category: 'tax',
      answer: '<p><strong>雙月制營業人：</strong>奇數月1-15日申報</p><p><strong>每月申報：</strong>次月15日前申報</p><p>建議提前準備資料，避免逾期受罰。</p>',
      tags: ['營業稅', '申報', '期限']
    },
    {
      question: '如何查詢客戶的財務報表？',
      category: 'accounting',
      answer: '<p>查詢步驟：</p><ol><li>登入系統</li><li>進入「客戶管理」</li><li>選擇客戶</li><li>點選「財務報表」標籤</li><li>選擇年月查看</li></ol>',
      tags: ['客戶', '報表', '查詢']
    }
  ];
  
  for (const faq of faqs) {
    try {
      await createFAQ(faq.question, faq.category, faq.answer, faq.tags);
    } catch (error) {
      console.error(`❌ FAQ創建失敗:`, error.message);
    }
  }
}

// 主函數
async function main() {
  try {
    console.log('🚀 開始初始化知識庫...\n');
    
    await login();
    await initSOPs();
    await initFAQs();
    
    console.log('\n✅ 知識庫初始化完成！');
    console.log('\n📝 請前往 https://www.horgoscpa.com/internal/knowledge 查看結果');
    
  } catch (error) {
    console.error('\n❌ 初始化失敗:', error.message);
    process.exit(1);
  }
}

main();

