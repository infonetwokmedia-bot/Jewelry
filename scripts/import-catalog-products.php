<?php

/**
 * Script para importar productos del catálogo con soporte TranslatePress
 *
 * USO:
 *   docker exec jewelry_wordpress php -d memory_limit=512M /var/www/html/import-catalog-products.php [limite]
 *
 * Ejemplos:
 *   # Importar los primeros 5 productos (prueba)
 *   docker exec jewelry_wordpress php /var/www/html/import-catalog-products.php 5
 *
 *   # Importar todos
 *   docker exec jewelry_wordpress php /var/www/html/import-catalog-products.php
 */

require_once('/var/www/html/wp-load.php');

if (!class_exists('WC_Product_Simple')) {
    die("❌ WooCommerce no está activado\n");
}

echo "\n=== IMPORTACIÓN DE PRODUCTOS DEL CATÁLOGO ===\n\n";

// Límite de productos (para pruebas)
$limit = isset($argv[1]) && is_numeric($argv[1]) ? intval($argv[1]) : 0;

if ($limit > 0) {
    echo "⚠️  Modo prueba: Se importarán solo {$limit} productos\n\n";
}

/**
 * Agregar traducción a TranslatePress
 */
function jewelry_add_trp_translation($spanish, $english)
{
    global $wpdb;

    if (empty($spanish) || empty($english)) {
        return false;
    }

    // Insertar en wp_trp_original_strings
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}trp_original_strings WHERE original = %s",
        $spanish
    ));

    if ($existing) {
        $orig_id = $existing;
    } else {
        $wpdb->insert(
            $wpdb->prefix . 'trp_original_strings',
            array('original' => $spanish),
            array('%s')
        );
        $orig_id = $wpdb->insert_id;
    }

    if (!$orig_id) {
        return false;
    }

    // Verificar si ya existe en diccionario
    $existing_dict = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}trp_dictionary_es_es_en_us WHERE original_id = %d",
        $orig_id
    ));

    if ($existing_dict) {
        $wpdb->update(
            $wpdb->prefix . 'trp_dictionary_es_es_en_us',
            array(
                'original' => $spanish,
                'translated' => $english,
                'status' => 2
            ),
            array('original_id' => $orig_id),
            array('%s', '%s', '%d'),
            array('%d')
        );
    } else {
        $wpdb->insert(
            $wpdb->prefix . 'trp_dictionary_es_es_en_us',
            array(
                'original' => $spanish,
                'translated' => $english,
                'status' => 2,
                'block_type' => 0,
                'original_id' => $orig_id
            ),
            array('%s', '%s', '%d', '%d', '%d')
        );
    }

    return true;
}

/**
 * Leer CSV del catálogo
 */
function jewelry_read_catalog_csv()
{
    // Usar el CSV traducido que tiene las descripciones en inglés
    $csv_path = '/var/www/html/docs/data/catalog_editable_translated.csv';

    if (!file_exists($csv_path)) {
        echo "❌ No se encontró: $csv_path\n";
        return array();
    }

    $products = array();
    $file = fopen($csv_path, 'r');

    // Leer cabecera y limpiar BOM si existe
    $header = fgetcsv($file, 0, ';');
    if (!empty($header)) {
        // Limpiar BOM y caracteres extraños del primer campo
        $header[0] = preg_replace('/^\x{FEFF}/u', '', $header[0]); // UTF-8 BOM
        $header[0] = trim($header[0], '"');
        $header[0] = str_replace('"""', '', $header[0]);
        $header = array_map('trim', $header);
    }

    // Leer productos
    while (($row = fgetcsv($file, 0, ';')) !== false) {
        if (count($header) === count($row)) {
            $product = array_combine($header, $row);

            // Solo productos marcados como web_ready
            if (isset($product['web_ready']) && strtoupper(trim($product['web_ready'])) === 'TRUE') {
                $products[] = $product;
            }
        }
    }

    fclose($file);

    return $products;
}

/**
 * Crear producto en WooCommerce
 */
