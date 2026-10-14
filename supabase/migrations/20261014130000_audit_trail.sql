-- F-33: audit trail and status history.
--
-- Previously the only record of a change was updated_at: who changed what, when,
-- and from which value was not recorded anywhere. Nothing is ever "posted", so
-- an administrator could edit or delete any row and leave no trace.
--
-- This adds an append-only log written by a trigger, so it cannot be bypassed by
-- the UI or by a direct API call, and captures only the fields that actually
-- changed rather than a full row copy.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGSERIAL PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  record_id   TEXT        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by  UUID,                      -- auth.uid() of the actor, NULL for service-role jobs
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  changes     JSONB,                      -- { column: { from, to } } for UPDATE; full row for INSERT/DELETE
  actor_role  TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_record   ON public.audit_log (table_name, record_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor    ON public.audit_log (changed_by, changed_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Append-only from the application's point of view: readable by admins, and
-- never updatable or deletable by anyone holding an anon/authenticated token.
-- The trigger writes as the table owner, so it does not need an INSERT policy.
DROP POLICY IF EXISTS "audit_log_read_admin" ON public.audit_log;
CREATE POLICY "audit_log_read_admin" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

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

  -- UPDATE: record only the columns whose value actually changed, and ignore
  -- updated_at so a no-op touch does not create a log entry.
  old_j := to_jsonb(OLD);
  new_j := to_jsonb(NEW);
  FOR k IN SELECT jsonb_object_keys(new_j) LOOP
    IF k <> 'updated_at' AND (old_j -> k) IS DISTINCT FROM (new_j -> k) THEN
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', old_j -> k, 'to', new_j -> k));
    END IF;
  END LOOP;

  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.audit_log (table_name, record_id, action, changed_by, changes, actor_role)
    VALUES (TG_TABLE_NAME, rec_id, 'UPDATE', auth.uid(), diff, auth.role());
  END IF;

  RETURN NEW;
END $$;

-- Attach to every business table.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers','equipment','tickets','amc_contracts','pm_schedules','technicians','user_roles']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'audit_' || t, t);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.write_audit_log()',
      'audit_' || t, t);
  END LOOP;
END $$;

-- F-50 (partial): a completed or paid document may still be corrected, but it
-- cannot be made to disappear. Deletion of records in a settled state is
-- refused outright, and every edit to them is now in the audit log above.
-- Full immutability with reversal entries needs a credit-note/reversal workflow,
-- which does not exist yet and is a client decision - see FIXES-APPLIED.md.
CREATE OR REPLACE FUNCTION public.block_settled_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- status is a different enum type on each table, so compare as text. Comparing
  -- against a bare literal made Postgres coerce it to the triggering table's own
  -- enum and fail with "invalid input value for enum" on the other table.
  IF TG_TABLE_NAME = 'amc_contracts' AND OLD.status::text = 'Payment Received' THEN
    RAISE EXCEPTION 'Contract % has payment recorded against it and cannot be deleted. Correct it instead, or raise a reversal.', OLD.id;
  END IF;
  IF TG_TABLE_NAME = 'tickets' AND OLD.status::text = 'Completed' THEN
    RAISE EXCEPTION 'Ticket % is completed and cannot be deleted. Reopen it if it was closed in error.', OLD.id;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS block_settled_amc_delete ON public.amc_contracts;
CREATE TRIGGER block_settled_amc_delete BEFORE DELETE ON public.amc_contracts
  FOR EACH ROW EXECUTE FUNCTION public.block_settled_delete();

DROP TRIGGER IF EXISTS block_settled_ticket_delete ON public.tickets;
CREATE TRIGGER block_settled_ticket_delete BEFORE DELETE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.block_settled_delete();
