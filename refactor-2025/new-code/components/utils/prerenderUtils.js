/**
 * 预渲染工具函数
 * 使用统一的Prerender系统进行页面缓存
 */

/**
 * 加载预渲染的HTML
 * @param {string} pageName - 页面名称
 * @returns {string|null} - 预渲染的HTML或null
 */
export function loadPrerenderedHTML(pageName) {
  if (typeof window !== 'undefined' && window.Prerender) {
    return window.Prerender.load(pageName);
  }
  return null;
}

/**
 * 保存预渲染的HTML
 * @param {string} pageName - 页面名称
 * @param {string} html - 要保存的HTML
 */
export function savePrerenderedHTML(pageName, html) {
  if (typeof window !== 'undefined' && window.Prerender) {
    window.Prerender.save(pageName, html);
  }
}

/**
 * 清除预渲染的HTML
 * @param {string} pageName - 页面名称
 */
export function clearPrerenderedHTML(pageName) {
  if (typeof window !== 'undefined' && window.Prerender) {
    window.Prerender.clear(pageName);
  }
}

export default {
  loadPrerenderedHTML,
  savePrerenderedHTML,
  clearPrerenderedHTML
};

