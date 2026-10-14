-- F-07: narrow technician read scope to least privilege.
-- F-35: give AMC contracts the fields the specification asks for.
-- F-27: make the customer-rename cascade atomic.

-- ========================================================== F-07 read scope
-- Technicians could read EVERY customer with full contact details, EVERY
-- equipment record with serials, and EVERY AMC contract. They now see only the
-- customers, equipment and contracts connected to work actually assigned to
-- them, which is what the job needs.

CREATE OR REPLACE FUNCTION public.technician_sees_equipment(_equipment_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets t
     WHERE t.equipment_id = _equipment_id
       AND t.assigned_technician = public.current_technician_id()
  ) OR EXISTS (
    SELECT 1 FROM public.pm_schedules p
     WHERE p.equipment_id = _equipment_id
       AND p.assigned_technician = public.current_technician_id()
  )
$$;
GRANT EXECUTE ON FUNCTION public.technician_sees_equipment(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Technicians view equipment" ON public.equipment;
CREATE POLICY "Technicians view assigned equipment" ON public.equipment
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND public.technician_sees_equipment(id)
  );

DROP POLICY IF EXISTS "Technicians view customers" ON public.customers;
CREATE POLICY "Technicians view customers of assigned work" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND EXISTS (
      SELECT 1 FROM public.equipment e
       WHERE e.customer_id = customers.id
         AND public.technician_sees_equipment(e.id)
    )
  );

DROP POLICY IF EXISTS "Technicians view amc" ON public.amc_contracts;
CREATE POLICY "Technicians view amc of assigned work" ON public.amc_contracts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND public.technician_sees_equipment(equipment_id)
  );

-- Supporting indexes: these predicates filter on equipment_id + assigned_technician.
CREATE INDEX IF NOT EXISTS idx_tickets_tech_equipment ON public.tickets (assigned_technician, equipment_id);
CREATE INDEX IF NOT EXISTS idx_pm_tech_equipment      ON public.pm_schedules (assigned_technician, equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_customer     ON public.equipment (customer_id);

-- ======================================================= F-35 contract fields
-- amc_contracts could not distinguish AMC from CMC from CAMC, carried no visit
-- frequency, no billing schedule and no renewal date, so the specification's
-- contract model could not be expressed at all.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coverage_type') THEN
    CREATE TYPE public.coverage_type AS ENUM ('AMC', 'CMC', 'CAMC');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_frequency') THEN
    CREATE TYPE public.billing_frequency AS ENUM ('Annual', 'Half-Yearly', 'Quarterly', 'Monthly');
  END IF;
END $$;

ALTER TABLE public.amc_contracts
  ADD COLUMN IF NOT EXISTS coverage        public.coverage_type      NOT NULL DEFAULT 'AMC',
  ADD COLUMN IF NOT EXISTS visits_per_year INTEGER                   NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS billing         public.billing_frequency  NOT NULL DEFAULT 'Annual',
  ADD COLUMN IF NOT EXISTS renewal_date    DATE;

ALTER TABLE public.amc_contracts DROP CONSTRAINT IF EXISTS amc_visits_per_year_sane;
ALTER TABLE public.amc_contracts
  ADD CONSTRAINT amc_visits_per_year_sane CHECK (visits_per_year BETWEEN 1 AND 12);

-- Default the renewal date to the day after the contract ends, which is what the
-- renewal report needs and what the business already does by hand.
UPDATE public.amc_contracts SET renewal_date = end_date + 1 WHERE renewal_date IS NULL;

-- ==================================================== F-27 atomic cascade
-- Renaming a customer used to cascade the denormalised copy into equipment,
-- tickets, amc_contracts and pm_schedules as four separate HTTP round trips
-- orchestrated in the browser. If the tab closed or one call failed after the
-- first succeeded, the copies were left inconsistent with no rollback.
-- One function, one transaction.

CREATE OR REPLACE FUNCTION public.rename_customer(
  _customer_id     TEXT,
  _name            TEXT,
  _contact_person  TEXT,
  _phone           TEXT,
  _email           TEXT,
  _address         TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER          -- the caller's RLS still applies: only an admin can do this
SET search_path = public
AS $$
DECLARE updated INTEGER;
BEGIN
  UPDATE public.customers
     SET name = _name, contact_person = _contact_person,
         phone = _phone, email = _email, address = _address
   WHERE id = _customer_id;

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated = 0 THEN
    RAISE EXCEPTION 'Customer % was not updated. You may not have permission to change it, or it no longer exists.', _customer_id;
  END IF;

  UPDATE public.equipment     SET customer_name = _name WHERE customer_id = _customer_id;
  UPDATE public.tickets       SET customer_name = _name WHERE customer_id = _customer_id;
  UPDATE public.amc_contracts SET customer_name = _name WHERE customer_id = _customer_id;
  UPDATE public.pm_schedules  SET customer_name = _name
   WHERE equipment_id IN (SELECT id FROM public.equipment WHERE customer_id = _customer_id);
END $$;

REVOKE ALL ON FUNCTION public.rename_customer(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_customer(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;
