// 全局儲存文章數據
window.articlesData = window.articlesData || {};

// 搜尋功能
document.getElementById('search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const posts = document.querySelectorAll('.blog-post');
    posts.forEach(post => {
        const title = post.querySelector('h3').textContent.toLowerCase();
        const content = post.querySelector('p').textContent.toLowerCase();
        post.style.display = (title.includes(searchTerm) || content.includes(searchTerm)) ? 'block' : 'none';
    });
});

// 分類篩選
document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', function() {
        const category = this.dataset.category;
        const posts = document.querySelectorAll('.blog-post');
        posts.forEach(post => {
            post.style.display = (category === 'all' || post.dataset.category === category) ? 'block' : 'none';
        });
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});

// 全站使用根路徑
function getBasePath() {
    const path = window.location.pathname;
    if (path.includes('/blog/')) {
        return '../';
    }
    return '';
}

// 動態加載文章列表的通用函數
function loadArticles(gridId, maxArticles = Infinity) {
    console.log('Loading articles for:', gridId);
    console.log('Articles data before load:', window.articlesData);

    const basePath = getBasePath();
    console.log('basePath in loadArticles:', basePath);
    const articlesDir = `${basePath}blog/articles/`;
    const articleFiles = ['article1.json', 'article2.json', 'article3.json']; // 確保包含所有文章的 JSON 檔案
    console.log('articlesDir:', articlesDir);
    console.log('articleFiles:', articleFiles);

    Promise.all(articleFiles.map(file =>
        fetch(articlesDir + file)
            .then(response => {
                console.log('Fetch response for', file, ':', response);
                if (!response.ok) {
                    console.error('Fetch error for', file, ':', response.status);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Fetched data for', file, ':', data);
                window.articlesData[data.id] = data; // 假設 JSON 檔案中有 'id' 欄位
                console.log('window.articlesData after', file, ':', window.articlesData);
            })
            .catch(error => {
                console.error('Could not load article:', error);
                return null; // 處理載入失敗的情況
            })
    )).then(() => {
        // 在所有文章資料載入完成後再進行渲染
        console.log('All promises resolved, articlesData:', window.articlesData);
    });  // 修復閉合
}  // 閉合 loadArticles 函數