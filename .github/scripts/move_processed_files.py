# 13. 清理已處理的Word文檔
- name: 清理已處理的Word文檔
  if: steps.process_word.outputs.html_changed == 'true'
  run: |
    # 確保工作區乾淨
    git stash -u || true
    
    # 先拉取最新變更以避免衝突
    git pull origin ${GITHUB_REF##*/} || true
    
    # 應用stash (如果需要)
    git stash pop || true
    
    # 檢查是否有Python腳本，如果沒有則創建
    if [ ! -f ".github/scripts/move_processed_files.py" ]; then
      echo "移動文件腳本不存在，創建腳本..."
      mkdir -p .github/scripts
      # 在這裡將腳本內容寫入文件（省略，因為您會直接將文件添加到倉庫）
    fi
    
    # 檢查是否有文件需要移動
    if [ -d "word-docs" ] && [ -f "assets/data/processed_files.json" ]; then
      echo "開始移動已處理的Word文檔..."
      
      # 執行Python腳本
      python .github/scripts/move_processed_files.py
      
      # 提交更改
      git add word-docs/ assets/data/processed_files.json
      git commit -m "移動已處理的Word文檔" || echo "無需提交"
      git push || echo "無需推送"
    else
      echo "沒有需要處理的 Word 文檔或找不到已處理文件記錄"
    fi