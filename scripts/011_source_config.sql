-- Create app_config table if not exists
CREATE TABLE IF NOT EXISTS app_config (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default source config
INSERT INTO app_config (key, value)
VALUES ('source_config', '{"source1_enabled": true, "source2_enabled": true, "source3_enabled": true}')
ON CONFLICT (key) DO NOTHING;

-- Create proxy_usage_logs table if not exists
CREATE TABLE IF NOT EXISTS proxy_usage_logs (
  id SERIAL PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  success BOOLEAN DEFAULT true,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_proxy_usage_logs_source ON proxy_usage_logs(source);
CREATE INDEX IF NOT EXISTS idx_proxy_usage_logs_used_at ON proxy_usage_logs(used_at);
