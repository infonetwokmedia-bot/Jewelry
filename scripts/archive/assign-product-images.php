<?php

/**
 * Script para asignar imágenes a productos del catálogo
 *
 * PREREQUISITO: Las imágenes deben estar en /var/www/html/wp-content/uploads/jewelry-catalog/
 *
 * USO:
 *   docker exec jewelry_wordpress php -d memory_limit=512M /var/www/html/assign-product-images.php [modo]
 *
 * MODOS:
 *   test    - Modo prueba (primeros 5 productos)
 *   all     - Todos los productos
 *
 * Ejemplos:
 *   docker exec jewelry_wordpress php /var/www/html/assign-product-images.php test
 *   docker exec jewelry_wordpress php /var/www/html/assign-product-images.php all
 */

require_once('/var/www/html/wp-load.php');

if (!class_exists('WC_Product_Simple')) {
    die("❌ WooCommerce no está activado\n");
}

echo "\n=== ASIGNACIÓN DE IMÁGENES A PRODUCTOS ===\n\n";

// Modo de ejecución
$mode = isset($argv[1]) ? $argv[1] : 'test';
$limit = ($mode === 'test') ? 5 : 0;

if ($mode === 'test') {
    echo "⚠️  Modo prueba: Solo primeros 5 productos\n\n";
}

// Directorio de imágenes
$upload_dir = wp_upload_dir();
$images_base_path = $upload_dir['basedir'] . '/jewelry-catalog';
$images_base_url = $upload_dir['baseurl'] . '/jewelry-catalog';

// Verificar que existe el directorio de imágenes
if (!is_dir($images_base_path)) {
    die("❌ No se encontró el directorio de imágenes: $images_base_path\n\nEjecutar primero:\n  bash /srv/stacks/jewelry/scripts/prepare-catalog-images.sh\n\n");
}

/**
 * Leer CSV del catálogo
 */
function jewelry_read_catalog_csv()
{
    $csv_path = '/var/www/html/docs/data/catalog_editable_translated.csv';

    if (!file_exists($csv_path)) {
        echo "❌ No se encontró: $csv_path\n";
        return array();
    }

    $products = array();
    $file = fopen($csv_path, 'r');

    // Leer cabecera y limpiar BOM
    $header = fgetcsv($file, 0, ';');
    if (!empty($header)) {
        $header[0] = preg_replace('/^\x{FEFF}/u', '', $header[0]);
        $header[0] = trim($header[0], '"');
        $header[0] = str_replace('"""', '', $header[0]);
        $header = array_map('trim', $header);
    }

    // Leer productos
    while (($row = fgetcsv($file, 0, ';')) !== false) {
        if (count($header) === count($row)) {
            $product = array_combine($header, $row);
            if (isset($product['web_ready']) && strtoupper(trim($product['web_ready'])) === 'TRUE') {
                $products[] = $product;
            }
        }
    }

    fclose($file);
    return $products;
}

/**
 * Obtener producto por SKU
 */
function jewelry_get_product_by_sku($sku)
{
    global $wpdb;
    $product_id = $wpdb->get_var($wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key='_sku' AND meta_value=%s",
        $sku
    ));

    return $product_id ? wc_get_product($product_id) : null;
}

/**
 * Insertar imagen en la biblioteca de medios
 */
function jewelry_insert_image($image_path, $product_id, $image_title)
{
    // Verificar que el archivo existe
    if (!file_exists($image_path)) {
        return false;
    }

    // Verificar si ya está importada (por nombre de archivo)
    $filename = basename($image_path);
    global $wpdb;
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT ID FROM {$wpdb->posts} WHERE post_type='attachment' AND guid LIKE %s",
        '%' . $filename
    ));

    if ($existing) {
        return $existing;
    }

    // Preparar datos del archivo
    $filetype = wp_check_filetype($image_path);
    $attachment = array(
        'guid'           => $image_path,
        'post_mime_type' => $filetype['type'],
        'post_title'     => $image_title,
        'post_content'   => '',
        'post_status'    => 'inherit'
    );

    // Insertar attachment
    $attach_id = wp_insert_attachment($attachment, $image_path, $product_id);

    if (is_wp_error($attach_id)) {
        return false;
    }

    // Generar metadata
    require_once(ABSPATH . 'wp-admin/includes/image.php');
    $attach_data = wp_generate_attachment_metadata($attach_id, $image_path);
    wp_update_attachment_metadata($attach_id, $attach_data);

    return $attach_id;
}

/**
 * Asignar imágenes a un producto
 */
