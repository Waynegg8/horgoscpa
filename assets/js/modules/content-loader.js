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

    const info = buildCardInfo({
        category: article.category || 'Insight',
        title:    article.title,
        desc:     article.description,
        cta:      '閱讀更多'
    });

    card.appendChild(cover);
    card.appendChild(info);
    return card;
}

// Build a resource card using safe DOM methods
function buildResourceCard(res) {
    const isTool = res.type === 'tool';
    const card = document.createElement('a');
    card.className = 'book-card';
    card.dataset.category = safe(res.category || 'tool').toLowerCase();
    card.href = safe(res.link);
    if (!isTool) {
        card.setAttribute('download', '');
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
    }

    // Cover: dark gradient with category initial (no user data risk)
    const cover = document.createElement('div');
    cover.className = 'book-cover resource-card-cover';
    const iconLetter = document.createElement('div');
    iconLetter.className = 'resource-card-initial';
    iconLetter.textContent = res.category ? res.category[0].toUpperCase() : 'H';
    const iconBar = document.createElement('div');
    iconBar.className = 'resource-card-bar';
    cover.appendChild(iconLetter);
    cover.appendChild(iconBar);

    const info = buildCardInfo({
        category: res.category || 'Resource',
        title:    res.title,
        desc:     res.description,
        cta:      isTool ? '前往使用 →' : '點擊下載 ↓',
        ctaClass: isTool ? 'card-cta card-cta--brand' : 'card-cta'
    });
    // title margin
    info.querySelector('.book-title').style.marginTop = '10px';

    card.appendChild(cover);
    card.appendChild(info);
    return card;
}

// Shared card info block builder
function buildCardInfo({ category, title, desc, cta, ctaClass = 'card-cta' }) {
    const info = document.createElement('div');
    info.className = 'book-info';

    const catSpan = document.createElement('span');
    catSpan.className = 'book-category';
    catSpan.textContent = safe(category);

    const titleEl = document.createElement('h3');
    titleEl.className = 'book-title';
    titleEl.textContent = safe(title);

    const descEl = document.createElement('p');
    descEl.className = 'book-desc';
    descEl.textContent = safe(desc);

    const ctaEl = document.createElement('span');
    ctaEl.className = ctaClass;
    ctaEl.textContent = safe(cta);

    info.appendChild(catSpan);
    info.appendChild(titleEl);
    info.appendChild(descEl);
    info.appendChild(ctaEl);
    return info;
}

// Generic grid loader — used by both articles and resources
function loadContentGrid({ gridId, jsonUrl, buildCard, defaultEmpty, categoryExtractor, labelMap }) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    fetch(jsonUrl)
        .then(r => {
            if (!r.ok) throw new Error('network');
            return r.json();
        })
        .then(items => {
            grid.innerHTML = '';

            const filterGroup = document.querySelector('.filter-group');
            if (filterGroup && items.length > 0) {
                const categories = ['All', ...new Set(items.map(categoryExtractor))];
                attachFilterButtons(filterGroup, categories, labelMap || null);
            }

            if (items.length === 0) {
                const msg = document.createElement('p');
                msg.className = 'text-muted';
                msg.style.textAlign = 'center';
                msg.textContent = defaultEmpty;
                grid.appendChild(msg);
                return;
            }

            items.forEach(item => grid.appendChild(buildCard(item)));
        })
        .catch(err => {
            console.error(`Failed to load ${jsonUrl}:`, err);
            const msg = document.createElement('p');
            msg.className = 'text-muted';
            msg.style.textAlign = 'center';
            msg.textContent = '內容暫時無法載入，請稍後再試。';
            grid.appendChild(msg);
        });
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

    // --- Articles grid ---
    loadContentGrid({
        gridId:            'articles-grid',
        jsonUrl:           '/assets/data/articles.json',
        buildCard:         buildArticleCard,
        defaultEmpty:      '尚無文章',
        categoryExtractor: item => item.category || 'Insight'
    });

    // --- Resources grid ---
    loadContentGrid({
        gridId:            'resource-grid',
        jsonUrl:           '/assets/data/resources.json',
        buildCard:         buildResourceCard,
        defaultEmpty:      '尚無資源',
        categoryExtractor: item => item.category || 'Tool',
        labelMap: { 'all': '全部', 'tool': '工具', 'download': '下載', 'tax': '稅務', 'law': '法規' }
    });

    // --- Related Articles ---
    const relatedList = document.getElementById('related-articles-list');
    if (relatedList) {
        fetch('/assets/data/articles.json')
            .then(r => {
                if (!r.ok) throw new Error('network');
                return r.json();
            })
            .then(articles => {
                relatedList.innerHTML = '';
                const normalize = p => p.split('/').pop().replace('.html', '').toLowerCase();
                const currentSlug = normalize(window.location.pathname);
                const display = articles.filter(a => currentSlug !== normalize(a.link)).slice(0, 3);

                if (display.length === 0) {
                    [{ href: '/services.html', cat: '服務項目', title: '了解我們的專業服務' },
                     { href: '/booking.html',  cat: '預約諮詢', title: '立即預約免費諮詢' }]
                    .forEach(fb => {
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

                display.forEach(article => relatedList.appendChild(buildRelatedItem(article)));
            })
            .catch(err => console.error('Failed to load related articles:', err));
    }
}
