#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# Wrapper for mcp-wordpress MCP server
# Loads .env variables before starting the server
# ═══════════════════════════════════════════════════
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if exists (contains MCP_WP_APP_PASSWORD)
if [ -f "$PROJECT_DIR/.env" ]; then
    set -a
    source "$PROJECT_DIR/.env"
    set +a
fi

# Map MCP env vars to what mcp-wordpress expects
export WORDPRESS_SITE_URL="${WORDPRESS_SITE_URL:-https://dev.tujoyita.com}"
export WORDPRESS_USERNAME="${WORDPRESS_USERNAME:-ppcapiro}"
export WORDPRESS_APP_PASSWORD="${WORDPRESS_APP_PASSWORD:-$MCP_WP_APP_PASSWORD}"

exec node "$PROJECT_DIR/node_modules/mcp-wordpress/dist/index.js"