function jewelry_assign_images_to_product($product_data, $images_base_path)
{
    $sku = trim($product_data['id']);
    $images_field = trim($product_data['images']);
    $slug = trim($product_data['slug']);

    // Obtener producto
    $product = jewelry_get_product_by_sku($sku);
    if (!$product) {
        echo "   ❌ Producto no encontrado (SKU: $sku)\n";
        return false;
    }

    // Buscar imágenes por slug (las imágenes están renombradas como: slug-01.jpg, slug-02.webp, etc)
    if (empty($slug)) {
        echo "   ⚠️  Sin slug definido\n";
        return false;
    }

    // Buscar todas las imágenes que coincidan con el patrón del slug
    $image_pattern = $images_base_path . '/full/' . $slug . '-*.{jpg,jpeg,webp}';
    $found_images = glob($image_pattern, GLOB_BRACE);

    if (empty($found_images)) {
        echo "   ⚠️  Sin imágenes encontradas para slug: $slug\n";
        return false;
    }

    // Filtrar solo JPG (webp son duplicados)
    $jpg_images = array_filter($found_images, function ($path) {
        return preg_match('/\.(jpg|jpeg)$/i', $path);
    });

    if (empty($jpg_images)) {
        $jpg_images = $found_images; // Usar todas si no hay JPG
    }

    // Ordenar numéricamente
    usort($jpg_images, function ($a, $b) {
        preg_match('/-(\d+)\.(jpg|jpeg|webp)$/i', $a, $match_a);
        preg_match('/-(\d+)\.(jpg|jpeg|webp)$/i', $b, $match_b);
        $num_a = isset($match_a[1]) ? intval($match_a[1]) : 0;
        $num_b = isset($match_b[1]) ? intval($match_b[1]) : 0;
        return $num_a - $num_b;
    });

    echo "   📸 Procesando " . count($jpg_images) . " imagen(es)...\n";

    $attached_images = array();
    $featured_set = false;

    foreach ($jpg_images as $idx => $found_path) {
        if (!file_exists($found_path)) {
            continue;
        }

        // Título de la imagen
        $image_title = $product->get_name() . ' - Imagen ' . ($idx + 1);

        // Insertar en biblioteca
        $attach_id = jewelry_insert_image($found_path, $product->get_id(), $image_title);

        if ($attach_id) {
            $attached_images[] = $attach_id;

            // Primera imagen = featured image
            if (!$featured_set) {
                $product->set_image_id($attach_id);
                $featured_set = true;
                echo "      ✅ Featured: " . basename($found_path) . " (ID: $attach_id)\n";
            } else {
                echo "      ✅ Galería: " . basename($found_path) . " (ID: $attach_id)\n";
            }
        }
    }

    // Asignar galería (resto de imágenes)
    if (count($attached_images) > 1) {
        $gallery_ids = array_slice($attached_images, 1);
        $product->set_gallery_image_ids($gallery_ids);
    }

    // Guardar producto
    $product->save();

    return count($attached_images);
}

// ============================================================================
// PROCESO DE ASIGNACIÓN
// ============================================================================

$products = jewelry_read_catalog_csv();

if (empty($products)) {
    die("❌ No se encontraron productos en el CSV\n");
}

$total = count($products);

if ($limit > 0 && $limit < $total) {
    $products = array_slice($products, 0, $limit);
    $total = count($products);
}

echo "📦 Se procesarán $total productos\n\n";

$processed = 0;
$images_assigned = 0;
$errors = 0;

foreach ($products as $idx => $product_data) {
    $sku = trim($product_data['id']);
    $name_short = substr(trim($product_data['raw_description_es']), 0, 40);

    echo "\n[" . ($idx + 1) . "/$total] $sku: $name_short...\n";

    $result = jewelry_assign_images_to_product($product_data, $images_base_path);

    if ($result === false) {
        $errors++;
    } elseif ($result > 0) {
        $images_assigned += $result;
        $processed++;
        echo "   ✅ $result imagen(es) asignada(s)\n";
    }
}

// ============================================================================
// RESUMEN
// ============================================================================

echo "\n\n=== RESUMEN ===\n\n";
echo "Total productos procesados: $total\n";
echo "Productos con imágenes: $processed\n";
echo "Imágenes asignadas: $images_assigned\n";
echo "Errores: $errors\n\n";

if ($processed > 0) {
    echo "✅ Imágenes asignadas exitosamente\n";
    echo "📝 Las imágenes están visibles en:\n";
    echo "   - WP Admin: wp-admin/upload.php\n";
    echo "   - Productos: wp-admin/edit.php?post_type=product\n";
}

echo "\n";
