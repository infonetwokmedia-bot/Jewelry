<?php

/**
 * Script para crear nuevas categorías de productos con soporte TranslatePress
 *
 * Ejecutar: docker exec jewelry_wordpress php -d memory_limit=512M /var/www/html/create-product-categories.php
 */

require_once('/var/www/html/wp-load.php');

echo "\n=== CREANDO CATEGORÍAS DE PRODUCTOS CON TRANSLATEPRESS ===\n\n";

/**
 * Agregar traducción a TranslatePress
 */
function jewelry_add_trp_translation($spanish, $english)
{
    global $wpdb;

    $spanish_escaped = esc_sql($spanish);
    $english_escaped = esc_sql($english);

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
        echo "   ⚠️  No se pudo obtener original_id para: $spanish\n";
        return false;
    }

    // Verificar si ya existe en diccionario
    $existing_dict = $wpdb->get_var($wpdb->prepare(
        "SELECT id FROM {$wpdb->prefix}trp_dictionary_es_es_en_us WHERE original_id = %d",
        $orig_id
    ));

    if ($existing_dict) {
        // Actualizar existente
        $wpdb->update(
            $wpdb->prefix . 'trp_dictionary_es_es_en_us',
            array(
                'original' => $spanish,
                'translated' => $english,
                'status' => 2  // Human translated
            ),
            array('original_id' => $orig_id),
            array('%s', '%s', '%d'),
            array('%d')
        );
    } else {
        // Insertar nuevo
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
 * Crear categoría de producto (solo en español, TranslatePress lo traduce)
 */
function jewelry_create_category($name_es, $name_en, $slug, $description_es = '', $description_en = '')
{
    echo "📂 Creando categoría: $name_es / $name_en\n";

    // Verificar si ya existe
    $existing = term_exists($slug, 'product_cat');

    if ($existing) {
        $term_id = $existing['term_id'];
        echo "   ℹ️  Categoría '$name_es' ya existe (ID: $term_id)\n";

        // Actualizar descripción si se proporcionó
        if (!empty($description_es)) {
            wp_update_term($term_id, 'product_cat', array(
                'description' => $description_es
            ));
            echo "   ✅ Descripción actualizada\n";
        }
    } else {
        // Crear categoría nueva
        $result = wp_insert_term(
            $name_es,
            'product_cat',
            array(
                'slug' => $slug,
                'description' => $description_es
            )
        );

        if (is_wp_error($result)) {
            echo "   ❌ Error: " . $result->get_error_message() . "\n";
            return false;
        }

        $term_id = $result['term_id'];
        echo "   ✅ Categoría creada (ID: $term_id)\n";
    }

    // Agregar traducciones a TranslatePress
    jewelry_add_trp_translation($name_es, $name_en);
    echo "   ✅ Traducción agregada a TranslatePress: $name_es → $name_en\n";

    if (!empty($description_es) && !empty($description_en)) {
        jewelry_add_trp_translation($description_es, $description_en);
        echo "   ✅ Descripción traducida\n";
    }

    return $term_id;
}

// ============================================================================
// CATEGORÍAS A CREAR
// ============================================================================

$categories = array(
    array(
        'name_es' => 'Gargantillas',
        'name_en' => 'Chokers',
        'slug' => 'gargantillas',
        'description_es' => 'Gargantillas elegantes en oro, plata y con diseños únicos. Perfectas para cualquier ocasión.',
        'description_en' => 'Elegant chokers in gold, silver and unique designs. Perfect for any occasion.'
    ),
    array(
        'name_es' => 'Aretes',
        'name_en' => 'Earrings',
        'slug' => 'aretes',
        'description_es' => 'Aretes y argollas de alta calidad. Desde diseños clásicos hasta modernos.',
        'description_en' => 'High-quality earrings and hoops. From classic to modern designs.'
    ),
    array(
        'name_es' => 'Dijes',
        'name_en' => 'Pendants',
        'slug' => 'dijes',
        'description_es' => 'Dijes personalizados en oro y diamantes. Dale un toque único a tu cadena.',
        'description_en' => 'Custom pendants in gold and diamonds. Add a unique touch to your chain.'
    ),
    array(
        'name_es' => 'Anillos',
        'name_en' => 'Rings',
        'slug' => 'anillos',
        'description_es' => 'Anillos de compromiso, bodas y moda. Diseños exclusivos para cada ocasión.',
        'description_en' => 'Engagement, wedding and fashion rings. Exclusive designs for every occasion.'
    )
);

echo "Se crearán " . count($categories) . " categorías nuevas\n\n";

// Crear cada categoría
foreach ($categories as $cat) {
    $result = jewelry_create_category(
        $cat['name_es'],
        $cat['name_en'],
        $cat['slug'],
        $cat['description_es'],
        $cat['description_en']
    );

    if ($result) {
        echo "   ✅ Completado\n";
    }
    echo "\n";
}

// ============================================================================
// VERIFICAR CATEGORÍAS EXISTENTES
// ============================================================================

echo "📋 Verificando categorías existentes que se reutilizarán:\n\n";

$existing_cats = array(
    array('slug' => 'cadenas-de-oro', 'name_es' => 'Cadenas de Oro', 'name_en' => 'Gold Chains'),
    array('slug' => 'pulseras-y-manillas', 'name_es' => 'Pulseras y Manillas', 'name_en' => 'Bracelets')
);

foreach ($existing_cats as $cat) {
    $term = get_term_by('slug', $cat['slug'], 'product_cat');
    if ($term) {
        echo "✅ {$cat['name_es']} (ID: {$term->term_id}, Productos: {$term->count})\n";

        // Asegurar que tiene traducción en TranslatePress
        jewelry_add_trp_translation($cat['name_es'], $cat['name_en']);
    } else {
        echo "⚠️  No encontrada: {$cat['slug']}\n";
    }
}

echo "\n";

// ============================================================================
// RESUMEN FINAL
// ============================================================================

echo "=== RESUMEN FINAL ===\n\n";

$all_product_cats = get_terms(array(
    'taxonomy' => 'product_cat',
    'hide_empty' => false
));

echo "Total de categorías de productos: " . count($all_product_cats) . "\n\n";

foreach ($all_product_cats as $cat) {
    echo "  • {$cat->name} (slug: {$cat->slug}, productos: {$cat->count})\n";
}

echo "\n✅ PROCESO COMPLETADO\n";
echo "📝 Las categorías ahora están disponibles para asignar productos\n";
echo "🌐 Las traducciones se mostrarán automáticamente en /en/\n\n";
