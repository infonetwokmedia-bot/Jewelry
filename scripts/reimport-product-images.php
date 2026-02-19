<?php

/**
 * Script para reimportar correctamente las imágenes a la biblioteca de WordPress
 *
 * Problema: Las imágenes están en /jewelry-catalog/full/ pero no en la biblioteca de medios
 * Solución: Copiarlas a uploads/YYYY/MM/ y registrarlas correctamente
 *
 * USO:
 *   docker exec jewelry_wordpress php /var/www/html/reimport-product-images.php [test|import]
 */

require_once('/var/www/html/wp-load.php');

if (!class_exists('WC_Product_Simple')) {
    die("❌ WooCommerce no está activado\n");
}

// Cargar funciones de medios
require_once(ABSPATH . 'wp-admin/includes/image.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');
require_once(ABSPATH . 'wp-admin/includes/media.php');

echo "\n=== REIMPORTACIÓN DE IMÁGENES A BIBLIOTECA DE MEDIOS ===\n\n";

// Modo
$mode = isset($argv[1]) ? $argv[1] : 'test';
$is_test = ($mode !== 'import');

if ($is_test) {
    echo "⚠️  MODO PRUEBA - No se importará nada\n";
    echo "   Para importar: docker exec jewelry_wordpress php /var/www/html/reimport-product-images.php import\n\n";
} else {
    echo "🚀 MODO IMPORTACIÓN - Importando imágenes...\n\n";
}

/**
 * Importar imagen correctamente a la biblioteca de WordPress
 */
function jewelry_import_image_correctly($source_path, $product_id, $image_title)
{
    // Verificar que existe
    if (!file_exists($source_path)) {
        return false;
    }

    // Obtener upload dir
    $upload_dir = wp_upload_dir();
    $filename = basename($source_path);

    // Generar nombre único si ya existe
    $target_path = $upload_dir['path'] . '/' . $filename;
    $target_url = $upload_dir['url'] . '/' . $filename;

    $counter = 1;
    while (file_exists($target_path)) {
        $pathinfo = pathinfo($filename);
        $new_filename = $pathinfo['filename'] . '-' . $counter . '.' . $pathinfo['extension'];
        $target_path = $upload_dir['path'] . '/' . $new_filename;
        $target_url = $upload_dir['url'] . '/' . $new_filename;
        $counter++;
    }

    // Copiar archivo
    if (!copy($source_path, $target_path)) {
        return false;
    }

    // Preparar attachment data
    $filetype = wp_check_filetype($target_path);
    $attachment = array(
        'guid'           => $target_url,
        'post_mime_type' => $filetype['type'],
        'post_title'     => $image_title,
        'post_content'   => '',
        'post_status'    => 'inherit'
    );

    // Insertar attachment en la base de datos
    $attach_id = wp_insert_attachment($attachment, $target_path, $product_id);

    if (is_wp_error($attach_id)) {
        return false;
    }

    // Generar metadata y thumbnails
    $attach_data = wp_generate_attachment_metadata($attach_id, $target_path);
    wp_update_attachment_metadata($attach_id, $attach_data);

    return $attach_id;
}

/**
 * Mapeo SKU → slug de imágenes (del CSV original)
 */
function jewelry_get_image_slug_from_sku($sku)
{
    $map = [
        'PROD-001' => 'cadenas-carol-g-1',
        'PROD-002' => 'gargantillas-tiffany-2',
        'PROD-003' => 'cadenas-clover-3',
        'PROD-004' => 'aretes-cartier-4',
        'PROD-005' => 'gargantillas-pepper-5',
        'PROD-006' => 'gargantillas-visantino-6',
        'PROD-007' => 'cadenas-monaco-7',
        'PROD-008' => 'cadenas-gucci-8',
        'PROD-009' => 'cadenas-corte-brillo-9',
        'PROD-010' => 'gargantillas-monaco-romani-10',
        'PROD-011' => 'cadenas-11',
        'PROD-012' => 'aretes-12',
        'PROD-013' => 'pulseras-clover-monaco-pepper-cartier-versace-13',
        'PROD-014' => 'cadenas-14',
        'PROD-015' => 'cadenas-tenis-15',
        'PROD-016' => 'cadenas-torzal-16',
        'PROD-017' => 'cadenas-cuban-link-17',
        'PROD-018' => 'gargantillas-18',
        'PROD-019' => 'gargantillas-19',
        'PROD-020' => 'dijes-20',
        'PROD-021' => 'cadenas-tenis-21',
        'PROD-022' => 'anillos-22',
        'PROD-023' => 'dijes-23',
        'PROD-024' => 'cadenas-cuban-link-24',
        'PROD-025' => 'cadenas-rolo-25',
        'PROD-026' => 'aretes-pegasus-26',
        'PROD-027' => 'pulseras-27',
        'PROD-028' => 'cadenas-tiffany-militar-28',
        'PROD-029' => 'pulseras-cartier-29',
        'PROD-030' => 'cadenas-chino-30',
        'PROD-031' => 'anillos-31',
    ];

    return isset($map[$sku]) ? $map[$sku] : null;
}

