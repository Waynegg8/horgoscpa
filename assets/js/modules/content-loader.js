/* HorgosCPA — Content Loader: Articles, Resources, Related + filterContent */

// Sanitize a string for safe text node insertion (defence-in-depth)
function safe(str) {
    return str != null ? String(str) : '';
}

// Module-level filter function — accessible to all loaders
function filterContent() {
    const query = (document.getElementById('resourceSearch')?.value || '').toLowerCase();
    const active = document.querySelector('.filter-btn.active')?.dataset.category || 'all';

    document.querySelectorAll('.book-card').forEach(card => {
        const titleEl = card.querySelector('.book-title') || card.querySelector('h3');
        const title = (titleEl?.textContent || '').toLowerCase();
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

// Build an article card using safe DOM methods (no innerHTML for user data)
function buildArticleCard(article) {
    const card = document.createElement('a');
    card.className = 'book-card';
    card.dataset.category = safe(article.category || 'insight').toLowerCase();
    card.href = safe(article.link);

    const bgImage = article.image || '/assets/images/hero.jpg';
    const imageUrl = bgImage.startsWith('/') ? bgImage : '/' + bgImage;

    const cover = document.createElement('div');
    cover.className = 'book-cover';
    cover.style.backgroundImage = `url('${encodeURI(imageUrl)}')`;

    const info = document.createElement('div');
    info.className = 'book-info';

    const catSpan = document.createElement('span');
    catSpan.className = 'book-category';
    catSpan.textContent = safe(article.category || 'Insight');

    const titleEl = document.createElement('h3');
    titleEl.className = 'book-title';
    titleEl.textContent = safe(article.title);

    const descEl = document.createElement('p');
    descEl.className = 'book-desc';
    descEl.textContent = safe(article.description);

    const ctaEl = document.createElement('span');
    ctaEl.className = 'card-cta';
    ctaEl.textContent = '閱讀更多';

    info.appendChild(catSpan);
    info.appendChild(titleEl);
    info.appendChild(descEl);
    info.appendChild(ctaEl);
    card.appendChild(cover);
    card.appendChild(info);

    return card;
}

// Build a resource card using safe DOM methods
function buildResourceCard(res) {
    const card = document.createElement('a');
    card.className = 'book-card';
    card.dataset.category = safe(res.category || 'tool').toLowerCase();
    card.href = safe(res.link);
    if (res.type !== 'tool') {
        card.setAttribute('download', '');
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
    }

    const isTool = res.type === 'tool';
    // Category initial is safe: single char, no user input vector
    const initial = res.category ? res.category[0].toUpperCase() : 'H';

    const cover = document.createElement('div');
    cover.className = 'book-cover';
    cover.style.cssText = 'background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;';

    const iconLetter = document.createElement('div');
    iconLetter.style.cssText = 'font-family: var(--font-serif); font-size: 3rem; color: rgba(180, 142, 85, 0.2); font-weight: 700;';
    iconLetter.textContent = initial;

    const iconBar = document.createElement('div');
    iconBar.style.cssText = 'position: absolute; bottom: 10px; right: 10px; width: 40px; height: 1px; background: rgba(180, 142, 85, 0.5);';

    cover.appendChild(iconLetter);
    cover.appendChild(iconBar);

    const info = document.createElement('div');
    info.className = 'book-info';

    const catSpan = document.createElement('span');
    catSpan.className = 'book-category';
    catSpan.textContent = safe(res.category || 'Resource');

    const titleEl = document.createElement('h3');
    titleEl.className = 'book-title';
    titleEl.style.marginTop = '10px';
    titleEl.textContent = safe(res.title);

    const descEl = document.createElement('p');
    descEl.className = 'book-desc';
    descEl.textContent = safe(res.description);

    const ctaEl = document.createElement('span');
    ctaEl.className = 'card-cta';
    ctaEl.style.color = isTool ? 'var(--color-brand)' : 'inherit';
    ctaEl.textContent = isTool ? '前往使用 →' : '點擊下載 ↓';

    info.appendChild(catSpan);
    info.appendChild(titleEl);
    info.appendChild(descEl);
    info.appendChild(ctaEl);
    card.appendChild(cover);
    card.appendChild(info);

    return card;
}

// Build a related article list item using safe DOM methods
function buildRelatedItem(article) {
    const item = document.createElement('li');
    item.style.marginBottom = '15px';

    const link = document.createElement('a');
    link.href = safe(article.link);
    link.style.cssText = 'text-decoration: none; display: block;';

    const catSpan = document.createElement('span');
    catSpan.className = 'related-article-cat';
    catSpan.textContent = safe(article.category || 'Insight');

    const titleEl = document.createElement('h5');
    titleEl.className = 'related-article-title';
    titleEl.textContent = safe(article.title);

    link.appendChild(catSpan);
    link.appendChild(titleEl);
    item.appendChild(link);

    return item;
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
                    articlesGrid.appendChild(buildArticleCard(article));
                });
            })
            .catch(err => {
                console.error('Failed to load articles:', err);
                const msg = document.createElement('p');
                msg.className = 'text-error';
                msg.style.textAlign = 'center';
                msg.textContent = `無法載入文章：${err.message}`;
                articlesGrid.appendChild(msg);
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
                    resourceGrid.appendChild(buildResourceCard(res));
                });
            })
            .catch(err => {
                console.error('Failed to load resources:', err);
                const msg = document.createElement('p');
                msg.className = 'text-error';
                msg.style.textAlign = 'center';
                msg.textContent = `無法載入資源：${err.message}`;
                resourceGrid.appendChild(msg);
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

                const available = articles.filter(a => currentSlug !== normalize(a.link));
                const display = available.slice(0, 3);

                if (display.length === 0) {
                    // Fallback: static links via safe DOM
                    const fallbacks = [
                        { href: '/services.html', cat: '服務項目', title: '了解我們的專業服務' },
                        { href: '/booking.html',  cat: '預約諮詢', title: '立即預約免費諮詢' }
                    ];
                    fallbacks.forEach(fb => {
                        const item = document.createElement('li');
                        item.style.marginBottom = '15px';
                        const link = document.createElement('a');
                        link.href = fb.href;
                        link.style.cssText = 'text-decoration: none; display: block;';
                        const cat = document.createElement('span');
                        cat.className = 'related-article-cat';
                        cat.textContent = fb.cat;
                        const h5 = document.createElement('h5');
                        h5.className = 'related-article-title';
                        h5.textContent = fb.title;
                        link.appendChild(cat);
                        link.appendChild(h5);
                        item.appendChild(link);
                        relatedList.appendChild(item);
                    });
                    return;
                }

                display.forEach(article => {
                    relatedList.appendChild(buildRelatedItem(article));
                });
            })
            .catch(err => console.error('Failed to load related articles:', err));
    }
}
