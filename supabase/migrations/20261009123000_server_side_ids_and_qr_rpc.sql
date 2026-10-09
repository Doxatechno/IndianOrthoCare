-- Move id generation into the database, and replace the open anon INSERT
-- policy on tickets with a narrow function.
--
-- Two problems being fixed here.
--
-- 1. Ids were generated on the client as max(existing) + 1. On the public QR
--    page that read ran as anon, which has no SELECT policy on tickets, so it
--    always came back empty: lastNum was always 0 and the new id was always
--    'TK-001'. Every public service request after the first failed on the
--    primary key, and retrying could never succeed. The same max+1 pattern in
--    DataContext also races whenever two admins act at once.
--
-- 2. "Anon create ticket from QR" was FOR INSERT TO anon WITH CHECK (true), so
--    anyone holding the bundled anon key could insert tickets with any status
--    and any assigned_technician - forged, pre-completed, pre-assigned work
--    orders.

-- ---------------------------------------------------------------- sequences
-- Start each sequence past the highest id already in use.
CREATE SEQUENCE IF NOT EXISTS public.customer_id_seq  AS BIGINT MINVALUE 1;
CREATE SEQUENCE IF NOT EXISTS public.equipment_id_seq AS BIGINT MINVALUE 1;
CREATE SEQUENCE IF NOT EXISTS public.ticket_id_seq    AS BIGINT MINVALUE 1;
CREATE SEQUENCE IF NOT EXISTS public.amc_id_seq       AS BIGINT MINVALUE 1;
CREATE SEQUENCE IF NOT EXISTS public.technician_id_seq AS BIGINT MINVALUE 1;

DO $$
DECLARE n bigint;
BEGIN
  -- substring(... '^PREFIX(\d+)$') ignores ids that are not plain counters,
  -- e.g. the deterministic PM-derived ticket ids (TK-PM-002-Q1).
  SELECT COALESCE(MAX((substring(id FROM '^C(\d+)$'))::bigint), 0) INTO n FROM public.customers;
  PERFORM setval('public.customer_id_seq', GREATEST(n, 1), n > 0);

  SELECT COALESCE(MAX((substring(id FROM '^E(\d+)$'))::bigint), 0) INTO n FROM public.equipment;
  PERFORM setval('public.equipment_id_seq', GREATEST(n, 1), n > 0);

  SELECT COALESCE(MAX((substring(id FROM '^TK-(\d+)$'))::bigint), 0) INTO n FROM public.tickets;
  PERFORM setval('public.ticket_id_seq', GREATEST(n, 1), n > 0);

  SELECT COALESCE(MAX((substring(id FROM '^AMC-(\d+)$'))::bigint), 0) INTO n FROM public.amc_contracts;
  PERFORM setval('public.amc_id_seq', GREATEST(n, 1), n > 0);

  SELECT COALESCE(MAX((substring(id FROM '^TECH-(\d+)$'))::bigint), 0) INTO n FROM public.technicians;
  PERFORM setval('public.technician_id_seq', GREATEST(n, 1), n > 0);
END $$;

ALTER TABLE public.customers     ALTER COLUMN id SET DEFAULT 'C'     || lpad(nextval('public.customer_id_seq')::text, 3, '0');
ALTER TABLE public.equipment     ALTER COLUMN id SET DEFAULT 'E'     || lpad(nextval('public.equipment_id_seq')::text, 3, '0');
ALTER TABLE public.tickets       ALTER COLUMN id SET DEFAULT 'TK-'   || lpad(nextval('public.ticket_id_seq')::text, 3, '0');
ALTER TABLE public.amc_contracts ALTER COLUMN id SET DEFAULT 'AMC-'  || lpad(nextval('public.amc_id_seq')::text, 3, '0');
ALTER TABLE public.technicians   ALTER COLUMN id SET DEFAULT 'TECH-' || lpad(nextval('public.technician_id_seq')::text, 3, '0');

GRANT USAGE, SELECT ON SEQUENCE
  public.customer_id_seq, public.equipment_id_seq, public.ticket_id_seq,
  public.amc_id_seq, public.technician_id_seq
  TO anon, authenticated, service_role;

-- -------------------------------------------------------------- QR submissions
-- The only write anon can perform. The caller supplies what the form collects;
-- everything that governs workflow state is set here, not by the caller.
CREATE OR REPLACE FUNCTION public.create_ticket_from_qr(
  _equipment_id  TEXT,
  _issue_type    TEXT,
  _remarks       TEXT,
  _location      TEXT DEFAULT NULL,
  _contact_name  TEXT DEFAULT NULL,
  _contact_phone TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eq       public.equipment;
  new_id   TEXT;
BEGIN
  IF _issue_type IS NULL OR btrim(_issue_type) = '' THEN
    RAISE EXCEPTION 'Issue type is required';
  END IF;
  IF _remarks IS NULL OR btrim(_remarks) = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;

  SELECT * INTO eq FROM public.equipment WHERE id = _equipment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown equipment %', _equipment_id;
  END IF;

  INSERT INTO public.tickets (
    equipment_id, equipment_name, customer_id, customer_name,
    location, status, assigned_technician, remarks, issue_type, created_date
  ) VALUES (
    eq.id, eq.name, eq.customer_id, eq.customer_name,
    COALESCE(NULLIF(btrim(_location), ''), eq.customer_name),
    'Pending',          -- never caller-controlled
    NULL,               -- never caller-controlled
    format('[Customer: %s, Phone: %s] %s',
           COALESCE(NULLIF(btrim(_contact_name), ''),  'N/A'),
           COALESCE(NULLIF(btrim(_contact_phone), ''), 'N/A'),
           left(btrim(_remarks), 2000)),
    left(btrim(_issue_type), 100),
    CURRENT_DATE
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.create_ticket_from_qr(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_ticket_from_qr(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- anon no longer writes to the table directly.
DROP POLICY IF EXISTS "Anon create ticket from QR" ON public.tickets;
