
-- Add DELETE policy for pm_schedules so we can manage records
CREATE POLICY "pm_delete_public_roles"
ON public.pm_schedules
FOR DELETE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

-- Delete all existing PM schedule records (clearing old data)
DELETE FROM public.pm_schedules;