function jewelry_create_product($data)
{
    global $wpdb;

    $product_id = $data['id'];
    $name_es = trim($data['raw_description_es']);
    $name_en = trim($data['raw_description_en']);
    $sku = $product_id;
    $category_es = trim($data['category_es']);
    $model = trim($data['model']);
    $slug = trim($data['slug']);

    // Nombre corto del producto (primeras palabras)
    $short_name_es = implode(' ', array_slice(explode(' ', $name_es), 0, 5));
    if (strlen($name_es) > strlen($short_name_es)) {
        $short_name_es .= '...';
    }

    echo "📦 Creando: $short_name_es (SKU: $sku)\n";

    // Verificar si ya existe
    $existing = $wpdb->get_var($wpdb->prepare(
        "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key='_sku' AND meta_value=%s",
        $sku
    ));

    if ($existing) {
        echo "   ⚠️  Producto ya existe (ID: $existing), saltando...\n";
        return $existing;
    }

    // Crear producto
    $product = new WC_Product_Simple();
    $product->set_name($short_name_es);
    $product->set_description($name_es);
    $product->set_short_description($short_name_es);
    $product->set_sku($sku);
    $product->set_status('draft');  // Borrador hasta agregar precios
    $product->set_catalog_visibility('visible');

    // Obtener categoría
    if ($category_es) {
        $cat_slug = strtolower(str_replace(' ', '-', $category_es));
        $cat_slug = remove_accents($cat_slug);

        $term = get_term_by('slug', $cat_slug, 'product_cat');
        if (!$term) {
            // Mapeo de categorías del catálogo a slugs de WooCommerce
            $cat_slug_map = array(
                'cadenas' => 'necklaces-chains',
                'pulseras' => 'bracelets',
                'aretes' => 'earrings',
                'gargantillas' => 'gargantillas',
                'dijes' => 'dijes',
                'anillos' => 'rings'
            );

            if (isset($cat_slug_map[$cat_slug])) {
                $term = get_term_by('slug', $cat_slug_map[$cat_slug], 'product_cat');
            }
        }

        if ($term) {
            $product->set_category_ids(array($term->term_id));
            echo "   ✅ Categoría: {$term->name}\n";
        } else {
            echo "   ⚠️  Categoría no encontrada: $category_es\n";
        }
    }

    // Guardar producto
    $product_id_created = $product->save();

    if (!$product_id_created) {
        echo "   ❌ Error al crear producto\n";
        return false;
    }

    echo "   ✅ Creado (ID: $product_id_created)\n";

    // Agregar traducciones a TranslatePress
    if ($name_en && strlen($name_en) > 5) {
        $short_name_en = implode(' ', array_slice(explode(' ', $name_en), 0, 5));
        if (strlen($name_en) > strlen($short_name_en)) {
            $short_name_en .= '...';
        }

        jewelry_add_trp_translation($short_name_es, $short_name_en);
        jewelry_add_trp_translation($name_es, $name_en);
        echo "   ✅ Traducciones agregadas a TranslatePress\n";
    } else {
        echo "   ⚠️  Sin traducción EN disponible\n";
    }

    return $product_id_created;
}

// ============================================================================
// PROCESO DE IMPORTACIÓN
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

echo "📦 Se importarán $total productos\n\n";

$imported = 0;
$skipped = 0;
$errors = 0;

foreach ($products as $idx => $product_data) {
    echo "\n[" . ($idx + 1) . "/$total] ";

    $result = jewelry_create_product($product_data);

    if ($result === false) {
        $errors++;
    } elseif (is_numeric($result)) {
        $imported++;
    } else {
        $skipped++;
    }
}

// ============================================================================
// RESUMEN
// ============================================================================

echo "\n\n=== RESUMEN DE IMPORTACIÓN ===\n\n";
echo "Total procesados: $total\n";
echo "Importados: $imported\n";
echo "Saltados: $skipped\n";
echo "Errores: $errors\n\n";

if ($imported > 0) {
    echo "✅ Productos creados en estado BORRADOR\n";
    echo "📝 Próximos pasos:\n";
    echo "   1. Agregar precios manualmente en WP Admin\n";
    echo "   2. Subir/asignar imágenes\n";
    echo "   3. Cambiar estado a 'Publicado'\n";
    echo "   4. Verificar traducciones en /en/\n";
}

echo "\n";
