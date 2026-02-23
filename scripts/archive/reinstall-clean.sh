#!/bin/bash

###############################################################################
# Script de Reinstalación Limpia de WordPress - Proyecto Jewelry
# Este script reinstala WordPress desde cero con configuración base limpia
###############################################################################

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✅ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  ${1}${NC}"
}

print_error() {
    echo -e "${RED}❌ ${1}${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz del proyecto"
    exit 1
fi

print_header "REINSTALACIÓN LIMPIA DE WORDPRESS - JEWELRY PROJECT"

print_warning "Este script va a:"
echo "  1. Detener todos los contenedores"
echo "  2. Eliminar TODOS los datos de MySQL y WordPress"
echo "  3. Reinstalar WordPress desde cero"
echo "  4. Instalar plugins esenciales"
echo "  5. Configurar Bogo correctamente"
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    print_error "Reinstalación cancelada"
    exit 1
fi

# ============================================================================
# PASO 1: BACKUP DE SEGURIDAD
# ============================================================================
print_header "PASO 1: CREANDO BACKUP DE SEGURIDAD"

BACKUP_DIR="./backups/pre-reinstall-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_info "Haciendo backup de la base de datos..."
docker exec jewelry_mysql mysqldump -u root -p'jewelry_root_2026_secure!' jewelry_db > "$BACKUP_DIR/database-backup.sql" 2>/dev/null
print_success "Backup de base de datos creado: $BACKUP_DIR/database-backup.sql"

print_info "Haciendo backup de archivos importantes..."
if [ -d "data/wordpress/wp-content/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads-backup.tar.gz" data/wordpress/wp-content/uploads/ 2>/dev/null || true
    print_success "Backup de uploads creado"
fi

if [ -f "data/wordpress/wp-content/themes/kadence/functions-custom.php" ]; then
    cp "data/wordpress/wp-content/themes/kadence/functions-custom.php" "$BACKUP_DIR/functions-custom.php.bak"
    print_success "Backup de functions-custom.php creado"
fi

# ============================================================================
# PASO 2: DETENER CONTENEDORES
# ============================================================================
print_header "PASO 2: DETENIENDO CONTENEDORES"

print_info "Deteniendo todos los contenedores..."
docker compose down
print_success "Contenedores detenidos"

# ============================================================================
# PASO 3: LIMPIAR DATOS
# ============================================================================
print_header "PASO 3: LIMPIANDO DATOS ANTERIORES"

print_warning "Eliminando datos de MySQL..."
sudo rm -rf data/mysql/*
print_success "Datos de MySQL eliminados"

print_warning "Eliminando datos de WordPress..."
sudo rm -rf data/wordpress/*
print_success "Datos de WordPress eliminados"

# ============================================================================
# PASO 4: INICIAR CONTENEDORES LIMPIOS
# ============================================================================
print_header "PASO 4: INICIANDO CONTENEDORES LIMPIOS"

print_info "Iniciando contenedores..."
docker compose up -d

print_info "Esperando a que MySQL esté listo..."
sleep 15

# Esperar a que MySQL esté completamente listo
print_info "Verificando salud de MySQL..."
for i in {1..30}; do
    if docker exec jewelry_mysql mysqladmin ping -u root -p'jewelry_root_2026_secure!' --silent 2>/dev/null; then
        print_success "MySQL está listo"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "MySQL no respondió a tiempo"
        exit 1
    fi
    echo -n "."
    sleep 2
done

print_info "Esperando a que WordPress esté listo..."
sleep 10

# ============================================================================
# PASO 5: INSTALAR WORDPRESS
# ============================================================================
print_header "PASO 5: INSTALANDO WORDPRESS"

print_info "Verificando instalación de WordPress..."
sleep 5

# Verificar que WordPress está accesible
print_info "Esperando a que WordPress responda..."
for i in {1..20}; do
    if docker exec jewelry_wordpress wp core is-installed --allow-root 2>/dev/null; then
        print_success "WordPress ya está instalado"
        break
    fi
    if [ $i -eq 20 ]; then
        print_info "WordPress no está instalado, procediendo con instalación..."

        # Instalar WordPress
        docker exec jewelry_wordpress wp core install \
            --url="https://jewelry.local.dev" \
            --title="Jewelry Miami" \
            --admin_user="admin" \
            --admin_password="Admin@2026!" \
            --admin_email="admin@jewelry.local.dev" \
            --skip-email \
            --allow-root

        print_success "WordPress instalado"
        break
    fi
    echo -n "."
    sleep 3
done

# ============================================================================
# PASO 6: CONFIGURAR WORDPRESS
# ============================================================================
print_header "PASO 6: CONFIGURANDO WORDPRESS"

print_info "Configurando permalinks..."
docker exec jewelry_wordpress wp rewrite structure '/%postname%/' --allow-root
docker exec jewelry_wordpress wp rewrite flush --allow-root
print_success "Permalinks configurados"

print_info "Configurando timezone..."
docker exec jewelry_wordpress wp option update timezone_string 'America/New_York' --allow-root
print_success "Timezone configurado"

print_info "Configurando idioma por defecto a Español..."
docker exec jewelry_wordpress wp language core install es_ES --allow-root
docker exec jewelry_wordpress wp site switch-language es_ES --allow-root
print_success "Idioma español instalado y activado"

print_info "Instalando idioma inglés..."
docker exec jewelry_wordpress wp language core install en_US --allow-root
print_success "Idioma inglés instalado"

# Configurar FS_METHOD para evitar problemas FTP
print_info "Configurando FS_METHOD='direct'..."
docker exec jewelry_wordpress bash -c "grep -q \"FS_METHOD\" /var/www/html/wp-config.php || sed -i \"/DB_COLLATE/a define('FS_METHOD', 'direct');\" /var/www/html/wp-config.php"
print_success "FS_METHOD configurado"

# ============================================================================
# PASO 7: INSTALAR TEMA KADENCE
# ============================================================================
print_header "PASO 7: INSTALANDO TEMA KADENCE"

print_info "Instalando tema Kadence..."
docker exec jewelry_wordpress wp theme install kadence --activate --allow-root
print_success "Tema Kadence instalado y activado"

print_info "Instalando Kadence Starter Templates..."
docker exec jewelry_wordpress wp plugin install kadence-starter-templates --activate --allow-root
print_success "Kadence Starter Templates instalado"

# ============================================================================
# PASO 8: INSTALAR WOOCOMMERCE
# ============================================================================
print_header "PASO 8: INSTALANDO WOOCOMMERCE"

print_info "Instalando WooCommerce..."
docker exec jewelry_wordpress wp plugin install woocommerce --activate --allow-root
print_success "WooCommerce instalado y activado"

print_info "Configurando WooCommerce básico..."
docker exec jewelry_wordpress wp option update woocommerce_store_address "Miami, FL" --allow-root
docker exec jewelry_wordpress wp option update woocommerce_default_country "US:FL" --allow-root
docker exec jewelry_wordpress wp option update woocommerce_currency "USD" --allow-root
docker exec jewelry_wordpress wp option update woocommerce_currency_pos "left" --allow-root
print_success "WooCommerce configurado"

# ============================================================================
# PASO 9: INSTALAR Y CONFIGURAR BOGO
# ============================================================================
print_header "PASO 9: INSTALANDO Y CONFIGURANDO BOGO"

print_info "Instalando plugin Bogo..."
docker exec jewelry_wordpress wp plugin install bogo --activate --allow-root
print_success "Bogo instalado y activado"

print_info "Configurando idiomas en Bogo..."
# Bogo se autoconfigura al detectar los idiomas instalados
sleep 3

print_info "Verificando configuración de Bogo..."
docker exec jewelry_wordpress wp option get bogo --allow-root || print_warning "Bogo se configurará automáticamente en el primer uso"
print_success "Bogo configurado"

# ============================================================================
# PASO 10: INSTALAR PLUGINS ESENCIALES
# ============================================================================
print_header "PASO 10: INSTALANDO PLUGINS ESENCIALES"

print_info "Instalando Contact Form 7..."
docker exec jewelry_wordpress wp plugin install contact-form-7 --activate --allow-root
print_success "Contact Form 7 instalado"

print_info "Instalando Elementor..."
docker exec jewelry_wordpress wp plugin install elementor --activate --allow-root
print_success "Elementor instalado"

# ============================================================================
# PASO 11: CREAR ESTRUCTURA BÁSICA DE PÁGINAS
# ============================================================================
print_header "PASO 11: CREANDO ESTRUCTURA BÁSICA"

print_info "Creando página Home (ES)..."
HOME_ES_ID=$(docker exec jewelry_wordpress wp post create \
    --post_type=page \
    --post_title="Inicio" \
    --post_status=publish \
    --post_content="<!-- wp:paragraph --><p>Página de inicio en español</p><!-- /wp:paragraph -->" \
    --porcelain \
    --allow-root)
docker exec jewelry_wordpress wp post meta update $HOME_ES_ID _locale es_ES --allow-root
print_success "Página Inicio creada (ID: $HOME_ES_ID)"

print_info "Creando página Home (EN)..."
HOME_EN_ID=$(docker exec jewelry_wordpress wp post create \
    --post_type=page \
    --post_title="Home" \
    --post_status=publish \
    --post_content="<!-- wp:paragraph --><p>Home page in English</p><!-- /wp:paragraph -->" \
    --porcelain \
    --allow-root)
docker exec jewelry_wordpress wp post meta update $HOME_EN_ID _locale en_US --allow-root
print_success "Página Home creada (ID: $HOME_EN_ID)"

print_info "Vinculando páginas Home con Bogo..."
docker exec jewelry_wordpress wp post meta update $HOME_ES_ID _bogo_translations "{\"es_ES\":$HOME_ES_ID,\"en_US\":$HOME_EN_ID}" --format=json --allow-root
docker exec jewelry_wordpress wp post meta update $HOME_EN_ID _bogo_translations "{\"es_ES\":$HOME_ES_ID,\"en_US\":$HOME_EN_ID}" --format=json --allow-root
print_success "Páginas Home vinculadas"

# Configurar página de inicio
print_info "Configurando página de inicio..."
docker exec jewelry_wordpress wp option update show_on_front page --allow-root
docker exec jewelry_wordpress wp option update page_on_front $HOME_ES_ID --allow-root
print_success "Página de inicio configurada"

# ============================================================================
# PASO 12: CREAR PÁGINAS DE WOOCOMMERCE
# ============================================================================
print_header "PASO 12: CREANDO PÁGINAS DE WOOCOMMERCE"

print_info "Instalando páginas de WooCommerce..."
docker exec jewelry_wordpress wp wc tool run install_pages --user=admin --allow-root
print_success "Páginas de WooCommerce creadas"

# ============================================================================
# PASO 13: CONFIGURAR PERMISOS
# ============================================================================
print_header "PASO 13: CONFIGURANDO PERMISOS"

print_info "Configurando permisos de archivos..."
docker exec jewelry_wordpress chown -R www-data:www-data /var/www/html
docker exec jewelry_wordpress find /var/www/html -type d -exec chmod 755 {} \;
docker exec jewelry_wordpress find /var/www/html -type f -exec chmod 644 {} \;
print_success "Permisos configurados"

# ============================================================================
# PASO 14: LIMPIAR CACHÉ
# ============================================================================
print_header "PASO 14: LIMPIANDO CACHÉ"

print_info "Limpiando caché de WordPress..."
docker exec jewelry_wordpress wp cache flush --allow-root
print_success "Caché limpiado"

print_info "Regenerando permalinks..."
docker exec jewelry_wordpress wp rewrite flush --allow-root
print_success "Permalinks regenerados"

# ============================================================================
# FINALIZACIÓN
# ============================================================================
print_header "✅ REINSTALACIÓN COMPLETADA"

echo ""
print_success "WordPress ha sido reinstalado exitosamente"
echo ""
print_info "Información de acceso:"
echo "  🌐 Frontend:      https://jewelry.local.dev"
echo "  🔧 Admin:         https://jewelry.local.dev/wp-admin"
echo "  📊 phpMyAdmin:    https://phpmyadmin.jewelry.local.dev"
echo ""
print_info "Credenciales:"
echo "  👤 Usuario:       admin"
echo "  🔑 Contraseña:    Admin@2026!"
echo ""
print_info "Plugins instalados:"
echo "  ✓ Kadence Theme + Starter Templates"
echo "  ✓ WooCommerce"
echo "  ✓ Bogo (Multiidioma)"
echo "  ✓ Contact Form 7"
echo "  ✓ Elementor"
echo ""
print_info "Idiomas configurados:"
echo "  ✓ Español (es_ES) - Idioma por defecto"
echo "  ✓ English (en_US)"
echo ""
print_info "Backup anterior guardado en:"
echo "  📦 $BACKUP_DIR"
echo ""
print_warning "PRÓXIMOS PASOS:"
echo "  1. Acceder al admin y revisar la configuración"
echo "  2. Configurar menús (usar prefijos primary_navigation_es y primary_navigation_en)"
echo "  3. Crear categorías de productos bilingües"
echo "  4. Agregar productos del catálogo"
echo "  5. Personalizar páginas con Elementor"
echo ""
print_success "¡Listo para comenzar!"
echo ""
