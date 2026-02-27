#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# Pre-commit hook — Anti-regression checks
# Install: cp scripts/pre-commit.sh .git/hooks/pre-commit
# ═══════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛡️  Running pre-commit anti-regression checks...${NC}"
ERRORS=0

# ─── 1. No .env files staged ───────────────────────────────────────────────
if git diff --cached --name-only | grep -qE '^\.env$|\.env\.production'; then
    echo -e "${RED}✗ BLOCKED: .env or .env.production.* files staged for commit${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ─── 2. No WC API credentials in staged JS/PHP files ───────────────────────
WC_KEY_FILES=$(git diff --cached --diff-filter=ACM --name-only -- '*.js' '*.php' 2>/dev/null)
if [ -n "$WC_KEY_FILES" ]; then
    WC_MATCHES=$(echo "$WC_KEY_FILES" | xargs grep -lE '(ck_[a-f0-9]{20,}|cs_[a-f0-9]{20,})' 2>/dev/null || true)
    if [ -n "$WC_MATCHES" ]; then
        echo -e "${RED}✗ BLOCKED: WooCommerce API keys found in staged files:${NC}"
        echo "$WC_MATCHES"
        ERRORS=$((ERRORS + 1))
    fi
fi

# ─── 3. JS syntax check on staged dashboard files ──────────────────────────
STAGED_JS=$(git diff --cached --name-only --diff-filter=ACM -- 'dashboard/js/*.js' | head -20)
if [ -n "$STAGED_JS" ]; then
    for f in $STAGED_JS; do
        if ! node --check "$f" 2>/dev/null; then
            echo -e "${RED}✗ Syntax error in $f${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    done
    echo -e "${GREEN}✔ JS syntax OK${NC}"
fi

# ─── 4. CRITICAL: Check for undefined export references ────────────────────
# This is the exact bug that broke production login on 2026-02-27
STAGED_DASH_JS=$(git diff --cached --name-only --diff-filter=ACM -- 'dashboard/js/*.js' | head -20)
if [ -n "$STAGED_DASH_JS" ]; then
    for f in $STAGED_DASH_JS; do
        # Extract J.xxx = yyy patterns and verify yyy is defined
        while IFS= read -r line; do
            prop=$(echo "$line" | sed -n 's/.*J\.\([a-zA-Z_]*\)\s*=\s*\([a-zA-Z_][a-zA-Z_0-9]*\).*/\2/p')
            [ -z "$prop" ] && continue
            # Skip keywords
            case "$prop" in true|false|null|undefined|this|window|document) continue ;; esac
            # Check if defined in same file
            if ! grep -qE "(function\s+${prop}\s*\(|const\s+${prop}\b|let\s+${prop}\b|var\s+${prop}\b|async\s+function\s+${prop}\s*\()" "$f"; then
                echo -e "${RED}✗ REGRESSION RISK: ${f} exports J.xxx = ${prop} but '${prop}' is not defined in this file${NC}"
                echo -e "${RED}  This WILL cause ReferenceError at runtime, crashing the dashboard.${NC}"
                ERRORS=$((ERRORS + 1))
            fi
        done < <(grep -n 'J\.[a-zA-Z_]* = [a-zA-Z_]' "$f" 2>/dev/null || true)
    done
fi

# ─── 5. SW pre-cache must not list individual JS modules ───────────────────
if git diff --cached --name-only | grep -q 'dashboard/sw.js'; then
    if grep -qE "'/dashboard/js/(auth|api|products|orders|app)\.js'" dashboard/sw.js 2>/dev/null; then
        echo -e "${RED}✗ REGRESSION: sw.js pre-caches individual JS modules. Production uses dist/bundle.min.js${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✔ sw.js pre-cache assets correct${NC}"
    fi
fi

# ─── 6. PHP syntax check on staged mu-plugins ──────────────────────────────
STAGED_PHP=$(git diff --cached --name-only --diff-filter=ACM -- 'data/wordpress/wp-content/mu-plugins/*.php' | head -20)
if [ -n "$STAGED_PHP" ]; then
    for f in $STAGED_PHP; do
        if ! php -l "$f" 2>/dev/null | grep -q "No syntax errors"; then
            echo -e "${RED}✗ PHP syntax error in $f${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    done
    echo -e "${GREEN}✔ PHP syntax OK${NC}"
fi

# ─── Result ─────────────────────────────────────────────────────────────────
if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo -e "${RED}✗ $ERRORS pre-commit check(s) failed. Commit blocked.${NC}"
    echo -e "${YELLOW}  Use 'git commit --no-verify' to bypass (NOT recommended).${NC}"
    exit 1
fi

echo -e "${GREEN}✔ All pre-commit checks passed.${NC}"
