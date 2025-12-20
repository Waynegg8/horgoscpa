/* HorgosCPA Main Interaction Script */

document.addEventListener('DOMContentLoaded', function () {

    // --- Dynamic Navigation & Footer Injection REMOVED ---
    // We now rely on static HTML with absolute paths (/assets, /services.html) 
    // to ensure robustness across all directory levels.

    // logic removed to prevent overriding valid absolute paths with relative ones.

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

                // Fix visibility: Make nav links dark on white background
                navLinks.querySelectorAll('a').forEach(link => {
                    link.style.color = '#1a1a1a';
                });

                nav.classList.add('scrolled'); // Force solid bg
                mobileToggle.textContent = '關閉';
                mobileToggle.style.color = '#FFFFFF'; // Keep toggle white on dark nav
            } else {
                // Close Menu logic
                navLinks.style.display = ''; // Reset to css default

                // Reset link colors
                navLinks.querySelectorAll('a').forEach(link => {
                    link.style.color = '';
                });

                mobileToggle.textContent = '選單';
                mobileToggle.style.color = ''; // Reset toggle color
                handleScroll(); // Reset scroll state
            }
        });
    }

    // --- Booking Form Handling (Native Formspree) ---
    // No JS interception needed for Formspree to work natively.
    // We keep the logic clean to avoid preventing the default POST action.

    // --- FAQ Dynamic Injection & Accordion ---
    const faqContainer = document.getElementById('faq-container-list');
    if (faqContainer) {
        fetch('/assets/data/faq.json')
            .then(response => response.json())
            .then(data => {
                faqContainer.innerHTML = ''; // Clear "Loading..."

                if (data.length === 0) {
                    faqContainer.innerHTML = '<p class="text-muted" style="text-align:center;">目前沒有常見問題資料。</p>';
                    return;
                }

                data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'faq-item';
                    // Inline styles for simplicity to match design
                    div.style.borderBottom = '1px solid #eee';
                    div.style.marginBottom = '15px';
                    div.style.paddingBottom = '15px';

                    div.innerHTML = `
                        <h3 style="font-size:1.1rem; color:#1a1a1a; margin-bottom:10px; cursor:pointer; font-weight:500;">${item.question}</h3>
                        <p style="font-size:0.95rem; color:#666; display:none; line-height:1.6; padding-left:0;">${item.answer}</p>
                    `;
                    faqContainer.appendChild(div);

                    // Add Click Event for toggling
                    const title = div.querySelector('h3');
                    const content = div.querySelector('p');

                    title.addEventListener('click', () => {
                        // Close others
                        document.querySelectorAll('.faq-item p').forEach(p => {
                            if (p !== content) p.style.display = 'none';
                        });
                        // Toggle current
                        if (content.style.display === 'none') {
                            content.style.display = 'block';
                            title.style.color = '#b48e55'; // Gold highlight active
                        } else {
                            content.style.display = 'none';
                            title.style.color = '#1a1a1a';
                        }
                    });
                });
            })
            .catch(err => {
                console.error('Failed to load FAQ:', err);
                faqContainer.innerHTML = '<p class="text-error" style="text-align:center;">無法載入常見問題。</p>';
            });
    }

    // --- Resources / Articles Search & Filter ---
    const searchInput = document.getElementById('resourceSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const resourceCards = document.querySelectorAll('.book-card');

    if (searchInput || filterButtons.length > 0) {

        function filterResources() {
            const query = searchInput ? searchInput.value.toLowerCase() : '';
            const activeCategory = document.querySelector('.filter-btn.active') ? document.querySelector('.filter-btn.active').dataset.category : 'all';

            // Re-query cards because they are loaded asynchronously
            const currentCards = document.querySelectorAll('.book-card');

            currentCards.forEach(card => {
                // Determine title: support both Articles (h3) and Resources (h3 inside, or similar)
                // Adjust selector based on actual card structure
                const titleEl = card.querySelector('.book-title') || card.querySelector('h3');
                const title = titleEl ? titleEl.innerText.toLowerCase() : '';

                // Determine category: data-category attribute or parsing text
                // Check if card has data-category
                let category = card.dataset.category || 'all';
                // If not in dataset, maybe logic needed? 
                // Currently generated cards DO NOT have data-category set in JS loop! 
                // We need to fix the JS loop to add data-category too.

                // But first let's fix the Search (Title match)
                const matchesSearch = title.includes(query);

                // Category match needs valid data. 
                // Let's assume for now 'all' or actual match.
                // We need to ensure cards have data-category.
                const matchesCategory = activeCategory === 'all' || category === activeCategory;

                if (matchesSearch && matchesCategory) {
                    card.style.display = 'block';
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





    // --- Dynamic Articles List (Main Page & Articles Page) ---
    const articlesGrid = document.getElementById('articles-grid');
    if (articlesGrid) {
        fetch('/assets/data/articles.json')
            .then(response => response.json())
            .then(articles => {
                articlesGrid.innerHTML = '';

                // --- Dynamic Category Generation (Articles) ---
                const filterGroup = document.querySelector('.filter-group');
                if (filterGroup && articles.length > 0) {
                    // 1. Extract unique categories (Capitalized)
                    const categories = ['All', ...new Set(articles.map(item => item.category || 'Insight'))];

                    // 2. Clear hardcoded buttons
                    filterGroup.innerHTML = '';

                    // 3. Generate Buttons
                    categories.forEach(cat => {
                        const btn = document.createElement('button');
                        btn.className = 'filter-btn';
                        if (cat === 'All') btn.classList.add('active');
                        btn.dataset.category = cat.toLowerCase(); // dataset uses lowercase for matching
                        btn.textContent = cat; // Display Name

                        // Inline Styles (copied from previous HTML to maintain look)
                        btn.style.cssText = 'padding: 6px 16px; background: transparent; border: 1px solid transparent; color: var(--text-muted); cursor: pointer; font-family: var(--font-sans); font-size: 0.9rem; transition: all 0.3s ease;';

                        filterGroup.appendChild(btn);

                        // 4. Attach Click Event (Re-using logic from below or defining here)
                        btn.addEventListener('click', () => {
                            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');

                            // Trigger Filter Logic
                            if (typeof filterResources === 'function') {
                                filterResources();
                            } else {
                                // Fallback if function scope issue, but filterResources is defined below. 
                                // Actually filterResources is defined inside a block below. 
                                // We might need to move filterResources to global or dispatch event.
                                // Solution: Dispatch event or duplicate logic? 
                                // Better: Dispatch a custom event or 'input' on searchInput to trigger the listener.
                                const searchInput = document.getElementById('resourceSearch');
                                if (searchInput) searchInput.dispatchEvent(new Event('input'));
                            }
                        });
                    });
                }


                if (articles.length === 0) {
                    articlesGrid.innerHTML = '<p class="text-muted" style="text-align:center;">尚無文章</p>';
                    return;
                }
                articles.forEach(article => {
                    const card = document.createElement('a');
                    card.className = 'book-card';
                    card.dataset.category = (article.category || 'insight').toLowerCase();
                    // Link is already absolute in JSON or needs to be treated as such
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

    // --- Related Topics Logic (Article Pages) ---
    const relatedList = document.getElementById('related-articles-list');
    if (relatedList) {
        fetch('/assets/data/articles.json')
            .then(response => response.json())
            .then(articles => {
                relatedList.innerHTML = '';

                // 1. Identify current page normalized (remove extension and leading/trailing slashes)
                const normalize = (path) => path.split('/').pop().replace('.html', '').toLowerCase();
                const currentSlug = normalize(window.location.pathname);

                // 2. Filter out current article
                const availableArticles = articles.filter(article => {
                    const articleSlug = normalize(article.link);
                    return currentSlug !== articleSlug;
                });

                // 3. Take first 3
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


    // --- Dynamic Resources List (Main Page & Resources Page) ---
    const resourceGrid = document.getElementById('resource-grid');
    if (resourceGrid) {
        fetch('/assets/data/resources.json')
            .then(response => response.json())
            .then(resources => {
                resourceGrid.innerHTML = '';

                // --- Dynamic Category Generation (Resources) ---
                const filterGroup = document.querySelector('.filter-group');
                // Only run this if we are on resources page (resource-grid exists) AND filterGroup exists
                // Note: If both grids existed on one page, we'd have a conflict. But assuming separate pages.
                if (filterGroup && resources.length > 0) {
                    // 1. Extract unique categories
                    const categories = ['All', ...new Set(resources.map(item => item.category || 'Tool'))];

                    // 2. Clear hardcoded buttons
                    filterGroup.innerHTML = '';

                    // 3. Generate Buttons
                    categories.forEach(cat => {
                        const btn = document.createElement('button');
                        btn.className = 'filter-btn';
                        if (cat === 'All') btn.classList.add('active');
                        btn.dataset.category = cat.toLowerCase();

                        // Map specific English categories to Chinese for display
                        const labelMap = {
                            'all': '全部',
                            'tool': '工具',
                            'download': '下載',
                            'tax': '稅務',
                            'law': '法規'
                        };
                        // Use map or fallback to original text (Capitalized)
                        btn.textContent = labelMap[cat.toLowerCase()] || cat;

                        // Inline Styles
                        btn.style.cssText = 'padding: 6px 16px; background: transparent; border: 1px solid transparent; color: var(--text-muted); cursor: pointer; font-family: var(--font-sans); font-size: 0.9rem; transition: all 0.3s ease;';

                        filterGroup.appendChild(btn);

                        // 4. Attach Click Event
                        btn.addEventListener('click', () => {
                            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');

                            // Trigger Filter Logic
                            const searchInput = document.getElementById('resourceSearch');
                            if (searchInput) searchInput.dispatchEvent(new Event('input'));
                        });
                    });
                }

                if (resources.length === 0) {
                    resourceGrid.innerHTML = '<p class="text-muted" style="text-align:center;">尚無資源</p>';
                    return;
                }

                resources.forEach(res => {
                    const card = document.createElement('a');
                    card.className = 'book-card';
                    card.dataset.category = (res.category || 'tool').toLowerCase(); // Add category for filtering
                    card.href = res.link;
                    // Handle Download Attribute
                    if (res.type !== 'tool') {
                        card.setAttribute('download', '');
                        card.target = '_blank';
                    }

                    const isTool = res.type === 'tool';
                    const btnText = isTool ? '前往使用 &rarr;' : '點擊下載 &darr;';

                    // Premium Gradient Fallback instead of Logo
                    const bgStyle = `background: linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;`;

                    // Simple Icon Overlay (CSS Shapes or SVG)
                    // Using a simple abstract letter
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

});
