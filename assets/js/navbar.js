// 導航欄下拉選單和響應式功能
document.addEventListener('DOMContentLoaded', function() {
  // 僅在移動設備上添加下拉選單的點擊事件
  const handleResponsiveMenu = () => {
    const windowWidth = window.innerWidth;
    const dropdownLinks = document.querySelectorAll('.has-dropdown > a');
    
    if (windowWidth <= 850) {
      // 移動設備模式
      dropdownLinks.forEach(link => {
        // 先移除可能已存在的事件監聽器
        link.removeEventListener('click', dropdownToggleHandler);
        // 添加新的事件監聽器
        link.addEventListener('click', dropdownToggleHandler);
      });
    } else {
      // 桌面模式 - 移除點擊事件
      dropdownLinks.forEach(link => {
        link.removeEventListener('click', dropdownToggleHandler);
      });
      
      // 確保所有可能的 .show 類被移除
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  };
  
  // 下拉選單切換處理函數
  function dropdownToggleHandler(e) {
    e.preventDefault();
    const dropdownMenu = this.nextElementSibling;
    
    // 關閉其他已打開的下拉選單
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      if (menu !== dropdownMenu) {
        menu.classList.remove('show');
      }
    });
    
    // 切換當前下拉選單
    dropdownMenu.classList.toggle('show');
  }
  
  // 初始化導航欄
  handleResponsiveMenu();
  
  // 窗口大小改變時，重新初始化導航欄而非整頁重載
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      handleResponsiveMenu();
    }, 250);
  });
  
  // 點擊導航欄外部時關閉打開的下拉選單（僅在移動模式）
  document.addEventListener('click', function(e) {
    if (window.innerWidth <= 850) {
      const isDropdownLink = e.target.closest('.has-dropdown > a');
      const isDropdownMenu = e.target.closest('.dropdown-menu');
      
      if (!isDropdownLink && !isDropdownMenu) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
          menu.classList.remove('show');
        });
      }
    }
  });
});