#!/bin/bash

#############################################################################
# 🚀 Actualizador de Contenido - Versión Mejorada
# Usa archivos para evitar problemas con caracteres especiales
#############################################################################

CONTAINER="jewelry_wordpress"
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

# Actualizar post via bash en Docker
update_post_bash() {
    local post_id=$1
    local content_file=$2

    docker exec $CONTAINER bash -c "
    # Leer archivo
    content=\$(cat $content_file)

    # Usar PHP/WP directamente via wp eval
    wp eval \"
    \\\$post_data = array(
        'ID' => $post_id,
        'post_content' => file_get_contents('$content_file')
    );
    wp_update_post(\\\$post_data);
    echo 'Actualizado';
    \" --allow-root
    " 2>/dev/null
}

# ============================================================================

update_home() {
    log_info "HOME..."

    # === ESPAÑOL ===
    log_info "  ES (1388)"

    # Obtener via Docker cat
    docker exec $CONTAINER wp post get 1388 --field=post_content > "$TEMP_DIR/es.html" 2>/dev/null

    # Backup
    cp "$TEMP_DIR/es.html" "$BACKUP_DIR/page_1388_$(date +%s).html"

    # Reemplazos
    sed -i 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua./Descubre nuestra colección de joyas premium, auténticas y diseñadas con perfección. Cada pieza cuenta una historia./g' "$TEMP_DIR/es.html"

    sed -i 's/In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half./En Nuestra Tienda, Encontrarás Todo Tipo de Joyas para Impresionar a tu Pareja./g' "$TEMP_DIR/es.html"

    # Copiar archivo a Docker TEMP
    docker cp "$TEMP_DIR/es.html" "$CONTAINER:/tmp/post_content_es.html"

    # Actualizar via SQL (más confiable)
    docker exec $CONTAINER mysql -u jewelry_user -pjewelry_password jewelry_db -e "
    UPDATE wp_posts
    SET post_content = LOAD_FILE('/tmp/post_content_es.html')
    WHERE ID = 1388;
    " 2>/dev/null && log_success "    Actualizado"

    # === INGLÉS ===
    log_info "  EN (1403)"

    docker exec $CONTAINER wp post get 1403 --field=post_content > "$TEMP_DIR/en.html" 2>/dev/null

    cp "$TEMP_DIR/en.html" "$BACKUP_DIR/page_1403_$(date +%s).html"

    sed -i 's/Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua./Discover our collection of premium, authentic jewelry pieces designed with perfection. Each piece tells a story./g' "$TEMP_DIR/en.html"

    sed -i 's/In Our Store, You Will Be Able To Find All Types Of Jewelry To Impress Your Other Half./Browse Our Exclusive Collection of Premium Jewelry Handcrafted with Excellence./g' "$TEMP_DIR/en.html"

    docker cp "$TEMP_DIR/en.html" "$CONTAINER:/tmp/post_content_en.html"

    docker exec $CONTAINER mysql -u jewelry_user -pjewelry_password jewelry_db -e "
    UPDATE wp_posts
    SET post_content = LOAD_FILE('/tmp/post_content_en.html')
    WHERE ID = 1403;
    " 2>/dev/null && log_success "    Actualizado"
}

update_about() {
    log_info "ABOUT..."

    # === ESPAÑOL ===
    log_info "  ES (1383)"

    docker exec $CONTAINER wp post get 1383 --field=post_content > "$TEMP_DIR/about_es.html" 2>/dev/null

    cp "$TEMP_DIR/about_es.html" "$BACKUP_DIR/page_1383_$(date +%s).html"

    sed -i '0,/Lorem ipsum dolor sit amet, consectetur adipiscing elit/{s/Lorem ipsum dolor sit amet, consectetur adipiscing elit/Remedio Joyería fue fundada hace más de 20 años en Miami con una misión simple/}' "$TEMP_DIR/about_es.html"

    docker cp "$TEMP_DIR/about_es.html" "$CONTAINER:/tmp/post_content.html"

    docker exec $CONTAINER mysql -u jewelry_user -pjewelry_password jewelry_db -e "
    UPDATE wp_posts
    SET post_content = LOAD_FILE('/tmp/post_content.html')
    WHERE ID = 1383;
    " 2>/dev/null && log_success "    Actualizado"

    # === INGLÉS ===
    log_info "  EN (1404)"

    docker exec $CONTAINER wp post get 1404 --field=post_content > "$TEMP_DIR/about_en.html" 2>/dev/null

    cp "$TEMP_DIR/about_en.html" "$BACKUP_DIR/page_1404_$(date +%s).html"

    sed -i '0,/Lorem ipsum dolor sit amet, consectetur adipiscing elit/{s/Lorem ipsum dolor sit amet, consectetur adipiscing elit/Remedio Jewelry was founded over 20 years ago in Miami with a mission/}' "$TEMP_DIR/about_en.html"

    docker cp "$TEMP_DIR/about_en.html" "$CONTAINER:/tmp/post_content.html"

    docker exec $CONTAINER mysql -u jewelry_user -pjewelry_password jewelry_db -e "
    UPDATE wp_posts
    SET post_content = LOAD_FILE('/tmp/post_content.html')
    WHERE ID = 1404;
    " 2>/dev/null && log_success "    Actualizado"
}

# ============================================================================

echo ""
echo -e "${BLUE}🚀 Actualizador de Contenido${NC}"
echo ""

case "${1:-all}" in
    home) update_home ;;
    about) update_about ;;
    all) update_home; echo ""; update_about ;;
    *)
        echo "Uso: $0 [home|about|all]"
        exit 1
        ;;
esac

echo ""
log_success "Completado. Backups: $BACKUP_DIR"
echo ""
