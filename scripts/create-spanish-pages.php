<?php

/**
 * Script para crear páginas en español y vincularlas con Bogo
 *
 * Ejecutar: docker exec jewelry_wordpress php /var/www/html/create-spanish-pages.php
 */

// Cargar WordPress
require_once('/var/www/html/wp-load.php');

// Traducciones de títulos
$translations = array(
    'Home'          => 'Inicio',
    'Shop'          => 'Tienda',
    'Cart'          => 'Carrito',
    'Checkout'      => 'Finalizar Compra',
    'My account'    => 'Mi Cuenta',
    'Blog'          => 'Blog',
    'About Us'      => 'Nosotros',
    'Contacts'      => 'Contacto',
    'Materials'     => 'Materiales',
);

// Páginas en inglés (IDs desde la plantilla)
$english_pages = array(
    1300 => 'Home',
    1298 => 'Shop',
    1299 => 'Cart',
    7    => 'Checkout',
    8    => 'My account',
    1177 => 'Blog',
    1180 => 'About Us',
    1182 => 'Contacts',
    1184 => 'Materials',
);

echo "\n=== CREANDO PÁGINAS EN ESPAÑOL Y VINCULANDO CON BOGO ===\n\n";

foreach ($english_pages as $en_id => $en_title) {

    // Verificar que la página existe
    $en_page = get_post($en_id);
    if (!$en_page) {
        echo "❌ Página EN ID $en_id no encontrada, saltando...\n";
        continue;
    }

    echo "📄 Procesando: $en_title (ID: $en_id)\n";

    // 1. Marcar página EN como en_US
    update_post_meta($en_id, '_locale', 'en_US');
    echo "   ✅ Marcada como en_US\n";

    // 2. Verificar si ya existe versión ES
    $existing_es = get_posts(array(
        'post_type'   => 'page',
        'post_status' => 'any',
        'title'       => $translations[$en_title],
        'numberposts' => 1,
    ));

    if (!empty($existing_es)) {
        $es_id = $existing_es[0]->ID;
        echo "   ℹ️  Versión ES ya existe (ID: $es_id)\n";
    } else {
        // 3. Crear página ES
        $es_page_data = array(
            'post_title'   => $translations[$en_title],
            'post_content' => $en_page->post_content,
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => $en_page->post_author,
            'post_name'    => sanitize_title($translations[$en_title]),
        );

        $es_id = wp_insert_post($es_page_data);

        if (is_wp_error($es_id)) {
            echo "   ❌ Error creando página ES: " . $es_id->get_error_message() . "\n";
            continue;
        }

        echo "   ✅ Página ES creada (ID: $es_id) - {$translations[$en_title]}\n";
    }

    // 4. Marcar página ES como es_ES
    update_post_meta($es_id, '_locale', 'es_ES');

    // 5. Vincular ambas páginas con Bogo
    $bogo_translations = array(
        'en_US' => $en_id,
        'es_ES' => $es_id,
    );

    update_post_meta($en_id, '_bogo_translations', $bogo_translations);
    update_post_meta($es_id, '_bogo_translations', $bogo_translations);

    echo "   🔗 Páginas vinculadas: EN ($en_id) ↔ ES ($es_id)\n\n";
}

echo "=== PROCESO COMPLETADO ===\n";
echo "\nResumen:\n";
echo "✅ Todas las páginas EN marcadas como en_US\n";
echo "✅ Todas las páginas ES creadas y marcadas como es_ES\n";
echo "✅ Todas las páginas vinculadas con Bogo\n\n";

// Limpiar caché
wp_cache_flush();
echo "✅ Caché limpiado\n\n";
