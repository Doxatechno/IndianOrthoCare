-- Backfill: technicians provisioned through the admin UI never got a role.
--
-- create-technician-user created the auth user and set technicians.user_id,
-- but never inserted into user_roles. Every RLS policy for technicians is
-- gated on has_role(auth.uid(), 'technician'), so those accounts could log in
-- and then see nothing: no tickets, no PM schedules, no customers, no
-- equipment - and no error either, because RLS returns an empty set rather
-- than failing.
--
-- Grant the role to every technician record that is linked to an auth user but
-- is missing it.

INSERT INTO public.user_roles (user_id, role)
SELECT t.user_id, 'technician'::public.app_role
  FROM public.technicians t
 WHERE t.user_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.user_roles r
      WHERE r.user_id = t.user_id
        AND r.role = 'technician'::public.app_role
   )
ON CONFLICT (user_id, role) DO NOTHING;

DO $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing
    FROM public.technicians t
   WHERE t.user_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles r
        WHERE r.user_id = t.user_id AND r.role = 'technician'::public.app_role
     );
  IF missing > 0 THEN
    RAISE WARNING 'Still % technician account(s) without the technician role', missing;
  END IF;
END $$;
