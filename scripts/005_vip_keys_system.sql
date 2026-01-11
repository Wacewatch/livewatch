-- Create VIP keys table
CREATE TABLE IF NOT EXISTS vip_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vip_keys_key ON vip_keys(key);
CREATE INDEX IF NOT EXISTS idx_vip_keys_used ON vip_keys(used);

-- Enable RLS
ALTER TABLE vip_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view all keys
CREATE POLICY "Admins can view all vip_keys" ON vip_keys
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Anyone can check if a key exists (for redemption)
CREATE POLICY "Anyone can validate vip_keys" ON vip_keys
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can insert keys
CREATE POLICY "Admins can insert vip_keys" ON vip_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: System can update keys when used
CREATE POLICY "System can update vip_keys" ON vip_keys
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
