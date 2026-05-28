-- ================================================================
-- Migration: GrowsmartSMB sync tables
-- Run this in Supabase → SQL Editor BEFORE the first sync
-- ================================================================

-- Sales Orders (scraped from GrowsmartSMB portal)
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id             text PRIMARY KEY,          -- e.g. SO-0453
  portal_id      text NOT NULL DEFAULT '',  -- internal portal ID
  customer_name  text NOT NULL DEFAULT '',
  order_date     date,
  delivery_date  date,
  status         text NOT NULL DEFAULT '',
  delivery_for   text NOT NULL DEFAULT '',  -- Sale / Demo / Service Under CAMC etc.
  delivered_pct  numeric(5,2) DEFAULT 0,
  invoiced_pct   numeric(5,2) DEFAULT 0,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Sync audit log — every run is logged here
CREATE TABLE IF NOT EXISTS public.sync_log (
  id             bigserial PRIMARY KEY,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  orders_count   integer DEFAULT 0,
  customer_count integer DEFAULT 0,
  status         text NOT NULL DEFAULT 'success',  -- 'success' | 'error'
  error_msg      text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_status      ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date  ON public.sales_orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer    ON public.sales_orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at       ON public.sync_log(synced_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS policies (allow anon + authenticated reads; service key handles writes)
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_orders_read_all" ON public.sales_orders;
CREATE POLICY "sales_orders_read_all" ON public.sales_orders
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sales_orders_write_service" ON public.sales_orders;
CREATE POLICY "sales_orders_write_service" ON public.sales_orders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "sync_log_read_all" ON public.sync_log;
CREATE POLICY "sync_log_read_all" ON public.sync_log
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sync_log_write_service" ON public.sync_log;
CREATE POLICY "sync_log_write_service" ON public.sync_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
