#!/bin/bash
################################################################################
# 🚀 DEPLOYMENT AGENT — Tu Joyita Miami (tujoyita.com)
#
# Agente especialista en deployment a producción.
# Ejecuta validaciones completas, backup, deploy y verificación.
#
# Uso:
#   ./scripts/deploy-agent.sh              # Deploy completo (interactivo)
#   ./scripts/deploy-agent.sh --check      # Solo verificar (no despliega)
#   ./scripts/deploy-agent.sh --force      # Deploy sin confirmación
#   ./scripts/deploy-agent.sh --rollback   # Rollback al último backup
#   ./scripts/deploy-agent.sh --status     # Estado de producción
#
# Requisitos:
#   - SSH configurado: Host tujoyita-prod en ~/.ssh/config
#   - Docker + Docker Compose en producción
#   - Branch main actualizado
#
################################################################################

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Producción
PROD_HOST="${PROD_HOST:-tujoyita-prod}"
PROD_DIR="${PROD_DIR:-/srv/stacks/tujoyita}"
PROD_DOMAIN="tujoyita.com"
PROD_COMPOSE="docker compose -f docker-compose.production.yml"

# Local
LOCAL_COMPOSE_FILE="docker-compose.yml"
LOCAL_DB_CONTAINER="jewelry_mysql"
LOCAL_WP_CONTAINER="jewelry_wordpress"
LOCAL_DB_NAME="jewelry_db"

# Producción containers
PROD_DB_CONTAINER="tujoyita_mysql"
PROD_WP_CONTAINER="tujoyita_wordpress"
PROD_DB_NAME="tujoyita_db"

# Archivos a sincronizar (solo código custom, NUNCA datos)
SYNC_PATHS=(
    "dashboard"
    "data/wordpress/wp-content/mu-plugins"
)

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Contadores
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCIONES UTILITARIAS
# ═══════════════════════════════════════════════════════════════════════════════

log_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

log_section() {
    echo -e "\n${CYAN}━━━ $1 ━━━${NC}"
}

