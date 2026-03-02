/* HorgosCPA — Content Loader: Articles, Resources, Related + filterContent */

// Module-level filter function — accessible to all loaders
function filterContent() {
    const query = (document.getElementById('resourceSearch')?.value || '').toLowerCase();
    const active = document.querySelector('.filter-btn.active')?.dataset.category || 'all';

    document.querySelectorAll('.book-card').forEach(card => {
        const titleEl = card.querySelector('.book-title') || card.querySelector('h3');
        const title = (titleEl?.innerText || '').toLowerCase();
        const category = card.dataset.category || 'all';

        const matchesSearch = title.includes(query);
        const matchesCategory = active === 'all' || category === active;

        card.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
    });
}

function attachFilterButtons(filterGroup, categories, labelMap) {
    filterGroup.innerHTML = '';

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        if (cat === 'All') btn.classList.add('active');
        btn.dataset.category = cat.toLowerCase();
        btn.textContent = labelMap ? (labelMap[cat.toLowerCase()] || cat) : cat;

        filterGroup.appendChild(btn);

        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterContent();
        });
    });
}

export function initContentLoader() {
    // Bind search input
    const searchInput = document.getElementById('resourceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterContent);
    }

    // --- Dynamic Articles List ---
    const articlesGrid = document.getElementById('articles-grid');
    if (articlesGrid) {
        fetch('/assets/data/articles.json')
            .then(response => response.json())
            .then(articles => {
                articlesGrid.innerHTML = '';

                const filterGroup = document.querySelector('.filter-group');
                if (filterGroup && articles.length > 0) {
                    const categories = ['All', ...new Set(articles.map(item => item.category || 'Insight'))];
                    attachFilterButtons(filterGroup, categories, null);
                }

                if (articles.length === 0) {
                    articlesGrid.innerHTML = '<p class="text-muted" style="text-align:center;">尚無文章</p>';
                    return;
                }

                articles.forEach(article => {
                    const card = document.createElement('a');
                    card.className = 'book-card';
                    card.dataset.category = (article.category || 'insight').toLowerCase();
                    card.href = article.link;
                    const bgImage = article.image || 'assets/images/hero.jpg';
                    const imageUrl = bgImage.startsWith('/') ? bgImage : '/' + bgImage;
                    card.innerHTML = `
                        <div class="book-cover" style="background-image: url('${imageUrl}');"></div>
                        <div class="book-info">
                            <span class="book-category">${article.category || 'Insight'}</span>
                            <h3 class="book-title">${article.title}</h3>
                            <p class="book-desc">${article.description || ''}</p>
                            <span class="card-cta">閱讀更多</span>
                        </div>
                    `;
                    articlesGrid.appendChild(card);
                });
            })
            .catch(err => {
                console.error('Failed to load articles:', err);
                articlesGrid.innerHTML = `<p class="text-error" style="text-align:center;">無法載入文章：${err.message}</p>`;
            });
    }

    // --- Dynamic Resources List ---
    const resourceGrid = document.getElementById('resource-grid');
    if (resourceGrid) {
        const labelMap = {
            'all': '全部',
            'tool': '工具',
            'download': '下載',
            'tax': '稅務',
            'law': '法規'
        };

        fetch('/assets/data/resources.json')
            .then(response => response.json())
            .then(resources => {
                resourceGrid.innerHTML = '';

                const filterGroup = document.querySelector('.filter-group');
                if (filterGroup && resources.length > 0) {
                    const categories = ['All', ...new Set(resources.map(item => item.category || 'Tool'))];
                    attachFilterButtons(filterGroup, categories, labelMap);
                }

                if (resources.length === 0) {
                    resourceGrid.innerHTML = '<p class="text-muted" style="text-align:center;">尚無資源</p>';
                    return;
                }

                resources.forEach(res => {
                    const card = document.createElement('a');
                    card.className = 'book-card';
                    card.dataset.category = (res.category || 'tool').toLowerCase();
                    card.href = res.link;
                    if (res.type !== 'tool') {
                        card.setAttribute('download', '');
                        card.target = '_blank';
                    }

                    const isTool = res.type === 'tool';
                    const btnText = isTool ? '前往使用 &rarr;' : '點擊下載 &darr;';
                    const bgStyle = `background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;`;
                    const iconOverlay = `
                        <div style="font-family: var(--font-serif); font-size: 3rem; color: rgba(180, 142, 85, 0.2); font-weight: 700;">
                            ${res.category ? res.category[0].toUpperCase() : 'H'}
                        </div>
                        <div style="position: absolute; bottom: 10px; right: 10px; width: 40px; height: 1px; background: rgba(180, 142, 85, 0.5);"></div>
                    `;

                    card.innerHTML = `
                        <div class="book-cover" style="${bgStyle}">
                            ${iconOverlay}
                        </div>
                        <div class="book-info">
                            <span class="book-category">${res.category || 'Resource'}</span>
                            <h3 class="book-title" style="margin-top:10px;">${res.title}</h3>
                            <p class="book-desc">${res.description || ''}</p>
                            <span class="card-cta" style="color: ${isTool ? 'var(--color-brand)' : 'inherit'}">${btnText}</span>
                        </div>
                    `;
                    resourceGrid.appendChild(card);
                });
            })
            .catch(err => {
                console.error('Failed to load resources:', err);
                resourceGrid.innerHTML = `<p class="text-error" style="text-align:center;">無法載入資源：${err.message}</p>`;
            });
    }

    // --- Related Articles ---
    const relatedList = document.getElementById('related-articles-list');
    if (relatedList) {
        fetch('/assets/data/articles.json')
            .then(response => response.json())
            .then(articles => {
                relatedList.innerHTML = '';

                const normalize = (path) => path.split('/').pop().replace('.html', '').toLowerCase();
                const currentSlug = normalize(window.location.pathname);

                const availableArticles = articles.filter(article => {
                    return currentSlug !== normalize(article.link);
                });

                const randomArticles = availableArticles.slice(0, 3);

                if (randomArticles.length === 0) {
                    relatedList.innerHTML = `
                        <li style="margin-bottom: 15px;">
                            <a href="/services.html" style="text-decoration: none; display: block;">
                                <span style="font-size: 0.8rem; color: #b48e55; text-transform: uppercase; display: block; margin-bottom: 2px;">服務項目</span>
                                <h5 style="font-size: 0.95rem; color: #1a1a1a; margin: 0; line-height: 1.4;">了解我們的專業服務</h5>
                            </a>
                        </li>
                        <li style="margin-bottom: 15px;">
                            <a href="/booking.html" style="text-decoration: none; display: block;">
                                <span style="font-size: 0.8rem; color: #b48e55; text-transform: uppercase; display: block; margin-bottom: 2px;">預約諮詢</span>
                                <h5 style="font-size: 0.95rem; color: #1a1a1a; margin: 0; line-height: 1.4;">立即預約免費諮詢</h5>
                            </a>
                        </li>
                    `;
                    return;
                }

                randomArticles.forEach(article => {
                    const item = document.createElement('li');
                    item.style.marginBottom = '15px';
                    item.innerHTML = `
                        <a href="${article.link}" style="text-decoration: none; display: block;">
                            <span style="font-size: 0.8rem; color: #b48e55; text-transform: uppercase; display: block; margin-bottom: 2px;">${article.category || 'Insight'}</span>
                            <h5 style="font-size: 0.95rem; color: #1a1a1a; margin: 0; line-height: 1.4; transition: color 0.3s;" onmouseover="this.style.color='#b48e55'" onmouseout="this.style.color='#1a1a1a'">${article.title}</h5>
                        </a>
                    `;
                    relatedList.appendChild(item);
                });
            })
            .catch(err => console.error('Failed to load related articles:', err));
    }
}
