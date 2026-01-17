-- Table for storing disabled channels
CREATE TABLE IF NOT EXISTS disabled_channels (
  id SERIAL PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  channel_name TEXT NOT NULL,
  disabled_by TEXT,
  disabled_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Table for storing banner messages per country
CREATE TABLE IF NOT EXISTS country_banners (
  id SERIAL PRIMARY KEY,
  country_name TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  bg_color TEXT DEFAULT '#f59e0b',
  text_color TEXT DEFAULT '#000000',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing global banner message (main page)
CREATE TABLE IF NOT EXISTS global_banners (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  bg_color TEXT DEFAULT '#3b82f6',
  text_color TEXT DEFAULT '#ffffff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default global banner (disabled by default)
INSERT INTO global_banners (message, enabled) 
VALUES ('Bienvenue sur LiveWatch !', false)
ON CONFLICT DO NOTHING;
