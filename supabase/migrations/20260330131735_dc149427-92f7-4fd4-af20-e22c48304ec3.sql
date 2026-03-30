-- Core status enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE public.ticket_status AS ENUM ('Pending', 'Assigned', 'In Progress', 'Completed', 'Issue Reported');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'amc_status') THEN
    CREATE TYPE public.amc_status AS ENUM ('Quotation Sent', 'Approved', 'Payment Pending', 'Paid', 'Active');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pm_status') THEN
    CREATE TYPE public.pm_status AS ENUM ('Pending', 'Assigned', 'Completed');
  END IF;
END $$;

-- Updated-at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Equipment
CREATE TABLE IF NOT EXISTS public.equipment (
  id text PRIMARY KEY,
  name text NOT NULL,
  model_number text NOT NULL DEFAULT '',
  serial_number text NOT NULL DEFAULT '',
  customer_id text NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  installation_date date,
  warranty_start_date date,
  warranty_end_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Installation tickets
CREATE TABLE IF NOT EXISTS public.tickets (
  id text PRIMARY KEY,
  equipment_id text NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
  location text NOT NULL DEFAULT '',
  status public.ticket_status NOT NULL DEFAULT 'Pending',
  assigned_technician text,
  remarks text NOT NULL DEFAULT '',
  issue_type text,
  created_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AMC contracts
CREATE TABLE IF NOT EXISTS public.amc_contracts (
  id text PRIMARY KEY,
  equipment_id text NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  status public.amc_status NOT NULL DEFAULT 'Quotation Sent',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PM schedules
CREATE TABLE IF NOT EXISTS public.pm_schedules (
  id text PRIMARY KEY,
  amc_id text NOT NULL REFERENCES public.amc_contracts(id) ON DELETE CASCADE,
  equipment_id text NOT NULL REFERENCES public.equipment(id) ON DELETE RESTRICT,
  pm_number integer NOT NULL,
  planned_date date NOT NULL,
  status public.pm_status NOT NULL DEFAULT 'Pending',
  assigned_technician text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pm_schedules_amc_pm_unique UNIQUE (amc_id, pm_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_equipment_customer_id ON public.equipment(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_equipment_id ON public.tickets(equipment_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_amc_equipment_id ON public.amc_contracts(equipment_id);
CREATE INDEX IF NOT EXISTS idx_amc_status ON public.amc_contracts(status);
CREATE INDEX IF NOT EXISTS idx_pm_amc_id ON public.pm_schedules(amc_id);
CREATE INDEX IF NOT EXISTS idx_pm_equipment_id ON public.pm_schedules(equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_status ON public.pm_schedules(status);

-- Trigger wiring
DROP TRIGGER IF EXISTS customers_set_updated_at ON public.customers;
CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS equipment_set_updated_at ON public.equipment;
CREATE TRIGGER equipment_set_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tickets_set_updated_at ON public.tickets;
CREATE TRIGGER tickets_set_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS amc_set_updated_at ON public.amc_contracts;
CREATE TRIGGER amc_set_updated_at
BEFORE UPDATE ON public.amc_contracts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS pm_set_updated_at ON public.pm_schedules;
CREATE TRIGGER pm_set_updated_at
BEFORE UPDATE ON public.pm_schedules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amc_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;

-- Permissive policies for this no-auth setup (can be tightened after auth is added)
DROP POLICY IF EXISTS "customers_public_all" ON public.customers;
CREATE POLICY "customers_public_all"
ON public.customers
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "equipment_public_all" ON public.equipment;
CREATE POLICY "equipment_public_all"
ON public.equipment
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "tickets_public_all" ON public.tickets;
CREATE POLICY "tickets_public_all"
ON public.tickets
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "amc_public_all" ON public.amc_contracts;
CREATE POLICY "amc_public_all"
ON public.amc_contracts
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "pm_public_all" ON public.pm_schedules;
CREATE POLICY "pm_public_all"
ON public.pm_schedules
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);