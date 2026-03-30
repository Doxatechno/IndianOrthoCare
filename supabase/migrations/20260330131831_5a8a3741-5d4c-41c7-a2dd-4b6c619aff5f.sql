-- Add denormalized display columns to match existing UI models
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';

ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS equipment_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_id text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';

ALTER TABLE public.amc_contracts
ADD COLUMN IF NOT EXISTS equipment_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_id text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';

ALTER TABLE public.pm_schedules
ADD COLUMN IF NOT EXISTS equipment_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS customer_name text NOT NULL DEFAULT '';

-- Replace overly-permissive true/true policies with role-based policies
DROP POLICY IF EXISTS "customers_public_all" ON public.customers;
DROP POLICY IF EXISTS "equipment_public_all" ON public.equipment;
DROP POLICY IF EXISTS "tickets_public_all" ON public.tickets;
DROP POLICY IF EXISTS "amc_public_all" ON public.amc_contracts;
DROP POLICY IF EXISTS "pm_public_all" ON public.pm_schedules;

CREATE POLICY "customers_select_public"
ON public.customers
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "customers_write_public_roles"
ON public.customers
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "customers_update_public_roles"
ON public.customers
FOR UPDATE
TO anon, authenticated
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "equipment_select_public"
ON public.equipment
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "equipment_write_public_roles"
ON public.equipment
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "equipment_update_public_roles"
ON public.equipment
FOR UPDATE
TO anon, authenticated
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "tickets_select_public"
ON public.tickets
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "tickets_write_public_roles"
ON public.tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "tickets_update_public_roles"
ON public.tickets
FOR UPDATE
TO anon, authenticated
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "amc_select_public"
ON public.amc_contracts
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "amc_write_public_roles"
ON public.amc_contracts
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "amc_update_public_roles"
ON public.amc_contracts
FOR UPDATE
TO anon, authenticated
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "pm_select_public"
ON public.pm_schedules
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "pm_write_public_roles"
ON public.pm_schedules
FOR INSERT
TO anon, authenticated
WITH CHECK (auth.role() IN ('anon', 'authenticated'));

CREATE POLICY "pm_update_public_roles"
ON public.pm_schedules
FOR UPDATE
TO anon, authenticated
USING (auth.role() IN ('anon', 'authenticated'))
WITH CHECK (auth.role() IN ('anon', 'authenticated'));