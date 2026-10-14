-- F-28 (corrected): optimistic concurrency needs an exactly round-trippable
-- version token.
--
-- The first attempt guarded concurrent edits with `updated_at`. That does not
-- work. Postgres stores timestamptz with microsecond precision
-- (2026-10-14 15:21:57.744874+00) but PostgREST serialises it to JSON with
-- milliseconds (2026-10-14T15:21:57.744Z), so the value the browser holds back
-- is never equal to the value stored in the row. UPDATE ... WHERE updated_at =
-- <what the client saw> matched zero rows every time, and because a
-- RLS/filter-miss returns HTTP 200 with an empty body, every guarded write was
-- reported to the user as a concurrent-edit conflict even when nobody else had
-- touched the record.
--
-- An integer round-trips through JSON exactly, so row_version is the token.

CREATE OR REPLACE FUNCTION public.bump_row_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Derived from the stored row, never from the request payload, so a client
  -- cannot defeat the guard by sending a row_version of its own.
  NEW.row_version := COALESCE(OLD.row_version, 0) + 1;
  RETURN NEW;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','equipment','tickets','amc_contracts','pm_schedules','technicians']
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS row_version INTEGER NOT NULL DEFAULT 1', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_bump_row_version', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.bump_row_version()',
      t || '_bump_row_version', t);
  END LOOP;
END $$;

-- row_version changes on every single update, so like updated_at it is
-- bookkeeping rather than history: keep it out of the audit diff, otherwise
-- every entry carries a meaningless row_version delta and a touch that changed
-- nothing else would log as a change.
CREATE OR REPLACE FUNCTION public.write_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec_id   TEXT;
  diff     JSONB := '{}'::jsonb;
  k        TEXT;
  old_j    JSONB;
  new_j    JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec_id := (to_jsonb(OLD) ->> 'id');
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, changes, actor_role)
    VALUES (TG_TABLE_NAME, rec_id, 'DELETE', auth.uid(), to_jsonb(OLD), auth.role());
    RETURN OLD;
  END IF;

  rec_id := (to_jsonb(NEW) ->> 'id');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, changes, actor_role)
    VALUES (TG_TABLE_NAME, rec_id, 'INSERT', auth.uid(), to_jsonb(NEW), auth.role());
    RETURN NEW;
  END IF;

  old_j := to_jsonb(OLD);
  new_j := to_jsonb(NEW);
  FOR k IN SELECT jsonb_object_keys(new_j) LOOP
    IF k NOT IN ('updated_at', 'row_version')
       AND (old_j -> k) IS DISTINCT FROM (new_j -> k) THEN
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', old_j -> k, 'to', new_j -> k));
    END IF;
  END LOOP;

  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, changes, actor_role)
    VALUES (TG_TABLE_NAME, rec_id, 'UPDATE', auth.uid(), diff, auth.role());
  END IF;

  RETURN NEW;
END $$;
