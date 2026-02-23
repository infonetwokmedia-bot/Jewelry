#!/bin/bash

#############################################################################
# 🤖 Automatizador de Contenido Bilingual - Remedio Joyería
# Actualiza páginas WordPress ES/EN via WP-CLI (sin interfaz gráfica)
#############################################################################

set -e

CONTAINER="jewelry_wordpress"
CONFIG_FILE="/srv/stacks/jewelry/scripts/content-translations-config.json"
BACKUP_DIR="/srv/stacks/jewelry/backups"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

wp_cli() {
    # Ejecutar comando WP-CLI en Docker
    docker exec $CONTAINER wp "$@" --allow-root 2>/dev/null || echo "ERROR"
}

# ============================================================================
# VERIFICACIONES INICIALES
# ============================================================================

log_info "Verificando prerequisitos..."

# Verificar que Docker está disponible
if ! command -v docker &> /dev/null; then
    log_error "Docker no está disponible"
    exit 1
fi

# Verificar contenedor
if ! docker ps | grep -q $CONTAINER; then
    log_error "Contenedor $CONTAINER no está en ejecución"
    exit 1
fi

# Verificar config JSON
if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Archivo de configuración no encontrado: $CONFIG_FILE"
    exit 1
fi

log_success "Prerequisitos verificados"

# ============================================================================
# FUNCIONES DE ACTUALIZACIÓN
# ============================================================================

get_post_content() {
    local post_id=$1
    wp_cli "post get $post_id --field=post_content"
}

create_backup() {
    local post_id=$1
    local content="$2"
    local timestamp=$(date +%s)
    local backup_file="$BACKUP_DIR/page_${post_id}_${timestamp}.html"

    mkdir -p "$BACKUP_DIR"
    echo "$content" > "$backup_file"
    echo "$backup_file"
}

