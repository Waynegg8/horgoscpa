document.addEventListener('DOMContentLoaded', () => {
    const loadArticles = async (gridId, maxArticles = Infinity) => {
        try {
            const response = await fetch('/blog/articles.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const grid = document.getElementById(gridId);
            if (!grid) return;

            grid.innerHTML = data.articles
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, maxArticles)
                .map(article => `
                    <article class="blog-post" data-category="${article.category}">
                        <h3><a href="${article.url}">${article.title}</a></h3>
                        <p>${article.previewText}</p>
                        <a href="${article.url}" class="read-more">閱讀全文 →</a>
                    </article>
                `).join('');
        } catch (error) {
            console.error('文章加載失敗:', error);
            document.getElementById(gridId).innerHTML = '<p>⚠️ 文章暫時無法加載，請稍後再試</p>';
        }
    };

    // 頁面類型判斷
    if (document.getElementById('blog-grid')) {
        loadArticles('blog-grid'); // 部落格主頁
    }
    if (document.getElementById('blog-preview-grid')) {
        loadArticles('blog-preview-grid', 3); // 首頁預覽
    }

    // 搜尋功能
    document.getElementById('search')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.blog-post').forEach(post => {
            const visible = post.querySelector('h3').textContent.toLowerCase().includes(term) ||
                post.querySelector('p').textContent.toLowerCase().includes(term);
            post.style.display = visible ? 'block' : 'none';
        });
    });

    // 分類篩選
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const category = this.dataset.category;
            document.querySelectorAll('.blog-post').forEach(post => {
                post.style.display = (category === 'all' || post.dataset.category === category) ? 'block' : 'none';
            });
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
});