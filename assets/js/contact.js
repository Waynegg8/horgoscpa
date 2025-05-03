document.addEventListener('DOMContentLoaded', function() {
  // 判斷當前是否營業中
  function checkBusinessHours() {
    const now = new Date();
    const day = now.getDay(); // 0是星期日，1-5是星期一到五，6是星期六
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes; // 將時間轉換為分鐘
    
    // 營業時間：週一至週五 8:30-17:30
    const openTime = 8 * 60 + 30; // 8:30 轉換為分鐘
    const closeTime = 17 * 60 + 30; // 17:30 轉換為分鐘
    
    const isWeekday = day >= 1 && day <= 5; // 是否為工作日
    const isDuringBusinessHours = currentTime >= openTime && currentTime < closeTime; // 是否在營業時間內
    
    const businessStatus = document.getElementById('business-status');
    
    if (isWeekday && isDuringBusinessHours) {
      businessStatus.textContent = '營業中';
      businessStatus.className = 'business-status status-open';
    } else {
      businessStatus.textContent = '非營業時間';
      businessStatus.className = 'business-status status-closed';
    }
  }
  
  // 執行判斷
  checkBusinessHours();
  
  // 每分鐘更新一次狀態
  setInterval(checkBusinessHours, 60000);
});