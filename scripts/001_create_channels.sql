-- Create channels table for managing TV channels
CREATE TABLE IF NOT EXISTS public.channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_channels_enabled ON public.channels(enabled);
CREATE INDEX IF NOT EXISTS idx_channels_sort_order ON public.channels(sort_order);

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read enabled channels
CREATE POLICY "channels_select_enabled"
  ON public.channels FOR SELECT
  USING (enabled = true);

-- Only allow authenticated users with admin metadata to manage channels
CREATE POLICY "channels_admin_all"
  ON public.channels FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );
