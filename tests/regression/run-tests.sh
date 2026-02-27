#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# Jewelry Dashboard — Anti-Regression Test Runner
# Prevents known bugs from reappearing.
# ═══════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════"
echo "  🛡️  Jewelry Dashboard — Regression Tests"
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

# Anti-regression: source code checks
run_suite "01 — JS Global Exports"       "01-js-global-exports.test.mjs"
run_suite "02 — Build Integrity"          "02-build-integrity.test.mjs"
run_suite "03 — Service Worker Coherence" "03-sw-coherence.test.mjs"
run_suite "04 — Deploy Readiness"         "04-deploy-readiness.test.mjs"
run_suite "05 — Login Flow Integrity"     "05-login-flow.test.mjs"

echo "═══════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo "  🛡️ ALL REGRESSION TESTS PASSED"
else
  echo "  ❌ REGRESSION DETECTED — FIX BEFORE DEPLOYING"
  exit 1
fi
echo "═══════════════════════════════════════════════"
