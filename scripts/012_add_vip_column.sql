-- Add VIP column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vip_granted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kofi_transaction_id TEXT;

-- Add index for faster VIP lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_vip ON public.user_profiles(is_vip);

-- Create payments table to track Ko-fi transactions
CREATE TABLE IF NOT EXISTS public.kofi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  kofi_transaction_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  from_name TEXT,
  message TEXT,
  type TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  is_subscription_payment BOOLEAN DEFAULT false,
  is_first_subscription_payment BOOLEAN DEFAULT false,
  tier_name TEXT,
  verification_token TEXT,
  message_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kofi_payments_user_id ON public.kofi_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_kofi_payments_email ON public.kofi_payments(email);
CREATE INDEX IF NOT EXISTS idx_kofi_payments_transaction_id ON public.kofi_payments(kofi_transaction_id);

COMMIT;
