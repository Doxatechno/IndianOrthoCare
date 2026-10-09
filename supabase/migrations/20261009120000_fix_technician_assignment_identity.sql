-- Fix: `assigned_technician` must hold technicians.id, not technicians.name.
--
-- The admin UI was writing the technician's NAME into
-- tickets.assigned_technician and pm_schedules.assigned_technician, while the
-- RLS policies compare that column to public.current_technician_id(), which
-- returns technicians.id. The two could never match, so technicians were never
-- able to see or update their own assigned work.
--
-- This migration normalises existing rows to ids and adds foreign keys so the
-- column can no longer drift away from technicians.id.

-- 1. Name -> id for every row that resolves to exactly one technician.
UPDATE public.tickets t
   SET assigned_technician = x.id
  FROM public.technicians x
 WHERE t.assigned_technician = x.name;

UPDATE public.pm_schedules p
   SET assigned_technician = x.id
  FROM public.technicians x
 WHERE p.assigned_technician = x.name;

-- 2. Anything left that is neither a known id nor a known name is a dangling
--    reference that no longer identifies anybody. Clear it so the rows show as
--    unassigned (and can be re-assigned) instead of blocking the FK below.
DO $$
DECLARE orphan_tickets int; orphan_pms int;
BEGIN
  SELECT count(*) INTO orphan_tickets
    FROM public.tickets t
   WHERE t.assigned_technician IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.technicians x WHERE x.id = t.assigned_technician);

  SELECT count(*) INTO orphan_pms
    FROM public.pm_schedules p
   WHERE p.assigned_technician IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.technicians x WHERE x.id = p.assigned_technician);

  IF orphan_tickets > 0 OR orphan_pms > 0 THEN
    RAISE NOTICE 'Clearing unresolvable assignments: % ticket(s), % PM schedule(s). These need re-assigning.',
      orphan_tickets, orphan_pms;
  END IF;
END $$;

UPDATE public.tickets t
   SET assigned_technician = NULL
 WHERE t.assigned_technician IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.technicians x WHERE x.id = t.assigned_technician);

UPDATE public.pm_schedules p
   SET assigned_technician = NULL
 WHERE p.assigned_technician IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.technicians x WHERE x.id = p.assigned_technician);

-- 3. Constrain the column so a name (or any other non-id value) is rejected.
ALTER TABLE public.tickets
  DROP CONSTRAINT IF EXISTS tickets_assigned_technician_fkey;
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_assigned_technician_fkey
  FOREIGN KEY (assigned_technician) REFERENCES public.technicians(id) ON DELETE SET NULL;

ALTER TABLE public.pm_schedules
  DROP CONSTRAINT IF EXISTS pm_schedules_assigned_technician_fkey;
ALTER TABLE public.pm_schedules
  ADD CONSTRAINT pm_schedules_assigned_technician_fkey
  FOREIGN KEY (assigned_technician) REFERENCES public.technicians(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tickets_assigned_technician ON public.tickets (assigned_technician);
CREATE INDEX IF NOT EXISTS idx_pm_assigned_technician ON public.pm_schedules (assigned_technician);
