<?php

/**
 * Restaurar CSS Custom y Colores Globales de Astra
 *
 * Este script restaura:
 * 1. Paleta de colores globales de Astra (temática de joyería)
 * 2. CSS custom completo con efectos de profundidad
 * 3. Sombras, elevaciones y efectos visuales
 *
 * @package Jewelry
 */

// Cargar WordPress
require_once('/var/www/html/wp-load.php');

if (!defined('ABSPATH')) {
    die('No se puede cargar WordPress');
}

echo "=== RESTAURACIÓN DE CSS Y PROFUNDIDAD VISUAL ===" . PHP_EOL . PHP_EOL;

// ============================================
// 1. RESTAURAR COLORES GLOBALES DE ASTRA
// ============================================

echo "🎨 Configurando colores globales de Astra..." . PHP_EOL;

$theme_options = get_option('astra-settings', array());

// Paleta de colores para joyería (oro, negro, gris)
$global_colors = array(
    'global-color-0' => '#d4af37',  // Dorado principal (oro)
    'global-color-1' => '#b8941f',  // Dorado hover (oro oscuro)
    'global-color-2' => '#1e1e1e',  // Negro (headings)
    'global-color-3' => '#3a3a3a',  // Gris oscuro (texto)
    'global-color-4' => '#ffffff',  // Blanco (background)
    'global-color-5' => '#f9f9f9',  // Gris muy claro (secondary bg)
    'global-color-6' => '#2c2c2c',  // Negro alternativo
    'global-color-7' => '#e0e0e0',  // Gris claro (borders)
    'global-color-8' => '#8b7e66',  // Dorado apagado (extra)
);

foreach ($global_colors as $key => $color) {
    $theme_options[$key] = $color;
}

update_option('astra-settings', $theme_options);

echo "✅ Colores globales configurados:" . PHP_EOL;
foreach ($global_colors as $key => $color) {
    echo "   --ast-{$key}: {$color}" . PHP_EOL;
}
echo PHP_EOL;

// ============================================
// 2. CSS PERSONALIZADO CON PROFUNDIDAD
// ============================================

echo "🎨 Aplicando CSS custom con efectos de profundidad..." . PHP_EOL;

$custom_css = <<<'CSS'
/* ============================================
   JEWELRY MIAMI - CSS CUSTOM CON PROFUNDIDAD
   Tema: Joyería de lujo con efectos de elevación
   Colores: Oro (#d4af37), Negro (#1e1e1e)
   ============================================ */

/* ===========================
   GRID DE PRODUCTOS RESPONSIVO
   =========================== */

/* Desktop: 4 columnas */
@media (min-width: 769px) {
    .woocommerce ul.products {
        display: grid !important;
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 2em !important;
    }
}

/* Tablet: 3 columnas */
@media (min-width: 545px) and (max-width: 768px) {
    .woocommerce ul.products {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 1.5em !important;
    }
}

/* Mobile: 2 columnas */
@media (max-width: 544px) {
    .woocommerce ul.products {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 1em !important;
    }
}

/* ===========================
   TARJETAS DE PRODUCTO - PROFUNDIDAD
   =========================== */

.woocommerce ul.products li.product {
    background: #ffffff;
    border-radius: 12px !important;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    /* Sombra con profundidad */
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.12),
        0 1px 2px rgba(0, 0, 0, 0.08);
}

/* Hover: Elevación dramática */
.woocommerce ul.products li.product:hover {
    transform: translateY(-8px);
    box-shadow:
        0 12px 28px rgba(0, 0, 0, 0.15),
        0 8px 10px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(212, 175, 55, 0.2);
}

/* ===========================
   IMÁGENES DE PRODUCTO
   =========================== */

.woocommerce ul.products li.product .astra-shop-thumbnail-wrap,
.woocommerce ul.products li.product img {
    border-radius: 12px 12px 0 0 !important;
    overflow: hidden;
    position: relative;
}

