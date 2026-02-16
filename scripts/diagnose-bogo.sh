#!/bin/bash

###############################################################################
# Script de Diagnóstico de Bogo - Jewelry Miami
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}ℹ ${1}${NC}"; }
print_success() { echo -e "${GREEN}✅ ${1}${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  ${1}${NC}"; }
print_error() { echo -e "${RED}❌ ${1}${NC}"; }
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_header "DIAGNÓSTICO DE BOGO - JEWELRY MIAMI"

# Helper function para ejecutar comandos WP-CLI
wp_cli() {
    docker run --rm \
        --volumes-from jewelry_wordpress \
        --network jewelry_jewelry_network \
        -e WORDPRESS_DB_HOST=mysql:3306 \
        -e WORDPRESS_DB_NAME=jewelry_db \
        -e WORDPRESS_DB_USER=jewelry_user \
        -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
        wordpress:cli \
        "$@" --allow-root 2>&1 | grep -v Warning
}

# ============================================================================
# 1. VERIFICAR ESTADO DE BOGO
# ============================================================================
print_header "1. VERIFICANDO PLUGIN BOGO"

BOGO_STATUS=$(wp_cli plugin status bogo | grep "Status" | awk '{print $2}')
BOGO_VERSION=$(wp_cli plugin status bogo | grep "Version" | awk '{print $2}')

if [ "$BOGO_STATUS" = "Active" ]; then
    print_success "Bogo está activo (v$BOGO_VERSION)"
else
    print_error "Bogo NO está activo"
    exit 1
fi

# ============================================================================
# 2. VERIFICAR IDIOMAS INSTALADOS
# ============================================================================
print_header "2. VERIFICANDO IDIOMAS"

print_info "Idiomas instalados:"
wp_cli language core list --status=installed --format=table

LANG_ACTIVE=$(wp_cli option get WPLANG || echo "en_US")
if [ -z "$LANG_ACTIVE" ]; then
    LANG_ACTIVE="en_US"
fi

print_info "Idioma activo del sitio: $LANG_ACTIVE"

# ============================================================================
# 3. VERIFICAR CONFIGURACIÓN DE BOGO
# ============================================================================
print_header "3. CONFIGURACIÓN DE BOGO"

BOGO_CONFIG=$(wp_cli option get bogo --format=json 2>/dev/null || echo "{}")
print_info "Configuración de Bogo:"
echo "$BOGO_CONFIG" | jq .

# ============================================================================
# 4. VERIFICAR PÁGINAS Y SUS VINCULACIONES
# ============================================================================
print_header "4. VERIFICANDO PÁGINAS BILINGÜES"

print_info "Verificando vinculación de páginas clave..."

# Página Home (1300) con Inicio (1320)
HOME_LOCALE=$(docker exec jewelry_mysql mysql -u jewelry_user -p'jewelry_pass_2026!' jewelry_db -sN -e "SELECT meta_value FROM wp_postmeta WHERE post_id = 1300 AND meta_key = '_locale';" 2>/dev/null)
HOME_TRANS=$(docker exec jewelry_mysql mysql -u jewelry_user -p'jewelry_pass_2026!' jewelry_db -sN -e "SELECT meta_value FROM wp_postmeta WHERE post_id = 1300 AND meta_key = '_bogo_translations';" 2>/dev/null)

if [ -n "$HOME_LOCALE" ]; then
    print_success "Página Home (1300): locale = $HOME_LOCALE"
else
    print_warning "Página Home (1300): NO tiene meta _locale configurado"
fi

if [ -n "$HOME_TRANS" ]; then
    print_success "Página Home (1300): tiene vinculaciones Bogo"
    echo "   Vinculación: $HOME_TRANS"
else
    print_error "Página Home (1300): NO tiene vinculaciones Bogo"
fi

# ============================================================================
# 5. VERIFICAR MENÚS
# ============================================================================
print_header "5. VERIFICANDO MENÚS"

print_info "Menús registrados:"
wp_cli menu list --format=table

