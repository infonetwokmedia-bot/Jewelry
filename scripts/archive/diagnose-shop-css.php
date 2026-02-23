<?php

/**
 * Script de diagnóstico profundo de la tienda
 *
 * Revisa:
 * - Configuración de Astra
 * - Configuración de WooCommerce
 * - CSS Custom
 * - Problemas comunes
 * - Imágenes de productos
 *
 * USO:
 *   docker exec jewelry_wordpress php /var/www/html/diagnose-shop-css.php
 */

require_once('/var/www/html/wp-load.php');

if (!class_exists('WC_Product_Simple')) {
    die("❌ WooCommerce no está activado\n");
}

echo "\n";
echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║   DIAGNÓSTICO DE LA TIENDA - JEWELRY MIAMI              ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n";
echo "\n";

// ============================================================================
// 1. INFORMACIÓN DEL SISTEMA
// ============================================================================

echo "📋 INFORMACIÓN DEL SISTEMA\n";
echo str_repeat("─", 60) . "\n";

$theme = wp_get_theme();
echo "Tema: " . $theme->get('Name') . " v" . $theme->get('Version') . "\n";
echo "Template: " . $theme->get_template() . "\n";
echo "Stylesheet: " . $theme->get_stylesheet() . "\n";

if (defined('WC_VERSION')) {
    echo "WooCommerce: v" . WC_VERSION . "\n";
}

if (defined('ELEMENTOR_VERSION')) {
    echo "Elementor: v" . ELEMENTOR_VERSION . "\n";
} else {
    echo "Elementor: ❌ NO INSTALADO\n";
}

echo "\n";

// ============================================================================
// 2. CONFIGURACIÓN DE WOOCOMMERCE
// ============================================================================

echo "🛒 CONFIGURACIÓN DE WOOCOMMERCE\n";
echo str_repeat("─", 60) . "\n";

$woo_columns = get_option('woocommerce_catalog_columns', 4);
$woo_rows = get_option('woocommerce_catalog_rows', 4);
$products_per_page = $woo_columns * $woo_rows;

echo "Columnas por fila: " . $woo_columns . "\n";
echo "Filas por página: " . $woo_rows . "\n";
echo "Productos por página: " . $products_per_page . "\n";
echo "Layout de tienda: " . (get_option('woocommerce_shop_page_display') ?: 'productos') . "\n";
echo "Diseño de producto: " . (get_option('woocommerce_product_page_design') ?: 'default') . "\n";

// Alto de imágenes
$image_size = wc_get_image_size('shop_catalog');
echo "Tamaño imagen catálogo: " . $image_size['width'] . "x" . $image_size['height'] . " (crop: " . ($image_size['crop'] ? 'sí' : 'no') . ")\n";

$thumb_size = wc_get_image_size('shop_thumbnail');
echo "Tamaño thumbnail: " . $thumb_size['width'] . "x" . $thumb_size['height'] . " (crop: " . ($thumb_size['crop'] ? 'sí' : 'no') . ")\n";

echo "\n";

// ============================================================================
// 3. CONFIGURACIÓN DE ASTRA
// ============================================================================

echo "🎨 CONFIGURACIÓN DE ASTRA\n";
echo str_repeat("─", 60) . "\n";

$astra_settings = get_option('astra-settings', []);

// Layout
$site_layout = isset($astra_settings['site-content-layout']) ? $astra_settings['site-content-layout'] : 'default';
echo "Layout del sitio: " . $site_layout . "\n";

$shop_layout = isset($astra_settings['single-product-content-layout']) ? $astra_settings['single-product-content-layout'] : 'default';
echo "Layout de producto: " . $shop_layout . "\n";

// Grid de productos
if (isset($astra_settings['shop-grids'])) {
    $grids = $astra_settings['shop-grids'];
    echo "Columnas Astra (desktop): " . ($grids['desktop'] ?? 'N/A') . "\n";
    echo "Columnas Astra (tablet): " . ($grids['tablet'] ?? 'N/A') . "\n";
    echo "Columnas Astra (mobile): " . ($grids['mobile'] ?? 'N/A') . "\n";
} else {
    echo "⚠️  Configuración de columnas Astra NO definida\n";
}

// Estilo de productos
if (isset($astra_settings['shop-product-structure'])) {
    echo "Estructura de producto: " . json_encode($astra_settings['shop-product-structure']) . "\n";
}

// Hover
$shop_hover = isset($astra_settings['shop-hover-style']) ? $astra_settings['shop-hover-style'] : 'none';
echo "Efecto hover: " . $shop_hover . "\n";

echo "\n";

// ============================================================================
// 4. CSS CUSTOM
// ============================================================================

echo "💅 CSS CUSTOM\n";
echo str_repeat("─", 60) . "\n";

