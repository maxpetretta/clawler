#!/usr/bin/env bash
set -euo pipefail

print_usage() {
  cat <<'EOF'
Run the Better Search scaffold smoke tests.

Usage:
  scripts/run-plugin-smoke-tests.sh [options]

Options:
  -h, --help   Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) print_usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; print_usage >&2; exit 1 ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
plugin_dir="$repo_root/packages/plugin"
manifest="$plugin_dir/openclaw.plugin.json"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

pass() { printf "  OK %s\n" "$1"; }
fail() { printf "  FAIL %s\n" "$1" >&2; exit 1; }
step() { printf "\n== %s ==\n" "$1"; }

require_cmd bun
require_cmd jq

step "Unit tests"
bun test packages/plugin/src/__tests__
pass "plugin unit tests"

step "Plugin manifest"
[[ -f "$manifest" ]] || fail "openclaw.plugin.json not found"

plugin_id=$(jq -r '.id' "$manifest")
plugin_name=$(jq -r '.name' "$manifest")
plugin_kind=$(jq -r '.kind' "$manifest")

[[ "$plugin_id" == "better-search" ]] || fail "plugin id should be better-search"
[[ "$plugin_name" == "Better Search" ]] || fail "plugin name should be Better Search"
[[ "$plugin_kind" == "tool" ]] || fail "plugin kind should be tool"
pass "manifest id=$plugin_id name=$plugin_name kind=$plugin_kind"

step "Website build"
bun run --cwd "$repo_root/packages/website" build >/dev/null
pass "website build"
