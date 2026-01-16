-- Add support for multiple Git proxy sources
CREATE TABLE IF NOT EXISTS proxy_sources (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  git_url TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  sync_interval_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default proxy source
INSERT INTO proxy_sources (name, git_url, sync_interval_minutes)
VALUES ('Free Proxy List', 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt', 30)
ON CONFLICT (git_url) DO NOTHING;

COMMIT;
