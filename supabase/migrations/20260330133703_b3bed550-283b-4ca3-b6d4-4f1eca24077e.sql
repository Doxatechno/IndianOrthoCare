
CREATE TABLE public.technicians (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  specialization text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technicians_select_public" ON public.technicians FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "technicians_insert_public" ON public.technicians FOR INSERT TO anon, authenticated WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));
CREATE POLICY "technicians_update_public" ON public.technicians FOR UPDATE TO anon, authenticated USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text])) WITH CHECK (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

CREATE TRIGGER set_technicians_updated_at BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial technicians
INSERT INTO public.technicians (id, name, phone, email, specialization) VALUES
  ('TECH-001', 'Amit Verma', '+91 98765 11111', 'amit@medserv.com', 'Radiology Equipment'),
  ('TECH-002', 'Ravi Krishnan', '+91 98765 22222', 'ravi@medserv.com', 'Imaging Systems'),
  ('TECH-003', 'Suresh Nair', '+91 98765 33333', 'suresh@medserv.com', 'ICU Equipment'),
  ('TECH-004', 'Deepak Joshi', '+91 98765 44444', 'deepak@medserv.com', 'Lab Instruments'),
  ('TECH-005', 'Manoj Tiwari', '+91 98765 55555', 'manoj@medserv.com', 'General Maintenance');
