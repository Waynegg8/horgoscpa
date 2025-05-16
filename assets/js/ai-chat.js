// 調用Gemini API
async function callGeminiApi(userMessage) {
  try {
    // 從環境變數獲取API金鑰
    let API_KEY;
    try {
      API_KEY = GEMINI_API_KEY;
      if (!API_KEY) {
        console.error('API key not found in environment variables');
        return { error: true, details: 'API key not configured' };
      }
      console.log('API key found, first 5 chars:', API_KEY.substring(0, 5));
    } catch (error) {
      console.error('Error accessing API key:', error);
      return { error: true, details: 'Error accessing API key: ' + error.message };
    }
    
    // 使用有效的模型名稱 - gemini-1.5-flash-002 (根據模型列表)
    const API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-002:generateContent';
    
    // 改進的系統提示，要求AI提供具體資訊而非建議聯繫客服
    const systemPrompt = `你是霍爾果斯會計師事務所的AI客服助理，專精於提供稅務和會計相關的專業諮詢。
作為專業的財稅顧問，你應該直接回答用戶的問題，提供具體、詳細且專業的資訊，而不是簡單地建議用戶撥打客服電話。

一定要提供實質內容，包括步驟、流程或相關規定，讓用戶獲得真正有價值的資訊。
只有在非常專業、特殊或需要個案處理的情況下，才建議用戶聯繫客服。

台灣設立公司的基本流程：
1. 公司名稱預查：至經濟部商業司網站查詢名稱是否可用
2. 準備設立文件：包括公司章程、股東名冊、董事名冊等
3. 資本額確認：依公司類型決定最低資本額
4. 辦理設立登記：向經濟部商業司申請
5. 申請統一編號：完成設立登記後向稅務機關申請
6. 辦理營業登記：依營業項目向相關單位申請

記住，一定要先提供實質內容，再視情況補充建議用戶聯繫客服電話(04-2220-5606)。

始終使用繁體中文回應。

用戶問題：${userMessage}`;

    // 標準請求體格式
    const requestBody = {
      contents: [{
        parts: [{ text: systemPrompt }]
      }]
    };
    
    console.log('Calling Gemini API...');
    console.log('API URL:', `${API_URL}?key=${API_KEY.substring(0, 5)}...`);
    console.log('Request body:', JSON.stringify(requestBody));
    
    // 發送API請求
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('API response status:', response.status);
    
    // 檢查回應
    if (!response.ok) {
      // 嘗試獲取錯誤詳情
      const errorText = await response.text();
      console.error('API returned error status:', response.status);
      console.error('API error text:', errorText);
      return { error: true, details: `Status: ${response.status}, Error: ${errorText}` };
    }
    
    // 解析成功回應
    const responseData = await response.json();
    console.log('API response successful, structure:', JSON.stringify(Object.keys(responseData)));
    
    // 從回應中提取文本
    const botResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!botResponse) {
      console.error('Unexpected API response format:', JSON.stringify(responseData).substring(0, 200));
      return { error: true, details: 'Unexpected response format: ' + JSON.stringify(responseData).substring(0, 200) };
    }
    
    console.log('Bot response (first 50 chars):', botResponse.substring(0, 50) + '...');
    return { response: botResponse };
  } catch (error) {
    console.error('Error calling Gemini API:', error.message, error.stack);
    return { error: true, details: 'API call error: ' + error.message };
  }
}