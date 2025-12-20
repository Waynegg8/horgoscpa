/* HorgosCPA Main Interaction Script */

document.addEventListener('DOMContentLoaded', function () {

    // --- Dynamic Navigation & Footer Injection ---
    // This ensures that adding a new page only requires updating this list.

    // Determine base path for subdirectories (e.g., /articles/)
    // This allows the script to work from root or subfolders without absolute path dependency.
    const isSubfolder = window.location.pathname.includes('/articles/');
    const pathPrefix = isSubfolder ? '../' : '';

    const navItems = [
        { label: '專業服務', link: pathPrefix + 'services.html' },
        { label: '專業團隊', link: pathPrefix + 'team.html' },
        { label: '文章專區', link: pathPrefix + 'articles.html' },
        { label: '資源專區', link: pathPrefix + 'resources.html' },
        { label: '常見問題', link: pathPrefix + 'faq.html' },
        { label: '聯絡我們', link: pathPrefix + 'contact.html' }
    ];

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    // 1. Inject Navbar Links
    const navLinksContainer = document.querySelector('.nav-links');
    if (navLinksContainer) {
        navLinksContainer.innerHTML = ''; // Clear existing static links
        navItems.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.link;
            a.textContent = item.label;
            if (item.link === currentPath) {
                a.classList.add('active'); // Optional styling hook
            }
            li.appendChild(a);
            navLinksContainer.appendChild(li);
        });
    }

    // 2. Inject Footer Sitemap Links
    // We look for specific headings or class structures in the footer.
    // Based on our HTML, the Sitemap is usually the second .footer-links div, 
    // or we can target it more robustly if we added IDs. 
    // For now, let's target the .footer-links that contains "網站地圖".
    const footerLinkGroups = document.querySelectorAll('.footer-links');
    footerLinkGroups.forEach(group => {
        const h4 = group.querySelector('h4');
        if (h4 && h4.textContent.includes('網站地圖')) {
            // Keep the header, remove the old links
            group.innerHTML = '<h4>網站地圖</h4>';
            navItems.forEach(item => {
                const a = document.createElement('a');
                a.href = item.link;
                a.textContent = item.label;
                group.appendChild(a);
            });
        }
    });

    // --- Inject English Logo Text ---
    const logoContainer = document.querySelector('.logo-container');
    if (logoContainer && !logoContainer.querySelector('.logo-text-en')) {
        const enText = document.createElement('span');
        enText.className = 'logo-text-en';
        enText.textContent = 'HORGOS CPA FIRM';
        logoContainer.appendChild(enText);
    }

    // --- Inject English Logo into Footer ---
    const footerBrand = document.querySelector('.footer-brand');
    if (footerBrand) {
        const footerImg = footerBrand.querySelector('img');
        // Check if already processed to avoid duplication
        if (footerImg && !footerImg.closest('.logo-container')) {
            // Create wrapper matching atoms.css structure
            const wrapper = document.createElement('div');
            wrapper.className = 'logo-container';
            wrapper.style.marginBottom = '20px'; // Preserve original spacing from inline style
            wrapper.style.display = 'flex'; // Ensure flex applies immediately

            // Insert wrapper before image
            footerImg.parentNode.insertBefore(wrapper, footerImg);

            // Move image into wrapper
            wrapper.appendChild(footerImg);

            // Apply standard class to image
            footerImg.classList.add('logo-img');
            footerImg.style.marginBottom = '0'; // Override inline style

            // Add English Text
            const enText = document.createElement('span');
            enText.className = 'logo-text-en';
            enText.textContent = 'HORGOS CPA FIRM';
            wrapper.appendChild(enText);
        }
    }

    // --- Scroll Effect for Navbar ---
    const nav = document.querySelector('.site-nav');

    function handleScroll() {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            // Keep solid white if menu is open
            if (!document.body.classList.contains('menu-open')) {
                // Only transparent on top of home page, generally
                // But simplified: check if we are on a page that supports transparent nav
                // For now, let's allow it to go transparent
                nav.classList.remove('scrolled');
            }
        }
    }

    window.addEventListener('scroll', handleScroll);

    // --- Mobile Menu Toggle ---
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', function () {
            document.body.classList.toggle('menu-open');

            if (document.body.classList.contains('menu-open')) {
                // Open Menu logic
                navLinks.style.display = 'flex';
                navLinks.style.flexDirection = 'column';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.width = '100%';
                navLinks.style.backgroundColor = '#FFF';
                navLinks.style.padding = '20px';
                navLinks.style.borderBottom = '1px solid #EEE';

                nav.classList.add('scrolled'); // Force solid bg
                mobileToggle.textContent = 'Close';
            } else {
                // Close Menu logic
                navLinks.style.display = ''; // Reset to css default
                mobileToggle.textContent = 'Menu';
                handleScroll(); // Reset scroll state
            }
        });
    }

    // --- Booking Form Handling (Native Formspree) ---
    // No JS interception needed for Formspree to work natively.
    // We keep the logic clean to avoid preventing the default POST action.

    // --- FAQ Accordion ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const title = item.querySelector('h3');
        const content = item.querySelector('p');

        if (title && content) {
            // Initial State: element is collapsed via CSS or we set it here
            // Let's assume we toggle a class 'active' on click
            title.style.cursor = 'pointer';
            title.addEventListener('click', () => {
                const isActive = item.classList.contains('active');

                // Close all others (optional - typical accordion behavior)
                faqItems.forEach(other => {
                    other.classList.remove('active');
                    const otherContent = other.querySelector('p');
                    if (otherContent) otherContent.style.display = 'none';
                });

                if (!isActive) {
                    item.classList.add('active');
                    content.style.display = 'block';
                } else {
                    item.classList.remove('active');
                    content.style.display = 'none';
                }
            });

            // Init: Hide content initially
            content.style.display = 'none';
        }
    });

    // --- Resources / Articles Search & Filter ---
    const searchInput = document.getElementById('resourceSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const resourceCards = document.querySelectorAll('.book-card');

    if (searchInput || filterButtons.length > 0) {

        function filterResources() {
            const query = searchInput ? searchInput.value.toLowerCase() : '';
            const activeCategory = document.querySelector('.filter-btn.active') ? document.querySelector('.filter-btn.active').dataset.category : 'all';

            resourceCards.forEach(card => {
                const title = card.querySelector('.book-title').innerText.toLowerCase();
                const category = card.dataset.category || 'all'; // Assume 'all' if not set

                const matchesSearch = title.includes(query);
                const matchesCategory = activeCategory === 'all' || category === activeCategory;

                if (matchesSearch && matchesCategory) {
                    card.style.display = 'block'; // Or 'block', depending on grid
                    // Actually, for Grid, we might just want to show/hide. 
                    // But 'display:none' removes it from layout flow which is good for grid.
                } else {
                    card.style.display = 'none';
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', filterResources);
        }

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterResources();
            });
        });
    }

    // --- Back to Top Button ---
    const backToTopBtn = document.createElement('div');
    backToTopBtn.className = 'btn-back-to-top';
    backToTopBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(backToTopBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // --- Dynamic Related Articles ---
    // --- Dynamic Related Articles (JSON Source) ---
    const relatedList = document.getElementById('related-articles-list');
    if (relatedList) {
        fetch('assets/data/articles.json')
            .then(response => response.json())
            .then(articlesDB => {
                // 1. Filter out current page
                const currentFilename = window.location.pathname.split('/').pop();
                const availableArticles = articlesDB.filter(article => article.link !== currentFilename);

                // 2. Randomize
                for (let i = availableArticles.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [availableArticles[i], availableArticles[j]] = [availableArticles[j], availableArticles[i]];
                }

                // 3. Select top 3
                const selectedArticles = availableArticles.slice(0, 3);

                // 4. Render
                if (selectedArticles.length > 0) {
                    selectedArticles.forEach(article => {
                        const li = document.createElement('li');
                        li.style.marginBottom = '15px';
                        li.style.paddingBottom = '15px';
                        li.style.borderBottom = '1px solid #eee';

                        const a = document.createElement('a');
                        a.href = article.link;
                        a.style.textDecoration = 'none';
                        a.style.color = '#1a1a1a';
                        a.style.fontFamily = 'var(--font-serif)';
                        a.style.fontSize = '1.1rem';
                        a.style.transition = 'color 0.3s';
                        a.innerText = article.title;

                        a.onmouseover = () => a.style.color = '#b48e55';
                        a.onmouseout = () => a.style.color = '#1a1a1a';

                        li.appendChild(a);
                        relatedList.appendChild(li);
                    });
                } else {
                    relatedList.innerHTML = '<li style="color:#999; font-size:0.9rem;">尚無更多推薦文章</li>';
                }
            })
            .catch(error => {
                console.error('Error loading articles:', error);
                // Fallback or Empty
            });
    }




    // --- Dynamic Articles List (Main Page) ---
    const articlesGrid = document.getElementById('articles-grid');
    if (articlesGrid) {
        fetch(pathPrefix + 'assets/data/articles.json')
            .then(response => response.json())
            .then(articles => {
                articlesGrid.innerHTML = ''; // Clear loading state

                if (articles.length === 0) {
                    articlesGrid.innerHTML = '<p class="text-muted" style="text-align:center;">尚無文章</p>';
                    return;
                }

                articles.forEach(article => {
                    const card = document.createElement('div');
                    card.className = 'book-card';
                    card.dataset.category = article.category ? article.category.toLowerCase() : 'all';

                    // Determine Image (Fallback logic)
                    const bgImage = article.image || 'assets/images/hero.jpg';
                    const linkUrl = pathPrefix + article.link;
                    const imageUrl = pathPrefix + bgImage;

                    card.innerHTML = `
                        <div class="book-cover" style="background-image: url('${imageUrl}'); height: 200px; background-size: cover; background-position: center;"></div>
                        <div class="book-info">
                            <span class="book-category">${article.category || 'Article'}</span>
                            <h3 class="book-title">${article.title}</h3>
                            <p class="book-desc">${article.description || ''}</p>
                            <a href="${linkUrl}" class="btn-text">閱讀更多 &rarr;</a>
                        </div>
                    `;
                    articlesGrid.appendChild(card);
                });
            })
            .catch(err => {
                console.error('Failed to load articles:', err);
                articlesGrid.innerHTML = '<p class="text-error" style="text-align:center;">無法載入文章，請稍後再試。</p>';
            });
    }

    // --- Dynamic Resources List (Main Page) ---
    const resourceGrid = document.getElementById('resource-grid');
    if (resourceGrid) {
        fetch(pathPrefix + 'assets/data/resources.json')
            .then(response => response.json())
            .then(resources => {
                resourceGrid.innerHTML = '';

                if (resources.length === 0) {
                    resourceGrid.innerHTML = '<p class="text-muted" style="text-align:center;">尚無資源</p>';
                    return;
                }

                resources.forEach(res => {
                    const card = document.createElement('div');
                    card.className = 'book-card';
                    card.dataset.category = res.category ? res.category.toLowerCase() : 'all';

                    const isTool = res.type === 'tool';
                    const btnText = isTool ? '前往使用 &rarr;' : '點擊下載 &darr;';
                    const linkUrl = pathPrefix + res.link;

                    card.innerHTML = `
                         <div class="book-info" style="padding: 30px;">
                            <span class="book-category">${res.category || 'Resource'}</span>
                            <h3 class="book-title" style="margin-top:10px;">${res.title}</h3>
                            <p class="book-desc">${res.description || ''}</p>
                            <a href="${linkUrl}" class="btn-text" style="color: ${isTool ? '#b48e55' : '#666'};" ${isTool ? '' : 'download'}>${btnText}</a>
                        </div>
                    `;
                    resourceGrid.appendChild(card);
                });
            })
            .catch(err => {
                console.error('Failed to load resources:', err);
                resourceGrid.innerHTML = '<p class="text-error" style="text-align:center;">無法載入資源。</p>';
            });
    }

});
