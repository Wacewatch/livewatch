-- Add source column to existing proxy_usage_logs table if it doesn't exist
ALTER TABLE proxy_usage_logs ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'S1';

-- Create app_config table for source configuration if not exists
CREATE TABLE IF NOT EXISTS app_config (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default source configuration
INSERT INTO app_config (key, value) 
VALUES (
  'sources_enabled',
  '{"source1": true, "source2": true, "source3": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Create index for source column
CREATE INDEX IF NOT EXISTS idx_proxy_usage_logs_source ON proxy_usage_logs(source);
