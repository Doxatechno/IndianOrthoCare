-- Backfill missing PM-generated tickets.
-- For each PM schedule that is Assigned with a technician but has no matching ticket,
-- create a ticket with deterministic ID 'TK-' || pm.id.
INSERT INTO public.tickets (
  id, equipment_id, equipment_name, customer_id, customer_name,
  location, status, assigned_technician, remarks, issue_type,
  created_date, completed_date
)
SELECT
  'TK-' || pm.id,
  pm.equipment_id,
  pm.equipment_name,
  COALESCE(e.customer_id, ''),
  pm.customer_name,
  COALESCE(c.address, ''),
  'Assigned'::ticket_status,
  pm.assigned_technician,
  'PM ' || pm.pm_number || ' - Preventive Maintenance',
  'Preventive Maintenance',
  CURRENT_DATE,
  NULL
FROM public.pm_schedules pm
LEFT JOIN public.equipment e ON e.id = pm.equipment_id
LEFT JOIN public.customers c ON c.id = e.customer_id
WHERE pm.status = 'Assigned'
  AND pm.assigned_technician IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = 'TK-' || pm.id
  );