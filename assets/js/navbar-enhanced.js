/**
 * 增強型導航欄 JavaScript
 * 處理下拉選單的展開/收合
 */

document.addEventListener('DOMContentLoaded', function() {
    initDropdowns();
    
    // 點擊外部關閉下拉選單
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.internal-nav-dropdown')) {
            closeAllDropdowns();
        }
    });
});

function initDropdowns() {
    const dropdowns = document.querySelectorAll('.internal-nav-dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.internal-nav-dropdown-toggle');
        
        if (toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // 關閉其他下拉選單
                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('open');
                    }
                });
                
                // 切換當前下拉選單
                dropdown.classList.toggle('open');
            });
        }
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.internal-nav-dropdown').forEach(dropdown => {
        dropdown.classList.remove('open');
    });
}

// 檢測當前頁面並設置 active 狀態
function setActiveNavItem() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.internal-nav-dropdown-item, .internal-nav-link');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && currentPath.includes(href)) {
            item.classList.add('active');
            
            // 如果是下拉選單中的項目，也標記父選單為 active
            const parentDropdown = item.closest('.internal-nav-dropdown');
            if (parentDropdown) {
                const toggle = parentDropdown.querySelector('.internal-nav-dropdown-toggle');
                if (toggle) {
                    toggle.classList.add('active');
                }
            }
        }
    });
}

// 頁面載入後設置 active 狀態
document.addEventListener('DOMContentLoaded', setActiveNavItem);

