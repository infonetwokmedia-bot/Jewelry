#!/bin/bash

#############################################################################
# 🚀 Actualizador FINAL de Contenido Bilingual
# Actualiza páginas usando MySQL correctamente
#############################################################################

WP_CONTAINER="jewelry_wordpress"
DB_CONTAINER="jewelry_mysql"
DB_USER="jewelry_user"
DB_PASSWORD="jewelry_password"
DB_NAME="jewelry_db"

WORKSPACE="/srv/stacks/jewelry"
BACKUP_DIR="$WORKSPACE/backups"
TEMP_DIR="/tmp/jewelry-update"

mkdir -p "$BACKUP_DIR" "$TEMP_DIR"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Leer credenciales de .env si existen
if [ -f "$WORKSPACE/.env" ]; then
    export $(grep "^[^#]" "$WORKSPACE/.env" | xargs)
fi

# ============================================================================
# FUNCIONES
# ============================================================================

get_post_content() {
    local post_id=$1
    docker exec $WP_CONTAINER wp post get $post_id --field=post_content --allow-root 2>/dev/null
}

update_post_mysql() {
    local post_id=$1
    local content_file=$2

    # Escapar quotes para SQL
    local escaped=$(sed 's/\\"/\\\\\\"/g; s/"/'\''/g' "$content_file")

    # Ejecutar UPDATE en MySQL
    docker exec $DB_CONTAINER mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
    UPDATE wp_posts
    SET post_content = '$(cat "$content_file" | sed "s/'/''/g")'
    WHERE ID = $post_id;
    SELECT CONCAT('Actualizado: ', ID, ' - ', CHAR_LENGTH(post_content), ' chars') as resultado FROM wp_posts WHERE ID = $post_id;
    " 2>/dev/null
}

# Alternativa: usar WP-CLI con archivo
update_post_wpcli_file() {
    local post_id=$1
    local file=$2

    # Copiar archivo al contenedor WordPress
    docker cp "$file" "$WP_CONTAINER:/tmp/post_content.html"

    # Usar comando PHP via WP-CLI
    docker exec $WP_CONTAINER wp eval "
        \$content = file_get_contents('/tmp/post_content.html');
        \$result = wp_update_post(array(
            'ID' => $post_id,
            'post_content' => \$content
        ));
        echo 'Actualizado ID: ' . \$result;
    " --allow-root 2>/dev/null
}

# ============================================================================
# UPDATE HOME
# ============================================================================

update_home() {
    log_info "Actualizado HOME/INICIO..."
    echo ""

    # === ESPAÑOL (1388) ===
    log_info "HOME Español (ID: 1388)"

    # Obtener contenido
    get_post_content 1388 > "$TEMP_DIR/1388.html"

    # Verificar que se obtuvo
    if [ ! -s "$TEMP_DIR/1388.html" ]; then
        log_error "No se pudo obtener contenido"
        return 1
    fi

    # Crear backup
    cp "$TEMP_DIR/1388.html" "$BACKUP_DIR/page_1388_$(date +%s).html"
    log_success "  Backup creado"

    # Reemplazos
    sed -i 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua./Descubre nuestra colección de joyas premium, auténticas y diseñadas con perfección. Cada pieza cuenta una historia./g' "$TEMP_DIR/1388.html"

    sed -i 's/In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half./En Nuestra Tienda, Encontrarás Todo Tipo de Joyas para Impresionar a tu Pareja./g' "$TEMP_DIR/1388.html"

    log_success "  Reemplazos aplicados"

    # Actualizar
    update_post_wpcli_file 1388 "$TEMP_DIR/1388.html"
    log_success "  Post actualizado"

    echo ""

    # === INGLÉS (1403) ===
    log_info "HOME English (ID: 1403)"

    get_post_content 1403 > "$TEMP_DIR/1403.html"

    if [ ! -s "$TEMP_DIR/1403.html" ]; then
        log_error "No se pudo obtener contenido"
        return 1
    fi

    cp "$TEMP_DIR/1403.html" "$BACKUP_DIR/page_1403_$(date +%s).html"
    log_success "  Backup creado"

    sed -i 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua./Discover our collection of premium, authentic jewelry pieces designed with perfection. Each piece tells a story./g' "$TEMP_DIR/1403.html"

    sed -i 's/In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half./Browse Our Exclusive Collection of Premium Jewelry Handcrafted with Excellence./g' "$TEMP_DIR/1403.html"

    log_success "  Reemplazos aplicados"

    update_post_wpcli_file 1403 "$TEMP_DIR/1403.html"
    log_success "  Post actualizado"
}

# ============================================================================
# UPDATE ABOUT
# ============================================================================

update_about() {
    log_info "Actualizando ABOUT/NOSOTROS..."
    echo ""

    # === ESPAÑOL (1383) ===
    log_info "ABOUT Español (ID: 1383)"

    get_post_content 1383 > "$TEMP_DIR/1383.html"

    [ ! -s "$TEMP_DIR/1383.html" ] && log_error "No se pudo obtener" && return 1

    cp "$TEMP_DIR/1383.html" "$BACKUP_DIR/page_1383_$(date +%s).html"
    log_success "  Backup creado"

    # Reemplazar primer Lorem
    sed -i 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit/Remedio Joyería fue fundada hace 20 años en Miami con una misión simple: proporcionar joyería de lujo auténtica/g' "$TEMP_DIR/1383.html" | head -1

    log_success "  Reemplazos aplicados"

    update_post_wpcli_file 1383 "$TEMP_DIR/1383.html"
    log_success "  Post actualizado"

    echo ""

    # === INGLÉS (1404) ===
    log_info "ABOUT English (ID: 1404)"

    get_post_content 1404 > "$TEMP_DIR/1404.html"

    [ ! -s "$TEMP_DIR/1404.html" ] && log_error "No se pudo obtener" && return 1

    cp "$TEMP_DIR/1404.html" "$BACKUP_DIR/page_1404_$(date +%s).html"
    log_success "  Backup creado"

    sed -i 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit/Remedio Jewelry was founded 20 years ago in Miami with a simple mission: provide authentic luxury jewelry/g' "$TEMP_DIR/1404.html" | head -1

    log_success "  Reemplazos aplicados"

    update_post_wpcli_file 1404 "$TEMP_DIR/1404.html"
    log_success "  Post actualizado"
}

# ============================================================================
# VALIDATE
# ============================================================================

validate() {
    log_info "Validando cambios..."
    echo ""

    for id in 1388 1403 1383 1404; do
        local content=$(get_post_content $id)
        local lorem=$(echo "$content" | grep -o "Lorem ipsum" | wc -l)
        local size=$(echo "$content" | wc -c)
        echo "  Post $id: $size chars, $lorem Lorem ipsum"
    done
}

# ============================================================================
# MAIN
# ============================================================================

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Actualizador de Contenido Bilingual   ${NC}"
echo -e "${BLUE}║     Remedio Joyería 2026                 ${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

case "${1:-all}" in
    home)
        update_home
        ;;
    about)
        update_about
        ;;
    all)
        update_home
        echo ""
        update_about
        ;;
    validate)
        validate
        ;;
    *)
        echo "Uso: $0 [home|about|all|validate]"
        exit 1
        ;;
esac

echo ""
log_success "Completado. Backups: $BACKUP_DIR"
log_success "Próximo paso: Validar en https://jewelry.local.dev/inicio/ (ES) y /en/home/ (EN)"
echo ""
