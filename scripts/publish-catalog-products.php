<?php

/**
 * Script para cambiar estado de productos de Draft a Published
 *
 * USO:
 *   docker exec jewelry_wordpress php /var/www/html/publish-catalog-products.php [modo]
 *
 * MODOS:
 *   test    - Modo prueba (mostrar sin cambiar)
 *   publish - Publicar todos los productos
 *
 * Ejemplos:
 *   # Ver cuántos productos están en borrador
 *   docker exec jewelry_wordpress php /var/www/html/publish-catalog-products.php test
 *
 *   # Publicar todos
 *   docker exec jewelry_wordpress php /var/www/html/publish-catalog-products.php publish
 */

require_once('/var/www/html/wp-load.php');

if (!class_exists('WC_Product')) {
    die("❌ WooCommerce no está activado\n");
}

echo "\n=== PUBLICACIÓN DE PRODUCTOS DEL CATÁLOGO ===\n\n";

// Modo de ejecución
$mode = isset($argv[1]) ? $argv[1] : 'test';

if ($mode === 'test') {
    echo "⚠️  Modo prueba: Solo mostrará productos sin cambiar nada\n\n";
} elseif ($mode === 'publish') {
    echo "🚀 Modo publicación: Cambiará todos los productos a estado 'publish'\n\n";
} else {
    die("❌ Modo inválido. Usar: test o publish\n\n");
}

/**
 * Obtener productos en borrador del catálogo
 */
function jewelry_get_draft_products()
{
    $args = array(
        'post_type' => 'product',
        'post_status' => 'draft',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => '_sku',
                'value' => 'PROD-',
                'compare' => 'LIKE'
            )
        )
    );

    return get_posts($args);
}

/**
 * Publicar un producto
 */
function jewelry_publish_product($product_id)
{
    $product = wc_get_product($product_id);

    if (!$product) {
        return false;
    }

    // Cambiar estado a publish
    $product->set_status('publish');
    $product->save();

    return true;
}

// ============================================================================
// OBTENER PRODUCTOS EN BORRADOR
// ============================================================================

$draft_products = jewelry_get_draft_products();

if (empty($draft_products)) {
    echo "✅ No hay productos en borrador del catálogo\n\n";

    // Mostrar resumen de todos los productos
    $all_products = get_posts(array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'post_status' => array('publish', 'draft', 'pending', 'private')
    ));

    $status_count = array();
    foreach ($all_products as $p) {
        $status = $p->post_status;
        if (!isset($status_count[$status])) {
            $status_count[$status] = 0;
        }
        $status_count[$status]++;
    }

    echo "📊 Estado de todos los productos:\n";
    foreach ($status_count as $status => $count) {
        echo "   • $status: $count productos\n";
    }
    echo "\n";

    exit(0);
}

$total = count($draft_products);
echo "📦 Productos en borrador del catálogo: $total\n\n";

// ============================================================================
// MOSTRAR/PUBLICAR PRODUCTOS
// ============================================================================

$published = 0;
$errors = 0;

foreach ($draft_products as $idx => $post) {
    $product = wc_get_product($post->ID);
    $sku = $product->get_sku();
    $name = $product->get_name();
    $name_short = substr($name, 0, 50);

    echo "[" . ($idx + 1) . "/$total] $sku: $name_short";

    if ($mode === 'test') {
        echo " (borrador)\n";
    } elseif ($mode === 'publish') {
        $result = jewelry_publish_product($post->ID);

        if ($result) {
            echo " ✅ Publicado\n";
            $published++;
        } else {
            echo " ❌ Error\n";
            $errors++;
        }
    }
}

// ============================================================================
// RESUMEN
// ============================================================================

echo "\n=== RESUMEN ===\n\n";

if ($mode === 'test') {
    echo "Productos en borrador: $total\n";
    echo "\n📝 Para publicarlos, ejecutar:\n";
    echo "   docker exec jewelry_wordpress php /var/www/html/publish-catalog-products.php publish\n\n";
} elseif ($mode === 'publish') {
    echo "Total procesados: $total\n";
    echo "Publicados exitosamente: $published\n";
    echo "Errores: $errors\n\n";

    if ($published > 0) {
        echo "✅ Productos publicados\n";
        echo "📝 Los productos son visibles en:\n";
        echo "   - ES: https://jewelry.local.dev/tienda/\n";
        echo "   - EN: https://jewelry.local.dev/en/shop/\n";
    }
}

echo "\n";
