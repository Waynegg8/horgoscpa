def process_word_file(docx_path: str, output_dir: str) -> Dict:
    """
    處理單個Word文件的完整流程
    :param docx_path: Word文檔路徑
    :param output_dir: 輸出目錄
    :return: 處理結果
    """
    try:
        # 1. 提取文件名資訊
        filename = os.path.basename(docx_path)
        logger.info(f"開始處理文件: {filename}")
        
        # 從文件名提取日期
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
        date = date_match.group(1) if date_match else datetime.datetime.now().strftime("%Y-%m-%d")
        
        # 2. 使用多種方法提取Word內容
        content_dict = extract_word_content(docx_path)
        
        # 3. 將內容轉換為HTML
        html_content = convert_to_html(content_dict)
        
        # 4. 清理HTML內容
        cleaned_html = clean_html_content(html_content)
        
        # 5. 提取文章結構
        article_structure = extract_article_structure(cleaned_html)
        
        # 6. 生成最終HTML，並獲取檔名
        final_html, file_name = generate_article_html(article_structure, date, filename)
        
        # 7. 寫入文件
        output_path = os.path.join(output_dir, file_name)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
        
        logger.info(f"成功將 {filename} 轉換為 {file_name}")
        
        return {
            'success': True,
            'output_file': file_name,
            'title': article_structure['title'],
            'metadata': {
                'date': date,
                'summary': article_structure['summary']
            }
        }
        
    except Exception as e:
        logger.error(f"處理 {docx_path} 時出錯: {str(e)}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'docx_path': docx_path
        }