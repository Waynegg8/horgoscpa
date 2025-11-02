-- 為現有的知識庫內容設置默認scope值
-- 2025-11-02

-- 為現有的SOP設置默認scope為'task'（任務層級）
UPDATE SOPDocuments 
SET scope = 'task' 
WHERE scope IS NULL;

-- 為現有的FAQ設置默認scope為'task'（任務層級）
UPDATE InternalFAQ 
SET scope = 'task' 
WHERE scope IS NULL;

-- 為現有的資源文檔設置默認scope為'task'（任務層級）
UPDATE InternalDocuments 
SET scope = 'task' 
WHERE scope IS NULL;

-- 說明：
-- 將所有現有的知識庫內容默認設置為任務層級(task)
-- 這樣可以確保現有數據在新系統中仍然可見
-- 管理員可以稍後根據實際情況將部分內容調整為服務層級(service)

