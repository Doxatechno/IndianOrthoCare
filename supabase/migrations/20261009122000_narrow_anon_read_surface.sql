-- Narrow what the anonymous role can read.
--
-- The anon key ships inside the JS bundle, so "anon" means "anyone on the
-- internet". Two policies existed so the public QR page could fetch a single
-- equipment row, but they were written as unrestricted full-table reads:
--
--   "Anon read customers for QR"  ON customers  FOR SELECT TO anon USING (true)
--   "Anon read equipment for QR"  ON equipment  FOR SELECT TO anon USING (true)
--
-- That exposed every customer's name, contact person, phone, email and
-- address, and the entire installed base including serial numbers.
-- sales_orders and sync_log were likewise readable by anon and by any
-- authenticated user, with no QR justification at all.
--
-- The QR page needs exactly one equipment row and none of the customer
-- contact fields, so it gets a function that returns just that.

CREATE OR REPLACE FUNCTION public.get_equipment_for_qr(_equipment_id TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  model_number TEXT,
  serial_number TEXT,
  customer_id TEXT,
  customer_name TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.name, e.model_number, e.serial_number, e.customer_id, e.customer_name
    FROM public.equipment e
   WHERE e.id = _equipment_id
   LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_equipment_for_qr(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_equipment_for_qr(TEXT) TO anon, authenticated;

-- Remove the blanket anon reads.
DROP POLICY IF EXISTS "Anon read customers for QR" ON public.customers;
DROP POLICY IF EXISTS "Anon read equipment for QR" ON public.equipment;

-- sales_orders / sync_log: admin only. Both are consumed exclusively by
-- admin-gated screens (the Sales Orders page and the dashboard widget).
DROP POLICY IF EXISTS "sales_orders_read_all" ON public.sales_orders;
DROP POLICY IF EXISTS "sync_log_read_all"     ON public.sync_log;

CREATE POLICY "sales_orders_read_admin" ON public.sales_orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "sync_log_read_admin" ON public.sync_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
