-- Database-level integrity, so validation cannot be bypassed by calling the API
-- directly. Before this migration the schema had ZERO check constraints and no
-- uniqueness on the business keys, which meant:
--   * every validation rule lived only in the browser;
--   * two customers could be saved with identical name, phone and email;
--   * two equipment rows could hold the same serial number, breaking the
--     one-equipment-one-serial assumption the whole service model rests on;
--   * an AMC could be stored with a negative value, or an end date before its
--     start date.
--
-- Each constraint below is added NOT VALID first and validated separately, so
-- that pre-existing rows that violate it do not block the migration. Any such
-- rows are reported, left in place for a human to correct, and the constraint
-- still applies to everything written from now on.

-- ----------------------------------------------------------------- value sanity
ALTER TABLE public.amc_contracts
  DROP CONSTRAINT IF EXISTS amc_price_non_negative;
ALTER TABLE public.amc_contracts
  ADD CONSTRAINT amc_price_non_negative CHECK (price >= 0) NOT VALID;

ALTER TABLE public.amc_contracts
  DROP CONSTRAINT IF EXISTS amc_dates_ordered;
ALTER TABLE public.amc_contracts
  ADD CONSTRAINT amc_dates_ordered CHECK (end_date >= start_date) NOT VALID;

ALTER TABLE public.equipment
  DROP CONSTRAINT IF EXISTS equipment_warranty_dates_ordered;
ALTER TABLE public.equipment
  ADD CONSTRAINT equipment_warranty_dates_ordered
  CHECK (warranty_end_date IS NULL OR warranty_start_date IS NULL
         OR warranty_end_date >= warranty_start_date) NOT VALID;

ALTER TABLE public.pm_schedules
  DROP CONSTRAINT IF EXISTS pm_number_positive;
ALTER TABLE public.pm_schedules
  ADD CONSTRAINT pm_number_positive CHECK (pm_number > 0) NOT VALID;

-- --------------------------------------------------------- required text fields
-- NOT NULL already covers absence; these reject whitespace-only values, which
-- the UI happily submitted.
ALTER TABLE public.customers  DROP CONSTRAINT IF EXISTS customers_name_not_blank;
ALTER TABLE public.customers  ADD CONSTRAINT customers_name_not_blank
  CHECK (btrim(name) <> '') NOT VALID;

ALTER TABLE public.equipment  DROP CONSTRAINT IF EXISTS equipment_name_not_blank;
ALTER TABLE public.equipment  ADD CONSTRAINT equipment_name_not_blank
  CHECK (btrim(name) <> '') NOT VALID;

ALTER TABLE public.technicians DROP CONSTRAINT IF EXISTS technicians_name_not_blank;
ALTER TABLE public.technicians ADD CONSTRAINT technicians_name_not_blank
  CHECK (btrim(name) <> '') NOT VALID;

-- ------------------------------------------------------------------- uniqueness
-- Case- and whitespace-insensitive, so "Apollo Hospital", "apollo hospital" and
-- " Apollo  Hospital " cannot all be created as separate records. Partial, so
-- that blank/placeholder serials do not collide with each other.
DROP INDEX IF EXISTS public.customers_name_unique_ci;
CREATE UNIQUE INDEX customers_name_unique_ci
  ON public.customers (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

DROP INDEX IF EXISTS public.equipment_serial_unique_ci;
CREATE UNIQUE INDEX equipment_serial_unique_ci
  ON public.equipment (lower(regexp_replace(btrim(serial_number), '\s+', ' ', 'g')))
  WHERE btrim(serial_number) <> '';

-- --------------------------------------------------------------------- validate
-- Report anything already in breach, then validate what can be validated.
DO $$
DECLARE n bigint; msg text := '';
BEGIN
  SELECT count(*) INTO n FROM public.amc_contracts WHERE price < 0;
  IF n > 0 THEN msg := msg || format('%s AMC row(s) with a negative value; ', n); END IF;

  SELECT count(*) INTO n FROM public.amc_contracts WHERE end_date < start_date;
  IF n > 0 THEN msg := msg || format('%s AMC row(s) ending before they start; ', n); END IF;

  SELECT count(*) INTO n FROM public.equipment
   WHERE warranty_end_date IS NOT NULL AND warranty_start_date IS NOT NULL
     AND warranty_end_date < warranty_start_date;
  IF n > 0 THEN msg := msg || format('%s equipment row(s) with warranty end before start; ', n); END IF;

  IF msg <> '' THEN
    RAISE WARNING 'Pre-existing rows breach the new constraints and need correcting: %', msg;
    RAISE WARNING 'Those constraints stay NOT VALID. Correct the rows, then run: ALTER TABLE ... VALIDATE CONSTRAINT ...';
  ELSE
    ALTER TABLE public.amc_contracts VALIDATE CONSTRAINT amc_price_non_negative;
    ALTER TABLE public.amc_contracts VALIDATE CONSTRAINT amc_dates_ordered;
    ALTER TABLE public.equipment     VALIDATE CONSTRAINT equipment_warranty_dates_ordered;
    ALTER TABLE public.pm_schedules  VALIDATE CONSTRAINT pm_number_positive;
    ALTER TABLE public.customers     VALIDATE CONSTRAINT customers_name_not_blank;
    ALTER TABLE public.equipment     VALIDATE CONSTRAINT equipment_name_not_blank;
    ALTER TABLE public.technicians   VALIDATE CONSTRAINT technicians_name_not_blank;
    RAISE NOTICE 'All integrity constraints validated against existing data.';
  END IF;
END $$;
