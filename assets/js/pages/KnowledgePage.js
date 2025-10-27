/**
 * Knowledge Page
 * 知识库页面
 */

import { AuthUtils } from '../core/utils/auth.js';
import { apiClient } from '../core/api/client.js';
import { Loading } from '../components/feedback/Loading.js';
import { Toast } from '../components/feedback/Toast.js';

export class KnowledgePage {
  constructor() {
    this.currentUser = null;
    this.currentCategory = null;
  }

  async init() {
    if (!AuthUtils.requireAuth()) return;

    this.currentUser = AuthUtils.getCurrentUser();
    await this.loadCategories();
    await this.loadSOPs();
  }

  async loadCategories() {
    try {
      const response = await apiClient.get('/api/sop-categories');
      const categories = response.data || response || [];
      
      const container = document.getElementById('sopCategories');
      if (container && categories.length > 0) {
        container.innerHTML = categories.map(cat => `
          <div class="category-item" data-id="${cat.id}">
            ${cat.name}
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('[Knowledge] Load categories failed:', error);
    }
  }

  async loadSOPs() {
    const container = document.getElementById('sopsContainer');
    if (!container) return;

    Loading.show(container);

    try {
      const response = await apiClient.get('/api/sops');
      const sops = response.data || response || [];
      
      if (sops.length === 0) {
        Loading.showEmpty(container, '暂无 SOP 文档');
        return;
      }

      container.innerHTML = `
        <div class="sops-list">
          ${sops.map(sop => `
            <div class="sop-card" data-id="${sop.id}">
              <h3>${sop.title}</h3>
              <p>${sop.category_name || '未分类'}</p>
              <button class="btn-sm" onclick="window.knowledgePage.viewSop(${sop.id})">查看</button>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }

  async viewSop(id) {
    try {
      const response = await apiClient.get(`/api/sops/${id}`);
      const sop = response.data || response;
      
      Toast.info('SOP 详情: ' + sop.title);
    } catch (error) {
      Toast.error('加载失败: ' + error.message);
    }
  }

  async search(keyword) {
    if (!keyword) {
      await this.loadSOPs();
      return;
    }

    const container = document.getElementById('sopsContainer');
    Loading.show(container, '搜索中...');

    try {
      const response = await apiClient.get('/api/sops/search', {
        params: { q: keyword }
      });
      const results = response.data || response || [];

      if (results.length === 0) {
        Loading.showEmpty(container, '未找到相关内容');
        return;
      }

      container.innerHTML = `
        <div class="search-results">
          ${results.map(sop => `
            <div class="result-item">
              <h4>${sop.title}</h4>
              <p>${sop.content?.substring(0, 100)}...</p>
            </div>
          `).join('')}
        </div>
      `;
    } catch (error) {
      Loading.showError(container, error.message);
    }
  }
}

window.KnowledgePage = KnowledgePage;
export default KnowledgePage;

