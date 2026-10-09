-- Authorization regression suite.
--
-- Asserts what each role can actually do, by executing real statements under
-- SET LOCAL role + request.jwt.claims. Every check that mattered to a
-- production defect is here. See README.md in this directory for how to run it.
--
-- Prints one line per assertion and raises at the end if any failed.

\set ON_ERROR_STOP on
\pset pager off
SET client_min_messages TO notice;

CREATE TEMP TABLE _results (name text, expected text, actual text, ok boolean);

-- expect: 'rows=N', 'blocked', or 'rows>0'
CREATE OR REPLACE FUNCTION pg_temp.check(
  label text, role_name text, claims text, stmt text, expected text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint; actual text;
BEGIN
  BEGIN
    EXECUTE format('SET LOCAL role %I', role_name);
    PERFORM set_config('request.jwt.claims', claims, true);
    EXECUTE stmt;
    GET DIAGNOSTICS n = ROW_COUNT;
    actual := 'rows=' || n;
  EXCEPTION WHEN OTHERS THEN
    actual := 'blocked';
  END;
  RESET role;
  PERFORM set_config('request.jwt.claims', '', true);

  INSERT INTO _results VALUES (
    label, expected, actual,
    CASE
      WHEN expected = 'rows>0' THEN actual LIKE 'rows=%' AND split_part(actual, '=', 2)::bigint > 0
      ELSE actual = expected
    END
  );
END $$;

-- --------------------------------------------------------------- clean slate
-- Makes the suite idempotent: it can be run repeatedly against the same
-- database, and leaves nothing behind (see the matching block at the end).
CREATE OR REPLACE FUNCTION pg_temp.purge_fixtures() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.tickets      WHERE id LIKE 'RLS-%' OR equipment_id LIKE 'RLS-%';
  DELETE FROM public.pm_schedules WHERE id LIKE 'RLS-%' OR equipment_id LIKE 'RLS-%';
  DELETE FROM public.amc_contracts WHERE id LIKE 'RLS-%' OR equipment_id LIKE 'RLS-%';
  DELETE FROM public.equipment    WHERE id LIKE 'RLS-%';
  DELETE FROM public.customers    WHERE id LIKE 'RLS-%' OR name = 'Seq Co';
  DELETE FROM public.technicians  WHERE id LIKE 'RLS-%';
  DELETE FROM public.user_roles   WHERE user_id::text LIKE 'aaaaaaaa-0000-0000-0000-%';
  DELETE FROM auth.users          WHERE id::text LIKE 'aaaaaaaa-0000-0000-0000-%';
END $$;

SELECT pg_temp.purge_fixtures();

-- ---------------------------------------------------------------- fixtures
INSERT INTO auth.users (id, email) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'rls-admin@test.invalid'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'rls-tech-a@test.invalid'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'rls-tech-b@test.invalid'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'rls-norole@test.invalid');
INSERT INTO public.user_roles (user_id, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'admin'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'technician'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'technician');

