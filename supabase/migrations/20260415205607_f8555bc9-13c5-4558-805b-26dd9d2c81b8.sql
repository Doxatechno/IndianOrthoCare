-- Add DELETE policy for tickets
CREATE POLICY "tickets_delete_public_roles"
ON public.tickets
FOR DELETE
TO anon, authenticated
USING (auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text]));

-- Clear existing ticket data
DELETE FROM public.tickets;