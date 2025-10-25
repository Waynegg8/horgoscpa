/*
 * Blog 列表頁 - 讀取 posts.json 並渲染文章列表
 * 支援搜尋、分類篩選、分頁
 */

  let allPosts = [];
let filteredPosts = [];
  let currentPage = 1;
const postsPerPage = 12;

document.addEventListener('DOMContentLoaded', async () => {
  await loadPosts();
  initFilters();
  renderPosts();
  renderCategories();
});

async function loadPosts() {
  try {
    const response = await fetch('/assets/data/posts.json');
    allPosts = await response.json();
    filteredPosts = [...allPosts];
    } catch (error) {
    console.error('載入文章失敗:', error);
    allPosts = [];
    filteredPosts = [];
  }
}

function initFilters() {
  const searchInput = document.getElementById('blog-search');
  const searchBtn = document.getElementById('search-btn');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      applyFilters();
    });
  }
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      applyFilters();
    });
  }
}

function applyFilters() {
  const searchTerm = document.getElementById('blog-search')?.value.toLowerCase() || '';
  const selectedCategory = document.querySelector('.category-filter .active')?.dataset.category || 'all';
  
  filteredPosts = allPosts.filter(post => {
    const matchSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm) ||
      post.summary.toLowerCase().includes(searchTerm) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
    
    const matchCategory = selectedCategory === 'all' || post.category === selectedCategory;
    
    return matchSearch && matchCategory;
  });
  
      currentPage = 1;
  renderPosts();
}

function renderCategories() {
  const categoryFilter = document.querySelector('.category-filter');
  if (!categoryFilter) return;
  
  // 從文章中提取所有分類
  const categories = ['all', ...new Set(allPosts.map(p => p.category).filter(Boolean))];
  
  categoryFilter.innerHTML = categories.map(cat => `
    <button class="category-btn ${cat === 'all' ? 'active' : ''}" data-category="${cat}">
      ${cat === 'all' ? '全部' : cat}
        </button>
  `).join('');
  
  // 綁定點擊事件
  categoryFilter.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      categoryFilter.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });
}

function renderPosts() {
  const container = document.getElementById('blog-posts-container');
  if (!container) return;
  
  if (filteredPosts.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 60px 20px; color: #666;">
        <p style="font-size: 18px;">目前尚無文章，請稍後再回來看看。</p>
        </div>
      `;
      return;
    }
    
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const pagePosts = filteredPosts.slice(startIndex, endIndex);
  
  container.innerHTML = pagePosts.map(post => `
    <article class="blog-card">
      <a href="${post.html_url}" class="blog-card-link">閱讀文章</a>
        <div class="blog-image">
        <img src="${post.cover_image}" alt="${post.title}">
        </div>
        <div class="blog-content">
        <span class="date">${formatDate(post.published_at)}</span>
        <span class="category">${post.category}</span>
        <h3><a href="${post.html_url}">${post.title}</a></h3>
        <p>${post.summary}</p>
        <a href="${post.html_url}" class="read-more">閱讀更多</a>
        </div>
      </article>
  `).join('');
  
  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('pagination-container');
  if (!container) return;
  
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
    
    if (totalPages <= 1) {
    container.innerHTML = '';
      return;
    }
    
  let html = '';
  
  // 上一頁
  if (currentPage > 1) {
    html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">上一頁</button>`;
  }
  
  // 頁碼
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      html += `<span class="page-ellipsis">...</span>`;
    }
  }
  
  // 下一頁
  if (currentPage < totalPages) {
    html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">下一頁</button>`;
  }
  
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderPosts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}



