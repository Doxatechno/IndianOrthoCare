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
exit $status
