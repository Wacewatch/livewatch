-- Add Naga source configuration
-- Naga is a new source that uses the exact VAVOO reading technique

-- Update app_config to include naga_enabled flag
DO $$
DECLARE
  config_exists BOOLEAN;
BEGIN
  -- Check if source_config exists
  SELECT EXISTS (
    SELECT 1 FROM app_config WHERE key = 'source_config'
  ) INTO config_exists;

  IF config_exists THEN
    -- Update existing config to add naga_enabled
    UPDATE app_config
    SET value = value || jsonb_build_object(
      'naga_enabled', true,
      'naga_default', false
    )
    WHERE key = 'source_config'
    AND NOT (value ? 'naga_enabled');
  ELSE
    -- Insert new config with naga enabled
    INSERT INTO app_config (key, value)
    VALUES ('source_config', jsonb_build_object(
      'source1_enabled', true,
      'source2_enabled', true,
      'source3_enabled', true,
      'source4_enabled', true,
      'naga_enabled', true,
      'naga_default', false,
      'external_proxy_url', '',
      'default_tvvoo_source', 1,
      'alpha_enabled', true,
      'beta_enabled', true
    ));
  END IF;
END $$;

-- Create naga_cache table for storing token and catalog
CREATE TABLE IF NOT EXISTS naga_cache (
  id SERIAL PRIMARY KEY,
  cache_type VARCHAR(50) NOT NULL UNIQUE, -- 'token' or 'catalog'
  cache_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_naga_cache_type ON naga_cache(cache_type);

-- Insert initial cache entries
INSERT INTO naga_cache (cache_type, cache_data)
VALUES 
  ('token', '{"sig": null, "ts": 0}'),
  ('catalog', '{"channels": [], "ts": 0}')
ON CONFLICT (cache_type) DO NOTHING;

-- Create naga_usage_logs table for tracking
CREATE TABLE IF NOT EXISTS naga_usage_logs (
  id SERIAL PRIMARY KEY,
  channel_id VARCHAR(255),
  channel_name VARCHAR(255),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_naga_usage_logs_success ON naga_usage_logs(success);
CREATE INDEX IF NOT EXISTS idx_naga_usage_logs_used_at ON naga_usage_logs(used_at);

-- Add comment
COMMENT ON TABLE naga_cache IS 'Cache storage for Naga source (token and catalog)';
COMMENT ON TABLE naga_usage_logs IS 'Usage tracking for Naga source streams';