.woocommerce ul.products li.product img {
    width: 100%;
    height: auto;
    object-fit: cover;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Zoom sutil en hover */
.woocommerce ul.products li.product:hover img {
    transform: scale(1.08);
}

/* ===========================
   CATEGORÍAS
   =========================== */

.woocommerce ul.products li.product .ast-woo-product-category {
    text-transform: uppercase;
    font-size: 0.75em;
    letter-spacing: 1px;
    color: #8b7e66;
    font-weight: 600;
    margin-bottom: 0.5em;
}

/* ===========================
   TÍTULOS DE PRODUCTO
   =========================== */

.woocommerce ul.products li.product .woocommerce-loop-product__title,
.woocommerce ul.products li.product h2 {
    font-size: 1.1em;
    font-weight: 600;
    color: #1e1e1e;
    margin: 0.5em 0;
    line-height: 1.4;
}

/* ===========================
   PRECIOS - DORADO CON PROFUNDIDAD
   =========================== */

.woocommerce ul.products li.product .price {
    font-size: 1.3em;
    font-weight: 700;
    color: #d4af37 !important;
    margin: 0.5em 0;
    text-shadow: 0 1px 2px rgba(212, 175, 55, 0.2);
}

.woocommerce ul.products li.product .price del {
    opacity: 0.5;
    color: #666 !important;
    font-weight: 400;
}

.woocommerce ul.products li.product .price ins {
    text-decoration: none;
    color: #d4af37 !important;
}

/* Precio "Consultar" para productos sin precio */
.woocommerce ul.products li.product .price:empty::before {
    content: "Consultar";
    color: #8b7e66;
    font-style: italic;
}

/* ===========================
   BOTONES - EFECTOS DE ELEVACIÓN
   =========================== */

.woocommerce ul.products li.product .button,
.woocommerce ul.products li.product a.add_to_cart_button,
.woocommerce ul.products li.product a.product_type_simple {
    background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 8px !important;
    padding: 12px 24px !important;
    font-weight: 600 !important;
    font-size: 0.95em !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    /* Sombra dorada */
    box-shadow:
        0 4px 12px rgba(212, 175, 55, 0.25),
        0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
}

/* Hover: Más elevación y brillo */
.woocommerce ul.products li.product .button:hover,
.woocommerce ul.products li.product a.add_to_cart_button:hover {
    background: linear-gradient(135deg, #e5c04a 0%, #c9a32e 100%) !important;
    transform: translateY(-2px);
    box-shadow:
        0 8px 20px rgba(212, 175, 55, 0.35),
        0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Efecto ripple simulado */
.woocommerce ul.products li.product .button::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
}

.woocommerce ul.products li.product .button:hover::before {
    width: 300px;
    height: 300px;
}

/* ===========================
   BADGES Y ETIQUETAS
   =========================== */

/* Badge "Agotado" */
.woocommerce ul.products li.product .outofstock-badge,
.woocommerce span.onsale {
    background: #e74c3c !important;
    color: #ffffff !important;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 0.8em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    position: absolute;
    top: 15px;
    right: 15px;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

/* Badge "En oferta" */
.woocommerce span.onsale {
    background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%) !important;
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
}

/* ===========================
   RATING DE ESTRELLAS
   =========================== */

.woocommerce .star-rating {
    color: #d4af37 !important;
    filter: drop-shadow(0 1px 2px rgba(212, 175, 55, 0.3));
}

.woocommerce .star-rating::before {
    color: #e0e0e0 !important;
}

/* ===========================
   PÁGINA DE PRODUCTO INDIVIDUAL
   =========================== */

/* Galería con sombra */
.woocommerce div.product div.images {
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
        0 8px 24px rgba(0, 0, 0, 0.12),
        0 4px 8px rgba(0, 0, 0, 0.08);
}

.woocommerce div.product div.images img {
    border-radius: 16px !important;
    transition: transform 0.3s ease;
}

.woocommerce div.product div.images img:hover {
    transform: scale(1.02);
}

/* Título del producto */
.woocommerce div.product .product_title {
    font-size: 2.2em !important;
    color: #1e1e1e !important;
    font-weight: 700;
    margin-bottom: 0.5em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* Precio en página individual */
.woocommerce div.product p.price,
.woocommerce div.product span.price {
    font-size: 2em !important;
    color: #d4af37 !important;
    font-weight: 700;
    text-shadow: 0 2px 4px rgba(212, 175, 55, 0.2);
}

/* Botón agregar al carrito - grande */
.woocommerce div.product form.cart .button {
    background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%) !important;
    padding: 18px 40px !important;
    font-size: 1.1em !important;
    border-radius: 10px !important;
    box-shadow:
        0 6px 16px rgba(212, 175, 55, 0.3),
        0 3px 6px rgba(0, 0, 0, 0.12);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.woocommerce div.product form.cart .button:hover {
    transform: translateY(-3px);
    box-shadow:
        0 10px 24px rgba(212, 175, 55, 0.4),
        0 6px 12px rgba(0, 0, 0, 0.15);
}

/* ===========================
   BREADCRUMBS
   =========================== */

.woocommerce .woocommerce-breadcrumb {
    background: #f9f9f9;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 0.9em;
    margin-bottom: 2em;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.woocommerce .woocommerce-breadcrumb a {
    color: #d4af37;
    transition: color 0.2s ease;
}

.woocommerce .woocommerce-breadcrumb a:hover {
    color: #b8941f;
}

/* ===========================
   PAGINACIÓN
   =========================== */

.woocommerce nav.woocommerce-pagination ul li a,
.woocommerce nav.woocommerce-pagination ul li span {
    border-radius: 8px;
    padding: 10px 16px;
    border: 2px solid #e0e0e0;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.woocommerce nav.woocommerce-pagination ul li a:hover,
.woocommerce nav.woocommerce-pagination ul li span.current {
    background: #d4af37 !important;
    color: #ffffff !important;
    border-color: #d4af37 !important;
    box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
}

/* ===========================
   FILTROS Y ORDENAMIENTO
   =========================== */

.woocommerce-ordering select {
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 10px 15px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.woocommerce-ordering select:focus {
    border-color: #d4af37;
    outline: none;
    box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.15);
}

/* ===========================
   RESPONSIVE: AJUSTES MOBILE
   =========================== */

@media (max-width: 544px) {
    .woocommerce ul.products li.product {
        border-radius: 8px !important;
    }

    .woocommerce ul.products li.product:hover {
        transform: translateY(-4px);
    }

    .woocommerce ul.products li.product .price {
        font-size: 1.1em;
    }

    .woocommerce ul.products li.product .button {
        padding: 10px 16px !important;
        font-size: 0.85em !important;
    }
}

/* ===========================
   ANIMACIONES GLOBALES
   =========================== */

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.woocommerce ul.products li.product {
    animation: fadeInUp 0.5s ease-out forwards;
}

/* Delay escalonado para cada producto */
.woocommerce ul.products li.product:nth-child(1) { animation-delay: 0.05s; }
.woocommerce ul.products li.product:nth-child(2) { animation-delay: 0.1s; }
.woocommerce ul.products li.product:nth-child(3) { animation-delay: 0.15s; }
.woocommerce ul.products li.product:nth-child(4) { animation-delay: 0.2s; }

/* ===========================
   FIN DEL CSS
   =========================== */
CSS;

// Guardar CSS en wp_options
update_option('astra_theme_custom_css', $custom_css);

echo "✅ CSS aplicado: " . strlen($custom_css) . " bytes" . PHP_EOL;
echo "   - Grid responsivo 4-3-2" . PHP_EOL;
echo "   - Sombras con profundidad (box-shadow multicapa)" . PHP_EOL;
echo "   - Hover con elevación (-8px translateY)" . PHP_EOL;
echo "   - Botones con gradiente dorado" . PHP_EOL;
echo "   - Border-radius 12px" . PHP_EOL;
echo "   - Animaciones fadeInUp" . PHP_EOL;
echo "   - Zoom de imágenes en hover (1.08)" . PHP_EOL;
echo PHP_EOL;

// ============================================
// 3. LIMPIAR CACHE
// ============================================

echo "🧹 Limpiando cache..." . PHP_EOL;

// WordPress cache
wp_cache_flush();

// Astra transients
delete_transient('astra_dynamic_css');
delete_transient('astra-theme-options');

// WooCommerce transients
delete_transient('wc_products_onsale');
delete_transient('wc_featured_products');

// Regenerar permalinks
flush_rewrite_rules();

echo "✅ Cache limpiado" . PHP_EOL;
echo PHP_EOL;

// ============================================
// 4. RESUMEN
// ============================================

echo "=== RESUMEN ===" . PHP_EOL . PHP_EOL;

echo "✅ Colores globales: 9 colores configurados" . PHP_EOL;
echo "✅ CSS custom: " . strlen($custom_css) . " bytes aplicados" . PHP_EOL;
echo "✅ Efectos de profundidad:" . PHP_EOL;
echo "   • Sombras multicapa en tarjetas" . PHP_EOL;
echo "   • Elevación en hover (-8px)" . PHP_EOL;
echo "   • Gradientes dorados en botones" . PHP_EOL;
echo "   • Border-radius suavizados (12px)" . PHP_EOL;
echo "   • Animaciones fadeInUp" . PHP_EOL;
echo "   • Text-shadow en precios" . PHP_EOL;
echo "✅ Cache limpiado" . PHP_EOL;
echo PHP_EOL;

echo "🌐 Verificar en:" . PHP_EOL;
echo "   • https://jewelry.local.dev/tienda/" . PHP_EOL;
echo "   • https://jewelry.local.dev/en/shop/" . PHP_EOL;
echo PHP_EOL;

echo "💡 Si no se ven los cambios:" . PHP_EOL;
echo "   Presionar Ctrl+F5 (o Cmd+Shift+R en Mac) en el navegador" . PHP_EOL;
echo PHP_EOL;

echo "✨ RESTAURACIÓN COMPLETADA" . PHP_EOL;
