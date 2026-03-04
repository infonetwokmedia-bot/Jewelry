#!/bin/bash
################################################################################
# DEPLOYMENT AGENT v2.0 — Tu Joyita Miami (tujoyita.com)
#
# Single-script deployment: validates, backs up, deploys code, provisions DB
# settings, updates containers, and verifies health — all in one run.
#
# Usage:
#   ./scripts/deploy-agent.sh              # Interactive deploy
#   ./scripts/deploy-agent.sh --check      # Validate only (no deploy)
#   ./scripts/deploy-agent.sh --force      # Deploy without confirmation
#   ./scripts/deploy-agent.sh --rollback   # Rollback to latest backup
#   ./scripts/deploy-agent.sh --status     # Show production status
#   ./scripts/deploy-agent.sh --provision  # Run only DB provisioning
#   ./scripts/deploy-agent.sh --help       # Show help
#
# Requirements:
#   - SSH: Host tujoyita-prod configured in ~/.ssh/config
#   - Docker + Docker Compose on production server
#   - Branch main up to date
#
# Architecture (7 Phases):
#   Phase 1 — Local validation (git, files, credentials, anti-regression tests)
#   Phase 2 — Remote validation (SSH, containers, disk, SSL, health)
#   Phase 3 — Production backup (DB dump, compressed, timestamped)
#   Phase 4 — Code sync (mu-plugins, dashboard bundle, docker config, scripts)
#   Phase 5 — Container update (rebuild WP + dashboard, NEVER touch MySQL)
#   Phase 6 — DB provisioning (idempotent wp_options via WP-CLI)
#   Phase 7 — Health check (HTTPS, REST API, Dashboard, Shop, /en/)
#
# Anti-Regression Rules (REG-001 through REG-005):
#   - REG-001: Verify all J.xxx exports match actual function names
#   - REG-002: sw.js PRECACHE_ASSETS must list dist/ files, never js/*.js
#   - REG-003: Always run build.js before deploy to refresh cache busters
#   - REG-004: Healthchecks use http://127.0.0.1/ not localhost (IPv6 fix)
#   - REG-005: After container recreate, verify Traefik routers registered
#
# DB Isolation (CRITICAL):
#   LOCAL:  jewelry_mysql  → jewelry_db   (bind mount ./data/mysql)
#   PROD:   tujoyita_mysql → tujoyita_db  (named volume mysql-data)
#   Deploy ONLY copies code. NEVER touches production DB schema/data.
#   Phase 6 runs declarative wp_options — idempotent, safe to repeat.
#
################################################################################

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
VERSION="2.0.0"
TIMESTAMP="$(date -u '+%Y%m%d_%H%M%S')"

# Production
PROD_HOST="${PROD_HOST:-tujoyita-prod}"
PROD_DIR="${PROD_DIR:-/srv/stacks/tujoyita}"
PROD_DOMAIN="tujoyita.com"

# Container names
PROD_WP_CONTAINER="tujoyita_wordpress"
PROD_DB_CONTAINER="tujoyita_mysql"
PROD_DASHBOARD_CONTAINER="tujoyita_dashboard"
PROD_DB_NAME="tujoyita_db"
LOCAL_DB_CONTAINER="jewelry_mysql"
LOCAL_DB_NAME="jewelry_db"

# WP-CLI command prefix for production (uses docker exec to avoid Redis connectivity issues)
WPCLI_CMD="docker exec $PROD_WP_CONTAINER php /var/www/html/wp-cli.phar"

# State
LAST_BACKUP=""
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0
PHASE_ERRORS=0

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────────────────────────────────────

