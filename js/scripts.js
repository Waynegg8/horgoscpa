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
        return '../'; // blog.html 在 blog/ 目錄下，根路徑需要回退一級
    }
    return ''; // index.html 在根目錄
}

// 動態加載文章的通用函數
function loadArticles(gridId, maxArticles = Infinity) {
    console.log('Loading articles for:', gridId);
    console.log('Articles data:', window.articlesData);

    const basePath = getBasePath();
    const articlesDir = `${basePath}blog/articles/`;
    const articleFiles = ['article1.json', 'article2.json']; // 假設你有這些檔案，後續可以動態生成

    Promise.all(articleFiles.map(file =>
        fetch(articlesDir + file)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                window.articlesData[data.id] = data; // 假設 JSON 檔案中有 'id' 欄位
            })
            .catch(error => {
                console.error('Could not load article:', error);
                return null; // 處理載入失敗的情況
            })
    )).then(() => {
        // 在所有文章資料載入完成後再進行渲染
        const articles = Object.values(window.articlesData).filter(article => article !== null);
        console.log('Filtered and loaded articles:', articles);

        // 按日期倒序排序
        articles.sort((a, b) => new Date(b.date) - new Date(a.date));
        // 限制文章數量
        const articlesToShow = articles.slice(0, maxArticles);

        const grid = document.getElementById(gridId);
        if (!grid) {
            console.error('Grid element not found:', gridId);
            return;
        }

        grid.innerHTML = ''; // 清空現有內容
        console.log('Grid element found, rendering articles...');

        articlesToShow.forEach(article => {
            const articleElement = document.createElement('article');
            articleElement.className = `blog-post`;
            articleElement.dataset.category = article.category.toLowerCase();

            // 動態調整圖片路徑和文章連結
            const imgPath = `${basePath}img/blog/preview${article.id}.jpg`;
            const articlePath = `${basePath}blog/article${article.id}.html`;

            articleElement.innerHTML = `
                <img src="${imgPath}" alt="文章預覽圖" onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200';">
                <h3><a href="${articlePath}">${article.title}</a></h3>
                <p>${article.previewText}</p>
                <span>發布日期：${article.date} | 分類：${article.category}</span>
            `;
            grid.appendChild(articleElement);
            console.log(`Added article ${article.id} to grid`);
        });

        if (articlesToShow.length === 0) {
            grid.innerHTML = '<p>目前沒有文章。</p>';
        } else {
            console.log(`Total articles rendered: ${articlesToShow.length}`);
        }
    });
}

// 主頁最新文章（最多兩篇）
if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
    loadArticles('blog-preview-grid', 2);
}

// 部落格頁面（所有文章）
if (window.location.pathname.includes('blog.html')) {
    loadArticles('blog-grid');
}