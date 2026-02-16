<?php

/**
 * Script para crear menús bilingües
 *
 * Ejecutar: docker exec jewelry_wordpress php /var/www/html/create-bilingual-menus.php
 */

require_once('/var/www/html/wp-load.php');

echo "\n=== CREANDO MENÚS BILINGÜES ===\n\n";

// Definir estructura de menús
$menu_items_en = array(
    array('page_id' => 1300, 'title' => 'Home'),
    array('page_id' => 1298, 'title' => 'Shop'),
    array('page_id' => 1180, 'title' => 'About Us'),
    array('page_id' => 1184, 'title' => 'Materials'),
    array('page_id' => 1182, 'title' => 'Contacts'),
    array('page_id' => 8,    'title' => 'My Account'),
);

$menu_items_es = array(
    array('page_id' => 1320, 'title' => 'Inicio'),
    array('page_id' => 1321, 'title' => 'Tienda'),
    array('page_id' => 1325, 'title' => 'Nosotros'),
    array('page_id' => 1327, 'title' => 'Materiales'),
    array('page_id' => 1326, 'title' => 'Contacto'),
    array('page_id' => 1324, 'title' => 'Mi Cuenta'),
);

// ============================================================================
// CREAR MENÚ EN INGLÉS
// ============================================================================
echo "📋 Creando menú en inglés...\n";

// Verificar si el menú ya existe
$menu_en_exists = wp_get_nav_menu_object('primary_navigation_en');

if ($menu_en_exists) {
    $menu_en_id = $menu_en_exists->term_id;
    echo "   ℹ️  Menú 'primary_navigation_en' ya existe (ID: $menu_en_id)\n";

    // Limpiar items existentes
    $existing_items = wp_get_nav_menu_items($menu_en_id);
    if ($existing_items) {
        foreach ($existing_items as $item) {
            wp_delete_post($item->ID, true);
        }
        echo "   🗑️  Items antiguos eliminados\n";
    }
} else {
    $menu_en_id = wp_create_nav_menu('primary_navigation_en');

    if (is_wp_error($menu_en_id)) {
        echo "   ❌ Error creando menú EN: " . $menu_en_id->get_error_message() . "\n";
        exit(1);
    }

    echo "   ✅ Menú 'primary_navigation_en' creado (ID: $menu_en_id)\n";
}

// Agregar items al menú EN
$position = 1;
foreach ($menu_items_en as $item) {
    $menu_item_id = wp_update_nav_menu_item($menu_en_id, 0, array(
        'menu-item-title'     => $item['title'],
        'menu-item-object-id' => $item['page_id'],
        'menu-item-object'    => 'page',
        'menu-item-type'      => 'post_type',
        'menu-item-status'    => 'publish',
        'menu-item-position'  => $position++,
    ));

    if (is_wp_error($menu_item_id)) {
        echo "   ❌ Error agregando '{$item['title']}': " . $menu_item_id->get_error_message() . "\n";
    } else {
        echo "   ✅ Agregado: {$item['title']}\n";
    }
}

echo "\n";

// ============================================================================
// CREAR MENÚ EN ESPAÑOL
// ============================================================================
echo "📋 Creando menú en español...\n";

// Verificar si el menú ya existe
$menu_es_exists = wp_get_nav_menu_object('primary_navigation_es');

if ($menu_es_exists) {
    $menu_es_id = $menu_es_exists->term_id;
    echo "   ℹ️  Menú 'primary_navigation_es' ya existe (ID: $menu_es_id)\n";

    // Limpiar items existentes
    $existing_items = wp_get_nav_menu_items($menu_es_id);
    if ($existing_items) {
        foreach ($existing_items as $item) {
            wp_delete_post($item->ID, true);
        }
        echo "   🗑️  Items antiguos eliminados\n";
    }
} else {
    $menu_es_id = wp_create_nav_menu('primary_navigation_es');

    if (is_wp_error($menu_es_id)) {
        echo "   ❌ Error creando menú ES: " . $menu_es_id->get_error_message() . "\n";
        exit(1);
    }

    echo "   ✅ Menú 'primary_navigation_es' creado (ID: $menu_es_id)\n";
}

// Agregar items al menú ES
$position = 1;
foreach ($menu_items_es as $item) {
    $menu_item_id = wp_update_nav_menu_item($menu_es_id, 0, array(
        'menu-item-title'     => $item['title'],
        'menu-item-object-id' => $item['page_id'],
        'menu-item-object'    => 'page',
        'menu-item-type'      => 'post_type',
        'menu-item-status'    => 'publish',
        'menu-item-position'  => $position++,
    ));

    if (is_wp_error($menu_item_id)) {
        echo "   ❌ Error agregando '{$item['title']}': " . $menu_item_id->get_error_message() . "\n";
    } else {
        echo "   ✅ Agregado: {$item['title']}\n";
    }
}

echo "\n";

// ============================================================================
// ASIGNAR MENÚ EN INGLÉS A LA UBICACIÓN PRIMARY (por defecto)
// ============================================================================
echo "📍 Configurando ubicación de menú por defecto...\n";

$locations = get_theme_mod('nav_menu_locations');
if (!is_array($locations)) {
    $locations = array();
}

$locations['primary'] = $menu_en_id;
set_theme_mod('nav_menu_locations', $locations);

echo "   ✅ Menú EN asignado a ubicación 'primary' (por defecto)\n";

echo "\n=== PROCESO COMPLETADO ===\n\n";

echo "Resumen:\n";
echo "✅ Menú EN 'primary_navigation_en' (ID: $menu_en_id) - 6 items\n";
echo "✅ Menú ES 'primary_navigation_es' (ID: $menu_es_id) - 6 items\n";
echo "✅ Menú EN asignado a ubicación 'primary'\n\n";

echo "⚠️  IMPORTANTE:\n";
echo "Para que el menú cambie automáticamente según idioma, necesitas agregar\n";
echo "esta función a wp-content/themes/kadence/functions-custom.php:\n\n";

echo "<?php\n";
echo "/**\n";
echo " * Cambiar menú automáticamente según idioma de Bogo\n";
echo " */\n";
echo "function jewelry_switch_menu_by_language( \$args ) {\n";
echo "    if ( ! function_exists( 'bogo_get_current_locale' ) ) {\n";
echo "        return \$args;\n";
echo "    }\n\n";
echo "    \$locale = bogo_get_current_locale();\n\n";
echo "    if ( 'primary' === \$args['theme_location'] ) {\n";
echo "        if ( 'es_ES' === \$locale ) {\n";
echo "            \$menu_es = wp_get_nav_menu_object( 'primary_navigation_es' );\n";
echo "            if ( \$menu_es ) {\n";
echo "                \$args['menu'] = \$menu_es;\n";
echo "            }\n";
echo "        } elseif ( 'en_US' === \$locale ) {\n";
echo "            \$menu_en = wp_get_nav_menu_object( 'primary_navigation_en' );\n";
echo "            if ( \$menu_en ) {\n";
echo "                \$args['menu'] = \$menu_en;\n";
echo "            }\n";
echo "        }\n";
echo "    }\n\n";
echo "    return \$args;\n";
echo "}\n";
echo "add_filter( 'wp_nav_menu_args', 'jewelry_switch_menu_by_language' );\n";

echo "\n";
