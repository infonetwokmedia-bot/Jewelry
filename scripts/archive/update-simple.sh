#!/bin/bash

#############################################################################
# 🚀 Actualizador Simple de Contenido Bilingual
# Reemplaza Lorem ipsum con contenido real via WP-CLI
#############################################################################

set -e

CONTAINER="jewelry_wordpress"
WORKSPACE="/srv/stacks/jewelry"
BACKUP_DIR="$WORKSPACE/backups"
TEMP_DIR="/tmp/jewelry-update"

mkdir -p "$BACKUP_DIR" "$TEMP_DIR"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Ejecutar WP-CLI
wp() {
    docker exec $CONTAINER wp "$@" --allow-root 2>/dev/null
}

# Obtener contenido de página
get_page() {
    local post_id=$1
    wp post get $post_id --format=json | jq -r '.post_content'
}

# Actualizar página alternativo (más confiable)
update_page_cli() {
    local post_id=$1
    local new_content="$2"

    # Guardar en archivo
    local tmp_file="$TEMP_DIR/post_${post_id}.html"
    echo "$new_content" > "$tmp_file"

    # Copiar a Docker
    docker cp "$tmp_file" "$CONTAINER:/tmp/post_update.html" 2>/dev/null

    # Actualizar via WP-CLI leyendo del archivo
    docker exec $CONTAINER bash -c \
        "wp post update $post_id --post_content=\$(cat /tmp/post_update.html) --allow-root" && \
        log_success "Post $post_id actualizado" || \
        log_error "Error actualizando post $post_id"
}

# ============================================================================
# ACTUALIZAR HOME
# ============================================================================

update_home() {
    log_info "Procesando HOME..."

    # IDs
    local es_id=1388
    local en_id=1403

    echo ""

    # === ESPAÑOL ===
    log_info "Actualizando HOME Español (ID: $es_id)..."

    # Obtener contenido
    echo "  ➓ Obteniendo contenido..."
    local es_content=$(get_page $es_id)

    if [ -z "$es_content" ]; then
        log_error "No se pudo obtener contenido"
        return 1
    fi

    # Crear backup
    local backup_es="$BACKUP_DIR/page_${es_id}_$(date +%s).html"
    echo "$es_content" > "$backup_es"
    log_success "Backup: $(basename $backup_es)"

    # Reemplazos ESPAÑOL
    echo "  ➓ Aplicando reemplazos..."
    es_content=$(echo "$es_content" | sed 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua./Descubre nuestra colección de joyas premium, auténticas y diseñadas con perfección. Cada pieza cuenta una historia./g')

    es_content=$(echo "$es_content" | sed 's/In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half./En Nuestra Tienda, Encontrarás Todo Tipo de Joyas para Impresionar a tu Pareja./g')

    # Actualizar
    update_page_cli $es_id "$es_content"

    echo ""

    # === INGLÉS ===
    log_info "Actualizando HOME Inglés (ID: $en_id)..."

    # Obtener contenido
    echo "  ➓ Obteniendo contenido..."
    local en_content=$(get_page $en_id)

    # Crear backup
    local backup_en="$BACKUP_DIR/page_${en_id}_$(date +%s).html"
    echo "$en_content" > "$backup_en"
    log_success "Backup: $(basename $backup_en)"

    # Reemplazos INGLÉS
    echo "  ➓ Aplicando reemplazos..."
    en_content=$(echo "$en_content" | sed 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua./Discover our collection of premium, authentic jewelry pieces designed with perfection. Each piece tells a story./g')

    en_content=$(echo "$en_content" | sed 's/In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half./Browse Our Exclusive Collection of Premium Jewelry Handcrafted with Excellence./g')

    # Actualizar
    update_page_cli $en_id "$en_content"

    log_success "HOME actualizado completamente"
    return 0
}

# ============================================================================
# ACTUALIZAR ABOUT
# ============================================================================

update_about() {
    log_info "Procesando ABOUT..."

    local es_id=1383
    local en_id=1404

    echo ""

    # === ESPAÑOL ===
    log_info "Actualizando ABOUT Español (ID: $es_id)..."

    local es_content=$(get_page $es_id)
    local backup_es="$BACKUP_DIR/page_${es_id}_$(date +%s).html"
    echo "$es_content" > "$backup_es"
    log_success "Backup: $(basename $backup_es)"

    # Primer Lorem
    es_content=$(echo "$es_content" | sed '0,/Lorem ipsum dolor sit amet, consectetur adipiscing elit/{s/Lorem ipsum dolor sit amet, consectetur adipiscing elit/Remedio Joyería fue fundada hace más de 20 años en Miami con una misión: proporcionar joyería de lujo auténtica con servicio excepcional./}')

    update_page_cli $es_id "$es_content"

    echo ""

    # === INGLÉS ===
    log_info "Actualizando ABOUT Inglés (ID: $en_id)..."

    local en_content=$(get_page $en_id)
    local backup_en="$BACKUP_DIR/page_${en_id}_$(date +%s).html"
    echo "$en_content" > "$backup_en"
    log_success "Backup: $(basename $backup_en)"

    # Primer Lorem
    en_content=$(echo "$en_content" | sed '0,/Lorem ipsum dolor sit amet, consectetur adipiscing elit/{s/Lorem ipsum dolor sit amet, consectetur adipiscing elit/Remedio Jewelry was founded over 20 years ago in Miami with a mission: provide authentic luxury jewelry with exceptional service./}')

    update_page_cli $en_id "$en_content"

    log_success "ABOUT actualizado completamente"
    return 0
}

# ============================================================================
# VALIDAR CAMBIOS
# ============================================================================

validate() {
    log_info "Validando cambios..."
    echo ""

    for page_id in 1388 1403 1383 1404; do
        local content=$(get_page $page_id)
        local lorem_count=$(echo "$content" | grep -o "Lorem ipsum" | wc -l)
        local size=${#content}

        echo "  Post $page_id: $size caracteres, $lorem_count Lorem ipsum"
    done
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  🤖 Actualizador de Contenido Bilingual${NC}"
    echo -e "${BLUE}║     Remedio Joyería${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    if ! docker ps | grep -q $CONTAINER; then
        log_error "Contenedor $CONTAINER no activo"
        exit 1
    fi

    log_success "Contenedor detectado"
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
        help)
            echo "Uso: $0 [home|about|all|validate]"
            echo ""
            echo "  home     - Actualizar solo Home"
            echo "  about    - Actualizar solo About"
            echo "  all      - Actualizar todos (default)"
            echo "  validate - Ver cambios aplicados"
            ;;
        *)
            echo "Opción desconocida: $1"
            echo "Use: $0 help"
            exit 1
            ;;
    esac

    echo ""
    log_success "Completado. Backups en: $BACKUP_DIR"
    echo ""
}

main "$@"
