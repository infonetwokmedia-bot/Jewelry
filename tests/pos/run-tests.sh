#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# Jewelry Dashboard — POS Test Runner
# Uses Node.js built-in test runner (node:test)
# ═══════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════"
echo "  💎 Jewelry POS — Test Suite"
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

# Unit tests (no Docker needed)
run_suite "01 — HTML Structure"    "01-html-structure.test.mjs"
run_suite "02 — CSS Completeness"  "02-css-completeness.test.mjs"
run_suite "03 — JS Module Exports" "03-js-module-exports.test.mjs"
run_suite "04 — POS Logic (Unit)"  "04-pos-logic.test.mjs"
run_suite "05 — API Functions"     "05-api-functions.test.mjs"
run_suite "06 — Permissions"       "06-permissions.test.mjs"
run_suite "07 — Integration Chain" "07-integration.test.mjs"

echo "═══════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo "  ✅ ALL SUITES PASSED"
else
  echo "  ❌ SOME SUITES FAILED — review above"
  exit 1
fi
echo "═══════════════════════════════════════════════"
