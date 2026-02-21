-- Create delta_cache table for token and catalog storage
CREATE TABLE IF NOT EXISTS delta_cache (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL UNIQUE, -- 'token' or 'catalog'
  sig TEXT, -- For token type
  channels JSONB, -- For catalog type
  ts INTEGER NOT NULL, -- Unix timestamp
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on type for faster lookups
CREATE INDEX IF NOT EXISTS idx_delta_cache_type ON delta_cache(type);
CREATE INDEX IF NOT EXISTS idx_delta_cache_ts ON delta_cache(ts);

-- Create delta_usage_logs table for tracking
CREATE TABLE IF NOT EXISTS delta_usage_logs (
  id SERIAL PRIMARY KEY,
  channel_id TEXT NOT NULL,
  channel_name TEXT,
  country TEXT,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create index on timestamp for analytics
CREATE INDEX IF NOT EXISTS idx_delta_usage_timestamp ON delta_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_delta_usage_country ON delta_usage_logs(country);

-- Add delta_enabled and delta_default to app_config
DO $$
BEGIN
  -- Check if columns exist, if not add them
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_config' AND column_name = 'delta_enabled'
  ) THEN
    ALTER TABLE app_config ADD COLUMN delta_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_config' AND column_name = 'delta_default'
  ) THEN
    ALTER TABLE app_config ADD COLUMN delta_default BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Initialize config if needed
INSERT INTO app_config (key, source1_enabled, source2_enabled, source3_enabled, source4_enabled, delta_enabled, delta_default)
VALUES ('source_config', true, true, true, true, true, false)
ON CONFLICT (key) DO UPDATE 
SET 
  delta_enabled = COALESCE(app_config.delta_enabled, true),
  delta_default = COALESCE(app_config.delta_default, false);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON delta_cache TO authenticated;
GRANT SELECT, INSERT ON delta_usage_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE delta_cache_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE delta_usage_logs_id_seq TO authenticated;

-- Enable RLS
ALTER TABLE delta_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE delta_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow all operations on delta_cache" ON delta_cache FOR ALL USING (true);
CREATE POLICY "Allow insert on delta_usage_logs" ON delta_usage_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select on delta_usage_logs for authenticated users" ON delta_usage_logs FOR SELECT USING (true);