INSERT INTO public.technicians (id, name, phone, email, specialization, is_active, user_id) VALUES
  ('RLS-A', 'RLS Tech A', '9000000001', 'rls-tech-a@test.invalid', 'Service Engineer', true, 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('RLS-B', 'RLS Tech B', '9000000002', 'rls-tech-b@test.invalid', 'Service Engineer', true, 'aaaaaaaa-0000-0000-0000-000000000003');

INSERT INTO public.customers (id, name, contact_person, phone, email, address) VALUES
  ('RLS-C1', 'RLS Hospital', 'Dr RLS', '9111111111', 'dr@rls.invalid', '1 Test Road');
INSERT INTO public.equipment (id, name, model_number, serial_number, customer_id, customer_name, installation_date, warranty_start_date, warranty_end_date) VALUES
  ('RLS-E1', 'RLS C-Arm', 'M-1', 'S-1', 'RLS-C1', 'RLS Hospital', CURRENT_DATE - 30, CURRENT_DATE - 30, CURRENT_DATE + 60);
INSERT INTO public.amc_contracts (id, equipment_id, equipment_name, customer_id, customer_name, start_date, end_date, price, status) VALUES
  ('RLS-AMC1', 'RLS-E1', 'RLS C-Arm', 'RLS-C1', 'RLS Hospital', CURRENT_DATE, CURRENT_DATE + 365, 50000, 'Quotation Sent');
INSERT INTO public.pm_schedules (id, amc_id, equipment_id, equipment_name, customer_name, pm_number, planned_date, status, assigned_technician) VALUES
  ('RLS-PM1', 'RLS-AMC1', 'RLS-E1', 'RLS C-Arm', 'RLS Hospital', 1, CURRENT_DATE + 10, 'Assigned', 'RLS-A');
INSERT INTO public.tickets (id, equipment_id, equipment_name, customer_id, customer_name, location, status, assigned_technician, remarks, issue_type, created_date) VALUES
  ('RLS-TK1', 'RLS-E1', 'RLS C-Arm', 'RLS-C1', 'RLS Hospital', 'Ward 1', 'Assigned', 'RLS-A', 'a', 'Breakdown', CURRENT_DATE),
  ('RLS-TK2', 'RLS-E1', 'RLS C-Arm', 'RLS-C1', 'RLS Hospital', 'Ward 2', 'Assigned', 'RLS-B', 'b', 'Breakdown', CURRENT_DATE);

\set ANON   '{"role":"anon"}'
\set ADMIN  '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000001"}'
\set TECH_A '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000002"}'
\set TECH_B '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000003"}'
\set NOROLE '{"role":"authenticated","sub":"aaaaaaaa-0000-0000-0000-000000000004"}'

-- ------------------------------------------------- anon: reads are closed
SELECT pg_temp.check('anon cannot read customers',        'anon', :'ANON', 'SELECT * FROM customers', 'rows=0');
SELECT pg_temp.check('anon cannot read equipment',        'anon', :'ANON', 'SELECT * FROM equipment', 'rows=0');
SELECT pg_temp.check('anon cannot read tickets',          'anon', :'ANON', 'SELECT * FROM tickets', 'rows=0');
SELECT pg_temp.check('anon cannot read amc_contracts',    'anon', :'ANON', 'SELECT * FROM amc_contracts', 'rows=0');
SELECT pg_temp.check('anon cannot read pm_schedules',     'anon', :'ANON', 'SELECT * FROM pm_schedules', 'rows=0');
SELECT pg_temp.check('anon cannot read technicians',      'anon', :'ANON', 'SELECT * FROM technicians', 'rows=0');
SELECT pg_temp.check('anon cannot read user_roles',       'anon', :'ANON', 'SELECT * FROM user_roles', 'rows=0');
SELECT pg_temp.check('anon cannot read sales_orders',     'anon', :'ANON', 'SELECT * FROM sales_orders', 'rows=0');
SELECT pg_temp.check('anon cannot read sync_log',         'anon', :'ANON', 'SELECT * FROM sync_log', 'rows=0');

-- ------------------------------------------- anon: writes are closed too
SELECT pg_temp.check('anon cannot insert a customer',     'anon', :'ANON',
  'INSERT INTO customers (name,contact_person,phone,email,address) VALUES (''x'',''x'',''1'',''a@b.c'',''z'')', 'blocked');
SELECT pg_temp.check('anon cannot insert a ticket directly', 'anon', :'ANON',
  'INSERT INTO tickets (equipment_id,equipment_name,customer_id,customer_name,location,status,remarks,issue_type,created_date)
   VALUES (''RLS-E1'',''x'',''RLS-C1'',''y'',''z'',''Pending'',''r'',''Breakdown'',CURRENT_DATE)', 'blocked');
SELECT pg_temp.check('anon cannot grant itself admin',    'anon', :'ANON',
  'INSERT INTO user_roles (user_id,role) VALUES (''aaaaaaaa-0000-0000-0000-000000000004'',''admin'')', 'blocked');
SELECT pg_temp.check('anon cannot update a customer',     'anon', :'ANON',
  'UPDATE customers SET phone=''0'' WHERE id=''RLS-C1''', 'rows=0');
SELECT pg_temp.check('anon cannot delete a customer',     'anon', :'ANON',
  'DELETE FROM customers WHERE id=''RLS-C1''', 'rows=0');

-- ------------------------------------- anon: the two permitted functions
SELECT pg_temp.check('anon can look up one equipment row for a QR scan', 'anon', :'ANON',
  'SELECT * FROM get_equipment_for_qr(''RLS-E1'')', 'rows=1');
SELECT pg_temp.check('anon QR lookup returns nothing for an unknown id', 'anon', :'ANON',
  'SELECT * FROM get_equipment_for_qr(''NO-SUCH-ID'')', 'rows=0');
SELECT pg_temp.check('anon can file a QR service request', 'anon', :'ANON',
  'SELECT create_ticket_from_qr(''RLS-E1'',''Breakdown'',''it is making a noise'',''Ward 3'',''Nurse'',''9800000000'')', 'rows=1');
SELECT pg_temp.check('a second QR request does not collide', 'anon', :'ANON',
  'SELECT create_ticket_from_qr(''RLS-E1'',''Breakdown'',''still making a noise'',''Ward 3'',''Nurse'',''9800000000'')', 'rows=1');
SELECT pg_temp.check('QR request rejects a blank issue type', 'anon', :'ANON',
  'SELECT create_ticket_from_qr(''RLS-E1'','''',''x'')', 'blocked');
SELECT pg_temp.check('QR request rejects an unknown equipment id', 'anon', :'ANON',
  'SELECT create_ticket_from_qr(''NO-SUCH-ID'',''Breakdown'',''x'')', 'blocked');

-- -------------------------------------------------- technician isolation
SELECT pg_temp.check('technician sees their own ticket',  'authenticated', :'TECH_A', 'SELECT * FROM tickets WHERE id=''RLS-TK1''', 'rows=1');
SELECT pg_temp.check('technician sees their own PM',      'authenticated', :'TECH_A', 'SELECT * FROM pm_schedules WHERE id=''RLS-PM1''', 'rows=1');
SELECT pg_temp.check('technician can close their own ticket', 'authenticated', :'TECH_A',
  'UPDATE tickets SET status=''Completed'' WHERE id=''RLS-TK1''', 'rows=1');
SELECT pg_temp.check('technician cannot see another tech ticket', 'authenticated', :'TECH_A',
  'SELECT * FROM tickets WHERE id=''RLS-TK2''', 'rows=0');
SELECT pg_temp.check('technician cannot update another tech ticket', 'authenticated', :'TECH_B',
  'UPDATE tickets SET status=''Completed'' WHERE id=''RLS-TK1''', 'rows=0');
SELECT pg_temp.check('technician cannot update another tech PM', 'authenticated', :'TECH_B',
  'UPDATE pm_schedules SET status=''Completed'' WHERE id=''RLS-PM1''', 'rows=0');
SELECT pg_temp.check('technician cannot reassign their ticket', 'authenticated', :'TECH_A',
  'UPDATE tickets SET assigned_technician=''RLS-B'' WHERE id=''RLS-TK1''', 'blocked');
SELECT pg_temp.check('technician cannot insert a ticket', 'authenticated', :'TECH_A',
  'INSERT INTO tickets (equipment_id,equipment_name,customer_id,customer_name,location,status,remarks,issue_type,created_date)
   VALUES (''RLS-E1'',''x'',''RLS-C1'',''y'',''z'',''Pending'',''r'',''Breakdown'',CURRENT_DATE)', 'blocked');
SELECT pg_temp.check('technician cannot edit a customer', 'authenticated', :'TECH_A',
  'UPDATE customers SET phone=''0'' WHERE id=''RLS-C1''', 'rows=0');
SELECT pg_temp.check('technician cannot escalate to admin', 'authenticated', :'TECH_A',
  'INSERT INTO user_roles (user_id,role) VALUES (''aaaaaaaa-0000-0000-0000-000000000002'',''admin'')', 'blocked');
SELECT pg_temp.check('technician cannot read sales_orders', 'authenticated', :'TECH_A', 'SELECT * FROM sales_orders', 'rows=0');
SELECT pg_temp.check('technician can read customers for context', 'authenticated', :'TECH_A', 'SELECT * FROM customers', 'rows>0');

-- ------------------------------------------------ authenticated, no role
SELECT pg_temp.check('no-role user reads no customers', 'authenticated', :'NOROLE', 'SELECT * FROM customers', 'rows=0');
SELECT pg_temp.check('no-role user reads no tickets',   'authenticated', :'NOROLE', 'SELECT * FROM tickets', 'rows=0');
SELECT pg_temp.check('no-role user reads no sales_orders', 'authenticated', :'NOROLE', 'SELECT * FROM sales_orders', 'rows=0');
SELECT pg_temp.check('no-role user cannot grant itself admin', 'authenticated', :'NOROLE',
  'INSERT INTO user_roles (user_id,role) VALUES (''aaaaaaaa-0000-0000-0000-000000000004'',''admin'')', 'blocked');

-- ------------------------------------------------------------ admin can work
SELECT pg_temp.check('admin reads customers',   'authenticated', :'ADMIN', 'SELECT * FROM customers', 'rows>0');
SELECT pg_temp.check('admin reads tickets',     'authenticated', :'ADMIN', 'SELECT * FROM tickets', 'rows>0');
SELECT pg_temp.check('admin reads technicians', 'authenticated', :'ADMIN', 'SELECT * FROM technicians', 'rows>0');
SELECT pg_temp.check('admin reads sales_orders','authenticated', :'ADMIN', 'SELECT * FROM sales_orders', 'rows=0');
SELECT pg_temp.check('admin assigns a technician by id', 'authenticated', :'ADMIN',
  'UPDATE tickets SET assigned_technician=''RLS-B'', status=''Assigned'' WHERE id=''RLS-TK1''', 'rows=1');
SELECT pg_temp.check('admin cannot assign a technician by name', 'authenticated', :'ADMIN',
  'UPDATE tickets SET assigned_technician=''RLS Tech B'' WHERE id=''RLS-TK1''', 'blocked');
SELECT pg_temp.check('admin creates a customer without supplying an id', 'authenticated', :'ADMIN',
  'INSERT INTO customers (name,contact_person,phone,email,address) VALUES (''Seq Co'',''p'',''1'',''a@b.c'',''addr'')', 'rows=1');
SELECT pg_temp.check('admin deletes a ticket', 'authenticated', :'ADMIN',
  'DELETE FROM tickets WHERE id=''RLS-TK2''', 'rows=1');

-- ------------------------------------------------------------------ report
SELECT pg_temp.purge_fixtures();

DO $$
DECLARE r record; failed int;
BEGIN
  FOR r IN SELECT * FROM _results ORDER BY ok, name LOOP
    RAISE NOTICE '% | % | expected % got %',
      CASE WHEN r.ok THEN 'PASS' ELSE 'FAIL' END, rpad(r.name, 52), r.expected, r.actual;
  END LOOP;
  SELECT count(*) INTO failed FROM _results WHERE NOT ok;
  RAISE NOTICE '---- % assertion(s), % failed ----', (SELECT count(*) FROM _results), failed;
  IF failed > 0 THEN
    RAISE EXCEPTION '% authorization assertion(s) failed', failed;
  END IF;
END $$;
