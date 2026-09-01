#!/usr/bin/env bash
#
# enable-module.sh <module-id>
#
# Installs an optional module's backend migrations from
# supabase/modules/<module-id>/ into the active migration stream at
# supabase/migrations/, with fresh unique timestamps that preserve the
# module's own file order.
#
# It only STAGES files locally — it never applies anything to a database.
# Review the copied files, then apply them the way you apply core
# migrations (supabase db push, or the Supabase MCP per file).
#
# Safe by design:
#   - refuses unknown module ids and empty module directories
#   - a file already installed with identical content is skipped (running
#     the script twice is a no-op and says so)
#   - a name collision with DIFFERENT content aborts before copying
#     anything — nothing is ever overwritten
set -euo pipefail

MODULES_DIR="supabase/modules"
MIGRATIONS_DIR="supabase/migrations"

fail() { echo "error: $*" >&2; exit 1; }

[ $# -eq 1 ] || fail "usage: scripts/enable-module.sh <module-id>"
MODULE="$1"

[[ "$MODULE" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || fail "module id must be lowercase [a-z0-9_-]: '$MODULE'"
[ -d "$MODULES_DIR/$MODULE" ] || fail "no such module: $MODULES_DIR/$MODULE (available: $(ls "$MODULES_DIR" 2>/dev/null | grep -v '^\.' | tr '\n' ' '))"
[ -d "$MIGRATIONS_DIR" ] || fail "run from the repository root ($MIGRATIONS_DIR not found)"

# Module files, in the module's own order (sorted by name).
SRC_FILES=()
while IFS= read -r f; do SRC_FILES+=("$f"); done < <(find "$MODULES_DIR/$MODULE" -maxdepth 1 -name '*.sql' | sort)
[ ${#SRC_FILES[@]} -gt 0 ] || fail "module '$MODULE' has no .sql migrations in $MODULES_DIR/$MODULE"

# A module file NNNN_name.sql installs as <timestamp>_<module>_<name>.sql.
# The "_<module>_<name>.sql" suffix is the identity used to detect a prior
# install regardless of the timestamp it received then.
suffix_for() {
  local base
  base="$(basename "$1")"
  base="${base#"${base%%[!0-9]*}"}"   # strip leading digits
  base="${base#_}"                     # and their separator
  echo "_${MODULE}_${base}"
}

# Pass 1: classify every file before touching anything.
TO_INSTALL=()
INSTALLED=0
for src in "${SRC_FILES[@]}"; do
  suffix="$(suffix_for "$src")"
  existing="$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "*${suffix}" | head -1)"
  if [ -n "$existing" ]; then
    if cmp -s "$src" "$existing"; then
      echo "already installed: $(basename "$existing")"
      INSTALLED=$((INSTALLED + 1))
    else
      fail "conflict: $(basename "$existing") exists with DIFFERENT content than $src — resolve manually; nothing was copied"
    fi
  else
    TO_INSTALL+=("$src")
  fi
done

if [ ${#TO_INSTALL[@]} -eq 0 ]; then
  echo "module '$MODULE' is already fully installed ($INSTALLED file(s)); nothing to do"
  exit 0
fi

# Pass 2: copy, one fresh timestamp per file, incremented to keep order
# and stay unique even when the module ships several files.
TS=$(date -u +%Y%m%d%H%M%S)
for src in "${TO_INSTALL[@]}"; do
  while find "$MIGRATIONS_DIR" -maxdepth 1 -name "${TS}_*" | grep -q .; do
    TS=$((TS + 1))
  done
  dest="$MIGRATIONS_DIR/${TS}$(suffix_for "$src")"
  cp "$src" "$dest"
  echo "installed: $dest"
  TS=$((TS + 1))
done

echo
echo "Staged ${#TO_INSTALL[@]} migration(s) for module '$MODULE'."
echo "Nothing has been applied to any database. Review the files, then apply"
echo "them like core migrations (supabase db push, or MCP apply_migration)."
