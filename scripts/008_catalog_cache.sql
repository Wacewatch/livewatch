-- Create cached catalog table
CREATE TABLE IF NOT EXISTS catalog_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  language TEXT,
  logo TEXT,
  background TEXT,
  sources JSONB NOT NULL,
  quality TEXT,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_catalog_cache_enabled ON catalog_cache(enabled);
CREATE INDEX IF NOT EXISTS idx_catalog_cache_category ON catalog_cache(category);
CREATE INDEX IF NOT EXISTS idx_catalog_cache_language ON catalog_cache(language);
CREATE INDEX IF NOT EXISTS idx_catalog_cache_last_synced ON catalog_cache(last_synced);

-- Create sync log table
CREATE TABLE IF NOT EXISTS catalog_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  channels_synced INTEGER,
  status TEXT,
  error TEXT,
  duration_ms INTEGER
);
