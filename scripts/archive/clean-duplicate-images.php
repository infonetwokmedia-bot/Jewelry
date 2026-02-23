<?php

/**
 * Script para limpiar imágenes duplicadas de productos
 *
 * Problema: Se importaron thumbnails de WordPress como imágenes separadas
 * Solución: Mantener solo las imágenes ORIGINALES (sin dimensiones en el nombre)
 *
 * USO:
 *   docker exec jewelry_wordpress php /var/www/html/clean-duplicate-images.php [modo]
 *
 * MODOS:
 *   test    - Modo prueba (mostrar qué se haría, no ejecutar)
 *   clean   - Ejecutar limpieza
 */

require_once('/var/www/html/wp-load.php');

if (!class_exists('WC_Product_Simple')) {
    die("❌ WooCommerce no está activado\n");
}

echo "\n=== LIMPIEZA DE IMÁGENES DUPLICADAS ===\n\n";

// Modo de ejecución
$mode = isset($argv[1]) ? $argv[1] : 'test';
$is_test = ($mode !== 'clean');

if ($is_test) {
    echo "⚠️  Modo prueba: NO se eliminará nada\n";
    echo "   Para ejecutar: docker exec jewelry_wordpress php /var/www/html/clean-duplicate-images.php clean\n\n";
} else {
    echo "⚠️  MODO DE LIMPIEZA ACTIVO\n\n";
}

/**
 * Verificar si un attachment es un thumbnail de WordPress
 * Los thumbnails tienen dimensiones en el nombre: -150x150.jpg, -300x300.jpg, etc
 */
function jewelry_is_wordpress_thumbnail($attachment_id)
{
    $file_path = get_attached_file($attachment_id);
    $filename = basename($file_path);

    // Patrón para detectar thumbnails: nombre-NxN.ext o nombre-NxN-NxN.ext
    return preg_match('/-\d+x\d+(-\d+x\d+)*\.(jpg|jpeg|png|gif|webp)$/i', $filename);
}

/**
 * Obtener imagen original de un thumbnail
 */
function jewelry_get_original_image_id($thumbnail_id)
{
    global $wpdb;

    $file_path = get_attached_file($thumbnail_id);
    $filename = basename($file_path);

    // Remover dimensiones del nombre: cadenas-carol-g-1-01-300x300.jpg → cadenas-carol-g-1-01.jpg
    $original_name = preg_replace('/-\d+x\d+(-\d+x\d+)*(\.(jpg|jpeg|png|gif|webp))$/i', '$2', $filename);

    // Buscar el attachment original
    $original_id = $wpdb->get_var($wpdb->prepare(
        "SELECT ID FROM {$wpdb->posts}
        WHERE post_type='attachment'
        AND guid LIKE %s
        AND ID != %d
        LIMIT 1",
        '%' . $original_name,
        $thumbnail_id
    ));

    return $original_id;
}

/**
 * Limpiar imágenes de un producto
 */
function jewelry_clean_product_images($product_id, $is_test)
{
    $product = wc_get_product($product_id);
    if (!$product) {
        return false;
    }

    // Obtener todas las imágenes del producto
    $featured_image_id = $product->get_image_id();
    $gallery_ids = $product->get_gallery_image_ids();
    $all_image_ids = array_merge([$featured_image_id], $gallery_ids);
    $all_image_ids = array_filter($all_image_ids); // Remover vacíos

    if (empty($all_image_ids)) {
        return ['removed' => 0, 'kept' => 0];
    }

    // Separar originales de thumbnails
    $originals = [];
    $thumbnails = [];

    foreach ($all_image_ids as $img_id) {
        if (jewelry_is_wordpress_thumbnail($img_id)) {
            $thumbnails[] = $img_id;
        } else {
            $originals[] = $img_id;
        }
    }

    $removed_count = 0;
    $kept_count = count($originals);

    // Mostrar info
    echo "   📊 Total imágenes: " . count($all_image_ids) . "\n";
    echo "   ✅ Originales: " . count($originals) . "\n";
    echo "   ⚠️  Thumbnails: " . count($thumbnails) . "\n";

    if (count($thumbnails) > 0) {
        echo "   🗑️  Se eliminarán " . count($thumbnails) . " thumbnails:\n";

        foreach ($thumbnails as $thumb_id) {
            $filename = basename(get_attached_file($thumb_id));
            echo "      - ID $thumb_id: $filename\n";

            if (!$is_test) {
                // Eliminar de la galería si está
                $gallery_ids = array_diff($gallery_ids, [$thumb_id]);

                // Eliminar el attachment
                wp_delete_attachment($thumb_id, true);
                $removed_count++;
            }
        }

        if (!$is_test) {
            // Actualizar galería del producto (solo originales)
            $new_gallery = array_diff($originals, [$featured_image_id]);
            $product->set_gallery_image_ids(array_values($new_gallery));
            $product->save();
        }
    } else {
        echo "   ✅ No hay duplicados\n";
    }

    return ['removed' => $removed_count, 'kept' => $kept_count];
}

// ============================================================================
// PROCESO DE LIMPIEZA
// ============================================================================

// Obtener todos los productos con imágenes
$args = [
    'type' => 'simple',
    'status' => ['publish', 'draft', 'private'],
    'limit' => -1,
    'sku' => 'PROD-',
    'return' => 'ids'
];

// Buscar productos del catálogo (SKU empieza con PROD-)
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
echo "📦 Se procesarán $total productos del catálogo\n\n";

$processed = 0;
$total_removed = 0;
$total_kept = 0;
$errors = 0;

foreach ($product_ids as $idx => $product_id) {
    $product = wc_get_product($product_id);
    if (!$product) {
        continue;
    }

    $sku = $product->get_sku();
    $name = substr($product->get_name(), 0, 40);

    echo "\n[" . ($idx + 1) . "/$total] $sku: $name...\n";

    $result = jewelry_clean_product_images($product_id, $is_test);

    if ($result === false) {
        $errors++;
        echo "   ❌ Error procesando producto\n";
    } else {
        $processed++;
        $total_removed += $result['removed'];
        $total_kept += $result['kept'];
    }
}

// ============================================================================
// RESUMEN
// ============================================================================

echo "\n\n=== RESUMEN ===\n\n";
echo "Productos procesados: $processed / $total\n";
echo "Imágenes originales mantenidas: $total_kept\n";

if ($is_test) {
    echo "Thumbnails que se eliminarían: $total_removed\n";
    echo "\n⚠️  MODO PRUEBA: No se eliminó nada\n";
    echo "Para ejecutar la limpieza:\n";
    echo "  docker exec jewelry_wordpress php /var/www/html/clean-duplicate-images.php clean\n";
} else {
    echo "Thumbnails eliminados: $total_removed\n";
    echo "\n✅ Limpieza completada\n";
}

echo "\n";
