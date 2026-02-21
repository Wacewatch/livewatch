-- Delta channels table for fast loading
CREATE TABLE IF NOT EXISTS delta_channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clean_name TEXT,
  logo TEXT,
  url TEXT NOT NULL,
  country TEXT NOT NULL,
  category TEXT,
  quality TEXT,
  language TEXT DEFAULT 'fr',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- Delta countries table
CREATE TABLE IF NOT EXISTS delta_countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT,
  channel_count INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delta sync log
CREATE TABLE IF NOT EXISTS delta_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  channels_synced INTEGER,
  countries_synced INTEGER,
  duration_ms INTEGER,
  status TEXT,
  error TEXT
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_delta_channels_country ON delta_channels(country);
CREATE INDEX IF NOT EXISTS idx_delta_channels_enabled ON delta_channels(enabled);
CREATE INDEX IF NOT EXISTS idx_delta_channels_category ON delta_channels(category);
CREATE INDEX IF NOT EXISTS idx_delta_channels_last_synced ON delta_channels(last_synced);

-- RLS policies (allow public read, admin write)
ALTER TABLE delta_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE delta_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delta_channels_select_enabled" ON delta_channels
  FOR SELECT USING (enabled = true);

CREATE POLICY "delta_channels_admin_all" ON delta_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "delta_countries_select_all" ON delta_countries
  FOR SELECT USING (enabled = true);

CREATE POLICY "delta_countries_admin_all" ON delta_countries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
