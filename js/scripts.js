// 全局儲存文章數據
window.articlesData = {};

// 搜尋功能
document.getElementById('search')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const posts = document.querySelectorAll('.blog-post');
    posts.forEach(post => {
        const title = post.querySelector('h3').textContent.toLowerCase();
        const content = post.querySelector('p').textContent.toLowerCase();
        post.style.display = (title.includes(searchTerm) || content.includes(searchTerm) ? 'block' : 'none';
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

// 動態加載文章列表
function loadArticles(gridId, maxArticles = 3) {
    const blogGrid = document.getElementById(gridId);
    if (!blogGrid) return;

    fetch('/blog/articles/articles.json')
        .then(response => response.json())
        .then(data => {
            blogGrid.innerHTML = data.articles
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, maxArticles)
                .map(article => `
                    <article class="blog-post" data-category="${article.category}">
                        <h3>${article.title}</h3>
                        <p>${article.previewText}</p>
                        <a href="/blog/article${article.id}.html">閱讀更多</a>
                    </article>
                `).join('');
        });
}

// 頁面初始化
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('blog-grid')) loadArticles('blog-grid');
    if (document.getElementById('blog-preview-grid')) loadArticles('blog-preview-grid', 3);
});