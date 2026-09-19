#!/usr/bin/env bash
# Runs every supabase/tests/*.sql against a LOCAL Supabase database, one file at
# a time, stopping at the first failure. Each file is a rolled-back transaction.
#
#   supabase start && pnpm test:db
#
# The database is the local stack's DB_URL (`supabase status -o env`), or
# DATABASE_URL if you set it. It refuses anything that is not loopback: these
# tests create fixture users and workspaces and must never touch a hosted
# project. Needs `psql`, or falls back to the local Postgres container that
# publishes the URL's port.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

url="${DATABASE_URL:-}"
if [ -z "$url" ]; then
  url="$(supabase status -o env 2>/dev/null | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"
fi
if [ -z "$url" ]; then
  echo "No local database. Run \`supabase start\` first, or set DATABASE_URL to a local stack." >&2
  exit 2
fi
case "$url" in
  *@127.0.0.1:*|*@localhost:*|*@\[::1\]:*) ;;
  *) echo "Refusing a non-local database (${url##*@}): supabase/tests are for a local stack only." >&2; exit 2 ;;
esac

port="$(printf '%s' "$url" | sed -n 's|.*:\([0-9]*\)/[^/]*$|\1|p')"
run() {
  if command -v psql >/dev/null 2>&1; then
    psql "$url" -v ON_ERROR_STOP=1 -q -f "$1"
  else
    container="$(docker ps --filter "publish=$port" --format '{{.Names}}' | head -1)"
    [ -n "$container" ] || { echo "psql is not installed and no container publishes port $port." >&2; exit 2; }
    docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 -q < "$1"
  fi
}

shopt -s nullglob
for f in supabase/tests/*.sql; do
  echo "== $f"
  set +e
  out="$(run "$f" 2>&1)"
  rc=$?
  set -e
  printf '%s\n' "$out" | sed -E 's/^psql:[^ ]+ NOTICE:  //'
  if [ "$rc" -ne 0 ]; then
    echo "FAILED: $f" >&2
    exit 1
  fi
done