MENU_LOCATIONS=$(wp_cli theme mod get nav_menu_locations --format=json 2>/dev/null || echo "{}")
print_info "Ubicaciones de menú:"
echo "$MENU_LOCATIONS"

# ============================================================================
# 6. VERIFICAR ARCHIVO functions-custom.php
# ============================================================================
print_header "6. VERIFICANDO ARCHIVO CUSTOM"

if docker exec jewelry_wordpress test -f /var/www/html/wp-content/themes/kadence/functions-custom.php; then
    print_success "functions-custom.php existe"

    # Verificar sintaxis PHP
    SYNTAX_CHECK=$(docker exec jewelry_wordpress php -l /var/www/html/wp-content/themes/kadence/functions-custom.php 2>&1)
    if echo "$SYNTAX_CHECK" | grep -q "No syntax errors"; then
        print_success "Sintaxis PHP correcta"
    else
        print_error "Error de sintaxis PHP:"
        echo "$SYNTAX_CHECK"
    fi

    # Verificar permisos
    PERMS=$(docker exec jewelry_wordpress stat -c "%a %U:%G" /var/www/html/wp-content/themes/kadence/functions-custom.php)
    print_info "Permisos: $PERMS"

else
    print_error "functions-custom.php NO existe"
fi

# ============================================================================
# 7. VERIFICAR PERMISOS GENERALES
# ============================================================================
print_header "7. VERIFICANDO PERMISOS"

WP_CONTENT_PERMS=$(docker exec jewelry_wordpress stat -c "%a %U:%G" /var/www/html/wp-content)
print_info "wp-content: $WP_CONTENT_PERMS"

THEMES_PERMS=$(docker exec jewelry_wordpress stat -c "%a %U:%G" /var/www/html/wp-content/themes)
print_info "themes: $THEMES_PERMS"

KADENCE_PERMS=$(docker exec jewelry_wordpress stat -c "%a %U:%G" /var/www/html/wp-content/themes/kadence)
print_info "kadence: $KADENCE_PERMS"

# ============================================================================
# 8. PRUEBA DE FUNCIÓN BOGO
# ============================================================================
print_header "8. PRUEBA DE FUNCIÓN BOGO"

print_info "Probando función bogo_get_current_locale()..."

TEST_RESULT=$(docker exec jewelry_wordpress php -r "
require_once('/var/www/html/wp-load.php');
if (function_exists('bogo_get_current_locale')) {
    echo 'OK: Función existe';
} else {
    echo 'ERROR: Función no existe';
}
" 2>&1)

if echo "$TEST_RESULT" | grep -q "OK"; then
    print_success "$TEST_RESULT"
else
    print_error "$TEST_RESULT"
fi

# ============================================================================
# 9. VERIFICAR ERRORES EN LOGS
# ============================================================================
print_header "9. VERIFICANDO LOGS DE ERRORES"

print_info "Últimos errores PHP (si existen):"
if docker exec jewelry_wordpress test -f /var/www/html/wp-content/debug.log; then
    docker exec jewelry_wordpress tail -20 /var/www/html/wp-content/debug.log 2>/dev/null || echo "No hay errores recientes"
else
    print_info "No hay archivo de debug activo"
fi

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print_header "✅ DIAGNÓSTICO COMPLETADO"

echo ""
print_info "RESUMEN:"
echo "  • Plugin Bogo: $BOGO_STATUS (v$BOGO_VERSION)"
echo "  • Idioma activo: $LANG_ACTIVE"
echo "  • Páginas bilingües: Verificar output arriba"
echo "  • Menús: Verificar output arriba"
echo "  • functions-custom.php: Verificar output arriba"
echo ""
print_warning "Si hay problemas al editar páginas, prueba:"
echo "  1. Vaciar el caché del navegador (Ctrl+Shift+Delete)"
echo "  2. Reiniciar contenedores: docker compose restart"
echo "  3. Verificar en WP Admin → Ajustes → Bogo que ambos idiomas estén activos"
echo ""
