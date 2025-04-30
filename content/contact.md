
+++
title = "聯絡我們"
+++

<form action="https://formspree.io/f/xwpovnwy" method="POST" enctype="multipart/form-data">
  <label>姓名: <input type="text" name="name"></label><br>
  <label>聯絡方式: <input type="text" name="contact"></label><br>
  <label>服務類型: 
    <select name="service">
      <option value="記帳">記帳</option>
      <option value="報稅">報稅</option>
      <option value="公司設立">公司設立</option>
    </select>
  </label><br>
  <label>方便聯絡時間: <input type="text" name="time"></label><br>
  <label>問題: <textarea name="message"></textarea></label><br>
  <label>上傳檔案: <input type="file" name="attachment"></label><br>
  <label><input type="checkbox" name="_cc" value="email"> 寄副本給自己</label><br>
  <input type="hidden" name="_redirect" value="/thank-you">
  <button type="submit">送出</button>
</form>
