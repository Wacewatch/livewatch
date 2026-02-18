-- Migration to ensure all user_profiles have correct structure
-- Run this to fix any existing profiles and set proper defaults

-- Update any profiles that might have NULL role to 'user'
UPDATE user_profiles 
SET role = 'user' 
WHERE role IS NULL;

-- Update any profiles that might have NULL is_vip to false
UPDATE user_profiles 
SET is_vip = false 
WHERE is_vip IS NULL;

-- Verify the structure
SELECT 
  id,
  email,
  role,
  is_vip,
  created_at,
  updated_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;
