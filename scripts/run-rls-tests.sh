#!/usr/bin/env bash
# Run supabase/tests/rls.sql against a throwaway database built from the
# migration chain. Needs psql and a reachable PostgreSQL; set PGHOST/PGPORT/
# PGUSER as usual, or DATABASE_URL to point at an existing server.
set -euo pipefail

DB="${RLS_TEST_DB:-orthocare_rls_test}"
PSQL=(psql -v ON_ERROR_STOP=1 -q)
ADMIN_DB="${RLS_ADMIN_DB:-postgres}"

echo "==> recreating $DB"
"${PSQL[@]}" -d "$ADMIN_DB" -c "DROP DATABASE IF EXISTS $DB;"
"${PSQL[@]}" -d "$ADMIN_DB" -c "CREATE DATABASE $DB;"

echo "==> installing the Supabase-compatible shim"
"${PSQL[@]}" -d "$DB" -f supabase/tests/_supabase_shim.sql

echo "==> applying migrations"
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "$DB" -f "$f" 2>&1 | grep -v "NOTICE:" || true
done

echo "==> running authorization assertions"
# Assertions are reported via RAISE NOTICE, which psql writes to stderr with a
# "psql:<file>:<line>: NOTICE:  " prefix. Strip it and keep the exit status.
set +e
out=$(psql -d "$DB" -f supabase/tests/rls.sql 2>&1)
status=$?
set -e
echo "$out" | sed -E 's/^psql:[^:]+:[0-9]+: //; s/^NOTICE:  //' | grep -E '^(PASS|FAIL) \||^---- |^ERROR'

# The second suite needs its own fixtures and cannot share a database with the
# first: the immutability rules it asserts refuse to delete a completed ticket
# or a paid contract, so it cannot reset tables the other suite left behind.
echo "==> recreating ${DB}_2"
"${PSQL[@]}" -d "$ADMIN_DB" -c "DROP DATABASE IF EXISTS ${DB}_2;"
"${PSQL[@]}" -d "$ADMIN_DB" -c "CREATE DATABASE ${DB}_2;"
"${PSQL[@]}" -d "${DB}_2" -f supabase/tests/_supabase_shim.sql
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "${DB}_2" -f "$f" 2>&1 | grep -v "NOTICE:" || true
done

echo "==> running integrity, audit and concurrency assertions"
set +e
out2=$(psql -d "${DB}_2" -f supabase/tests/authorization_and_integrity.sql 2>&1)
status2=$?
set -e
echo "$out2" | sed -E 's/^psql:[^:]+:[0-9]+: //; s/^NOTICE:  //' | grep -E '^ (PASS|FAIL) \||^---- |^ERROR'

if [ $status -ne 0 ] || [ $status2 -ne 0 ]; then exit 1; fi
