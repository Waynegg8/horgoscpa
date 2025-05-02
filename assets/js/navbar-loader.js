// 動態加載導航欄
document.addEventListener('DOMContentLoaded', function() {
    // 獲取導航欄容器
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;
    
    // 加載導航欄HTML
    fetch('/includes/navbar.html')
        .then(response => response.text())
        .then(html => {
            // 插入導航欄HTML
            navbarContainer.innerHTML = html;
            
            // 初始化下拉選單功能
            initNavbar();
        })
        .catch(error => {
            console.error('無法加載導航欄:', error);
            navbarContainer.innerHTML = '<p>無法加載導航欄</p>';
        });
});

// 初始化導航欄功能
function initNavbar() {
    // 僅在移動設備上添加下拉選單的點擊事件
    if (window.innerWidth <= 850) {
        const dropdownLinks = document.querySelectorAll('.has-dropdown > a');
        
        dropdownLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const dropdownMenu = this.nextElementSibling;
                dropdownMenu.classList.toggle('show');
            });
        });
    }
    
    // 窗口大小改變時重新加載頁面以應用正確的樣式
    window.addEventListener('resize', function() {
        const width = window.innerWidth;
        if ((width <= 850 && window.prevWidth > 850) || 
            (width > 850 && window.prevWidth <= 850)) {
            window.prevWidth = width;
            // 延遲重新加載以避免連續調整大小時頻繁重新加載
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(function() {
                location.reload();
            }, 250);
        }
        window.prevWidth = width;
    });
    
    window.prevWidth = window.innerWidth;
}
