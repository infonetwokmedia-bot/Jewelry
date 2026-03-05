#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# Wrapper for Google Business Profile MCP server
# Loads .env variables before starting the server
# ═══════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if exists (contains GBP_* variables)
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Verify required GBP variables
for var in GBP_CLIENT_ID GBP_CLIENT_SECRET GBP_REFRESH_TOKEN GBP_ACCOUNT_ID GBP_LOCATION_ID; do
    if [ -z "${!var:-}" ]; then
        echo "ERROR: $var is not set in .env" >&2
        exit 1
    fi
done

exec node "$PROJECT_DIR/mcp-servers/gbp/build/index.js"
