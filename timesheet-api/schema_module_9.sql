-- =====================================================
-- 模組 9: 外部內容管理
-- 規格來源: docs/開發指南/外部內容管理-完整規格.md
-- =====================================================

-- -----------------------------------------------------
-- Table: ExternalArticles (外部文章/Blog)
-- 描述: 公開網站的 Blog 文章，含 SEO 優化欄位
-- 規格來源: L11-L37
-- -----------------------------------------------------
CREATE TABLE ExternalArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,           -- L12
  title TEXT NOT NULL,                                    -- L13
  slug TEXT UNIQUE NOT NULL,                              -- L14: URL 標識符
  summary TEXT,                                           -- L15
  content TEXT NOT NULL,                                  -- L16: HTML 內容
  featured_image TEXT,                                    -- L17: 封面圖 URL
  category TEXT,                                          -- L18
  tags TEXT,                                              -- L19: JSON 陣列
  is_published BOOLEAN DEFAULT 0,                         -- L20
  published_at TEXT,                                      -- L21
  view_count INTEGER DEFAULT 0,                           -- L22
  
  -- SEO 優化欄位
  seo_title TEXT,                                         -- L23
  seo_description TEXT,                                   -- L24
  seo_keywords TEXT,                                      -- L25
  
  -- 審計欄位
  created_by INTEGER NOT NULL,                            -- L26
  created_at TEXT DEFAULT (datetime('now')),              -- L27
  updated_at TEXT DEFAULT (datetime('now')),              -- L28
  is_deleted BOOLEAN DEFAULT 0,                           -- L29
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)      -- L31
);

-- 索引
CREATE UNIQUE INDEX idx_external_slug ON ExternalArticles(slug);           -- L34
CREATE INDEX idx_external_category ON ExternalArticles(category);          -- L35
CREATE INDEX idx_external_published ON ExternalArticles(is_published);     -- L36

-- -----------------------------------------------------
-- Table: ExternalFAQ (外部常見問題)
-- 描述: 公開網站的 FAQ 頁面內容
-- 規格來源: L41-L57
-- -----------------------------------------------------
CREATE TABLE ExternalFAQ (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,               -- L42
  question TEXT NOT NULL,                                 -- L43
  answer TEXT NOT NULL,                                   -- L44
  category TEXT,                                          -- L45
  sort_order INTEGER DEFAULT 0,                           -- L46
  is_published BOOLEAN DEFAULT 0,                         -- L47
  view_count INTEGER DEFAULT 0,                           -- L48
  
  -- 審計欄位
  created_at TEXT DEFAULT (datetime('now')),              -- L49
  updated_at TEXT DEFAULT (datetime('now')),              -- L50
  is_deleted BOOLEAN DEFAULT 0                            -- L51
);

-- 索引
CREATE INDEX idx_faq_category ON ExternalFAQ(category);                    -- L54
CREATE INDEX idx_faq_published ON ExternalFAQ(is_published);               -- L55
CREATE INDEX idx_faq_order ON ExternalFAQ(sort_order);                     -- L56

-- -----------------------------------------------------
-- Table: ResourceCenter (資源中心)
-- 描述: 可下載的資源文件（PDF, Excel, Word, ZIP）
-- 規格來源: L61-L82
-- -----------------------------------------------------
CREATE TABLE ResourceCenter (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,          -- L62
  title TEXT NOT NULL,                                    -- L63
  description TEXT,                                       -- L64
  file_url TEXT NOT NULL,                                 -- L65: R2 儲存路徑
  file_type TEXT,                                         -- L66: PDF, Excel, Word, ZIP
  file_size INTEGER,                                      -- L67: bytes
  category TEXT,                                          -- L68
  is_published BOOLEAN DEFAULT 0,                         -- L69
  download_count INTEGER DEFAULT 0,                       -- L70
  
  -- 審計欄位
  created_by INTEGER NOT NULL,                            -- L71
  created_at TEXT DEFAULT (datetime('now')),              -- L72
  updated_at TEXT DEFAULT (datetime('now')),              -- L73
  is_deleted BOOLEAN DEFAULT 0,                           -- L74
  
  FOREIGN KEY (created_by) REFERENCES Users(user_id)      -- L76
);

-- 索引
CREATE INDEX idx_resources_category ON ResourceCenter(category);           -- L79
CREATE INDEX idx_resources_published ON ResourceCenter(is_published);      -- L80
CREATE INDEX idx_resources_type ON ResourceCenter(file_type);              -- L81

-- -----------------------------------------------------
-- Table: ExternalImages (外部圖片資源)
-- 描述: 圖片管理（用於 Blog 文章、資源封面等）
-- 規格來源: L86-L103
-- -----------------------------------------------------
CREATE TABLE ExternalImages (
  image_id INTEGER PRIMARY KEY AUTOINCREMENT,             -- L87
  title TEXT,                                             -- L88
  image_url TEXT NOT NULL,                                -- L89: R2 儲存路徑
  alt_text TEXT,                                          -- L90: 圖片替代文字
  category TEXT,                                          -- L91
  file_size INTEGER,                                      -- L92: bytes
  width INTEGER,                                          -- L93: 圖片寬度
  height INTEGER,                                         -- L94: 圖片高度
  
  -- 審計欄位
  uploaded_by INTEGER NOT NULL,                           -- L95
  uploaded_at TEXT DEFAULT (datetime('now')),             -- L96
  is_deleted BOOLEAN DEFAULT 0,                           -- L97
  
  FOREIGN KEY (uploaded_by) REFERENCES Users(user_id)     -- L99
);

-- 索引
CREATE INDEX idx_images_category ON ExternalImages(category);              -- L102


