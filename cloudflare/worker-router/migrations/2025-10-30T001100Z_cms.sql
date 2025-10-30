-- ExternalArticles (Blog 文章)
CREATE TABLE IF NOT EXISTS ExternalArticles (
  article_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  category TEXT,
  tags TEXT,
  is_published BOOLEAN DEFAULT 0,
  published_at TEXT,
  view_count INTEGER DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ext_articles_category ON ExternalArticles(category);
CREATE INDEX IF NOT EXISTS idx_ext_articles_published ON ExternalArticles(is_published);

-- ExternalFAQ
CREATE TABLE IF NOT EXISTS ExternalFAQ (
  faq_id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ext_faq_category ON ExternalFAQ(category);
CREATE INDEX IF NOT EXISTS idx_ext_faq_published ON ExternalFAQ(is_published);
CREATE INDEX IF NOT EXISTS idx_ext_faq_sort ON ExternalFAQ(sort_order);

-- ResourceCenter（資源下載）
CREATE TABLE IF NOT EXISTS ResourceCenter (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT,
  cover_image TEXT,
  is_published BOOLEAN DEFAULT 1,
  download_count INTEGER DEFAULT 0,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rc_published ON ResourceCenter(is_published);
CREATE INDEX IF NOT EXISTS idx_rc_category ON ResourceCenter(category);
CREATE INDEX IF NOT EXISTS idx_rc_file_type ON ResourceCenter(file_type);

-- ExternalServices（服務介紹）
CREATE TABLE IF NOT EXISTS ExternalServices (
  service_id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  hero_image TEXT,
  is_published BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  is_deleted BOOLEAN DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ext_services_published ON ExternalServices(is_published);
CREATE INDEX IF NOT EXISTS idx_ext_services_sort ON ExternalServices(sort_order);


