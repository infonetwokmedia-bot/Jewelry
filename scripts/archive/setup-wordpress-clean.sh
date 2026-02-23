#!/bin/bash

###############################################################################
# Script de Configuración de WordPress - Proyecto Jewelry
# Usa el contenedor wpcli correctamente
###############################################################################

set -e

# Colores
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

print_header "CONFIGURACIÓN LIMPIA DE WORDPRESS"

# ============================================================================
# ESPERAR A QUE WORDPRESS ESTÉ LISTO
# ============================================================================
print_header "PASO 1: VERIFICANDO DISPONIBILIDAD DE WORDPRESS"

print_info "Esperando a que WordPress descargue archivos iniciales..."
sleep 20

print_info "Verificando que wp-cli.phar esté disponible..."
for i in {1..10}; do
    if docker exec jewelry_wordpress test -f /var/www/html/wp-includes/version.php; then
        print_success "WordPress está listo"
        break
    fi
    if [ $i -eq 10 ]; then
        print_error "WordPress no está listo después de esperar"
        exit 1
    fi
    echo -n "."
    sleep 3
done

# ============================================================================
# INSTALAR WORDPRESS VÍA WEB
# ============================================================================
print_header "PASO 2: INSTALACIÓN INICIAL"

print_warning "WordPress requiere instalación inicial vía web."
print_info ""
print_info "Por favor, abre tu navegador y ve a: https://jewelry.local.dev"
print_info ""
print_info "Completa la instalación con estos datos:"
echo "  • Título del sitio:  Jewelry Miami"
echo "  • Nombre de usuario: admin"
echo "  • Contraseña:        Admin@2026!"
echo "  • Email:            admin@jewelry.local.dev"
echo ""
read -p "Presiona ENTER cuando hayas completado la instalación web... "

# ============================================================================
# VERIFICAR INSTALACIÓN
# ============================================================================
print_header "PASO 3: VERIFICANDO INSTALACIÓN"

print_info "Verificando que WordPress esté instalado..."
if curl -k -s https://jewelry.local.dev/wp-admin/ | grep -q "WordPress"; then
    print_success "WordPress está accesible"
else
    print_error "WordPress no responde correctamente"
    exit 1
fi

# ============================================================================
# INSTALAR IDIOMAS
# ============================================================================
print_header "PASO 4: CONFIGURANDO IDIOMAS"

print_info "Descargando idioma español..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    language core install es_ES --activate --allow-root

print_success "Idioma español instalado"

print_info "Descargando idioma inglés..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    language core install en_US --allow-root

print_success "Idioma inglés instalado"

# ============================================================================
# CONFIGURAR PERMALINKS
# ============================================================================
print_header "PASO 5: CONFIGURANDO PERMALINKS"

docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    rewrite structure '/%postname%/' --allow-root

print_success "Permalinks configurados"

# ============================================================================
# INSTALAR TEMA KADENCE
# ============================================================================
print_header "PASO 6: INSTALANDO TEMA KADENCE"

print_info "Instalando tema Kadence..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    theme install kadence --activate --allow-root

print_success "Tema Kadence instalado"

print_info "Instalando Kadence Starter Templates..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    plugin install kadence-starter-templates --activate --allow-root

print_success "Kadence Starter Templates instalado"

# ============================================================================
# INSTALAR WOOCOMMERCE
# ============================================================================
print_header "PASO 7: INSTALANDO WOOCOMMERCE"

print_info "Instalando WooCommerce..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    plugin install woocommerce --activate --allow-root

print_success "WooCommerce instalado"

print_info "Configurando WooCommerce..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    option update woocommerce_store_address "Miami, FL" --allow-root

docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    option update woocommerce_default_country "US:FL" --allow-root

docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    option update woocommerce_currency "USD" --allow-root

print_success "WooCommerce configurado"

# ============================================================================
# INSTALAR BOGO
# ============================================================================
print_header "PASO 8: INSTALANDO BOGO"

print_info "Instalando plugin Bogo..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    plugin install bogo --activate --allow-root

print_success "Bogo instalado"

# ============================================================================
# INSTALAR PLUGINS ADICIONALES
# ============================================================================
print_header "PASO 9: INSTALANDO PLUGINS ADICIONALES"

print_info "Instalando Contact Form 7..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    plugin install contact-form-7 --activate --allow-root

print_success "Contact Form 7 instalado"

print_info "Instalando Elementor..."
docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    plugin install elementor --activate --allow-root

print_success "Elementor instalado"

# ============================================================================
# CONFIGURAR FS_METHOD
# ============================================================================
print_header "PASO 10: CONFIGURANDO FS_METHOD"

print_info "Agregando FS_METHOD='direct' a wp-config.php..."
docker exec jewelry_wordpress bash -c "grep -q \"FS_METHOD\" /var/www/html/wp-config.php || sed -i \"/DB_COLLATE/a define('FS_METHOD', 'direct');\" /var/www/html/wp-config.php"
print_success "FS_METHOD configurado"

# ============================================================================
# CONFIGURAR PERMISOS
# ============================================================================
print_header "PASO 11: CONFIGURANDO PERMISOS"

print_info "Configurando permisos de archivos..."
docker exec jewelry_wordpress chown -R www-data:www-data /var/www/html
docker exec jewelry_wordpress find /var/www/html -type d -exec chmod 755 {} \;
docker exec jewelry_wordpress find /var/www/html -type f -exec chmod 644 {} \;
print_success "Permisos configurados"

# ============================================================================
# LIMPIAR CACHÉ
# ============================================================================
print_header "PASO 12: LIMPIANDO CACHÉ"

docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    cache flush --allow-root

docker run --rm \
    --volumes-from jewelry_wordpress \
    --network jewelry_jewelry_network \
    -e WORDPRESS_DB_HOST=mysql:3306 \
    -e WORDPRESS_DB_NAME=jewelry_db \
    -e WORDPRESS_DB_USER=jewelry_user \
    -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
    wordpress:cli \
    rewrite flush --allow-root

print_success "Caché limpiado"

# ============================================================================
# FINALIZACIÓN
# ============================================================================
print_header "✅ CONFIGURACIÓN COMPLETADA"

echo ""
print_success "WordPress ha sido configurado exitosamente"
echo ""
print_info "Información de acceso:"
echo "  🌐 Frontend:      https://jewelry.local.dev"
echo "  🔧 Admin:         https://jewelry.local.dev/wp-admin"
echo "  📊 phpMyAdmin:    https://phpmyadmin.jewelry.local.dev"
echo ""
print_info "Plugins instalados:"
echo "  ✓ Kadence Theme + Starter Templates"
echo "  ✓ WooCommerce (USD, Miami FL)"
echo "  ✓ Bogo (Multiidioma)"
echo "  ✓ Contact Form 7"
echo "  ✓ Elementor"
echo ""
print_info "Idiomas configurados:"
echo "  ✓ Español (es_ES) - Activo"
echo "  ✓ English (en_US) - Disponible"
echo ""
print_warning "PRÓXIMOS PASOS:"
echo "  1. Acceder al admin: https://jewelry.local.dev/wp-admin"
echo "  2. Configurar Bogo en: Configuración → Bogo"
echo "  3. Crear menús bilingües"
echo "  4. Crear páginas principales (Home/Inicio)"
echo "  5. Configurar WooCommerce completamente"
echo ""
print_success "¡Listo para comenzar!"
echo ""
