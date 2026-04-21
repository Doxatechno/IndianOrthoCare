-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'technician');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Helper to get the current technician's record id
CREATE OR REPLACE FUNCTION public.current_technician_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.technicians WHERE user_id = auth.uid() LIMIT 1
$$;

-- 5. RLS for user_roles (admin only)
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Drop all old permissive policies
DROP POLICY IF EXISTS amc_select_public ON public.amc_contracts;
DROP POLICY IF EXISTS amc_update_public_roles ON public.amc_contracts;
DROP POLICY IF EXISTS amc_write_public_roles ON public.amc_contracts;

DROP POLICY IF EXISTS customers_select_public ON public.customers;
DROP POLICY IF EXISTS customers_update_public_roles ON public.customers;
DROP POLICY IF EXISTS customers_write_public_roles ON public.customers;

DROP POLICY IF EXISTS equipment_select_public ON public.equipment;
DROP POLICY IF EXISTS equipment_update_public_roles ON public.equipment;
DROP POLICY IF EXISTS equipment_write_public_roles ON public.equipment;

DROP POLICY IF EXISTS pm_select_public ON public.pm_schedules;
DROP POLICY IF EXISTS pm_update_public_roles ON public.pm_schedules;
DROP POLICY IF EXISTS pm_write_public_roles ON public.pm_schedules;
DROP POLICY IF EXISTS pm_delete_public_roles ON public.pm_schedules;

DROP POLICY IF EXISTS tickets_select_public ON public.tickets;
DROP POLICY IF EXISTS tickets_update_public_roles ON public.tickets;
DROP POLICY IF EXISTS tickets_write_public_roles ON public.tickets;
DROP POLICY IF EXISTS tickets_delete_public_roles ON public.tickets;

DROP POLICY IF EXISTS technicians_select_public ON public.technicians;
DROP POLICY IF EXISTS technicians_update_public ON public.technicians;
DROP POLICY IF EXISTS technicians_insert_public ON public.technicians;

-- 7. CUSTOMERS
CREATE POLICY "Admins manage customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians view customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'technician'));

-- Anon can read a single equipment for QR ticket page; customers used for join display
CREATE POLICY "Anon read customers for QR" ON public.customers
  FOR SELECT TO anon
  USING (true);

-- 8. EQUIPMENT
CREATE POLICY "Admins manage equipment" ON public.equipment
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians view equipment" ON public.equipment
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'technician'));

CREATE POLICY "Anon read equipment for QR" ON public.equipment
  FOR SELECT TO anon
  USING (true);

-- 9. AMC CONTRACTS
CREATE POLICY "Admins manage amc" ON public.amc_contracts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians view amc" ON public.amc_contracts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'technician'));

-- 10. PM SCHEDULES
CREATE POLICY "Admins manage pm" ON public.pm_schedules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians view assigned pm" ON public.pm_schedules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND assigned_technician = public.current_technician_id()
  );

CREATE POLICY "Technicians update assigned pm" ON public.pm_schedules
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND assigned_technician = public.current_technician_id()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'technician')
    AND assigned_technician = public.current_technician_id()
  );

-- 11. TICKETS
CREATE POLICY "Admins manage tickets" ON public.tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians view assigned tickets" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND assigned_technician = public.current_technician_id()
  );

CREATE POLICY "Technicians update assigned tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'technician')
    AND assigned_technician = public.current_technician_id()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'technician')
    AND assigned_technician = public.current_technician_id()
  );

-- Anon can create tickets via QR page
CREATE POLICY "Anon create ticket from QR" ON public.tickets
  FOR INSERT TO anon
  WITH CHECK (true);

-- 12. TECHNICIANS
CREATE POLICY "Admins manage technicians" ON public.technicians
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians view own record" ON public.technicians
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());