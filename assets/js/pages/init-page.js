/**
 * Page Initialization
 * 页面初始化通用逻辑
 */

import { AuthUtils } from '../core/utils/auth.js';

/**
 * 初始化页面
 */
export async function initPage(pageInitFn) {
  // 检查认证
  const isAuth = await AuthUtils.checkAuth();
  
  if (!isAuth) {
    window.location.href = '/login.html';
    return;
  }

  // 执行页面特定的初始化
  try {
    if (pageInitFn) {
      await pageInitFn();
    }
  } catch (error) {
    console.error('[Page Init] Failed:', error);
  }
}

// 导出到全局
window.initPage = initPage;

export default initPage;

