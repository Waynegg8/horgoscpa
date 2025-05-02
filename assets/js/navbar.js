// 導航欄下拉選單和響應式功能
document.addEventListener('DOMContentLoaded', function() {
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
});
