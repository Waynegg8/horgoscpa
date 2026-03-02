/* HorgosCPA — UI Effects: Navbar scroll, Mobile toggle, Back-to-top */

export function initUIEffects() {
    const nav = document.querySelector('.site-nav');

    // --- Scroll Effect for Navbar ---
    function handleScroll() {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            if (!document.body.classList.contains('menu-open')) {
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
            const isOpen = document.body.classList.contains('menu-open');

            navLinks.classList.toggle('nav-open', isOpen);
            mobileToggle.setAttribute('aria-expanded', String(isOpen));

            if (isOpen) {
                nav.classList.add('scrolled');
                mobileToggle.textContent = '關閉';
            } else {
                mobileToggle.textContent = '選單';
                handleScroll();
            }
        });
    }

    // --- Back to Top Button ---
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'btn-back-to-top';
    backToTopBtn.setAttribute('aria-label', '返回頂部');
    backToTopBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    document.body.appendChild(backToTopBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.classList.add('show');
        } else {
            backToTopBtn.classList.remove('show');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
