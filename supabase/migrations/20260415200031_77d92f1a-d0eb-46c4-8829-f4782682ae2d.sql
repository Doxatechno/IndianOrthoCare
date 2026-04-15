
-- Step 1: Add warranty_end_date column
ALTER TABLE public.amc_contracts ADD COLUMN IF NOT EXISTS warranty_end_date date;

-- Step 2: Populate warranty_end_date from equipment table
UPDATE public.amc_contracts ac
SET warranty_end_date = e.warranty_end_date
FROM public.equipment e
WHERE ac.equipment_id = e.id AND e.warranty_end_date IS NOT NULL;

-- Step 3: Convert column to text temporarily, migrate data, then swap enum
ALTER TABLE public.amc_contracts 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.amc_contracts 
  ALTER COLUMN status TYPE text USING status::text;

-- Migrate old statuses to new ones
UPDATE public.amc_contracts SET status = 'PO Released' WHERE status = 'Approved';
UPDATE public.amc_contracts SET status = 'Invoice Generated' WHERE status = 'Payment Pending';
UPDATE public.amc_contracts SET status = 'Payment Received' WHERE status IN ('Paid', 'Active');

-- Drop old enum and create new one
DROP TYPE public.amc_status;
CREATE TYPE public.amc_status AS ENUM ('Quotation Sent', 'PO Released', 'Invoice Generated', 'Payment Received');

-- Convert back to enum
ALTER TABLE public.amc_contracts 
  ALTER COLUMN status TYPE public.amc_status USING status::public.amc_status;

ALTER TABLE public.amc_contracts 
  ALTER COLUMN status SET DEFAULT 'Quotation Sent'::public.amc_status;
