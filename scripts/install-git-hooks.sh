#!/usr/bin/env bash
# Points git at the repo's tracked .githooks/ directory so the pre-push
# migration guard runs. Opt-in (`pnpm hooks:install`); safe to re-run.
# Outside a git checkout (CI, a source tarball) it does nothing.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Not a git checkout — hooks not installed."; exit 0; }
git config core.hooksPath .githooks
echo "Git hooks path set to .githooks (pre-push migration guard active)."
