// api/index.js - Node.js API 處理文章刪除與上傳
const express = require('express');
const multer = require('multer');
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 環境配置
const GITHUB_TOKEN = process.env.GH_PAT; // 從環境變量讀取GitHub令牌
const GITHUB_REPO = 'waynegg8/horgoscpa';
const GITHUB_REPO_OWNER = 'waynegg8';
const GITHUB_REPO_NAME = 'horgoscpa';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here'; // 管理員令牌，應當設為環境變量

// 創建 Express 應用
const app = express();
app.use(express.json());

// 配置 Multer 用於處理文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'word-docs/');
  },
  filename: function (req, file, cb) {
    // 使用原始文件名
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 只接受 .docx 文件
    if (!file.originalname.match(/\.(docx)$/)) {
      return cb(new Error('只允許上傳 Word 文檔 (.docx)'));
    }
    // 檢查文件名格式
    if (!file.originalname.match(/^\d{4}-\d{2}-\d{2}-.+\.docx$/)) {
      return cb(new Error('文件名格式不正確，應為: YYYY-MM-DD-文章標題.docx'));
    }
    cb(null, true);
  }
});

// 創建 Octokit 實例
const octokit = new Octokit({
  auth: GITHUB_TOKEN
});

// 驗證管理員令牌
function verifyAdminToken(token) {
  return token === ADMIN_TOKEN;
}

/**
 * 刪除文章 API
 * POST /api/delete-article?file=文件名.html
 */
app.post('/api/delete-article', async (req, res) => {
  try {
    // 驗證令牌
    if (!req.body.token || !verifyAdminToken(req.body.token)) {
      return res.status(401).json({ success: false, message: '管理員令牌無效' });
    }
    
    // 獲取文件名
    const filename = req.query.file;
    if (!filename) {
      return res.status(400).json({ success: false, message: '未提供文件名' });
    }
    
    // 獲取文件 SHA
    const { data: fileData } = await octokit.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: `blog/${filename}`,
    });
    
    // 刪除文件
    await octokit.repos.deleteFile({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: `blog/${filename}`,
      message: `刪除文章：${filename}`,
      sha: fileData.sha,
    });
    
    // 觸發 GitHub Actions 重新生成 JSON
    await octokit.actions.createWorkflowDispatch({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      workflow_id: 'blog-automation.yml',
      ref: 'main',
      inputs: {
        process_word: 'false',
        update_json: 'true'
      }
    });
    
    res.json({ success: true, message: '文章已成功刪除' });
  } catch (error) {
    console.error('刪除文章時出錯:', error);
    res.status(500).json({ success: false, message: error.message || '刪除文章時出錯' });
  }
});

/**
 * 上傳 Word 文檔 API
 * POST /api/upload-article
 */
app.post('/api/upload-article', upload.single('file'), async (req, res) => {
  try {
    // 驗證令牌
    if (!req.body.token || !verifyAdminToken(req.body.token)) {
      return res.status(401).json({ success: false, message: '管理員令牌無效' });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: '未收到文件' });
    }
    
    // 獲取文件資訊
    const filename = req.file.originalname;
    const filePath = req.file.path;
    
    // 提交到 GitHub
    await commitFile(filePath, filename);
    
    // 觸發 GitHub Actions 處理 Word 文檔
    await octokit.actions.createWorkflowDispatch({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      workflow_id: 'blog-automation.yml',
      ref: 'main',
      inputs: {
        process_word: 'true',
        update_json: 'true'
      }
    });
    
    res.json({ success: true, message: '文章已成功上傳' });
  } catch (error) {
    console.error('上傳文章時出錯:', error);
    res.status(500).json({ success: false, message: error.message || '上傳文章時出錯' });
  }
});

/**
 * 提交文件到 GitHub
 */
async function commitFile(filePath, filename) {
  // 使用 git 命令提交文件
  await execPromise('git config --global user.name "API Uploader"');
  await execPromise('git config --global user.email "api-uploader@example.com"');
  await execPromise('git pull origin main');
  await execPromise(`git add "${filePath}"`);
  await execPromise(`git commit -m "上傳文章: ${filename}"`);
  await execPromise('git push origin main');
}

// 啟動服務器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API 服務器運行在 http://localhost:${PORT}`);
});

module.exports = app;