// Additional CSS del Customizer
$custom_css = wp_get_custom_css();
if (!empty($custom_css)) {
    $lines = substr_count($custom_css, "\n") + 1;
    $bytes = strlen($custom_css);
    echo "Additional CSS (Customizer): " . $lines . " líneas, " . $bytes . " bytes\n";
    echo "Preview (primeras 10 líneas):\n";
    $css_lines = explode("\n", $custom_css);
    foreach (array_slice($css_lines, 0, 10) as $line) {
        echo "  " . trim($line) . "\n";
    }
    if ($lines > 10) {
        echo "  ... (+" . ($lines - 10) . " líneas más)\n";
    }
} else {
    echo "Additional CSS: ❌ NINGUNO\n";
}

echo "\n";

// ============================================================================
// 5. PRODUCTOS CON PROBLEMAS
// ============================================================================

echo "📦 ANÁLISIS DE PRODUCTOS\n";
echo str_repeat("─", 60) . "\n";

// Contar productos
$total_products = wp_count_posts('product')->publish;
echo "Total productos publicados: " . $total_products . "\n";

// Productos sin imagen
$products_no_image = 0;
$products_no_gallery = 0;
$products_no_price = 0;
$products_no_description = 0;

$args = [
    'type' => 'simple',
    'status' => 'publish',
    'limit' => -1
];

$products = wc_get_products($args);

foreach ($products as $product) {
    if (!$product->get_image_id()) {
        $products_no_image++;
    }

    if (empty($product->get_gallery_image_ids())) {
        $products_no_gallery++;
    }

    if (empty($product->get_price()) || $product->get_price() == 0) {
        $products_no_price++;
    }

    if (empty($product->get_description()) && empty($product->get_short_description())) {
        $products_no_description++;
    }
}

echo "Productos sin featured image: " . $products_no_image . "\n";
echo "Productos sin galería: " . $products_no_gallery . "\n";
echo "Productos sin precio: " . $products_no_price . "\n";
echo "Productos sin descripción: " . $products_no_description . "\n";

echo "\n";

// ============================================================================
// 6. PROBLEMAS POTENCIALES
// ============================================================================

echo "⚠️  PROBLEMAS DETECTADOS\n";
echo str_repeat("─", 60) . "\n";

$problems = [];
$warnings = [];

// Problema 1: Productos sin precio
if ($products_no_price > 0) {
    $problems[] = "$products_no_price productos sin precio - No se pueden vender";
}

// Problema 2: No hay columnas definidas en Astra
if (!isset($astra_settings['shop-grids'])) {
    $problems[] = "Astra no tiene configuración de columnas - Usando default de WooCommerce";
}

// Problema 3: Productos sin imagen
if ($products_no_image > 0) {
    $warnings[] = "$products_no_image productos sin featured image";
}

// Problema 4: Elementor no instalado pero el template puede requerirlo
if (!defined('ELEMENTOR_VERSION')) {
    $warnings[] = "Elementor no está instalado - El template puede verse incompleto";
}

// Problema 5: CSS muy grande
if (strlen($custom_css) > 10000) {
    $warnings[] = "CSS custom muy grande (" . strlen($custom_css) . " bytes) - Puede ralentizar el sitio";
}

// Problema 6: Productos por página = 0
if ($products_per_page == 0) {
    $problems[] = "Productos por página = 0 - La tienda puede mostrar 0 productos";
}

if (empty($problems) && empty($warnings)) {
    echo "✅ No se detectaron problemas críticos\n";
} else {
    if (!empty($problems)) {
        echo "🔴 PROBLEMAS CRÍTICOS:\n";
        foreach ($problems as $idx => $problem) {
            echo "  " . ($idx + 1) . ". " . $problem . "\n";
        }
    }

    if (!empty($warnings)) {
        echo "\n🟡 ADVERTENCIAS:\n";
        foreach ($warnings as $idx => $warning) {
            echo "  " . ($idx + 1) . ". " . $warning . "\n";
        }
    }
}

echo "\n";

// ============================================================================
// 7. RECOMENDACIONES
// ============================================================================

echo "💡 RECOMENDACIONES\n";
echo str_repeat("─", 60) . "\n";

if ($products_no_price > 0) {
    echo "1. Agregar precios a los productos en WP Admin > Productos\n";
}

if (!isset($astra_settings['shop-grids'])) {
    echo "2. Configurar columnas en Appearance > Customize > WooCommerce > Shop\n";
}

if ($products_per_page == 0) {
    echo "3. Configurar productos por página en WooCommerce > Settings > Products\n";
}

if (!defined('ELEMENTOR_VERSION')) {
    echo "4. Instalar y activar Elementor si el template lo requiere\n";
}

if ($products_no_image > 0) {
    echo "5. Agregar imágenes destacadas a todos los productos\n";
}

echo "\n";
echo "╔══════════════════════════════════════════════════════════╗\n";
echo "║   FIN DEL DIAGNÓSTICO                                   ║\n";
echo "╚══════════════════════════════════════════════════════════╝\n";
echo "\n";