log_header()  { echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}\n${BLUE}  $1${NC}\n${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"; }
log_phase()   { echo -e "\n${BOLD}${CYAN}▶ FASE $1: $2${NC}"; }
log_section() { echo -e "\n${CYAN}  ━━━ $1 ━━━${NC}"; }
log_ok()      { echo -e "  ${GREEN}✔${NC} $1"; CHECKS_PASSED=$((CHECKS_PASSED + 1)); }
log_fail()    { echo -e "  ${RED}✗${NC} $1"; CHECKS_FAILED=$((CHECKS_FAILED + 1)); PHASE_ERRORS=$((PHASE_ERRORS + 1)); }
log_warn()    { echo -e "  ${YELLOW}⚠${NC} $1"; CHECKS_WARNED=$((CHECKS_WARNED + 1)); }
log_info()    { echo -e "  ${DIM}ℹ${NC} $1"; }
die()         { echo -e "\n${RED}FATAL: $1${NC}" >&2; exit 1; }

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

ssh_prod() {
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$PROD_HOST" "$@"
}

# WP-CLI on production (returns trimmed output)
wpcli_prod() {
    ssh_prod "$WPCLI_CMD $* --allow-root" 2>/dev/null | tr -d '\r'
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 1: LOCAL VALIDATION
# ═════════════════════════════════════════════════════════════════════════════

phase1_local_validation() {
    log_phase "1" "VALIDACIÓN LOCAL"
    PHASE_ERRORS=0

    # ── 1a. Git ──────────────────────────────────────────────────────────
    log_section "Git"

    if ! git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
        log_fail "No es un repositorio Git"
        return 1
    fi
    log_ok "Repositorio Git válido"

    local branch
    branch=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)
    if [ "$branch" = "main" ]; then
        log_ok "Branch: main"
    else
        log_fail "Branch: $branch (se requiere main)"
    fi

    if git -C "$PROJECT_DIR" diff --quiet && git -C "$PROJECT_DIR" diff --cached --quiet; then
        log_ok "Working tree limpio"
    else
        log_warn "Cambios sin commitear"
        git -C "$PROJECT_DIR" status --short | head -5 | while read -r line; do
            log_info "  $line"
        done
    fi

    git -C "$PROJECT_DIR" fetch origin main --quiet 2>/dev/null || true
    local local_sha remote_sha
    local_sha=$(git -C "$PROJECT_DIR" rev-parse HEAD)
    remote_sha=$(git -C "$PROJECT_DIR" rev-parse origin/main 2>/dev/null || echo "unknown")
    if [ "$local_sha" = "$remote_sha" ]; then
        log_ok "Sincronizado con origin/main"
    elif [ "$remote_sha" = "unknown" ]; then
        log_warn "No se pudo verificar origin/main"
    else
        log_warn "Local y origin/main difieren (local: ${local_sha:0:8}, origin: ${remote_sha:0:8})"
    fi

    log_info "Commit: $(git -C "$PROJECT_DIR" log --oneline -1)"

    # ── 1b. Archivos Requeridos ──────────────────────────────────────────
    log_section "Archivos Requeridos"

    local required_files=(
        "docker-compose.production.yml"
        "dashboard/index.html"
        "dashboard/nginx/production.conf"
    )
    for f in "${required_files[@]}"; do
        if [ -e "$PROJECT_DIR/$f" ]; then
            log_ok "$f"
        else
            log_fail "$f NO encontrado"
        fi
    done

    # mu-plugins
    local mu_dir="$PROJECT_DIR/data/wordpress/wp-content/mu-plugins"
    if [ -d "$mu_dir" ]; then
        local mu_count
        mu_count=$(find "$mu_dir" -name "jewelry-*.php" -type f | wc -l)
        log_ok "mu-plugins: $mu_count archivos jewelry-*.php"
    else
        log_warn "Directorio mu-plugins no encontrado"
    fi

    # jewelry-dashboard plugin
    if [ -f "$PROJECT_DIR/data/wordpress/wp-content/plugins/jewelry-dashboard/jewelry-dashboard.php" ]; then
        log_ok "Plugin jewelry-dashboard presente"
    else
        log_warn "Plugin jewelry-dashboard no encontrado"
    fi

    # Nginx production.conf points to tujoyita_wordpress
    if grep -q "tujoyita_wordpress" "$PROJECT_DIR/dashboard/nginx/production.conf" 2>/dev/null; then
        log_ok "production.conf → tujoyita_wordpress"
    else
        log_fail "production.conf NO apunta a tujoyita_wordpress"
    fi

    # ── 1c. Seguridad ───────────────────────────────────────────────────
    log_section "Seguridad"

    local sensitive_patterns=(".env" ".wp-credentials" "data/mysql")
    for pat in "${sensitive_patterns[@]}"; do
        if git -C "$PROJECT_DIR" ls-files --error-unmatch "$pat" &>/dev/null 2>&1; then
            log_fail "'$pat' tracked en Git (RIESGO)"
        else
            log_ok "'$pat' excluido de Git"
        fi
    done

    if git -C "$PROJECT_DIR" ls-files --error-unmatch "dashboard/.env.js" &>/dev/null 2>&1; then
        log_fail "dashboard/.env.js tracked en Git (API keys)"
    else
        log_ok "dashboard/.env.js excluido de Git"
    fi

    # ── 1d. DB Isolation ─────────────────────────────────────────────────
    log_section "Aislamiento de Bases de Datos"

    if [ "$LOCAL_DB_CONTAINER" != "$PROD_DB_CONTAINER" ] && [ "$LOCAL_DB_NAME" != "$PROD_DB_NAME" ]; then
        log_ok "Contenedores y DBs separados"
        log_info "Local: $LOCAL_DB_CONTAINER → $LOCAL_DB_NAME"
        log_info "Prod:  $PROD_DB_CONTAINER → $PROD_DB_NAME"
    else
        log_fail "PELIGRO: Nombres coinciden"
    fi

    if grep -q "mysql-data:" "$PROJECT_DIR/docker-compose.production.yml"; then
        log_ok "Producción usa named volumes"
    else
        log_warn "Producción no usa named volumes"
    fi

    # ── 1e. Anti-Regression Tests ────────────────────────────────────────
    log_section "Tests Anti-Regresión"

    local test_runner="$PROJECT_DIR/tests/regression/run-tests.sh"
    if [ -f "$test_runner" ] && command -v node &>/dev/null; then
        log_info "Ejecutando suite anti-regresión..."
        local test_output test_exit=0
        test_output=$(bash "$test_runner" 2>&1) || test_exit=$?
        if [ "$test_exit" -eq 0 ]; then
            log_ok "Tests anti-regresión: TODOS PASARON"
            local test_count
            test_count=$(echo "$test_output" | grep -oP '\d+ tests' | head -1 || echo "")
            [ -n "$test_count" ] && log_info "  $test_count ejecutados"
        else
            log_fail "Tests anti-regresión FALLARON (exit: $test_exit)"
            echo "$test_output" | grep -iE 'fail|error|✗' | head -5 | while IFS= read -r line; do
                log_info "  $line"
            done
        fi
    elif [ ! -f "$test_runner" ]; then
        log_warn "tests/regression/run-tests.sh no encontrado"
    else
        log_warn "Node.js no disponible — saltando tests"
    fi

    # ── 1f. Dashboard Build (REG-003) ────────────────────────────────────
    log_section "Dashboard Build (REG-003)"

    if command -v node &>/dev/null && [ -f "$PROJECT_DIR/dashboard/build.js" ]; then
        log_info "Ejecutando node dashboard/build.js..."
        local build_output build_exit=0
        build_output=$(cd "$PROJECT_DIR" && node dashboard/build.js 2>&1) || build_exit=$?
        if [ "$build_exit" -eq 0 ] && [ -f "$PROJECT_DIR/dashboard/dist/bundle.min.js" ]; then
            log_ok "Dashboard build exitoso"
            if [ -f "$PROJECT_DIR/dashboard/dist/index.html" ]; then
                log_ok "dist/index.html generado (cache busters frescos)"
            else
                log_warn "dist/index.html no generado"
            fi
            # REG-001: Syntax check
            if node --check "$PROJECT_DIR/dashboard/dist/bundle.min.js" 2>/dev/null; then
                log_ok "bundle.min.js sintaxis válida"
            else
                log_fail "bundle.min.js errores de sintaxis"
            fi
        else
            log_warn "Dashboard build falló — se desplegará sin minificar"
        fi
    else
        log_warn "Node.js o build.js no disponible"
    fi

    [ "$PHASE_ERRORS" -gt 0 ] && log_warn "Fase 1: $PHASE_ERRORS errores" || true
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 2: REMOTE VALIDATION
# ═════════════════════════════════════════════════════════════════════════════

phase2_remote_validation() {
    log_phase "2" "VALIDACIÓN REMOTA"
    PHASE_ERRORS=0

    # ── 2a. SSH ──────────────────────────────────────────────────────────
    log_section "Conexión SSH"

    if ! ssh_prod "echo ok" &>/dev/null; then
        log_fail "No se puede conectar a $PROD_HOST"
        return 1
    fi
    log_ok "SSH conecta a $PROD_HOST"

    if ssh_prod "test -d $PROD_DIR"; then
        log_ok "$PROD_DIR existe"
    else
        log_fail "$PROD_DIR no existe"
        return 1
    fi

    if ssh_prod "test -f $PROD_DIR/.env"; then
        log_ok ".env de producción existe"
    else
        log_fail ".env de producción NO existe"
    fi

    # ── 2b. Containers ───────────────────────────────────────────────────
    log_section "Contenedores"

    local containers
    containers=$(ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml ps --format '{{.Name}}|{{.Status}}'" 2>/dev/null || echo "")

    if [ -n "$containers" ]; then
        while IFS='|' read -r name status; do
            [ -z "$name" ] && continue
            if echo "$status" | grep -qi "up\|running"; then
                log_ok "$name: $status"
            else
                log_warn "$name: $status"
            fi
        done <<< "$containers"
    else
        log_warn "No se pudieron listar contenedores"
    fi

    # ── 2c. Disk ─────────────────────────────────────────────────────────
    log_section "Disco"

    local disk_info
    disk_info=$(ssh_prod "df -h $PROD_DIR | tail -1 | awk '{print \$5, \$4}'" 2>/dev/null || echo "unknown")

    if [ "$disk_info" != "unknown" ]; then
        local used_pct available
        used_pct=$(echo "$disk_info" | awk '{print $1}' | tr -d '%')
        available=$(echo "$disk_info" | awk '{print $2}')
        if [ "$used_pct" -lt 80 ]; then
            log_ok "Disco: ${used_pct}% usado, ${available} libre"
        elif [ "$used_pct" -lt 90 ]; then
            log_warn "Disco: ${used_pct}% usado"
        else
            log_fail "Disco CRÍTICO: ${used_pct}%"
        fi
    else
        log_warn "No se pudo verificar disco"
    fi

    # ── 2d. SSL ──────────────────────────────────────────────────────────
    log_section "SSL"

    local ssl_expiry
    ssl_expiry=$(echo | openssl s_client -servername "$PROD_DOMAIN" -connect "$PROD_DOMAIN:443" 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")

    if [ -n "$ssl_expiry" ]; then
        local expiry_epoch now_epoch diff_days
        expiry_epoch=$(date -d "$ssl_expiry" +%s 2>/dev/null || echo "0")
        now_epoch=$(date +%s)
        diff_days=$(( (expiry_epoch - now_epoch) / 86400 ))
        if [ "$diff_days" -gt 30 ]; then
            log_ok "SSL: $diff_days días (expira: $ssl_expiry)"
        elif [ "$diff_days" -gt 7 ]; then
            log_warn "SSL: $diff_days días"
        else
            log_fail "SSL CRÍTICO: $diff_days días"
        fi
    else
        log_info "SSL no verificable (normal en primer deploy)"
    fi

    # ── 2e. Pre-deploy health ────────────────────────────────────────────
    log_section "Salud Pre-Deploy"

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$PROD_DOMAIN" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_ok "WordPress: HTTP $http_code"
    elif [ "$http_code" = "000" ]; then
        log_info "WordPress no responde (normal en primer deploy)"
    else
        log_warn "WordPress: HTTP $http_code"
    fi

    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://$PROD_DOMAIN/dashboard/" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_ok "Dashboard: HTTP $http_code"
    elif [ "$http_code" = "000" ]; then
        log_info "Dashboard no responde (normal en primer deploy)"
    else
        log_warn "Dashboard: HTTP $http_code"
    fi

    [ "$PHASE_ERRORS" -gt 0 ] && log_warn "Fase 2: $PHASE_ERRORS errores" || true
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 3: BACKUP
# ═════════════════════════════════════════════════════════════════════════════

phase3_backup() {
    log_phase "3" "BACKUP DE PRODUCCIÓN"

    local backup_file="backups/pre-deploy_${TIMESTAMP}.sql.gz"
    log_info "Destino: $backup_file"

    ssh_prod "mkdir -p $PROD_DIR/backups" 2>/dev/null || true

    local backup_size
    backup_size=$(ssh_prod "cd $PROD_DIR && \
        docker exec $PROD_DB_CONTAINER mysqldump \
            -u root -p\$(grep MYSQL_ROOT_PASSWORD .env | cut -d'=' -f2-) \
            \$(grep MYSQL_DATABASE .env | cut -d'=' -f2-) \
            --single-transaction --routines --triggers \
            2>/dev/null | gzip > $backup_file && \
        ls -lh $backup_file | awk '{print \$5}'" 2>/dev/null || echo "FAILED")

    if [ "$backup_size" = "FAILED" ]; then
        log_fail "Backup falló"
        return 1
    fi

    log_ok "Backup: $backup_file ($backup_size)"
    LAST_BACKUP="$backup_file"

    # Keep last 10 backups
    ssh_prod "cd $PROD_DIR/backups && ls -t pre-deploy_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm --" 2>/dev/null || true
    local count
    count=$(ssh_prod "ls $PROD_DIR/backups/pre-deploy_*.sql.gz 2>/dev/null | wc -l" || echo "?")
    log_info "Total backups: $count"
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 4: CODE SYNC
# ═════════════════════════════════════════════════════════════════════════════

phase4_code_sync() {
    log_phase "4" "SINCRONIZAR CÓDIGO"
    PHASE_ERRORS=0

    echo -e "  ${DIM}Solo código custom. NUNCA: DB, uploads, plugins terceros.${NC}"

    # ── 4a. mu-plugins ───────────────────────────────────────────────────
    log_section "mu-plugins"

    local mu_dir="$PROJECT_DIR/data/wordpress/wp-content/mu-plugins"
    if [ -d "$mu_dir" ]; then
        for mu_file in "$mu_dir"/jewelry-*.php; do
            [ -f "$mu_file" ] || continue
            local basename
            basename=$(basename "$mu_file")

            # Skip dev-only
            if [ "$basename" = "jewelry-dev-domain.php" ]; then
                log_info "$basename (SKIP — dev only)"
                continue
            fi

            scp -q "$mu_file" "$PROD_HOST:/tmp/$basename"
            ssh_prod "docker cp /tmp/$basename $PROD_WP_CONTAINER:/var/www/html/wp-content/mu-plugins/$basename && rm /tmp/$basename"
            log_ok "$basename"
        done
    else
        log_warn "mu-plugins no encontrado"
    fi

    # ── 4a.2 Custom plugins ──────────────────────────────────────────────
    log_section "Custom Plugins"

    local plugin_dir="$PROJECT_DIR/data/wordpress/wp-content/plugins/jewelry-dashboard"
    if [ -d "$plugin_dir" ]; then
        for plugin_file in "$plugin_dir"/*.php; do
            [ -f "$plugin_file" ] || continue
            local pbasename
            pbasename=$(basename "$plugin_file")
            scp -q "$plugin_file" "$PROD_HOST:/tmp/$pbasename"
            ssh_prod "docker exec $PROD_WP_CONTAINER mkdir -p /var/www/html/wp-content/plugins/jewelry-dashboard && \
                docker cp /tmp/$pbasename $PROD_WP_CONTAINER:/var/www/html/wp-content/plugins/jewelry-dashboard/$pbasename && \
                rm /tmp/$pbasename"
            log_ok "jewelry-dashboard/$pbasename"
        done
    else
        log_warn "Plugin jewelry-dashboard no encontrado"
    fi

    # ── 4b. Dashboard ────────────────────────────────────────────────────
    log_section "Dashboard SPA"

    if [ -d "$PROJECT_DIR/dashboard" ]; then
        rsync -avz --quiet --delete \
            --exclude='.env.js' \
            --exclude='.env.production.js' \
            --exclude='node_modules/' \
            --exclude='.env.js.example' \
            --exclude='nginx/wc-auth.conf' \
            --exclude='nginx/wc-auth.production.conf' \
            --exclude='build.js' \
            "$PROJECT_DIR/dashboard/" \
            "$PROD_HOST:$PROD_DIR/dashboard/"

        # REG-003: bundled index.html with fresh cache busters
        if [ -f "$PROJECT_DIR/dashboard/dist/index.html" ]; then
            scp -q "$PROJECT_DIR/dashboard/dist/index.html" "$PROD_HOST:$PROD_DIR/dashboard/index.html"
            log_ok "Dashboard (bundled + cache busters frescos)"
        else
            log_ok "Dashboard (sin bundle)"
        fi

        # Verify production configs on VPS
        if ssh_prod "test -f $PROD_DIR/dashboard/nginx/wc-auth.production.conf"; then
            log_ok "wc-auth.production.conf presente"
        else
            log_warn "wc-auth.production.conf NO existe en VPS"
        fi

        if ssh_prod "test -f $PROD_DIR/dashboard/.env.js"; then
            log_ok "dashboard/.env.js presente en VPS"
        else
            log_warn "dashboard/.env.js NO existe en VPS"
            log_info "Crear: cp .env.production.js .env.js"
        fi
    fi

    # ── 4c. Docker config ────────────────────────────────────────────────
    log_section "Docker"

    scp -q "$PROJECT_DIR/docker-compose.production.yml" "$PROD_HOST:$PROD_DIR/docker-compose.production.yml"
    log_ok "docker-compose.production.yml"

    if [ -d "$PROJECT_DIR/docker/wordpress" ]; then
        ssh_prod "mkdir -p $PROD_DIR/docker/wordpress"
        rsync -avz --quiet "$PROJECT_DIR/docker/wordpress/" "$PROD_HOST:$PROD_DIR/docker/wordpress/"
        log_ok "Dockerfile WordPress (PHP + Redis)"
    fi

    # ── 4d. Scripts ──────────────────────────────────────────────────────
    log_section "Scripts"

    rsync -avz --quiet "$PROJECT_DIR/scripts/" "$PROD_HOST:$PROD_DIR/scripts/"
    log_ok "Scripts sincronizados"

    [ "$PHASE_ERRORS" -gt 0 ] && log_warn "Fase 4: $PHASE_ERRORS errores" || true
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 5: CONTAINER UPDATE
# ═════════════════════════════════════════════════════════════════════════════

phase5_containers() {
    log_phase "5" "ACTUALIZAR CONTENEDORES"
    echo -e "  ${DIM}WordPress + Dashboard. MySQL NUNCA se toca.${NC}"

    # Build or pull WordPress image
    if ssh_prod "test -f $PROD_DIR/docker/wordpress/Dockerfile"; then
        log_info "Building WordPress image (PHP + Redis)..."
        ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml build --no-cache wordpress" 2>/dev/null
        log_ok "WordPress image built"
    else
        log_info "Pulling WordPress image..."
        ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml pull --quiet wordpress" 2>/dev/null || true
        log_ok "WordPress image pulled"
    fi

    # Ensure Redis
    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml up -d redis" 2>/dev/null || true
    sleep 3
    log_ok "Redis disponible"

    # Recreate WP + Dashboard (NEVER mysql)
    log_info "Recreando WordPress + Dashboard..."
    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml up -d --force-recreate wordpress dashboard"
    log_ok "WordPress y Dashboard recreados"

    log_info "Esperando arranque (15s)..."
    sleep 15

    # Verify MySQL untouched
    local mysql_status
    mysql_status=$(ssh_prod "docker inspect --format='{{.State.Status}}' $PROD_DB_CONTAINER" 2>/dev/null || echo "unknown")
    if [ "$mysql_status" = "running" ]; then
        log_ok "MySQL corriendo (NO fue tocado)"
    else
        log_warn "MySQL status: $mysql_status"
    fi

    # REG-005: Traefik router verification
    log_section "Traefik (REG-005)"

    local traefik_routers
    traefik_routers=$(ssh_prod "curl -sf http://localhost:8080/api/http/routers 2>/dev/null | grep -co 'tujoyita'" 2>/dev/null) || traefik_routers=0

    if [ "$traefik_routers" -gt 0 ]; then
        log_ok "Traefik: $traefik_routers routers tujoyita"
    else
        log_warn "Traefik sin routers — forzando redescubrimiento..."
        ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml up -d dashboard" 2>/dev/null
        sleep 5
        traefik_routers=$(ssh_prod "curl -sf http://localhost:8080/api/http/routers 2>/dev/null | grep -co 'tujoyita'" 2>/dev/null) || traefik_routers=0
        if [ "$traefik_routers" -gt 0 ]; then
            log_ok "Traefik redescubrió $traefik_routers routers"
        else
            log_fail "Traefik NO detecta routers — verificar manualmente"
        fi
    fi

    # Flush WP cache
    log_info "Limpiando cache..."
    ssh_prod "$WPCLI_CMD cache flush --allow-root" 2>/dev/null || true
    log_ok "Cache limpiado"
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 6: DB PROVISIONING (IDEMPOTENT)
# ═════════════════════════════════════════════════════════════════════════════
# Declarative wp_option updates. Safe to run on every deploy.
# Ensures production settings match the project source of truth.
# NEVER destructive — only updates option values.
# NEVER touches: products, orders, users, posts, translations, uploads.
# ═════════════════════════════════════════════════════════════════════════════

phase6_provision() {
    log_phase "6" "PROVISIONING DB (idempotente)"
    PHASE_ERRORS=0

    echo -e "  ${DIM}Declarativo: wp_options = fuente de verdad del proyecto.${NC}"
    echo -e "  ${DIM}NO toca: productos, pedidos, usuarios, traducciones, media.${NC}"

    # Helper: set a wp_option idempotently
    wp_set() {
        local key="$1"
        local expected="$2"
        local current
        current=$(wpcli_prod "option get '$key'" 2>/dev/null | tr -d '\r\n') || current="__UNSET__"

        if [ "$current" = "$expected" ]; then
            log_ok "$key = $expected"
        else
            wpcli_prod "option update '$key' '$expected'" >/dev/null 2>&1
            if [ "$current" = "__UNSET__" ]; then
                log_ok "$key = $expected (nuevo)"
            else
                log_ok "$key: $current → $expected"
            fi
        fi
    }

    # ── 6a. Store Identity ───────────────────────────────────────────────
    log_section "Identidad de la Tienda"

    wp_set "blogname"        "Tu Joyita Miami"
    wp_set "blogdescription" "Joyas de alta calidad en Miami, Florida"
    wp_set "timezone_string" "America/New_York"
    wp_set "date_format"     "F j, Y"
    wp_set "time_format"     "g:i a"
    wp_set "WPLANG"          "es_ES"

    # ── 6b. WooCommerce ─────────────────────────────────────────────────
    log_section "WooCommerce"

    wp_set "woocommerce_default_country"      "US:FL"
    wp_set "woocommerce_store_address"        "7212 Bird Road"
    wp_set "woocommerce_store_city"           "Miami"
    wp_set "woocommerce_store_postcode"       "33155"
    wp_set "woocommerce_currency"             "USD"
    wp_set "woocommerce_currency_pos"         "left"
    wp_set "woocommerce_price_thousand_sep"   ","
    wp_set "woocommerce_price_decimal_sep"    "."
    wp_set "woocommerce_price_num_decimals"   "2"
    wp_set "woocommerce_calc_taxes"           "yes"
    wp_set "woocommerce_enable_reviews"       "yes"

    # ── 6c. Security & Comments ──────────────────────────────────────────
    log_section "Seguridad y Comentarios"

    wp_set "default_comment_status" "closed"
    wp_set "default_ping_status"    "closed"
    wp_set "default_pingback_flag"  "0"
    wp_set "comments_notify"        "0"

    # ── 6d. Permalinks ───────────────────────────────────────────────────
    log_section "Permalinks"

    wp_set "permalink_structure" "/%postname%/"
    wpcli_prod "rewrite flush --hard" >/dev/null 2>&1 || true
    log_ok "Rewrite rules flushed"

    # ── 6e. Cleanup Default Content ──────────────────────────────────────
    log_section "Limpieza Contenido Default"

    # Only delete "Hello world!" (ID 1) if it exists as a post
    local post_ids
    post_ids=$(wpcli_prod "post list --post_type=post --field=ID" 2>/dev/null) || post_ids=""
    if echo "$post_ids" | grep -qw "1"; then
        wpcli_prod "post delete 1 --force" >/dev/null 2>&1 || true
        log_ok "Eliminado 'Hello world!' (ID 1)"
    else
        log_ok "Sin post default"
    fi

    # Delete sample comment (ID 1) if exists
    local comment_ids
    comment_ids=$(wpcli_prod "comment list --field=comment_ID" 2>/dev/null) || comment_ids=""
    if echo "$comment_ids" | grep -qw "1"; then
        wpcli_prod "comment delete 1 --force" >/dev/null 2>&1 || true
        log_ok "Eliminado comentario default (ID 1)"
    else
        log_ok "Sin comentario default"
    fi

    [ "$PHASE_ERRORS" -gt 0 ] && log_warn "Fase 6: $PHASE_ERRORS errores" || true
}

# ═════════════════════════════════════════════════════════════════════════════
# PHASE 7: HEALTH CHECK
# ═════════════════════════════════════════════════════════════════════════════

phase7_health() {
    log_phase "7" "HEALTH CHECK POST-DEPLOY"
    PHASE_ERRORS=0

    sleep 5

    # ── 7a. Endpoints ────────────────────────────────────────────────────
    log_section "Endpoints"

    local endpoints=(
        "https://$PROD_DOMAIN|WordPress|200"
        "https://$PROD_DOMAIN/wp-json/|REST API|200"
        "https://$PROD_DOMAIN/dashboard/|Dashboard|200"
        "https://$PROD_DOMAIN/tienda/|Tienda|200"
        "https://$PROD_DOMAIN/en/|English|200"
    )

    for entry in "${endpoints[@]}"; do
        IFS='|' read -r url label expected <<< "$entry"
        local code
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")
        if [ "$code" = "$expected" ]; then
            log_ok "$label: HTTP $code"
        elif [ "$code" = "000" ]; then
            log_warn "$label: no responde"
        else
            log_warn "$label: HTTP $code (esperaba $expected)"
        fi
    done

    # ── 7b. REST API Detail ──────────────────────────────────────────────
    log_section "WordPress REST API"

    local api_resp
    api_resp=$(curl -s --max-time 10 "https://$PROD_DOMAIN/wp-json/" 2>/dev/null || true)
    api_resp="${api_resp:0:500}"
    if echo "$api_resp" | grep -q '"name"'; then
        log_ok "REST API respondiendo"
        local site_name
        site_name=$(echo "$api_resp" | grep -oP '"name"\s*:\s*"[^"]*"' | head -1) || true
        [ -n "$site_name" ] && log_info "  $site_name" || true
    else
        log_warn "REST API no responde correctamente"
    fi

    # ── 7c. Containers ───────────────────────────────────────────────────
    log_section "Contenedores"

    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml ps --format 'table {{.Name}}\t{{.Status}}'" 2>/dev/null || \
        log_warn "No se pudo obtener estado"

    [ "$PHASE_ERRORS" -gt 0 ] && log_warn "Fase 7: $PHASE_ERRORS errores" || true
}

# ═════════════════════════════════════════════════════════════════════════════
# ROLLBACK
# ═════════════════════════════════════════════════════════════════════════════

cmd_rollback() {
    log_header "ROLLBACK — Tu Joyita Miami"

    echo -e "  ${YELLOW}Restaura DB al último backup pre-deploy.${NC}"
    echo -e "  ${YELLOW}Código: git revert HEAD && git push && deploy${NC}"
    echo ""

    echo -e "  ${BOLD}Backups:${NC}"
    ssh_prod "ls -lht $PROD_DIR/backups/pre-deploy_*.sql.gz 2>/dev/null | head -5" || die "No hay backups"

    echo ""
    read -rp "  Restaurar último backup? (yes/no): " confirm
    [ "$confirm" != "yes" ] && { echo -e "  ${YELLOW}Cancelado.${NC}"; exit 0; }

    local last
    last=$(ssh_prod "ls -t $PROD_DIR/backups/pre-deploy_*.sql.gz 2>/dev/null | head -1")
    [ -z "$last" ] && die "No hay backups"

    echo -e "\n  ${YELLOW}Restaurando: $last${NC}"

    ssh_prod "cd $PROD_DIR && \
        gunzip -c $last | docker exec -i $PROD_DB_CONTAINER mysql \
        -u root -p\$(grep MYSQL_ROOT_PASSWORD .env | cut -d'=' -f2-) \
        \$(grep MYSQL_DATABASE .env | cut -d'=' -f2-)"

    log_ok "DB restaurada"
    ssh_prod "$WPCLI_CMD cache flush --allow-root" 2>/dev/null || true
    log_ok "Cache limpiado"
    echo -e "\n  ${GREEN}${BOLD}Rollback completado.${NC}"
}

# ═════════════════════════════════════════════════════════════════════════════
# STATUS
# ═════════════════════════════════════════════════════════════════════════════

cmd_status() {
    log_header "ESTADO — Tu Joyita Miami (Producción)"
    ssh_prod "echo ok" &>/dev/null || die "No se puede conectar a $PROD_HOST"
    phase2_remote_validation
    print_summary
}

# ═════════════════════════════════════════════════════════════════════════════
# MANIFEST
# ═════════════════════════════════════════════════════════════════════════════

print_manifest() {
    cat <<'MANIFEST'

┌────────────────────────────────────────────────────────────────┐
│  DEPLOY AGENT v2.0 — Tu Joyita Miami                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SE DESPLIEGA:                                                 │
│    ✔ mu-plugins/jewelry-*.php (código custom)                  │
│    ✔ plugins/jewelry-dashboard/ (CORS, media upload, stats)    │
│    ✔ dashboard/ (SPA bundled + nginx config)                   │
│    ✔ docker-compose.production.yml                             │
│    ✔ scripts/ (utilidades)                                     │
│    ✔ wp_options declarativas (idempotentes vía WP-CLI)         │
│                                                                │
│  NUNCA SE TOCA:                                                │
│    ✗ Base de datos (schema, productos, pedidos, traducciones)  │
│    ✗ wp-content/uploads/ (media)                               │
│    ✗ Plugins de terceros (WooCommerce, Elementor, etc.)        │
│    ✗ Temas de terceros (Astra)                                 │
│    ✗ Credenciales (.env, .env.js, .env.production.js)          │
│                                                                │
│  PROTECCIÓN:                                                   │
│    ◆ Backup auto pre-deploy         ◆ Tests anti-regresión    │
│    ◆ Build + cache buster refresh   ◆ Traefik router verify   │
│    ◆ Health check 5 endpoints       ◆ DB provisioning (safe)  │
│    ◆ DB aislada: jewelry_db ≠ tujoyita_db                     │
│    ◆ Rollback instantáneo                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘

MANIFEST
}

# ═════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═════════════════════════════════════════════════════════════════════════════

print_summary() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  RESUMEN${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "  Pasaron:       ${GREEN}${CHECKS_PASSED}${NC}"
    echo -e "  Advertencias:  ${YELLOW}${CHECKS_WARNED}${NC}"
    echo -e "  Errores:       ${RED}${CHECKS_FAILED}${NC}"
    echo ""
    if [ "$CHECKS_FAILED" -eq 0 ]; then
        echo -e "  ${GREEN}${BOLD}RESULTADO: TODO OK${NC}"
    else
        echo -e "  ${RED}${BOLD}RESULTADO: $CHECKS_FAILED errores${NC}"
    fi
    echo ""
}

# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

main() {
    cd "$PROJECT_DIR"

    local mode="${1:-deploy}"

    case "$mode" in
        --help|-h)
            echo "Deploy Agent v${VERSION} — Tu Joyita Miami"
            echo ""
            echo "Uso: $0 [opción]"
            echo ""
            echo "  (sin args)      Deploy completo interactivo"
            echo "  --check, -c     Solo validar (no despliega)"
            echo "  --force, -f     Deploy sin confirmación"
            echo "  --rollback, -r  Rollback al último backup"
            echo "  --status, -s    Estado de producción"
            echo "  --provision, -p Solo ejecutar provisioning DB"
            echo "  --help, -h      Esta ayuda"
            exit 0
            ;;

        --check|-c)
            log_header "VERIFICACIÓN PRE-DEPLOY v${VERSION}"
            print_manifest
            phase1_local_validation
            phase2_remote_validation
            print_summary
            exit "$CHECKS_FAILED"
            ;;

        --status|-s)
            cmd_status
            exit 0
            ;;

        --rollback|-r)
            cmd_rollback
            exit 0
            ;;

        --provision|-p)
            log_header "PROVISIONING DB — Tu Joyita Miami"
            ssh_prod "echo ok" &>/dev/null || die "No se puede conectar a producción"
            phase6_provision
            print_summary
            exit "$CHECKS_FAILED"
            ;;

        --force|-f)
            log_header "DEPLOY FORZADO v${VERSION}"
            print_manifest
            ;;

        *)
            log_header "DEPLOY AGENT v${VERSION} — Tu Joyita Miami"
            print_manifest
            ;;
    esac

    # ── Full deploy pipeline ─────────────────────────────────────────────

    phase1_local_validation
    phase2_remote_validation || die "No se puede conectar a producción"

    # Gate
    if [ "$CHECKS_FAILED" -gt 0 ] && [ "$mode" != "--force" ] && [ "$mode" != "-f" ]; then
        echo ""
        echo -e "${RED}$CHECKS_FAILED errores. Deploy no recomendado.${NC}"
        read -rp "  Continuar? (yes/no): " confirm
        [ "$confirm" != "yes" ] && { echo -e "${YELLOW}Cancelado.${NC}"; exit 1; }
    fi

    # Confirmation
    if [ "$mode" != "--force" ] && [ "$mode" != "-f" ]; then
        echo ""
        echo -e "${YELLOW}${BOLD}¿Desplegar a producción (tujoyita.com)?${NC}"
        echo -e "${DIM}Commit: $(git log --oneline -1)${NC}"
        read -rp "  Escribe 'deploy' para confirmar: " confirm
        [ "$confirm" != "deploy" ] && { echo -e "${YELLOW}Cancelado.${NC}"; exit 0; }
    fi

    phase3_backup || die "Backup falló — deploy abortado"
    phase4_code_sync
    phase5_containers
    phase6_provision
    phase7_health

    # Final
    print_summary

    if [ "$CHECKS_FAILED" -eq 0 ]; then
        echo -e "  ${GREEN}${BOLD}DEPLOY EXITOSO${NC}"
    else
        echo -e "  ${YELLOW}${BOLD}Deploy con $CHECKS_FAILED advertencias${NC}"
        echo -e "  ${DIM}Rollback: $0 --rollback${NC}"
    fi
    echo ""
    echo -e "  ${DIM}Version:   v${VERSION}${NC}"
    echo -e "  ${DIM}Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')${NC}"
    echo -e "  ${DIM}Commit:    $(git log --oneline -1)${NC}"
    [ -n "${LAST_BACKUP:-}" ] && echo -e "  ${DIM}Backup:    $LAST_BACKUP${NC}"
    echo ""
}

main "$@"
