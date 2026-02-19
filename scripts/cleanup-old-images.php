<?php

/**
 * Script para limpiar imágenes antiguas y attachments duplicados
 *
 * Ahora que las imágenes están correctamente en la biblioteca de WordPress,
 * necesitamos eliminar los attachments viejos que apuntaban a /jewelry-catalog/
 *
 * USO:
 *   docker exec jewelry_wordpress php /var/www/html/cleanup-old-images.php [test|clean]
 */

require_once('/var/www/html/wp-load.php');

echo "\n=== LIMPIEZA DE IMÁGENES ANTIGUAS ===\n\n";

$mode = isset($argv[1]) ? $argv[1] : 'test';
$is_test = ($mode !== 'clean');

if ($is_test) {
    echo "⚠️  MODO PRUEBA\n";
    echo "   Para limpiar: docker exec jewelry_wordpress php /var/www/html/cleanup-old-images.php clean\n\n";
} else {
    echo "🗑️  MODO LIMPIEZA\n\n";
}

// ============================================================================
// 1. BUSCAR ATTACHMENTS ANTIGUOS (que apuntan a /jewelry-catalog/)
// ============================================================================

global $wpdb;

echo "🔍 Buscando attachments antiguos de /jewelry-catalog/...\n";

$old_attachments = $wpdb->get_results("
    SELECT ID, post_title, guid
    FROM {$wpdb->posts}
    WHERE post_type = 'attachment'
    AND guid LIKE '%/jewelry-catalog/%'
    ORDER BY ID
");

$count = count($old_attachments);
echo "Encontrados: $count attachments\n\n";

if ($count > 0) {
    echo "Primeros 10:\n";
    foreach (array_slice($old_attachments, 0, 10) as $att) {
        echo "  ID " . $att->ID . ": " . $att->post_title . "\n";
        echo "    " . $att->guid . "\n";
    }

    if ($count > 10) {
        echo "  ... y " . ($count - 10) . " más\n";
    }

    echo "\n";
}

// ============================================================================
// 2. ELIMINAR ATTACHMENTS ANTIGUOS
// ============================================================================

if (!$is_test && $count > 0) {
    echo "🗑️  Eliminando " . $count . " attachments antiguos...\n";

    $deleted = 0;
    foreach ($old_attachments as $att) {
        // Eliminar attachment (sin borrar archivo físico, solo de BD)
        $result = wp_delete_attachment($att->ID, false);
        if ($result) {
            $deleted++;
        }
    }

    echo "✅ Eliminados " . $deleted . " / " . $count . " attachments\n\n";
}

// ============================================================================
// 3. VERIFICAR PRODUCTOS
// ============================================================================

echo "📦 Verificando productos del catálogo...\n";

$product_ids = $wpdb->get_col("
    SELECT DISTINCT post_id
    FROM {$wpdb->postmeta}
    WHERE meta_key = '_sku'
    AND meta_value LIKE 'PROD-%'
");

$total = count($product_ids);
$with_images = 0;
$without_images = 0;

foreach ($product_ids as $product_id) {
    $product = wc_get_product($product_id);
    if (!$product) continue;

    $img_id = $product->get_image_id();
    if ($img_id) {
        $img_url = wp_get_attachment_url($img_id);
        // Verificar que la imagen NO apunte a /jewelry-catalog/
        if (strpos($img_url, '/jewelry-catalog/') === false) {
            $with_images++;
        } else {
            $without_images++;
            if (!$is_test) {
                echo "  ⚠️  Producto " . $product->get_sku() . " tiene imagen antigua\n";
            }
        }
    } else {
        $without_images++;
    }
}

echo "Productos con imágenes nuevas: $with_images / $total\n";
echo "Productos sin imágenes o con antiguas: $without_images / $total\n";

echo "\n";

// ============================================================================
// RESUMEN
// ============================================================================

echo "=== RESUMEN ===\n\n";

if ($is_test) {
    echo "Attachments antiguos que se eliminarían: $count\n";
    echo "\n⚠️  MODO PRUEBA - No se eliminó nada\n";
    echo "Para limpiar:\n";
    echo "  docker exec jewelry_wordpress php /var/www/html/cleanup-old-images.php clean\n";
} else {
    echo "✅ Limpieza completada\n";
    echo "Productos con imágenes correctas: $with_images / $total\n";
}

echo "\n";
