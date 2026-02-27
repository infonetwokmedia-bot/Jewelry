#!/bin/bash
################################################################################
# Post-Install Production Setup — Tu Joyita Miami
# Ejecutar DESPUÉS de instalar WordPress en producción.
# Uso: ssh tujoyita-prod 'bash /srv/stacks/tujoyita/scripts/post-install.sh'
################################################################################

set -e

COMPOSE="docker compose"
WP="$COMPOSE run --rm wpcli wp --allow-root"

cd /srv/stacks/tujoyita

echo "═══════════════════════════════════════════"
echo "  Tu Joyita Miami — Post-Install Setup"
echo "═══════════════════════════════════════════"
echo ""

# ─── Verificar WP instalado ─────────────────────────────────────────────────
if ! $WP core is-installed 2>/dev/null; then
    echo "❌ WordPress no está instalado. Ejecuta primero:"
    echo "   $WP core install --url=https://tujoyita.com --title='Tu Joyita Miami' --admin_user=admin --admin_email=admin@tujoyita.com --admin_password=CAMBIAR"
    exit 1
fi

echo "✅ WordPress instalado"
echo ""

# ─── Configuración General ──────────────────────────────────────────────────
echo "⟳ Configurando ajustes generales..."
$WP option update blogname "Tu Joyita Miami"
$WP option update blogdescription "Joyas de alta calidad en Miami, Florida"
$WP option update timezone_string "America/New_York"
$WP option update date_format "F j, Y"
$WP option update time_format "g:i a"
$WP option update WPLANG "es_ES"
echo "✅ Ajustes generales"

# ─── Permalinks ─────────────────────────────────────────────────────────────
echo "⟳ Configurando permalinks..."
$WP rewrite structure '/%postname%/' --hard
$WP rewrite flush --hard
echo "✅ Permalinks: /%postname%/"

# ─── Instalar Plugins Esenciales ────────────────────────────────────────────
echo ""
echo "⟳ Instalando plugins..."

PLUGINS=(
    "woocommerce"
    "translatepress-multilingual"
    "contact-form-7"
    "wordpress-seo"              # Yoast SEO (gratis, más estable que Rank Math)
    "wp-super-cache"
    "wp-mail-smtp"
    "all-in-one-wp-migration"
)

for plugin in "${PLUGINS[@]}"; do
    if $WP plugin is-installed "$plugin" 2>/dev/null; then
        echo "  ✓ $plugin (ya instalado)"
    else
        echo "  ⟳ Instalando $plugin..."
        $WP plugin install "$plugin" --activate
    fi
done

echo "✅ Plugins instalados"

# ─── Instalar Tema Astra ────────────────────────────────────────────────────
echo ""
echo "⟳ Instalando tema Astra..."
$WP theme install astra --activate 2>/dev/null || echo "  ✓ Astra (ya instalado)"
echo "✅ Tema Astra activo"

# ─── Configurar WooCommerce ─────────────────────────────────────────────────
echo ""
echo "⟳ Configurando WooCommerce..."
$WP option update woocommerce_currency "USD"
$WP option update woocommerce_currency_pos "left"
$WP option update woocommerce_price_thousand_sep ","
$WP option update woocommerce_price_decimal_sep "."
$WP option update woocommerce_price_num_decimals "2"
$WP option update woocommerce_default_country "US:FL"
$WP option update woocommerce_store_address "7212 Bird Road"
$WP option update woocommerce_store_city "Miami"
$WP option update woocommerce_store_postcode "33155"
$WP option update woocommerce_calc_taxes "yes"
$WP option update woocommerce_enable_reviews "yes"
echo "✅ WooCommerce configurado"

# ─── Configurar TranslatePress ──────────────────────────────────────────────
echo ""
echo "⟳ Configurando TranslatePress..."
$WP option update trp_settings '{"default-language":"es_ES","translation-languages":["es_ES","en_US"],"url-slugs":{"es_ES":"es","en_US":"en"},"native_or_english_name":"native_name","add-subdirectory-to-default-language":"no","force-language-to-custom-links":"yes","translate-slug":"no"}' --format=json 2>/dev/null || echo "  ⚠ Configurar TranslatePress manualmente desde el admin"
echo "✅ TranslatePress idiomas: ES (base) + EN (/en/)"

