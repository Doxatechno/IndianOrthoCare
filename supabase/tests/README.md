# Authorization tests

`rls.sql` asserts what each role can actually do, by executing real statements
under `SET LOCAL role` + `request.jwt.claims`. It covers 44 assertions across
five principals: `anon`, an admin, two technicians, and an authenticated user
with no role.

It exists because the defects that reached production were authorization
defects that no unit test could see: a column holding the wrong identifier so
RLS never matched, a function that forgot to grant a role, policies that read
`USING (true)`, and an `INSERT` policy with `WITH CHECK (true)`. Each of those
is now an assertion here.

## Running it against a local Supabase

```bash
supabase start
supabase db reset                  # applies migrations/ in order
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2-)" -f supabase/tests/rls.sql
```

It prints one line per assertion and exits non-zero if any failed, so it works
as a CI gate.

## Running it against a plain PostgreSQL

Useful when the Supabase CLI is not available. `_supabase_shim.sql` creates the
parts of a Supabase database the migrations depend on: the `anon`,
`authenticated` and `service_role` roles, an `auth` schema with `auth.users`,
and `auth.uid()` / `auth.role()` / `auth.jwt()` reading
`request.jwt.claims`.

```bash
createdb orthocare_test
psql -d orthocare_test -f supabase/tests/_supabase_shim.sql
for f in supabase/migrations/*.sql; do psql -d orthocare_test -v ON_ERROR_STOP=1 -f "$f"; done
psql -d orthocare_test -f supabase/tests/rls.sql
```

## Scope

It does not test the edge functions - those need a Deno runtime and the
service-role key, so they are exercised by deploying to a preview project.
Everything reachable through the PostgREST API is covered here.

`npm test` (Vitest) covers application logic and source-level invariants for
the same defects; `npx playwright test` covers the route guards.
