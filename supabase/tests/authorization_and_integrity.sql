-- Authorization and integrity assertions for the Indian Orthocare database.
--
-- Run it against a THROWAWAY database built from supabase/migrations alone - it
-- creates fixtures of its own and does not clean up after itself, because the
-- immutability rules it asserts (F01/F02) correctly refuse to delete a completed
-- ticket or a paid contract. Never point it at production.
--
--   createdb scratch && psql -d scratch -f supabase/tests/authorization_and_integrity.sql
--
-- It prints one row per assertion and a passed/failed/total tally at the end.
-- 63 assertions, 0 failures as of the fix branch.

\set ON_ERROR_STOP off
\pset pager off
\set QUIET on

-- ============ assertion harness ============
CREATE SCHEMA IF NOT EXISTS t;
CREATE TABLE IF NOT EXISTS t.results(id serial, name text, ok boolean, detail text);
TRUNCATE t.results;
-- The runners drop privilege to exercise RLS, so the harness's own bookkeeping
-- has to stay reachable from every role - otherwise "permission denied for
-- schema t" masquerades as the result of the test.
GRANT USAGE ON SCHEMA t TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON t.results TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA t TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION t.as_role(_role text, _uid text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF _uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('role', _role)::text, true);
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('role', _role, 'sub', _uid)::text, true);
  END IF;
END $$;

-- Run a statement as a role and record whether it was permitted / how many rows.
CREATE OR REPLACE FUNCTION t.check_count(_name text, _role text, _uid text, _sql text, _expect bigint)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n bigint; msg text;
BEGIN
  BEGIN
    PERFORM t.as_role(_role, _uid);
    EXECUTE format('SET LOCAL role %I', _role);
    EXECUTE _sql INTO n;
    RESET role;
    INSERT INTO t.results(name, ok, detail)
    VALUES (_name, n = _expect, format('rows=%s expected=%s', n, _expect));
  EXCEPTION WHEN OTHERS THEN
    RESET role;
    msg := SQLERRM;
    INSERT INTO t.results(name, ok, detail) VALUES (_name, false, 'error: '||msg);
  END;
END $$;