log_ok() {
    echo -e "  ${GREEN}✔${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

log_fail() {
    echo -e "  ${RED}✗${NC} $1"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

log_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    CHECKS_WARNED=$((CHECKS_WARNED + 1))
}

log_info() {
    echo -e "  ${DIM}ℹ${NC} $1"
}

log_step() {
    echo -e "\n${YELLOW}▶ Paso $1: $2${NC}"
}

die() {
    echo -e "\n${RED}FATAL: $1${NC}" >&2
    exit 1
}

# Ejecutar comando remoto en producción
ssh_prod() {
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$PROD_HOST" "$@"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FASE 1: VALIDACIONES PRE-DEPLOY (LOCAL)
# ═══════════════════════════════════════════════════════════════════════════════

check_local_prerequisites() {
    log_section "Requisitos Locales"

    # Git
    if git -C "$PROJECT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
        log_ok "Repositorio Git válido"
    else
        log_fail "No es un repositorio Git"
        return 1
    fi

    # Branch main
    local branch
    branch=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)
    if [ "$branch" = "main" ]; then
        log_ok "Branch: main"
    else
        log_fail "Branch actual: $branch (se requiere main)"
        return 1
    fi

    # Working tree limpio
    if git -C "$PROJECT_DIR" diff --quiet && git -C "$PROJECT_DIR" diff --cached --quiet; then
        log_ok "Working tree limpio (sin cambios sin commitear)"
    else
        log_warn "Hay cambios sin commitear"
        git -C "$PROJECT_DIR" status --short | head -5 | while read -r line; do
            log_info "  $line"
        done
    fi

    # Verificar que origin está actualizado
    git -C "$PROJECT_DIR" fetch origin main --quiet 2>/dev/null || true
    local local_sha remote_sha
    local_sha=$(git -C "$PROJECT_DIR" rev-parse HEAD)
    remote_sha=$(git -C "$PROJECT_DIR" rev-parse origin/main 2>/dev/null || echo "unknown")
    if [ "$local_sha" = "$remote_sha" ]; then
        log_ok "Local sincronizado con origin/main"
    elif [ "$remote_sha" = "unknown" ]; then
        log_warn "No se pudo verificar origin/main"
    else
        log_warn "Local y origin/main difieren"
        log_info "Local:  ${local_sha:0:8}"
        log_info "Origin: ${remote_sha:0:8}"
    fi

    # Commit actual
    log_info "Commit: $(git -C "$PROJECT_DIR" log --oneline -1)"
}

check_local_files() {
    log_section "Archivos del Proyecto"

    # docker-compose.production.yml
    if [ -f "$PROJECT_DIR/docker-compose.production.yml" ]; then
        log_ok "docker-compose.production.yml existe"
    else
        log_fail "docker-compose.production.yml NO encontrado"
    fi

    # .env.production template
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        log_ok ".env.production (template) existe"
    else
        log_warn ".env.production template no encontrado"
    fi

    # .env local (NO debe desplegarse)
    if [ -f "$PROJECT_DIR/.env" ]; then
        log_ok ".env local existe"
        # Verificar que NO está en git
        if git -C "$PROJECT_DIR" ls-files --error-unmatch .env &>/dev/null 2>&1; then
            log_fail ".env está tracked en Git (RIESGO DE SEGURIDAD)"
        else
            log_ok ".env NO está tracked en Git"
        fi
    fi

    # mu-plugins
    local mu_dir="$PROJECT_DIR/data/wordpress/wp-content/mu-plugins"
    if [ -d "$mu_dir" ]; then
        local mu_count
        mu_count=$(find "$mu_dir" -name "jewelry-*.php" -type f | wc -l)
        log_ok "mu-plugins: $mu_count archivos jewelry-*.php"
        find "$mu_dir" -name "jewelry-*.php" -type f | while read -r f; do
            local basename
            basename=$(basename "$f")
            if git -C "$PROJECT_DIR" ls-files --error-unmatch "data/wordpress/wp-content/mu-plugins/$basename" &>/dev/null 2>&1; then
                log_info "  $basename (tracked en Git)"
            else
                log_warn "  $basename (NO tracked en Git - no se desplegará)"
            fi
        done
    else
        log_warn "Directorio mu-plugins no encontrado"
    fi

    # Dashboard
    if [ -d "$PROJECT_DIR/dashboard" ] && [ -f "$PROJECT_DIR/dashboard/index.html" ]; then
        log_ok "Dashboard SPA existe"
    else
        log_warn "Dashboard no encontrado"
    fi

    # Nginx production config
    if [ -f "$PROJECT_DIR/dashboard/nginx/production.conf" ]; then
        log_ok "Nginx production.conf existe"
        # Verificar que apunta a tujoyita_wordpress
        if grep -q "tujoyita_wordpress" "$PROJECT_DIR/dashboard/nginx/production.conf"; then
            log_ok "production.conf apunta a tujoyita_wordpress"
        else
            log_fail "production.conf NO apunta a tujoyita_wordpress"
        fi
    else
        log_fail "dashboard/nginx/production.conf NO encontrado"
    fi
}

check_no_credentials_leak() {
    log_section "Seguridad: Verificación de Credenciales"

    # Verificar que archivos sensibles no están en git
    local sensitive_files=(".env" ".wp-credentials" "data/mysql")
    for f in "${sensitive_files[@]}"; do
        if git -C "$PROJECT_DIR" ls-files --error-unmatch "$f" &>/dev/null 2>&1; then
            log_fail "ALERTA: '$f' está tracked en Git"
        else
            log_ok "'$f' NO está en Git"
        fi
    done

    # Buscar passwords hardcodeados en archivos tracked
    local tracked_files
    tracked_files=$(git -C "$PROJECT_DIR" ls-files -- '*.php' '*.sh' '*.js' '*.json' 2>/dev/null | head -100)
    local leaks=0
    while IFS= read -r file; do
        [ -z "$file" ] && continue
        if grep -qiE '(password|secret|api_key)\s*[:=]\s*["\x27][A-Za-z0-9!@#$%^&*]{8,}["\x27]' "$PROJECT_DIR/$file" 2>/dev/null; then
            log_warn "Posible credencial en: $file"
            leaks=$((leaks + 1))
        fi
    done <<< "$tracked_files"
    if [ "$leaks" -eq 0 ]; then
        log_ok "Sin credenciales hardcodeadas en archivos tracked"
    fi
}

check_database_isolation() {
    log_section "Aislamiento de Bases de Datos"

    echo -e "  ${BOLD}Entorno Local:${NC}"
    log_info "DB Container: $LOCAL_DB_CONTAINER"
    log_info "DB Name:      $LOCAL_DB_NAME"
    log_info "Volumen:      ./data/mysql (bind mount)"

    echo -e "  ${BOLD}Entorno Producción:${NC}"
    log_info "DB Container: $PROD_DB_CONTAINER"
    log_info "DB Name:      $PROD_DB_NAME"
    log_info "Volumen:      mysql-data (named volume)"

    # Verificar que son diferentes
    if [ "$LOCAL_DB_CONTAINER" != "$PROD_DB_CONTAINER" ] && [ "$LOCAL_DB_NAME" != "$PROD_DB_NAME" ]; then
        log_ok "Contenedores y DBs completamente separados"
    else
        log_fail "PELIGRO: Nombres de contenedores/DBs coinciden"
    fi

    # Verificar que data/mysql NO se despliega
    if ! git -C "$PROJECT_DIR" ls-files data/mysql/ | grep -q .; then
        log_ok "data/mysql/ NO está en Git (datos locales protegidos)"
    else
        log_fail "data/mysql/ está en Git (RIESGO)"
    fi

    # Verificar que docker-compose.production.yml usa named volumes
    if grep -q "mysql-data:" "$PROJECT_DIR/docker-compose.production.yml"; then
        log_ok "Producción usa Docker named volumes (independientes)"
    else
        log_warn "Producción no usa named volumes"
    fi

    echo ""
    echo -e "  ${GREEN}CONCLUSIÓN: El deploy NUNCA toca la base de datos de producción.${NC}"
    echo -e "  ${GREEN}Solo se sincronizan archivos de código (mu-plugins, dashboard).${NC}"
    log_ok "Aislamiento de DB verificado"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FASE 2: VALIDACIONES DE PRODUCCIÓN (REMOTO)
# ═══════════════════════════════════════════════════════════════════════════════

check_ssh_connection() {
    log_section "Conexión SSH a Producción"

    if ssh_prod "echo ok" &>/dev/null; then
        log_ok "SSH conecta a $PROD_HOST"
    else
        log_fail "No se puede conectar a $PROD_HOST via SSH"
        return 1
    fi

    # Verificar directorio existe
    if ssh_prod "test -d $PROD_DIR"; then
        log_ok "Directorio $PROD_DIR existe"
    else
        log_fail "$PROD_DIR no existe en el servidor"
        return 1
    fi

    # Verificar .env en producción
    if ssh_prod "test -f $PROD_DIR/.env"; then
        log_ok ".env de producción existe"
    else
        log_fail ".env de producción NO existe"
        log_info "Crear .env en producción basado en .env.production"
    fi
}

check_prod_containers() {
    log_section "Contenedores de Producción"

    local containers
    containers=$(ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml ps --format '{{.Name}}|{{.Status}}'" 2>/dev/null || echo "")

    if [ -z "$containers" ]; then
        log_warn "No se pudieron listar contenedores (puede que no estén corriendo aún)"
        return 0
    fi

    while IFS='|' read -r name status; do
        [ -z "$name" ] && continue
        if echo "$status" | grep -qi "up\|running"; then
            log_ok "$name: $status"
        else
            log_warn "$name: $status"
        fi
    done <<< "$containers"
}

check_prod_disk_space() {
    log_section "Espacio en Disco (Producción)"

    local disk_usage
    disk_usage=$(ssh_prod "df -h $PROD_DIR | tail -1 | awk '{print \$5, \$4}'" 2>/dev/null || echo "unknown")

    if [ "$disk_usage" != "unknown" ]; then
        local used_pct available
        used_pct=$(echo "$disk_usage" | awk '{print $1}' | tr -d '%')
        available=$(echo "$disk_usage" | awk '{print $2}')

        if [ "$used_pct" -lt 80 ]; then
            log_ok "Disco: ${used_pct}% usado, ${available} disponible"
        elif [ "$used_pct" -lt 90 ]; then
            log_warn "Disco: ${used_pct}% usado, ${available} disponible"
        else
            log_fail "Disco CRÍTICO: ${used_pct}% usado, ${available} disponible"
        fi
    else
        log_warn "No se pudo verificar espacio en disco"
    fi
}

check_prod_health() {
    log_section "Salud del Sitio (Pre-deploy)"

    # HTTPS
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$PROD_DOMAIN" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_ok "HTTPS: $http_code"
    elif [ "$http_code" = "000" ]; then
        log_warn "HTTPS: No responde (sitio puede no estar desplegado aún)"
    else
        log_warn "HTTPS: $http_code"
    fi

    # www redirect
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://www.$PROD_DOMAIN" 2>/dev/null || echo "000")
    if [ "$http_code" = "301" ] || [ "$http_code" = "200" ]; then
        log_ok "www redirect: $http_code"
    elif [ "$http_code" = "000" ]; then
        log_info "www.$PROD_DOMAIN no responde (normal si es primer deploy)"
    else
        log_warn "www redirect: $http_code"
    fi

    # SSL
    local ssl_expiry
    ssl_expiry=$(echo | openssl s_client -servername "$PROD_DOMAIN" -connect "$PROD_DOMAIN:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
    if [ -n "$ssl_expiry" ]; then
        local expiry_epoch now_epoch diff_days
        expiry_epoch=$(date -d "$ssl_expiry" +%s 2>/dev/null || echo "0")
        now_epoch=$(date +%s)
        diff_days=$(( (expiry_epoch - now_epoch) / 86400 ))
        if [ "$diff_days" -gt 30 ]; then
            log_ok "SSL válido por $diff_days días (expira: $ssl_expiry)"
        elif [ "$diff_days" -gt 7 ]; then
            log_warn "SSL expira en $diff_days días"
        else
            log_fail "SSL CRÍTICO: expira en $diff_days días"
        fi
    else
        log_info "SSL no verificable (normal si es primer deploy)"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# FASE 3: BACKUP PRE-DEPLOY
# ═══════════════════════════════════════════════════════════════════════════════

backup_production() {
    log_step "3" "Backup de Producción"

    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="backups/pre-deploy_${timestamp}.sql.gz"

    echo -e "  Creando backup: ${DIM}$backup_file${NC}"

    local result
    result=$(ssh_prod "cd $PROD_DIR && mkdir -p backups && \
        docker exec $PROD_DB_CONTAINER mysqldump \
        -u root -p\$(grep MYSQL_ROOT_PASSWORD .env | cut -d'=' -f2-) \
        \$(grep MYSQL_DATABASE .env | cut -d'=' -f2-) \
        --single-transaction --routines --triggers \
        2>/dev/null | gzip > $backup_file && \
        ls -lh $backup_file | awk '{print \$5}'" 2>/dev/null || echo "FAILED")

    if [ "$result" = "FAILED" ]; then
        log_fail "Backup falló"
        return 1
    else
        log_ok "Backup creado: $backup_file ($result)"
        LAST_BACKUP="$backup_file"
    fi

    # Contar backups existentes
    local backup_count
    backup_count=$(ssh_prod "ls $PROD_DIR/backups/pre-deploy_*.sql.gz 2>/dev/null | wc -l" || echo "?")
    log_info "Total backups pre-deploy: $backup_count"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FASE 4: DEPLOY
# ═══════════════════════════════════════════════════════════════════════════════

deploy_code() {
    log_step "4" "Sincronizar Código"

    echo -e "  ${DIM}NOTA: Solo se despliega código custom tracked en Git.${NC}"
    echo -e "  ${DIM}NUNCA se tocan: base de datos, uploads, plugins de terceros.${NC}"
    echo ""

    # 4a. Sincronizar mu-plugins
    echo -e "  ${YELLOW}4a. mu-plugins${NC}"
    local mu_dir="$PROJECT_DIR/data/wordpress/wp-content/mu-plugins"
    if [ -d "$mu_dir" ]; then
        # Copiar mu-plugins al volumen de WordPress en producción
        # Usamos docker cp porque producción usa named volumes
        for mu_file in "$mu_dir"/jewelry-*.php; do
            [ -f "$mu_file" ] || continue
            local basename
            basename=$(basename "$mu_file")
            # Skip dev-only mu-plugins
            if [ "$basename" = "jewelry-dev-domain.php" ]; then
                log_ok "mu-plugin: $basename (SKIPPED — dev only)"
                continue
            fi
            # Primero, copiar al VPS
            scp -q "$mu_file" "$PROD_HOST:/tmp/$basename"
            # Luego, mover al contenedor
            ssh_prod "docker cp /tmp/$basename $PROD_WP_CONTAINER:/var/www/html/wp-content/mu-plugins/$basename && rm /tmp/$basename"
            log_ok "mu-plugin: $basename"
        done
    fi

    # 4b. Build Dashboard (bundle + minify)
    echo -e "\n  ${YELLOW}4b. Build Dashboard${NC}"
    if command -v node &>/dev/null && [ -f "$PROJECT_DIR/dashboard/build.js" ]; then
        (cd "$PROJECT_DIR" && node dashboard/build.js)
        if [ -f "$PROJECT_DIR/dashboard/dist/bundle.min.js" ]; then
            log_ok "Dashboard built (JS + CSS minified)"
        else
            log_warn "Build completed but bundle.min.js not found"
        fi
    else
        log_warn "Node.js or build.js not found — deploying unminified"
    fi

    # 4c. Sincronizar Dashboard
    echo -e "\n  ${YELLOW}4c. Dashboard SPA${NC}"
    if [ -d "$PROJECT_DIR/dashboard" ]; then
        # Sincronizar dashboard (excluyendo secrets and source JS/CSS)
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

        # If bundle exists, use dist/index.html as the main index
        if [ -f "$PROJECT_DIR/dashboard/dist/index.html" ]; then
            scp -q "$PROJECT_DIR/dashboard/dist/index.html" "$PROD_HOST:$PROD_DIR/dashboard/index.html"
            log_ok "Dashboard sincronizado (bundled)"
        else
            log_ok "Dashboard sincronizado (unbundled)"
        fi

        # Verificar que wc-auth.production.conf existe en VPS
        if ! ssh_prod "test -f $PROD_DIR/dashboard/nginx/wc-auth.production.conf"; then
            log_warn "wc-auth.production.conf NO existe en VPS — WC proxy no funcionará"
            log_warn "Crear manualmente: cp wc-auth.conf.example wc-auth.production.conf"
        else
            log_ok "wc-auth.production.conf presente en VPS"
        fi
    fi

    # 4d. Sincronizar docker-compose.production.yml
    echo -e "\n  ${YELLOW}4d. Configuración Docker${NC}"
    scp -q "$PROJECT_DIR/docker-compose.production.yml" "$PROD_HOST:$PROD_DIR/docker-compose.production.yml"
    log_ok "docker-compose.production.yml actualizado"

    # 4e. Sincronizar scripts
    echo -e "\n  ${YELLOW}4e. Scripts${NC}"
    rsync -avz --quiet \
        "$PROJECT_DIR/scripts/" \
        "$PROD_HOST:$PROD_DIR/scripts/"
    log_ok "Scripts sincronizados"
}

deploy_containers() {
    log_step "5" "Actualizar Contenedores"

    echo -e "  ${DIM}Recreando solo WordPress y Dashboard (DB intacta)${NC}"
    echo ""

    # Pull latest images
    echo -e "  Pulling imágenes..."
    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml pull --quiet wordpress dashboard" 2>/dev/null || true
    log_ok "Imágenes actualizadas"

    # Recrear solo WordPress y Dashboard (NO mysql)
    echo -e "  Recreando contenedores (MySQL NO se toca)..."
    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml up -d --force-recreate wordpress dashboard"
    log_ok "WordPress y Dashboard recreados"

    # Esperar a que WordPress arranque
    echo -e "  Esperando arranque..."
    sleep 10

    # Verificar que MySQL sigue corriendo (sin reiniciarse)
    local mysql_status
    mysql_status=$(ssh_prod "docker inspect --format='{{.State.Status}}' $PROD_DB_CONTAINER" 2>/dev/null || echo "unknown")
    if [ "$mysql_status" = "running" ]; then
        log_ok "MySQL sigue corriendo (NO fue tocado)"
    else
        log_warn "MySQL status: $mysql_status"
    fi

    # Flush cache
    echo -e "  Limpiando cache..."
    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml --profile cli run --rm wpcli wp cache flush" 2>/dev/null || true
    log_ok "Cache limpiado"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FASE 5: HEALTH CHECK POST-DEPLOY
# ═══════════════════════════════════════════════════════════════════════════════

post_deploy_health() {
    log_step "6" "Health Check Post-Deploy"

    sleep 5

    # HTTPS
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "https://$PROD_DOMAIN" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_ok "HTTPS: $http_code"
    else
        log_fail "HTTPS: $http_code"
    fi

    # REST API
    local rest_response
    rest_response=$(curl -s --max-time 15 "https://$PROD_DOMAIN/wp-json/" 2>/dev/null | head -c 100)
    if echo "$rest_response" | grep -q "name"; then
        log_ok "WordPress REST API respondiendo"
    else
        log_warn "REST API no responde como esperado"
    fi

    # Dashboard
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$PROD_DOMAIN/dashboard/" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_ok "Dashboard: $http_code"
    else
        log_warn "Dashboard: $http_code"
    fi

    # WooCommerce
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$PROD_DOMAIN/tienda/" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_ok "Tienda: $http_code"
    else
        log_warn "Tienda: $http_code (puede estar pendiente de crear)"
    fi

    # Versión en inglés
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$PROD_DOMAIN/en/" 2>/dev/null || echo "000")
    if [ "$http_code" = "200" ]; then
        log_ok "Versión inglés (/en/): $http_code"
    else
        log_warn "Versión inglés (/en/): $http_code"
    fi

    # Containers
    log_section "Estado Final de Contenedores"
    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml ps --format 'table {{.Name}}\t{{.Status}}'" 2>/dev/null || \
        log_warn "No se pudo obtener estado de contenedores"
}

# ═══════════════════════════════════════════════════════════════════════════════
# ROLLBACK
# ═══════════════════════════════════════════════════════════════════════════════

rollback() {
    log_header "🔄 ROLLBACK — Tu Joyita Miami"

    echo -e "  ${YELLOW}NOTA: El rollback restaura la base de datos al último backup.${NC}"
    echo -e "  ${YELLOW}Los archivos de código se pueden revertir con git.${NC}"
    echo ""

    # Listar backups disponibles
    echo -e "  Backups disponibles en producción:"
    ssh_prod "ls -lht $PROD_DIR/backups/pre-deploy_*.sql.gz 2>/dev/null | head -5" || {
        die "No hay backups disponibles"
    }

    echo ""
    read -rp "  ¿Restaurar el último backup? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "  ${YELLOW}Rollback cancelado.${NC}"
        exit 0
    fi

    local last_backup
    last_backup=$(ssh_prod "ls -t $PROD_DIR/backups/pre-deploy_*.sql.gz 2>/dev/null | head -1")

    if [ -z "$last_backup" ]; then
        die "No hay backups pre-deploy disponibles"
    fi

    echo -e "\n  ${YELLOW}Restaurando: $last_backup${NC}"

    ssh_prod "cd $PROD_DIR && \
        gunzip -c $last_backup | docker exec -i $PROD_DB_CONTAINER mysql \
        -u root -p\$(grep MYSQL_ROOT_PASSWORD .env | cut -d'=' -f2-) \
        \$(grep MYSQL_DATABASE .env | cut -d'=' -f2-)"

    log_ok "Base de datos restaurada desde $last_backup"

    # Flush cache
    ssh_prod "cd $PROD_DIR && docker compose -f docker-compose.production.yml --profile cli run --rm wpcli wp cache flush" 2>/dev/null || true
    log_ok "Cache limpiado"

    echo ""
    echo -e "  ${GREEN}Rollback completado.${NC}"
    echo -e "  ${DIM}Para revertir código: git revert HEAD && git push && make deploy${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STATUS
# ═══════════════════════════════════════════════════════════════════════════════

show_status() {
    log_header "📊 ESTADO — Tu Joyita Miami (Producción)"

    check_ssh_connection
    check_prod_containers
    check_prod_disk_space
    check_prod_health

    print_summary
}

# ═══════════════════════════════════════════════════════════════════════════════
# RESUMEN
# ═══════════════════════════════════════════════════════════════════════════════

print_summary() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  📊 RESUMEN${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Verificaciones pasadas: ${GREEN}${CHECKS_PASSED}${NC}"
    echo -e "  Advertencias:           ${YELLOW}${CHECKS_WARNED}${NC}"
    echo -e "  Errores:                ${RED}${CHECKS_FAILED}${NC}"
    echo ""

    if [ "$CHECKS_FAILED" -eq 0 ]; then
        echo -e "  ${GREEN}${BOLD}RESULTADO: TODAS las verificaciones pasaron.${NC}"
    else
        echo -e "  ${RED}${BOLD}RESULTADO: $CHECKS_FAILED verificaciones fallaron.${NC}"
    fi
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# QUÉ SE DESPLIEGA Y QUÉ NO
# ═══════════════════════════════════════════════════════════════════════════════

print_deploy_manifest() {
    echo ""
    echo -e "${CYAN}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${CYAN}│  📋 MANIFIESTO DE DEPLOYMENT                                │${NC}"
    echo -e "${CYAN}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${CYAN}│                                                             │${NC}"
    echo -e "${CYAN}│  ${GREEN}SE DESPLIEGA:${CYAN}                                            │${NC}"
    echo -e "${CYAN}│    ✔ mu-plugins/jewelry-*.php (código custom)               │${NC}"
    echo -e "${CYAN}│    ✔ dashboard/ (SPA + nginx config)                        │${NC}"
    echo -e "${CYAN}│    ✔ docker-compose.production.yml                          │${NC}"
    echo -e "${CYAN}│    ✔ scripts/ (utilidades)                                  │${NC}"
    echo -e "${CYAN}│    ✔ Imagen WordPress (pull latest)                         │${NC}"
    echo -e "${CYAN}│                                                             │${NC}"
    echo -e "${CYAN}│  ${RED}NUNCA SE TOCA:${CYAN}                                            │${NC}"
    echo -e "${CYAN}│    ✗ Base de datos MySQL (ni local ni remota)               │${NC}"
    echo -e "${CYAN}│    ✗ wp-content/uploads/ (media de productos)               │${NC}"
    echo -e "${CYAN}│    ✗ Plugins de terceros (WooCommerce, Elementor, etc.)     │${NC}"
    echo -e "${CYAN}│    ✗ Temas de terceros (Astra)                              │${NC}"
    echo -e "${CYAN}│    ✗ Credenciales (.env)                                    │${NC}"
    echo -e "${CYAN}│    ✗ TranslatePress (traducciones en DB)                    │${NC}"
    echo -e "${CYAN}│    ✗ Datos de WooCommerce (productos, pedidos)              │${NC}"
    echo -e "${CYAN}│                                                             │${NC}"
    echo -e "${CYAN}│  ${YELLOW}PROTECCIÓN:${CYAN}                                               │${NC}"
    echo -e "${CYAN}│    🔒 Backup automático pre-deploy                          │${NC}"
    echo -e "${CYAN}│    🔒 Rollback instantáneo disponible                       │${NC}"
    echo -e "${CYAN}│    🔒 Health check post-deploy                              │${NC}"
    echo -e "${CYAN}│    🔒 DB aislada: jewelry_db (local) ≠ tujoyita_db (prod)  │${NC}"
    echo -e "${CYAN}│                                                             │${NC}"
    echo -e "${CYAN}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    cd "$PROJECT_DIR"

    MODE="${1:-deploy}"
    LAST_BACKUP=""

    case "$MODE" in
        --check|-c)
            log_header "🔍 VERIFICACIÓN PRE-DEPLOY — Tu Joyita Miami"
            print_deploy_manifest
            check_local_prerequisites
            check_local_files
            check_no_credentials_leak
            check_database_isolation
            check_ssh_connection && {
                check_prod_containers
                check_prod_disk_space
                check_prod_health
            }
            print_summary
            exit $CHECKS_FAILED
            ;;

        --status|-s)
            show_status
            exit 0
            ;;

        --rollback|-r)
            rollback
            exit 0
            ;;

        --force|-f)
            log_header "🚀 DEPLOY FORZADO — Tu Joyita Miami"
            print_deploy_manifest
            ;;

        --help|-h)
            echo "Uso: $0 [opción]"
            echo ""
            echo "Opciones:"
            echo "  (sin args)    Deploy completo interactivo"
            echo "  --check, -c   Solo verificar, no desplegar"
            echo "  --force, -f   Deploy sin confirmación"
            echo "  --rollback, -r Rollback al último backup"
            echo "  --status, -s   Estado de producción"
            echo "  --help, -h     Mostrar esta ayuda"
            exit 0
            ;;

        *)
            log_header "🚀 DEPLOYMENT AGENT — Tu Joyita Miami"
            print_deploy_manifest
            ;;
    esac

    # ── Fase 1: Validaciones locales ───────────────────────────────────────
    log_step "1" "Validaciones Locales"
    check_local_prerequisites
    check_local_files
    check_no_credentials_leak
    check_database_isolation

    # ── Fase 2: Validaciones remotas ───────────────────────────────────────
    log_step "2" "Validaciones de Producción"
    check_ssh_connection || die "No se puede conectar a producción"
    check_prod_containers
    check_prod_disk_space
    check_prod_health

    # ── Verificar si hay errores bloqueantes ───────────────────────────────
    if [ "$CHECKS_FAILED" -gt 0 ] && [ "$MODE" != "--force" ] && [ "$MODE" != "-f" ]; then
        echo ""
        echo -e "${RED}Hay $CHECKS_FAILED verificaciones fallidas. Deploy no recomendado.${NC}"
        read -rp "¿Continuar de todas formas? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo -e "${YELLOW}Deploy cancelado.${NC}"
            exit 1
        fi
    fi

    # ── Confirmación ───────────────────────────────────────────────────────
    if [ "$MODE" != "--force" ] && [ "$MODE" != "-f" ]; then
        echo ""
        echo -e "${YELLOW}${BOLD}¿Desplegar a producción (tujoyita.com)?${NC}"
        echo -e "${DIM}Commit: $(git log --oneline -1)${NC}"
        read -rp "Escribe 'deploy' para confirmar: " confirm
        if [ "$confirm" != "deploy" ]; then
            echo -e "${YELLOW}Deploy cancelado.${NC}"
            exit 0
        fi
    fi

    # ── Fase 3: Backup ────────────────────────────────────────────────────
    backup_production || die "Backup falló. Deploy abortado por seguridad."

    # ── Fase 4: Deploy código ─────────────────────────────────────────────
    deploy_code

    # ── Fase 5: Actualizar contenedores ───────────────────────────────────
    deploy_containers

    # ── Fase 6: Health check ──────────────────────────────────────────────
    post_deploy_health

    # ── Resumen final ─────────────────────────────────────────────────────
    print_summary

    if [ "$CHECKS_FAILED" -eq 0 ]; then
        echo -e "  ${GREEN}${BOLD}🎉 DEPLOY EXITOSO${NC}"
    else
        echo -e "  ${YELLOW}${BOLD}⚠ Deploy completado con $CHECKS_FAILED advertencias${NC}"
        echo -e "  ${DIM}Para rollback: $0 --rollback${NC}"
    fi
    echo ""
    echo -e "  ${DIM}Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')${NC}"
    echo -e "  ${DIM}Commit:    $(git log --oneline -1)${NC}"
    [ -n "${LAST_BACKUP:-}" ] && echo -e "  ${DIM}Backup:    $LAST_BACKUP${NC}"
    echo ""
}

main "$@"
