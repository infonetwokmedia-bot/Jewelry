<?php

/**
 * Script para activar Elementor
 */

require_once('/var/www/html/wp-load.php');

echo "Activando Elementor...\n";

if (!is_plugin_active('elementor/elementor.php')) {
    $result = activate_plugin('elementor/elementor.php');

    if (is_wp_error($result)) {
        echo "❌ Error: " . $result->get_error_message() . "\n";
    } else {
        echo "✅ Elementor activado exitosamente\n";
    }
} else {
    echo "✅ Elementor ya estaba activo\n";
}

// Verificar versión
if (defined('ELEMENTOR_VERSION')) {
    echo "Versión: " . ELEMENTOR_VERSION . "\n";
}
