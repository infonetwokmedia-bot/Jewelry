#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# Jewelry Dashboard — Sales Tests Runner
# Ticket #15: auto-sync WC order stats + sales reporting
# Uses Node.js built-in test runner (node:test)
# ═══════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════"
echo "  💎 Jewelry Sales — Test Suite (Ticket #15)"
echo "═══════════════════════════════════════════════"
echo ""

FAIL=0

run_suite() {
  local name="$1" file="$2"
  echo "▶ $name"
  if node --test "$file" 2>&1; then
    echo "  ✅ $name PASSED"
  else
    echo "  ❌ $name FAILED"
    FAIL=1
  fi
  echo ""
}

# Static analysis (no Docker needed)
run_suite "01 — PHP Structure"         "01-php-structure.test.mjs"
run_suite "02 — JS API Functions"      "02-js-api-functions.test.mjs"
run_suite "03 — Dashboard Sales UI"    "03-dashboard-sales-ui.test.mjs"

# Integration (requires Docker containers)
run_suite "04 — Integration (Docker)"  "04-integration.test.mjs"

echo "═══════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo "  ✅ ALL SUITES PASSED"
else
  echo "  ❌ SOME SUITES FAILED — review above"
  exit 1
fi
echo "═══════════════════════════════════════════════"
