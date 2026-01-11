CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_channel ON active_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_heartbeat ON active_sessions(last_heartbeat);

-- Auto cleanup old sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_sessions() RETURNS void AS $$
BEGIN
  DELETE FROM active_sessions WHERE last_heartbeat < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS channel_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_channel_views_channel ON channel_views(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_views_date ON channel_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_channel_views_user ON channel_views(user_id);

-- Enable RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_views ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admins can view all sessions" ON active_sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can view all views" ON channel_views FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Users can insert their own sessions
CREATE POLICY "Users can insert their sessions" ON active_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their sessions" ON active_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their sessions" ON active_sessions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own views
CREATE POLICY "Users can insert their views" ON channel_views FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
