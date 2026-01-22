-- Fix kofi_payments table structure to match API expectations
-- Add missing columns if they don't exist
ALTER TABLE public.kofi_payments
ADD COLUMN IF NOT EXISTS transaction_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Ko-fi',
ADD COLUMN IF NOT EXISTS donor_name TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- If kofi_transaction_id exists but transaction_id doesn't, copy it over
UPDATE public.kofi_payments 
SET transaction_id = kofi_transaction_id 
WHERE transaction_id IS NULL AND kofi_transaction_id IS NOT NULL;

-- Copy from_name to donor_name if needed
UPDATE public.kofi_payments 
SET donor_name = from_name 
WHERE donor_name IS NULL AND from_name IS NOT NULL;

-- Ensure payment_method is set
UPDATE public.kofi_payments 
SET payment_method = 'Ko-fi' 
WHERE payment_method IS NULL;

-- Create index on transaction_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_kofi_payments_transaction_id_v2 ON public.kofi_payments(transaction_id);

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_kofi_payments_status ON public.kofi_payments(status);

COMMIT;
