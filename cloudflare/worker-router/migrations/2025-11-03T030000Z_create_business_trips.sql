-- Business Trips (外出登記) - 用於計算交通補貼

CREATE TABLE IF NOT EXISTS BusinessTrips (
  trip_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id INTEGER,                      -- 關聯客戶（可選）
  trip_date TEXT NOT NULL,                -- YYYY-MM-DD 外出日期
  destination TEXT NOT NULL,              -- 目的地
  distance_km REAL NOT NULL,              -- 距離（公里）
  purpose TEXT,                           -- 外出目的
  transport_subsidy_cents INTEGER NOT NULL DEFAULT 0, -- 交通補貼（分）
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  submitted_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  reviewed_by INTEGER,
  notes TEXT,                             -- 備註
  is_deleted BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES Users(user_id),
  FOREIGN KEY (client_id) REFERENCES Clients(client_id),
  FOREIGN KEY (reviewed_by) REFERENCES Users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_trips_user ON BusinessTrips(user_id);
CREATE INDEX IF NOT EXISTS idx_business_trips_client ON BusinessTrips(client_id);
CREATE INDEX IF NOT EXISTS idx_business_trips_date ON BusinessTrips(trip_date);
CREATE INDEX IF NOT EXISTS idx_business_trips_status ON BusinessTrips(status);

-- 計算交通補貼的規則：每5公里60元
-- 補貼計算公式：FLOOR(distance_km / 5) * 60 * 100 (轉換為分)

