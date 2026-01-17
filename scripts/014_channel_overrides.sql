-- Table for storing channel name and logo overrides
CREATE TABLE IF NOT EXISTS channel_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE,
  custom_name TEXT,
  custom_logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on channel_id
CREATE INDEX IF NOT EXISTS idx_channel_overrides_channel_id ON channel_overrides(channel_id);
