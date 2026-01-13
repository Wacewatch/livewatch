-- Add email column to vip_keys table
ALTER TABLE vip_keys ADD COLUMN IF NOT EXISTS used_by_email TEXT;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_vip_keys_email ON vip_keys(used_by_email);
