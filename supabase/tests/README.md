# Authorization, integrity and concurrency tests

`npm run test:rls` runs both suites, 107 assertions in total, each against its
own throwaway database built from `supabase/migrations` alone. It exits non-zero
if any assertion fails, so it works as a CI gate.

`rls.sql` asserts what each role can actually do, by executing real statements
under `SET LOCAL role` + `request.jwt.claims`. It covers 44 assertions across
five principals: `anon`, an admin, two technicians, and an authenticated user
with no role.

`authorization_and_integrity.sql` adds 63 assertions: the anonymous surface
(every table unreadable, writes refused, the QR lookup still working and
returning nothing for an unknown id), technician scope across all six business
tables, a signed-in user with no role, admin reach, the nine integrity
constraints and the case/whitespace-insensitive unique indexes, the two
immutability rules, the audit trail's old/new values and its exclusion of
bookkeeping columns, and the `row_version` concurrency token — including the
reason it is an integer and not `updated_at`.

The two cannot share a database: the immutability rules the second suite
asserts correctly refuse to delete a completed ticket or a paid contract, so it
cannot clear fixtures the first suite left behind.

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

`authorization_and_integrity.sql` runs the same way, but needs a database of its
own built the same way — never point either at production, since both create
fixtures and the second one does not clean up after itself.

## Scope

It does not test the edge functions - those need a Deno runtime and the
service-role key, so they are exercised by deploying to a preview project.
Everything reachable through the PostgREST API is covered here.

`npm test` (Vitest) covers application logic and source-level invariants for
the same defects; `npx playwright test` covers the route guards.