-- Run a write as a role; expect it to be refused (by RLS, privilege or constraint).
CREATE OR REPLACE FUNCTION t.check_refused(_name text, _role text, _uid text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE msg text; affected bigint;
BEGIN
  BEGIN
    PERFORM t.as_role(_role, _uid);
    EXECUTE format('SET LOCAL role %I', _role);
    EXECUTE _sql;
    GET DIAGNOSTICS affected = ROW_COUNT;
    RESET role;
    -- An RLS-filtered UPDATE/DELETE is not an error, it simply matches nothing.
    INSERT INTO t.results(name, ok, detail)
    VALUES (_name, affected = 0, format('permitted, %s row(s) affected', affected));
  EXCEPTION WHEN OTHERS THEN
    RESET role;
    msg := SQLERRM;
    INSERT INTO t.results(name, ok, detail) VALUES (_name, true, 'refused: '||left(msg, 60));
  END;
END $$;

-- Expect a write to succeed and affect rows.
CREATE OR REPLACE FUNCTION t.check_allowed(_name text, _role text, _uid text, _sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE msg text; affected bigint;
BEGIN
  BEGIN
    PERFORM t.as_role(_role, _uid);
    EXECUTE format('SET LOCAL role %I', _role);
    EXECUTE _sql;
    GET DIAGNOSTICS affected = ROW_COUNT;
    RESET role;
    INSERT INTO t.results(name, ok, detail)
    VALUES (_name, affected > 0, format('%s row(s) affected', affected));
  EXCEPTION WHEN OTHERS THEN
    RESET role;
    msg := SQLERRM;
    INSERT INTO t.results(name, ok, detail) VALUES (_name, false, 'refused: '||left(msg, 70));
  END;
END $$;

CREATE OR REPLACE FUNCTION t.check_bool(_name text, _cond boolean, _detail text DEFAULT '')
RETURNS void LANGUAGE sql AS $$
  INSERT INTO t.results(name, ok, detail) VALUES (_name, coalesce(_cond,false), _detail);
$$;

-- ============ seed (superuser, bypasses RLS) ============
-- Runs against a database freshly built from the migrations (see run-assert.sh).
-- It deliberately does not try to clear the tables first: the immutability
-- trigger refuses to delete a completed ticket or a paid contract, which is the
-- behaviour F01/F02 assert, so a reset-in-place would half-fail and leave the
-- fixtures in a state the assertions silently misread.
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111','admin@qa.invalid'),
  ('22222222-2222-2222-2222-222222222222','tech1@qa.invalid'),
  ('33333333-3333-3333-3333-333333333333','tech2@qa.invalid'),
  ('44444444-4444-4444-4444-444444444444','noroles@qa.invalid');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111','admin'),
  ('22222222-2222-2222-2222-222222222222','technician'),
  ('33333333-3333-3333-3333-333333333333','technician');

INSERT INTO public.technicians (id,name,phone,email,specialization,is_active,user_id) VALUES
  ('TECH-901','TEST-Tech One','9000000001','tech1@qa.invalid','X-Ray',true,'22222222-2222-2222-2222-222222222222'),
  ('TECH-902','TEST-Tech Two','9000000002','tech2@qa.invalid','C-Arm',true,'33333333-3333-3333-3333-333333333333');

INSERT INTO public.customers (id,name,contact_person,phone,email,address) VALUES
  ('C001','TEST-Apollo','Dr Rao','9111111111','rao@qa.invalid','Chennai'),
  ('C002','TEST-Fortis','Dr Iyer','9222222222','iyer@qa.invalid','Madurai');

INSERT INTO public.equipment (id,name,model_number,serial_number,customer_id,customer_name,installation_date,warranty_start_date,warranty_end_date) VALUES
  ('E001','TEST-C-Arm','CA-100','SN-A-001','C001','TEST-Apollo','2026-01-10','2026-01-10','2027-01-09'),
  ('E002','TEST-X-Ray','XR-200','SN-B-002','C002','TEST-Fortis','2026-02-20','2026-02-20','2027-02-19');

INSERT INTO public.amc_contracts (id,equipment_id,equipment_name,customer_id,customer_name,start_date,end_date,price,status) VALUES
  ('AMC-001','E001','TEST-C-Arm','C001','TEST-Apollo','2026-03-01','2027-02-28',50000,'Quotation Sent'),
  ('AMC-002','E002','TEST-X-Ray','C002','TEST-Fortis','2026-03-01','2027-02-28',60000,'Payment Received');

INSERT INTO public.pm_schedules (id,amc_id,equipment_id,equipment_name,customer_name,pm_number,planned_date,status,assigned_technician) VALUES
  ('PM-001-Q1','AMC-001','E001','TEST-C-Arm','TEST-Apollo',1,'2026-06-01','Assigned','TECH-901'),
  ('PM-002-Q1','AMC-002','E002','TEST-X-Ray','TEST-Fortis',1,'2026-06-01','Assigned','TECH-902');

INSERT INTO public.tickets (id,equipment_id,equipment_name,customer_id,customer_name,location,status,assigned_technician,remarks) VALUES
  ('TK-001','E001','TEST-C-Arm','C001','TEST-Apollo','Chennai','Assigned','TECH-901','seed'),
  ('TK-002','E002','TEST-X-Ray','C002','TEST-Fortis','Madurai','Assigned','TECH-902','seed'),
  ('TK-003','E001','TEST-C-Arm','C001','TEST-Apollo','Chennai','Completed','TECH-901','seed');

\set QUIET off
-- ============================================================
--  A. anonymous surface
-- ============================================================
SELECT t.check_count('A01 anon reads no customers','anon',NULL,'select count(*) from public.customers',0);
SELECT t.check_count('A02 anon reads no equipment','anon',NULL,'select count(*) from public.equipment',0);
SELECT t.check_count('A03 anon reads no tickets','anon',NULL,'select count(*) from public.tickets',0);
SELECT t.check_count('A04 anon reads no contracts','anon',NULL,'select count(*) from public.amc_contracts',0);
SELECT t.check_count('A05 anon reads no PM visits','anon',NULL,'select count(*) from public.pm_schedules',0);
SELECT t.check_count('A06 anon reads no technicians','anon',NULL,'select count(*) from public.technicians',0);
SELECT t.check_count('A07 anon reads no audit log','anon',NULL,'select count(*) from public.audit_log',0);
SELECT t.check_count('A08 anon reads no user_roles','anon',NULL,'select count(*) from public.user_roles',0);
SELECT t.check_refused('A09 anon cannot insert a customer','anon',NULL,
  $$insert into public.customers(id,name,contact_person,phone,email,address) values ('CX','x','x','x','x','x')$$);
SELECT t.check_refused('A10 anon cannot update equipment','anon',NULL,
  $$update public.equipment set name='hacked' where id='E001'$$);
SELECT t.check_refused('A11 anon cannot delete a ticket','anon',NULL,
  $$delete from public.tickets where id='TK-001'$$);
-- the one thing anon is meant to do: scan a QR label
SELECT t.check_count('A12 anon can resolve a QR code via the RPC','anon',NULL,
  $$select count(*) from public.get_equipment_for_qr('E001')$$, 1);
SELECT t.check_count('A13 QR RPC leaks nothing for an unknown id','anon',NULL,
  $$select count(*) from public.get_equipment_for_qr('NOPE')$$, 0);

-- ============================================================
--  B. technician scope
-- ============================================================
SELECT t.check_count('B01 technician sees only own tickets','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.tickets', 2);
SELECT t.check_count('B02 technician cannot see another technician''s ticket','authenticated','22222222-2222-2222-2222-222222222222',
  $$select count(*) from public.tickets where id='TK-002'$$, 0);
SELECT t.check_count('B03 technician sees only own PM visits','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.pm_schedules', 1);
SELECT t.check_count('B04 technician sees only equipment they work on','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.equipment', 1);
SELECT t.check_count('B05 technician sees only customers they work for','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.customers', 1);
SELECT t.check_count('B06 technician sees only their own staff record','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.technicians', 1);
SELECT t.check_count('B07 technician sees contracts for their equipment only','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.amc_contracts', 1);
SELECT t.check_count('B08 technician cannot read the audit log','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.audit_log', 0);
SELECT t.check_allowed('B09 technician can update their own ticket','authenticated','22222222-2222-2222-2222-222222222222',
  $$update public.tickets set status='In Progress' where id='TK-001'$$);
SELECT t.check_refused('B10 technician cannot update another technician''s ticket','authenticated','22222222-2222-2222-2222-222222222222',
  $$update public.tickets set status='Completed' where id='TK-002'$$);
SELECT t.check_refused('B11 technician cannot reassign a ticket to themselves','authenticated','22222222-2222-2222-2222-222222222222',
  $$update public.tickets set assigned_technician='TECH-901' where id='TK-002'$$);
SELECT t.check_allowed('B12 technician can update their own PM visit','authenticated','22222222-2222-2222-2222-222222222222',
  $$update public.pm_schedules set status='Completed' where id='PM-001-Q1'$$);
SELECT t.check_refused('B13 technician cannot update another''s PM visit','authenticated','22222222-2222-2222-2222-222222222222',
  $$update public.pm_schedules set status='Completed' where id='PM-002-Q1'$$);
SELECT t.check_refused('B14 technician cannot delete a ticket','authenticated','22222222-2222-2222-2222-222222222222',
  $$delete from public.tickets where id='TK-001'$$);
SELECT t.check_refused('B15 technician cannot create a customer','authenticated','22222222-2222-2222-2222-222222222222',
  $$insert into public.customers(id,name,contact_person,phone,email,address) values ('CY','y','y','y','y','y')$$);
SELECT t.check_refused('B16 technician cannot edit equipment','authenticated','22222222-2222-2222-2222-222222222222',
  $$update public.equipment set name='hacked' where id='E001'$$);
SELECT t.check_refused('B17 technician cannot grant themselves admin','authenticated','22222222-2222-2222-2222-222222222222',
  $$insert into public.user_roles(user_id,role) values ('22222222-2222-2222-2222-222222222222','admin')$$);
SELECT t.check_count('B18 technician sees only their own role row','authenticated','22222222-2222-2222-2222-222222222222',
  'select count(*) from public.user_roles', 1);

-- ============================================================
--  C. a signed-in user with no role sees nothing
-- ============================================================
SELECT t.check_count('C01 role-less user sees no customers','authenticated','44444444-4444-4444-4444-444444444444',
  'select count(*) from public.customers', 0);
SELECT t.check_count('C02 role-less user sees no tickets','authenticated','44444444-4444-4444-4444-444444444444',
  'select count(*) from public.tickets', 0);
SELECT t.check_count('C03 role-less user sees no technicians','authenticated','44444444-4444-4444-4444-444444444444',
  'select count(*) from public.technicians', 0);
SELECT t.check_refused('C04 role-less user cannot write','authenticated','44444444-4444-4444-4444-444444444444',
  $$update public.tickets set status='Completed' where id='TK-001'$$);

-- ============================================================
--  D. admin
-- ============================================================
SELECT t.check_count('D01 admin sees every customer','authenticated','11111111-1111-1111-1111-111111111111',
  'select count(*) from public.customers', 2);
SELECT t.check_count('D02 admin sees every ticket','authenticated','11111111-1111-1111-1111-111111111111',
  'select count(*) from public.tickets', 3);
SELECT t.check_count('D03 admin can read the audit log','authenticated','11111111-1111-1111-1111-111111111111',
  'select case when count(*) > 0 then 1 else 0 end from public.audit_log', 1);
SELECT t.check_allowed('D04 admin can edit any ticket','authenticated','11111111-1111-1111-1111-111111111111',
  $$update public.tickets set remarks='admin edit' where id='TK-002'$$);
SELECT t.check_allowed('D05 admin can create a customer','authenticated','11111111-1111-1111-1111-111111111111',
  $$insert into public.customers(id,name,contact_person,phone,email,address) values ('C003','TEST-New','P','9','n@qa.invalid','A')$$);

-- ============================================================
--  E. integrity constraints
-- ============================================================
SELECT t.check_refused('E01 contract end before start refused','postgres',NULL,
  $$insert into public.amc_contracts(id,equipment_id,equipment_name,customer_id,customer_name,start_date,end_date,price,status)
    values ('AMC-BAD','E001','x','C001','x','2027-01-01','2026-01-01',100,'Quotation Sent')$$);
SELECT t.check_refused('E02 negative contract value refused','postgres',NULL,
  $$insert into public.amc_contracts(id,equipment_id,equipment_name,customer_id,customer_name,start_date,end_date,price,status)
    values ('AMC-BAD2','E001','x','C001','x','2026-01-01','2027-01-01',-1,'Quotation Sent')$$);
SELECT t.check_refused('E03 warranty end before warranty start refused','postgres',NULL,
  $$insert into public.equipment(id,name,model_number,serial_number,customer_id,customer_name,warranty_start_date,warranty_end_date)
    values ('E-BAD','x','m','SN-BAD','C001','x','2027-01-01','2026-01-01')$$);
SELECT t.check_refused('E04 blank customer name refused','postgres',NULL,
  $$insert into public.customers(id,name,contact_person,phone,email,address) values ('C-BAD','   ','x','x','x','x')$$);
SELECT t.check_refused('E05 duplicate customer name refused (case-insensitive)','postgres',NULL,
  $$insert into public.customers(id,name,contact_person,phone,email,address) values ('C-DUP','test-apollo','x','x','x','x')$$);
SELECT t.check_refused('E06 duplicate serial refused (case/space-insensitive)','postgres',NULL,
  $$insert into public.equipment(id,name,model_number,serial_number,customer_id,customer_name) values ('E-DUP','x','m','  sn-a-001  ','C001','x')$$);
SELECT t.check_allowed('E07 two blank serials are still allowed','postgres',NULL,
  $$insert into public.equipment(id,name,model_number,serial_number,customer_id,customer_name) values ('E-BL1','x','m','','C001','x'),('E-BL2','x','m','','C001','x')$$);
SELECT t.check_refused('E08 equipment pointing at no customer refused','postgres',NULL,
  $$insert into public.equipment(id,name,model_number,serial_number,customer_id,customer_name) values ('E-FK','x','m','SN-FK','C-NONE','x')$$);
SELECT t.check_refused('E09 PM visit for a non-existent contract refused','postgres',NULL,
  $$insert into public.pm_schedules(id,amc_id,equipment_id,equipment_name,customer_name,pm_number,planned_date,status)
    values ('PM-FK','AMC-NONE','E001','x','x',1,'2026-06-01','Pending')$$);

-- ============================================================
--  F. settled records cannot be made to disappear
-- ============================================================
SELECT t.check_refused('F01 a paid contract cannot be deleted','postgres',NULL,
  $$delete from public.amc_contracts where id='AMC-002'$$);
SELECT t.check_refused('F02 a completed ticket cannot be deleted','postgres',NULL,
  $$delete from public.tickets where id='TK-003'$$);
SELECT t.check_allowed('F03 an unsettled contract can still be deleted','postgres',NULL,
  $$delete from public.pm_schedules where amc_id='AMC-001'$$);

-- ============================================================
--  G. audit trail
-- ============================================================
DO $$ BEGIN
  UPDATE public.tickets SET status='Assigned', remarks='seed' WHERE id='TK-001';
  DELETE FROM public.audit_log;
  UPDATE public.tickets SET status='Completed', remarks='audit probe' WHERE id='TK-001';
END $$;
SELECT t.check_bool('G01 an edit is recorded in the audit log',
  (SELECT count(*) = 1 FROM public.audit_log WHERE table_name='tickets' AND record_id='TK-001' AND action='UPDATE'),
  (SELECT coalesce(string_agg(action,','),'none') FROM public.audit_log));
SELECT t.check_bool('G02 the audit entry records old and new values',
  (SELECT changes->'status'->>'from' = 'Assigned' AND changes->'status'->>'to' = 'Completed'
     FROM public.audit_log WHERE table_name='tickets' AND record_id='TK-001' AND action='UPDATE' LIMIT 1),
  (SELECT changes::text FROM public.audit_log WHERE record_id='TK-001' AND action='UPDATE' LIMIT 1));
SELECT t.check_bool('G03 bookkeeping columns are left out of the diff',
  (SELECT NOT (changes ? 'updated_at') AND NOT (changes ? 'row_version')
     FROM public.audit_log WHERE table_name='tickets' AND record_id='TK-001' AND action='UPDATE' LIMIT 1));
DO $$ BEGIN
  DELETE FROM public.audit_log;
  UPDATE public.tickets SET updated_at = now() WHERE id='TK-001';
END $$;
SELECT t.check_bool('G04 a touch that changes nothing logs nothing',
  (SELECT count(*) = 0 FROM public.audit_log),
  (SELECT coalesce(string_agg(changes::text,' | '),'none') FROM public.audit_log));

-- ============================================================
--  H. optimistic concurrency token
-- ============================================================
SELECT t.check_bool('H01 every business table carries row_version',
  (SELECT count(*) = 6 FROM information_schema.columns
    WHERE table_schema='public' AND column_name='row_version'
      AND table_name IN ('customers','equipment','tickets','amc_contracts','pm_schedules','technicians')));
DO $$ BEGIN PERFORM set_config('t.v0', (SELECT row_version::text FROM public.tickets WHERE id='TK-002'), false); END $$;
DO $$ BEGIN UPDATE public.tickets SET remarks='bump 1' WHERE id='TK-002'; END $$;
SELECT t.check_bool('H02 an update bumps row_version by one',
  (SELECT row_version = current_setting('t.v0')::int + 1 FROM public.tickets WHERE id='TK-002'),
  (SELECT 'was '||current_setting('t.v0')||', now '||row_version FROM public.tickets WHERE id='TK-002'));
DO $$ BEGIN UPDATE public.tickets SET remarks='bump 2', row_version = 999 WHERE id='TK-002'; END $$;
SELECT t.check_bool('H03 a client cannot set row_version itself',
  (SELECT row_version <> 999 FROM public.tickets WHERE id='TK-002'),
  (SELECT 'row_version='||row_version FROM public.tickets WHERE id='TK-002'));
DO $$
DECLARE n bigint; v int;
BEGIN
  SELECT row_version INTO v FROM public.tickets WHERE id='TK-002';
  UPDATE public.tickets SET remarks='guarded ok' WHERE id='TK-002' AND row_version = v;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM t.check_bool('H04 a guarded update on the current version applies', n = 1, format('%s row(s)', n));

  UPDATE public.tickets SET remarks='guarded stale' WHERE id='TK-002' AND row_version = 1;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM t.check_bool('H05 a guarded update on a stale version matches nothing', n = 0,
                       format('%s row(s); remarks=%s', n, (SELECT remarks FROM public.tickets WHERE id='TK-002')));
END $$;
SELECT t.check_bool('H06 row_version survives a JSON round-trip exactly',
  (SELECT (to_jsonb(tk) ->> 'row_version')::int = tk.row_version FROM public.tickets tk WHERE id='TK-002'));
SELECT t.check_bool('H07 updated_at does NOT survive a JSON round-trip (why it cannot be the token)',
  (SELECT to_char(updated_at, 'US') <> to_char(date_trunc('milliseconds', updated_at), 'US')
     FROM public.tickets WHERE id='TK-002'),
  (SELECT 'microseconds='||to_char(updated_at,'US') FROM public.tickets WHERE id='TK-002'));

-- ============================================================
\set QUIET on
\echo ''
\pset format aligned
SELECT CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS r, name, detail FROM t.results ORDER BY id;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) FILTER (WHERE NOT ok) AS failed, count(*) AS total FROM t.results;

-- Exit non-zero when anything failed, so this works as a CI gate rather than
-- something a human has to read. ON_ERROR_STOP is off for the body of this file
-- (an assertion that a write is refused raises, and must not end the run), so it
-- has to be turned back on here or psql would exit 0 despite the exception.
\set ON_ERROR_STOP on
DO $$
DECLARE failed int; names text;
BEGIN
  SELECT count(*), string_agg(name, '; ') INTO failed, names FROM t.results WHERE NOT ok;
  IF failed > 0 THEN
    RAISE EXCEPTION '% assertion(s) failed: %', failed, names;
  END IF;
  RAISE NOTICE '---- % assertion(s), 0 failed ----', (SELECT count(*) FROM t.results);
END $$;