# ─── Eliminar Contenido Default ─────────────────────────────────────────────
echo ""
echo "⟳ Limpiando contenido default..."
$WP post delete 1 --force 2>/dev/null || true   # "Hello world!"
$WP post delete 2 --force 2>/dev/null || true   # "Sample Page"
$WP post delete 3 --force 2>/dev/null || true   # "Privacy Policy" draft
$WP plugin delete hello 2>/dev/null || true
$WP plugin delete akismet 2>/dev/null || true
echo "✅ Contenido default eliminado"

# ─── Seguridad ──────────────────────────────────────────────────────────────
echo ""
echo "⟳ Aplicando configuración de seguridad..."
$WP option update default_comment_status "closed"
$WP option update default_ping_status "closed"
$WP option update default_pingback_flag "0"
$WP option update comments_notify "0"
echo "✅ Comentarios deshabilitados por defecto"

# ─── Crear Páginas Base ─────────────────────────────────────────────────────
echo ""
echo "⟳ Creando páginas base..."

create_page() {
    local title="$1"
    local slug="$2"
    if ! $WP post list --post_type=page --name="$slug" --format=ids 2>/dev/null | grep -q .; then
        $WP post create --post_type=page --post_title="$title" --post_name="$slug" --post_status=publish
        echo "  ✓ $title (/$slug/)"
    else
        echo "  ✓ $title (ya existe)"
    fi
}

create_page "Inicio" "inicio"
create_page "Tienda" "tienda"
create_page "Sobre Nosotros" "sobre-nosotros"
create_page "Contacto" "contacto"
create_page "Blog" "blog"
create_page "Materiales" "materiales"
create_page "Política de Privacidad" "politica-de-privacidad"
create_page "Términos y Condiciones" "terminos-y-condiciones"
create_page "Política de Devoluciones" "politica-de-devoluciones"
create_page "Mi Cuenta" "mi-cuenta"
create_page "Carrito" "carrito"
create_page "Checkout" "checkout"

echo "✅ Páginas base creadas"

# ─── Configurar Páginas WooCommerce ─────────────────────────────────────────
echo ""
echo "⟳ Configurando páginas de WooCommerce..."
SHOP_ID=$($WP post list --post_type=page --name=tienda --format=ids 2>/dev/null)
CART_ID=$($WP post list --post_type=page --name=carrito --format=ids 2>/dev/null)
CHECKOUT_ID=$($WP post list --post_type=page --name=checkout --format=ids 2>/dev/null)
ACCOUNT_ID=$($WP post list --post_type=page --name=mi-cuenta --format=ids 2>/dev/null)
PRIVACY_ID=$($WP post list --post_type=page --name=politica-de-privacidad --format=ids 2>/dev/null)

[ -n "$SHOP_ID" ] && $WP option update woocommerce_shop_page_id "$SHOP_ID"
[ -n "$CART_ID" ] && $WP option update woocommerce_cart_page_id "$CART_ID"
[ -n "$CHECKOUT_ID" ] && $WP option update woocommerce_checkout_page_id "$CHECKOUT_ID"
[ -n "$ACCOUNT_ID" ] && $WP option update woocommerce_myaccount_page_id "$ACCOUNT_ID"
[ -n "$PRIVACY_ID" ] && $WP option update wp_page_for_privacy_policy "$PRIVACY_ID"

# Set front page and posts page
FRONT_ID=$($WP post list --post_type=page --name=inicio --format=ids 2>/dev/null)
BLOG_ID=$($WP post list --post_type=page --name=blog --format=ids 2>/dev/null)
[ -n "$FRONT_ID" ] && $WP option update page_on_front "$FRONT_ID" && $WP option update show_on_front "page"
[ -n "$BLOG_ID" ] && $WP option update page_for_posts "$BLOG_ID"

echo "✅ Páginas de WooCommerce configuradas"

# ─── Resumen ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ POST-INSTALL COMPLETADO"
echo "═══════════════════════════════════════════"
echo ""
echo "  Próximos pasos manuales:"
echo "  1. Ir a https://tujoyita.com/wp-admin"
echo "  2. Configurar Yoast SEO (apariencia en búsqueda)"
echo "  3. Configurar WP Mail SMTP (Settings → Email)"
echo "  4. Configurar WP Super Cache (Settings → WP Super Cache)"
echo "  5. Diseñar con Elementor"
echo "  6. Traducir con TranslatePress"
echo ""
