document.addEventListener('DOMContentLoaded', function() {
  // 原有的選項按鈕功能，可以保留但不再使用
  const optionGroups = document.querySelectorAll('.options-group');
  const hiddenField = document.getElementById('topic-field');
  
  // 新增的單選按鈕功能
  const radioButtons = document.querySelectorAll('input[name="topic-radio"]');
  
  radioButtons.forEach(radio => {
    radio.addEventListener('change', function() {
      // 更新隱藏欄位的值
      hiddenField.value = this.value;
      console.log('Selected topic:', this.value);
    });
  });
  
  // 表單提交前檢查是否有選擇主題
  const bookingForm = document.querySelector('.booking-form');
  bookingForm.addEventListener('submit', function(e) {
    if (!hiddenField.value) {
      // 如果沒有選擇主題，使用第一個單選按鈕的值
      if (radioButtons.length > 0) {
        const firstRadio = radioButtons[0];
        firstRadio.checked = true;
        hiddenField.value = firstRadio.value;
      }
    }
  });
  
  // 默認選中第一個選項
  if (radioButtons.length > 0) {
    radioButtons[0].checked = true;
    hiddenField.value = radioButtons[0].value;
  }
});