/**
 * Reimportar imágenes de un producto
 */
function jewelry_reimport_product_images($product, $is_test)
{
    $sku = $product->get_sku();

    // Obtener slug de imágenes del mapeo
    $image_slug = jewelry_get_image_slug_from_sku($sku);

    if (!$image_slug) {
        return ['status' => 'no_mapping', 'count' => 0];
    }

    // Buscar imágenes originales en jewelry-catalog
    $source_dir = '/var/www/html/wp-content/uploads/jewelry-catalog/full/';
    $pattern = $source_dir . $image_slug . '-*.jpg';
    $found_images = glob($pattern);

    if (empty($found_images)) {
        return ['status' => 'no_images', 'count' => 0];
    }

    // Ordenar por número
    usort($found_images, function ($a, $b) {
        preg_match('/-(\d+)\.jpg$/i', $a, $match_a);
        preg_match('/-(\d+)\.jpg$/i', $b, $match_b);
        $num_a = isset($match_a[1]) ? intval($match_a[1]) : 0;
        $num_b = isset($match_b[1]) ? intval($match_b[1]) : 0;
        return $num_a - $num_b;
    });

    if ($is_test) {
        return ['status' => 'test', 'count' => count($found_images), 'files' => $found_images];
    }

    // IMPORTAR REALMENTE
    $imported = [];

    foreach ($found_images as $idx => $source_path) {
        $image_title = $product->get_name() . ' - ' . ($idx + 1);

        $attach_id = jewelry_import_image_correctly($source_path, $product->get_id(), $image_title);

        if ($attach_id) {
            $imported[] = $attach_id;
        }
    }

    if (empty($imported)) {
        return ['status' => 'error', 'count' => 0];
    }

    // Asignar al producto
    // Primera imagen = featured
    $product->set_image_id($imported[0]);

    // Resto = galería
    if (count($imported) > 1) {
        $gallery_ids = array_slice($imported, 1);
        $product->set_gallery_image_ids($gallery_ids);
    }

    $product->save();

    return ['status' => 'success', 'count' => count($imported), 'featured' => $imported[0]];
}

// ============================================================================
// PROCESO
// ============================================================================

// Obtener productos del catálogo
global $wpdb;
$product_ids = $wpdb->get_col("
    SELECT DISTINCT post_id
    FROM {$wpdb->postmeta}
    WHERE meta_key = '_sku'
    AND meta_value LIKE 'PROD-%'
");

$total = count($product_ids);
echo "📦 Productos del catálogo: $total\n\n";

$processed = 0;
$images_imported = 0;
$errors = 0;

foreach ($product_ids as $idx => $product_id) {
    $product = wc_get_product($product_id);
    if (!$product) {
        continue;
    }

    $sku = $product->get_sku();
    $name = substr($product->get_name(), 0, 40);

    echo "[" . ($idx + 1) . "/$total] $sku: $name...\n";

    $result = jewelry_reimport_product_images($product, $is_test);

    if ($result['status'] === 'no_mapping') {
        echo "   ⚠️  Sin mapeo de slug (SKU no reconocido)\n";
    } elseif ($result['status'] === 'no_images') {
        echo "   ⚠️  Sin imágenes encontradas\n";
    } elseif ($result['status'] === 'test') {
        echo "   📸 Encontradas " . $result['count'] . " imágenes:\n";
        foreach (array_slice($result['files'], 0, 3) as $file) {
            echo "      - " . basename($file) . "\n";
        }
        if ($result['count'] > 3) {
            echo "      ... y " . ($result['count'] - 3) . " más\n";
        }
        $processed++;
    } elseif ($result['status'] === 'success') {
        echo "   ✅ Importadas " . $result['count'] . " imágenes\n";
        echo "      Featured ID: " . $result['featured'] . "\n";
        $images_imported += $result['count'];
        $processed++;
    } else {
        echo "   ❌ Error al importar\n";
        $errors++;
    }

    echo "\n";
}

// ============================================================================
// RESUMEN
// ============================================================================

echo "\n=== RESUMEN ===\n\n";
echo "Productos procesados: $processed / $total\n";

if ($is_test) {
    echo "Imágenes que se importarían: (estimado)\n";
    echo "\n⚠️  MODO PRUEBA - No se importó nada\n";
    echo "Para importar realmente:\n";
    echo "  docker exec jewelry_wordpress php /var/www/html/reimport-product-images.php import\n";
} else {
    echo "Imágenes importadas: $images_imported\n";
    echo "Errores: $errors\n";
    echo "\n✅ Importación completada\n";
    echo "\nLas imágenes ahora están en la biblioteca de medios estándar.\n";
    echo "WordPress generará thumbnails automáticamente.\n";
}

echo "\n";
