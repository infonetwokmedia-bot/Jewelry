<?php

/**
 * Script para corregir featured images de productos
 *
 * Problema: Después de limpiar duplicados, algunos productos tienen featured images inválidas
 * Solución: Usar la primera imagen de la galería como featured image
 *
 * USO:
 *   docker exec jewelry_wordpress php /var/www/html/fix-featured-images.php
 */

require_once('/var/www/html/wp-load.php');

if (!class_exists('WC_Product_Simple')) {
    die("❌ WooCommerce no está activado\n");
}

echo "\n=== CORRECCIÓN DE FEATURED IMAGES ===\n\n";

// Obtener todos los productos del catálogo
global $wpdb;
$product_ids = $wpdb->get_col("
    SELECT DISTINCT post_id
    FROM {$wpdb->postmeta}
    WHERE meta_key = '_sku'
    AND meta_value LIKE 'PROD-%'
");

if (empty($product_ids)) {
    die("❌ No se encontraron productos del catálogo\n");
}

$total = count($product_ids);
echo "📦 Productos encontrados: $total\n\n";

$fixed = 0;
$already_ok = 0;

foreach ($product_ids as $idx => $product_id) {
    $product = wc_get_product($product_id);
    if (!$product) {
        continue;
    }

    $sku = $product->get_sku();
    $name = substr($product->get_name(), 0, 40);

    $featured_id = $product->get_image_id();
    $gallery_ids = $product->get_gallery_image_ids();

    // Verificar si la featured image existe
    $featured_exists = false;
    if ($featured_id) {
        $featured_url = wp_get_attachment_url($featured_id);
        $featured_exists = !empty($featured_url);
    }

    echo "[" . ($idx + 1) . "/$total] $sku: $name...\n";

    if ($featured_exists) {
        echo "   ✅ Featured image OK (ID: $featured_id)\n";
        $already_ok++;
    } else {
        echo "   ⚠️  Featured image inválida (ID: $featured_id)\n";

        // Buscar una imagen válida
        $new_featured = null;

        // Opción 1: Primera imagen de la galería
        if (!empty($gallery_ids)) {
            foreach ($gallery_ids as $gallery_id) {
                $gallery_url = wp_get_attachment_url($gallery_id);
                if (!empty($gallery_url)) {
                    $new_featured = $gallery_id;
                    break;
                }
            }
        }

        // Opción 2: Buscar cualquier attachment del producto
        if (!$new_featured) {
            $attachments = get_posts([
                'post_type' => 'attachment',
                'post_parent' => $product_id,
                'posts_per_page' => 1,
                'post_status' => 'inherit'
            ]);

            if (!empty($attachments)) {
                $new_featured = $attachments[0]->ID;
            }
        }

        if ($new_featured) {
            $product->set_image_id($new_featured);
            // Remover de la galería para evitar duplicado
            $new_gallery = array_diff($gallery_ids, [$new_featured]);
            $product->set_gallery_image_ids(array_values($new_gallery));
            $product->save();

            $img_name = basename(wp_get_attachment_url($new_featured));
            echo "   ✅ Nueva featured: ID $new_featured ($img_name)\n";
            $fixed++;
        } else {
            echo "   ❌ No se encontró imagen válida\n";
        }
    }
}

// ============================================================================
// RESUMEN
// ============================================================================

echo "\n\n=== RESUMEN ===\n\n";
echo "Total productos: $total\n";
echo "Featured images correctas: $already_ok\n";
echo "Featured images corregidas: $fixed\n";
echo "\n✅ Proceso completado\n\n";
