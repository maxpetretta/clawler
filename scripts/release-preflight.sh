#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  cat <<'EOF'
Validate Clawler release readiness.

Usage:
  scripts/release-preflight.sh [options]

Options:
  --skip-install   Skip dependency installation.
  --skip-tests     Skip lint and smoke checks.
  -h, --help       Show this help.
EOF
}

skip_install=0
skip_tests=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install) skip_install=1 ;;
    --skip-tests) skip_tests=1 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; print_usage >&2; exit 1 ;;
  esac
  shift
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

pass() { printf "  OK %s\n" "$1"; }
warn() { printf "  WARN %s\n" "$1"; }
step() { printf "\n== %s ==\n" "$1"; }

require_cmd bun
require_cmd node

step "Version alignment"
plugin_version="$(node -p "require('./packages/plugin/package.json').version")"
skill_version="$(node -p "require('./packages/skill/package.json').version")"
[[ "$plugin_version" == "$skill_version" ]] || {
  echo "Version mismatch: plugin=$plugin_version skill=$skill_version" >&2
  exit 1
}
pass "plugin and skill versions match: $plugin_version"

step "Dependencies"
if [[ "$skip_install" -eq 1 ]]; then
  warn "skipped bun install"
else
  bun install --frozen-lockfile
  pass "dependencies installed"
fi

if [[ "$skip_tests" -eq 1 ]]; then
  warn "skipped lint and smoke checks"
else
  step "Quality checks"
  bun run lint
  pass "lint passed"

  bun run smoke
  pass "smoke checks passed"
fi