update_post_content() {
    local post_id=$1
    local new_content="$2"
    local backup_file="$3"

    # Escapar comillas y barras para WP-CLI
    local escaped=$(echo "$new_content" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')

    # Actualizar via WP-CLI (máximo 1000 caracteres para evitar límite de shell)
    # Usar archivo temporal en su lugar
    echo "$new_content" > /tmp/page_${post_id}_update.html

    # Leer desde archivo y actualizar
    local result=$(wp_cli "post update $post_id --post_content=$(cat /tmp/page_${post_id}_update.html)" 2>&1)

    if [[ $result == *"updated"* ]] || [[ $result == "1"* ]]; then
        log_success "Post actualizad: $post_id (Backup: $backup_file)"
        rm -f /tmp/page_${post_id}_update.html
        return 0
    else
        log_error "Error actualizando post $post_id"
        return 1
    fi
}

replace_text_in_content() {
    local content="$1"
    local old_text="$2"
    local new_text="$3"

    # Usar sed para reemplazar (escapar caracteres especiales)
    local old_escaped=$(printf '%s\n' "$old_text" | sed -e 's/[\/&]/\\&/g')
    local new_escaped=$(printf '%s\n' "$new_text" | sed -e 's/[\/&]/\\&/g')

    echo "$content" | sed "s/$old_escaped/$new_escaped/g"
}

# ============================================================================
# ACTUALIZAR PÁGINA HOME
# ============================================================================

update_home() {
    log_info "Actualizando HOME..."

    local es_id=1388
    local en_id=1403

    # Obtener contenido actual
    log_info "Obteniendo contenido ES (ID: $es_id)..."
    local es_content=$(get_post_content $es_id)
    local es_backup=$(create_backup $es_id "$es_content")

    log_info "Obteniendo contenido EN (ID: $en_id)..."
    local en_content=$(get_post_content $en_id)
    local en_backup=$(create_backup $en_id "$en_content")

    if [ "$es_content" = "ERROR" ] || [ "$en_content" = "ERROR" ]; then
        log_error "Error obteniendo contenido"
        return 1
    fi

    # Reemplazos para ESPAÑOL
    log_info "Aplicando traducciones a ES..."
    es_content=$(replace_text_in_content "$es_content" \
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." \
        "Descubre nuestra colección de joyas premium, auténticas y diseñadas con perfección. Cada pieza cuenta una historia.")

    es_content=$(replace_text_in_content "$es_content" \
        "In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half." \
        "En Nuestra Tienda, Encontrarás Todo Tipo de Joyas para Impresionar a tu Pareja.")

    # Reemplazos para INGLÉS
    log_info "Aplicando traducciones a EN..."
    en_content=$(replace_text_in_content "$en_content" \
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." \
        "Discover our collection of premium, authentic jewelry pieces designed with perfection. Each piece tells a story.")

    en_content=$(replace_text_in_content "$en_content" \
        "In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half." \
        "Browse Our Exclusive Collection of Premium Jewelry Handcrafted with Excellence.")

    # Actualizar posts
    update_post_content $es_id "$es_content" "$es_backup" || return 1
    update_post_content $en_id "$en_content" "$en_backup" || return 1

    log_success "Home actualizado correctamente"
    return 0
}

# ============================================================================
# ACTUALIZAR PÁGINA ABOUT
# ============================================================================

update_about() {
    log_info "Actualizando ABOUT..."

    local es_id=1383
    local en_id=1404

    log_info "Obteniendo contenido..."
    local es_content=$(get_post_content $es_id)
    local en_content=$(get_post_content $en_id)

    if [ "$es_content" = "ERROR" ] || [ "$en_content" = "ERROR" ]; then
        log_error "Error obteniendo contenido"
        return 1
    fi

    # Reemplazos
    log_info "Aplicando actualizaciones..."
    es_content=$(replace_text_in_content "$es_content" \
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit" \
        "Remedio Joyería fue fundada hace más de 20 años en Miami con una misión: proporcionar joyería de lujo auténtica con servicio excepcional.")

    en_content=$(replace_text_in_content "$en_content" \
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit" \
        "Remedio Jewelry was founded over 20 years ago in Miami with a mission: provide authentic luxury jewelry with exceptional service.")

    # Actualizar
    es_backup=$(create_backup $es_id "$es_content")
    en_backup=$(create_backup $en_id "$en_content")

    update_post_content $es_id "$es_content" "$es_backup" || return 1
    update_post_content $en_id "$en_content" "$en_backup" || return 1

    log_success "About actualizado correctamente"
    return 0
}

# ============================================================================
# VALIDAR BOGO LINKING
# ============================================================================

validate_bogo_linking() {
    local post_id=$1
    local page_name=$2

    log_info "Validando Bogo linking para $page_name..."

    # Obtener meta Bogo
    local bogo_locale=$(wp_cli "post meta get $post_id _bogo_locale" 2>/dev/null)
    local bogo_translations=$(wp_cli "post meta get $post_id _bogo_translations" 2>/dev/null)

    if [ -n "$bogo_locale" ]; then
        log_success "$page_name: Locale $bogo_locale"
    else
        log_warning "$page_name: No locale meta detected"
    fi

    return 0
}

# ============================================================================
# MENÚ PRINCIPAL
# ============================================================================

show_menu() {
    echo ""
    echo -e "${BLUE}=== Actualizador de Contenido Bilingual ===${NC}"
    echo "1) Actualizar Home"
    echo "2) Actualizar About"
    echo "3) Actualizar Todo"
    echo "4) Validar Bogo Linking"
    echo "5) Ver Backups"
    echo "0) Salir"
    echo ""
    read -p "Selecciona opción: " choice
}

main() {
    if [ $# -eq 0 ]; then
        # Modo interactivo
        while true; do
            show_menu
            case $choice in
                1) update_home ;;
                2) update_about ;;
                3)
                    update_home &&  update_about
                    validate_bogo_linking 1388 "Home ES"
                    validate_bogo_linking 1403 "Home EN"
                    validate_bogo_linking 1383 "About ES"
                    validate_bogo_linking 1404 "About EN"
                    ;;
                4)
                    validate_bogo_linking 1388 "Home ES"
                    validate_bogo_linking 1403 "Home EN"
                    validate_bogo_linking 1383 "About ES"
                    validate_bogo_linking 1404 "About EN"
                    ;;
                5)
                    log_info "Backups disponibles:"
                    ls -lh "$BACKUP_DIR" 2>/dev/null || log_warning "No hay backups"
                    ;;
                0) exit 0 ;;
                *) log_error "Opción inválida" ;;
            esac
        done
    else
        # Modo CLI
        case "$1" in
            home) update_home ;;
            about) update_about ;;
            all) update_home && update_about ;;
            validate)
                validate_bogo_linking 1388 "Home ES"
                validate_bogo_linking 1403 "Home EN"
                ;;
            *)
                log_error "Uso: $0 [home|about|all|validate]"
                exit 1
                ;;
        esac
    fi
}

# Ejecutar
main "$@"
