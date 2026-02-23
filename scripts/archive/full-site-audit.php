<?php

/**
 * Auditoría Completa del Sitio - Jewelry Miami
 *
 * Verifica:
 * - Base de datos y conectividad
 * - WordPress core y configuración
 * - Plugins (versiones, compatibilidad, errores)
 * - Tema Astra (configuración, CSS, colores)
 * - WooCommerce (productos, imágenes, precios, categorías)
 * - TranslatePress (traducciones, idiomas)
 * - Elementor (templates, widgets)
 * - Imágenes y media
 * - Performance y cache
 * - SEO básico
 * - Seguridad
 * - Enlaces y URLs
 *
 * @package Jewelry
 */

// Cargar WordPress
require_once('/var/www/html/wp-load.php');

if (!defined('ABSPATH')) {
    die('No se puede cargar WordPress');
}

// Cargar funciones adicionales necesarias
require_once(ABSPATH . 'wp-admin/includes/update.php');
require_once(ABSPATH . 'wp-admin/includes/plugin.php');
require_once(ABSPATH . 'wp-admin/includes/file.php');

// Colores para terminal
class AuditColors
{
    const SUCCESS = "\033[32m✅\033[0m";
    const ERROR = "\033[31m❌\033[0m";
    const WARNING = "\033[33m⚠️\033[0m";
    const INFO = "\033[36mℹ️\033[0m";
    const HEADER = "\033[1m\033[35m";
    const RESET = "\033[0m";
}

// Contadores
$total_checks = 0;
$passed_checks = 0;
$failed_checks = 0;
$warnings = 0;

function audit_header($title)
{
    echo "\n" . str_repeat("=", 70) . "\n";
    echo AuditColors::HEADER . "  $title" . AuditColors::RESET . "\n";
    echo str_repeat("=", 70) . "\n\n";
}

function audit_check($label, $condition, $success_msg = '', $fail_msg = '', $is_warning = false)
{
    global $total_checks, $passed_checks, $failed_checks, $warnings;

    $total_checks++;

    if ($condition) {
        $passed_checks++;
        echo AuditColors::SUCCESS . " $label";
        if ($success_msg) echo ": $success_msg";
        echo "\n";
        return true;
    } else {
        if ($is_warning) {
            $warnings++;
            echo AuditColors::WARNING . " $label";
        } else {
            $failed_checks++;
            echo AuditColors::ERROR . " $label";
        }
        if ($fail_msg) echo ": $fail_msg";
        echo "\n";
        return false;
    }
}

function audit_info($message)
{
    echo AuditColors::INFO . " $message\n";
}

echo "\n";
echo str_repeat("█", 70) . "\n";
echo "███  AUDITORÍA COMPLETA DEL SITIO - JEWELRY MIAMI  ███\n";
echo str_repeat("█", 70) . "\n";

// ============================================
// 1. BASE DE DATOS Y CONECTIVIDAD
// ============================================
audit_header("1. BASE DE DATOS Y CONECTIVIDAD");

global $wpdb;

// Verificar conexión DB
audit_check(
    "Conexión a base de datos",
    $wpdb->check_connection(),
    "Conectado correctamente",
    "Error de conexión a MySQL"
);

// Verificar charset
$charset = $wpdb->get_var("SELECT @@character_set_database");
audit_check(
    "Charset de base de datos",
    in_array($charset, ['utf8mb4', 'utf8']),
    "UTF-8 configurado ($charset)",
    "Charset incorrecto: $charset",
    true
);

// Verificar tamaño de DB
$db_size = $wpdb->get_var("
    SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2)
    FROM information_schema.TABLES
    WHERE table_schema = DATABASE()
");
audit_info("Tamaño de base de datos: {$db_size} MB");

// Verificar tablas
$tables = $wpdb->get_results("SHOW TABLES", ARRAY_N);
$table_count = count($tables);
audit_check(
    "Tablas de WordPress",
    $table_count >= 12,
    "$table_count tablas encontradas",
    "Solo $table_count tablas (esperadas ≥12)"
);

// Verificar tablas críticas
$critical_tables = ['posts', 'postmeta', 'users', 'options', 'terms', 'term_taxonomy'];
foreach ($critical_tables as $table) {
    $exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}{$table}'");
    audit_check(
        "Tabla {$wpdb->prefix}{$table}",
        !empty($exists),
        "Existe",
        "NO EXISTE - CRÍTICO"
    );
}

// ============================================
// 2. WORDPRESS CORE
// ============================================
audit_header("2. WORDPRESS CORE");

$wp_version = get_bloginfo('version');
audit_check(
    "Versión de WordPress",
    version_compare($wp_version, '6.0', '>='),
    "v{$wp_version}",
    "Versión antigua: v{$wp_version}",
    true
);

// Verificar actualizaciones
$updates = get_core_updates();
$needs_update = !empty($updates) && isset($updates[0]->response) && $updates[0]->response == 'upgrade';
audit_check(
    "Actualizaciones disponibles",
    !$needs_update,
    "WordPress actualizado",
    "Hay actualizaciones disponibles",
    true
);

// Verificar debug mode
audit_check(
    "Modo debug",
    !WP_DEBUG,
    "Desactivado (producción)",
    "ACTIVADO - Desactivar en producción",
    true
);

// Verificar memoria PHP
$memory_limit = ini_get('memory_limit');
$memory_numeric = (int) $memory_limit;
audit_check(
    "Límite de memoria PHP",
    $memory_numeric >= 256,
    "{$memory_limit}",
    "{$memory_limit} - Recomendado: 256M o más",
    true
);

// Verificar uploads directory
$upload_dir = wp_upload_dir();
audit_check(
    "Directorio de uploads",
    $upload_dir['error'] === false,
    $upload_dir['basedir'],
    $upload_dir['error']
);

audit_check(
    "Directorio escribible",
    is_writable($upload_dir['basedir']),
    "Permisos correctos",
    "Sin permisos de escritura"
);

// Verificar permalinks
$permalink_structure = get_option('permalink_structure');
audit_check(
    "Estructura de permalinks",
    !empty($permalink_structure),
    $permalink_structure,
    "Permalinks por defecto (?p=123) - Cambiar a pretty permalinks",
    true
);

// ============================================
// 3. PLUGINS
// ============================================
audit_header("3. PLUGINS");

$active_plugins = get_option('active_plugins');
$all_plugins = get_plugins();

audit_info("Plugins activos: " . count($active_plugins));
audit_info("Plugins totales: " . count($all_plugins));

// Verificar plugins críticos
$critical_plugins = [
    'woocommerce' => 'WooCommerce',
    'elementor' => 'Elementor',
    'translatepress-multilingual' => 'TranslatePress'
];

foreach ($critical_plugins as $slug => $name) {
    $is_active = false;
    foreach ($active_plugins as $plugin) {
        if (strpos($plugin, $slug) !== false) {
            $is_active = true;
            break;
        }
    }
    audit_check(
        "Plugin $name",
        $is_active,
        "Activado",
        "NO activado - CRÍTICO"
    );
}

// Verificar versiones de plugins activos
foreach ($active_plugins as $plugin) {
    if (isset($all_plugins[$plugin])) {
        $plugin_data = $all_plugins[$plugin];
        $version = $plugin_data['Version'];
        $name = $plugin_data['Name'];
        audit_info("  • $name: v{$version}");
    }
}

// Verificar actualizaciones de plugins
$plugin_updates = get_site_transient('update_plugins');
if (!empty($plugin_updates->response)) {
    audit_check(
        "Actualizaciones de plugins",
        false,
        "",
        count($plugin_updates->response) . " plugins con actualizaciones disponibles",
        true
    );
} else {
    audit_check(
        "Actualizaciones de plugins",
        true,
        "Todos actualizados"
    );
}

// ============================================
// 4. TEMA ASTRA
// ============================================
audit_header("4. TEMA ASTRA");

$theme = wp_get_theme();
audit_check(
    "Tema activo",
    $theme->get('Name') === 'Astra',
    "Astra v" . $theme->get('Version'),
    "Tema incorrecto: " . $theme->get('Name')
);

// Verificar colores globales
$astra_settings = get_option('astra-settings', []);
$colors_configured = 0;
for ($i = 0; $i <= 8; $i++) {
    if (isset($astra_settings["global-color-{$i}"]) && !empty($astra_settings["global-color-{$i}"])) {
        $colors_configured++;
    }
}
audit_check(
    "Colores globales configurados",
    $colors_configured >= 9,
    "$colors_configured/9 colores",
    "Solo $colors_configured/9 colores - Ejecutar restore-css-depth.php"
);

// Verificar CSS custom
$custom_css = get_option('astra_theme_custom_css', '');
$css_size = strlen($custom_css);
audit_check(
    "CSS personalizado",
    $css_size > 5000,
    number_format($css_size) . " bytes",
    "Solo {$css_size} bytes - CSS faltante o borrado"
);

// Verificar configuración WooCommerce de Astra
$shop_grids = isset($astra_settings['shop-grids']) ? $astra_settings['shop-grids'] : null;
audit_check(
    "Grid de tienda configurado",
    !empty($shop_grids),
    json_encode($shop_grids),
    "Grid no configurado",
    true
);

// ============================================
// 5. WOOCOMMERCE
// ============================================
audit_header("5. WOOCOMMERCE");

// Verificar si WooCommerce está activo
if (!class_exists('WooCommerce')) {
    audit_check("WooCommerce", false, "", "NO instalado o activado");
} else {
    $wc_version = WC()->version;
    audit_check(
        "Versión WooCommerce",
        version_compare($wc_version, '8.0', '>='),
        "v{$wc_version}",
        "Versión antigua: v{$wc_version}",
        true
    );

    // Contar productos
    $product_count = wp_count_posts('product');
    $published_products = $product_count->publish ?? 0;
    audit_info("Productos publicados: $published_products");

    audit_check(
        "Productos en tienda",
        $published_products > 0,
        "$published_products productos",
        "No hay productos publicados"
    );

    // Productos sin precio
    $products_no_price = $wpdb->get_var("
        SELECT COUNT(DISTINCT p.ID)
        FROM {$wpdb->posts} p
        WHERE p.post_type = 'product'
        AND p.post_status = 'publish'
        AND NOT EXISTS (
            SELECT 1 FROM {$wpdb->postmeta} pm
            WHERE pm.post_id = p.ID
            AND pm.meta_key = '_price'
            AND pm.meta_value != ''
        )
    ");

    audit_check(
        "Productos con precio",
        $products_no_price == 0,
        "Todos tienen precio",
        "$products_no_price productos SIN PRECIO - No se pueden vender"
    );

    // Productos sin imagen
    $products_no_image = $wpdb->get_var("
        SELECT COUNT(DISTINCT p.ID)
        FROM {$wpdb->posts} p
        WHERE p.post_type = 'product'
        AND p.post_status = 'publish'
        AND NOT EXISTS (
            SELECT 1 FROM {$wpdb->postmeta} pm
            WHERE pm.post_id = p.ID
            AND pm.meta_key = '_thumbnail_id'
            AND pm.meta_value != ''
        )
    ");

    audit_check(
        "Productos con imagen destacada",
        $products_no_image == 0,
        "Todos tienen imagen",
        "$products_no_image productos sin imagen destacada",
        true
    );

    // Productos sin descripción
    $products_no_desc = $wpdb->get_var("
        SELECT COUNT(*)
        FROM {$wpdb->posts}
        WHERE post_type = 'product'
        AND post_status = 'publish'
        AND (post_content = '' OR post_content IS NULL)
    ");

    audit_check(
        "Productos con descripción",
        $products_no_desc == 0,
        "Todos tienen descripción",
        "$products_no_desc productos sin descripción",
        true
    );

    // Categorías de productos
    $product_cats = get_terms(['taxonomy' => 'product_cat', 'hide_empty' => false]);
    $cat_count = count($product_cats);
    audit_check(
        "Categorías de productos",
        $cat_count > 0,
        "$cat_count categorías",
        "No hay categorías creadas",
        true
    );

    // Productos sin categoría
    $products_no_cat = $wpdb->get_var("
        SELECT COUNT(DISTINCT p.ID)
        FROM {$wpdb->posts} p
        WHERE p.post_type = 'product'
        AND p.post_status = 'publish'
        AND NOT EXISTS (
            SELECT 1 FROM {$wpdb->term_relationships} tr
            INNER JOIN {$wpdb->term_taxonomy} tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
            WHERE tr.object_id = p.ID
            AND tt.taxonomy = 'product_cat'
        )
    ");

    audit_check(
        "Productos categorizados",
        $products_no_cat == 0,
        "Todos tienen categoría",
        "$products_no_cat productos sin categoría",
        true
    );

    // Verificar página de tienda
    $shop_page_id = wc_get_page_id('shop');
    audit_check(
        "Página de tienda",
        $shop_page_id > 0,
        "ID: $shop_page_id",
        "Página de tienda no configurada"
    );

    // Verificar métodos de pago
    $payment_gateways = WC()->payment_gateways->get_available_payment_gateways();
    $payment_count = count($payment_gateways);
    audit_check(
        "Métodos de pago",
        $payment_count > 0,
        "$payment_count métodos activos",
        "No hay métodos de pago configurados",
        true
    );

    // Verificar zonas de envío
    $shipping_zones = WC_Shipping_Zones::get_zones();
    $zone_count = count($shipping_zones);
    audit_check(
        "Zonas de envío",
        $zone_count > 0,
        "$zone_count zonas configuradas",
        "No hay zonas de envío configuradas",
        true
    );

    // Verificar moneda
    $currency = get_woocommerce_currency();
    audit_info("Moneda: $currency");
}

// ============================================
// 6. TRANSLATEPRESS
// ============================================
audit_header("6. TRANSLATEPRESS (MULTIIDIOMA)");

$trp_settings = get_option('trp_settings', []);
$trp_active = !empty($trp_settings);

audit_check(
    "TranslatePress configurado",
    $trp_active,
    "Configuración encontrada",
    "No configurado"
);

if ($trp_active) {
    $default_language = $trp_settings['default-language'] ?? '';
    $translation_languages = $trp_settings['translation-languages'] ?? [];

    audit_info("Idioma principal: $default_language");
    audit_info("Idiomas adicionales: " . implode(', ', $translation_languages));

    audit_check(
        "Idiomas configurados",
        count($translation_languages) >= 1,
        count($translation_languages) . " idiomas adicionales",
        "Solo idioma principal configurado"
    );

    // Verificar tablas de traducción
    $trp_tables = ['dictionary', 'gettext'];
    foreach ($trp_tables as $table) {
        foreach ($translation_languages as $lang) {
            $table_name = $wpdb->prefix . 'trp_' . $table . '_' . $lang . '_' . $default_language;
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$table_name'");
            audit_check(
                "Tabla traducción $lang",
                !empty($exists),
                $table_name,
                "Tabla no existe",
                true
            );
        }
    }

    // Contar traducciones
    foreach ($translation_languages as $lang) {
        $table_name = $wpdb->prefix . 'trp_dictionary_' . $lang . '_' . $default_language;
        $translation_count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE status != 0");
        audit_info("  Traducciones $lang: $translation_count entradas");
    }
}

// ============================================
// 7. ELEMENTOR
// ============================================
audit_header("7. ELEMENTOR");

if (!class_exists('\Elementor\Plugin')) {
    audit_check("Elementor", false, "", "NO instalado o activado");
} else {
    $elementor_version = ELEMENTOR_VERSION;
    audit_check(
        "Versión Elementor",
        version_compare($elementor_version, '3.0', '>='),
        "v{$elementor_version}",
        "Versión antigua: v{$elementor_version}",
        true
    );

    // Contar páginas con Elementor
    $elementor_pages = $wpdb->get_var("
        SELECT COUNT(*)
        FROM {$wpdb->postmeta}
        WHERE meta_key = '_elementor_edit_mode'
        AND meta_value = 'builder'
    ");

    audit_info("Páginas con Elementor: $elementor_pages");

    // Verificar cache de CSS de Elementor
    $elementor_css_dir = WP_CONTENT_DIR . '/uploads/elementor/css/';
    if (is_dir($elementor_css_dir)) {
        $css_files = glob($elementor_css_dir . '*.css');
        audit_info("Archivos CSS de Elementor: " . count($css_files));
    }
}

// ============================================
// 8. IMÁGENES Y MEDIA
// ============================================
audit_header("8. IMÁGENES Y MEDIA");

// Contar archivos en media library
$attachment_count = wp_count_posts('attachment');
$total_attachments = $attachment_count->inherit ?? 0;
audit_info("Total de archivos en media library: $total_attachments");

// Verificar imágenes de productos
$product_images = $wpdb->get_var("
    SELECT COUNT(DISTINCT pm.meta_value)
    FROM {$wpdb->postmeta} pm
    INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
    WHERE p.post_type = 'product'
    AND p.post_status = 'publish'
    AND pm.meta_key = '_thumbnail_id'
    AND pm.meta_value != ''
");
audit_info("Imágenes destacadas de productos: $product_images");

// Verificar tamaño de uploads
$upload_dir = wp_upload_dir();
$upload_path = $upload_dir['basedir'];

if (is_dir($upload_path)) {
    $size_cmd = "du -sm " . escapeshellarg($upload_path) . " 2>/dev/null | cut -f1";
    $upload_size = (int) shell_exec($size_cmd);
    audit_info("Tamaño de uploads: {$upload_size} MB");

    audit_check(
        "Espacio en uploads",
        $upload_size < 5000,
        "{$upload_size} MB",
        "{$upload_size} MB - Considera optimizar imágenes",
        true
    );
}

// Verificar imágenes huérfanas
$orphan_images = $wpdb->get_var("
    SELECT COUNT(*)
    FROM {$wpdb->posts} p
    WHERE p.post_type = 'attachment'
    AND p.post_parent = 0
    AND p.post_mime_type LIKE 'image/%'
");
audit_check(
    "Imágenes sin asignar",
    $orphan_images < 50,
    "$orphan_images imágenes",
    "$orphan_images imágenes huérfanas - Considera limpiar",
    true
);

// Verificar tamaños de imagen registrados
$image_sizes = get_intermediate_image_sizes();
audit_info("Tamaños de imagen registrados: " . count($image_sizes));

// ============================================
// 9. PERFORMANCE Y CACHE
// ============================================
audit_header("9. PERFORMANCE Y CACHE");

// Verificar opciones autoload
$autoload_size = $wpdb->get_var("
    SELECT SUM(LENGTH(option_value))
    FROM {$wpdb->options}
    WHERE autoload = 'yes'
");
$autoload_mb = round($autoload_size / 1024 / 1024, 2);
audit_check(
    "Tamaño de autoload",
    $autoload_mb < 1,
    "{$autoload_mb} MB",
    "{$autoload_mb} MB - Optimizar opciones autoload (recomendado <1MB)",
    true
);

// Verificar transients
$transient_count = $wpdb->get_var("
    SELECT COUNT(*)
    FROM {$wpdb->options}
    WHERE option_name LIKE '_transient_%'
");
audit_info("Transients en DB: $transient_count");

// Verificar revisiones de posts
$revision_count = $wpdb->get_var("
    SELECT COUNT(*)
    FROM {$wpdb->posts}
    WHERE post_type = 'revision'
");
audit_check(
    "Revisiones de posts",
    $revision_count < 1000,
    "$revision_count revisiones",
    "$revision_count revisiones - Considera limpiar",
    true
);

// Verificar spam comments
$spam_count = $wpdb->get_var("
    SELECT COUNT(*)
    FROM {$wpdb->comments}
    WHERE comment_approved = 'spam'
");
if ($spam_count > 0) {
    audit_check(
        "Comentarios spam",
        false,
        "",
        "$spam_count comentarios spam - Limpiar",
        true
    );
}

// ============================================
// 10. SEO BÁSICO
// ============================================
audit_header("10. SEO BÁSICO");

// Verificar título del sitio
$site_title = get_bloginfo('name');
audit_check(
    "Título del sitio",
    !empty($site_title) && $site_title !== 'WordPress',
    "\"{$site_title}\"",
    "Título por defecto o vacío"
);

// Verificar descripción
$site_description = get_bloginfo('description');
audit_check(
    "Descripción del sitio",
    !empty($site_description),
    "\"{$site_description}\"",
    "Sin descripción",
    true
);

// Verificar visibilidad en buscadores
$blog_public = get_option('blog_public');
audit_check(
    "Visibilidad en buscadores",
    $blog_public == 1,
    "Visible para buscadores",
    "Bloqueado para buscadores - Cambiar en Ajustes > Lectura"
);

// Verificar plugin SEO
$seo_plugins = ['wordpress-seo', 'all-in-one-seo-pack', 'seo-by-rank-math'];
$has_seo_plugin = false;
foreach ($seo_plugins as $seo_plugin) {
    foreach ($active_plugins as $plugin) {
        if (strpos($plugin, $seo_plugin) !== false) {
            $has_seo_plugin = true;
            break 2;
        }
    }
}
audit_check(
    "Plugin SEO",
    $has_seo_plugin,
    "Plugin SEO instalado",
    "No hay plugin SEO - Considera Yoast SEO o Rank Math",
    true
);

// Verificar sitemap
$sitemap_exists = false;
$sitemap_urls = [
    home_url('sitemap.xml'),
    home_url('sitemap_index.xml'),
    home_url('wp-sitemap.xml')
];
foreach ($sitemap_urls as $url) {
    $response = wp_remote_head($url);
    if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) == 200) {
        $sitemap_exists = true;
        break;
    }
}
audit_check(
    "Sitemap XML",
    $sitemap_exists,
    "Sitemap disponible",
    "No se encontró sitemap",
    true
);

// ============================================
// 11. SEGURIDAD BÁSICA
// ============================================
audit_header("11. SEGURIDAD BÁSICA");

// Verificar versión de PHP
$php_version = phpversion();
audit_check(
    "Versión de PHP",
    version_compare($php_version, '7.4', '>='),
    "PHP {$php_version}",
    "PHP {$php_version} - Actualizar a PHP 8.0+",
    version_compare($php_version, '8.0', '<')
);

// Verificar usuario admin
$admin_user = get_user_by('login', 'admin');
audit_check(
    "Usuario 'admin'",
    !$admin_user,
    "No existe usuario 'admin'",
    "Existe usuario 'admin' - Cambiar nombre de usuario",
    true
);

// Verificar file editing
audit_check(
    "Edición de archivos",
    defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT,
    "Deshabilitada (recomendado)",
    "Habilitada - Deshabilitar con DISALLOW_FILE_EDIT",
    true
);

// Verificar table prefix
audit_check(
    "Prefijo de tablas",
    $wpdb->prefix !== 'wp_',
    "Prefijo personalizado: {$wpdb->prefix}",
    "Prefijo por defecto 'wp_' - Cambiar en instalaciones nuevas",
    true
);

// Verificar SSL
audit_check(
    "HTTPS configurado",
    is_ssl() || strpos(home_url(), 'https://') === 0,
    "SSL habilitado",
    "Sin SSL - Habilitar certificado HTTPS",
    true
);

// ============================================
// 12. URLS Y ENLACES
// ============================================
audit_header("12. URLS Y ENLACES");

// Verificar páginas principales
$pages_to_check = [
    'shop' => 'Tienda',
    'cart' => 'Carrito',
    'checkout' => 'Checkout',
    'myaccount' => 'Mi cuenta'
];

foreach ($pages_to_check as $page_key => $page_name) {
    if (function_exists('wc_get_page_id')) {
        $page_id = wc_get_page_id($page_key);
        $page_status = get_post_status($page_id);
        audit_check(
            "Página de $page_name",
            $page_status === 'publish',
            "Publicada (ID: $page_id)",
            "No publicada o no existe",
            true
        );
    }
}

// Verificar home URL vs site URL
$home_url = get_option('home');
$site_url = get_option('siteurl');
audit_check(
    "URLs consistentes",
    $home_url === $site_url,
    "home_url = site_url",
    "home_url ≠ site_url - Verificar configuración",
    true
);

// ============================================
// 13. ERRORES DE PHP
// ============================================
audit_header("13. ERRORES DE PHP");

// Verificar error_log
$error_log = ini_get('error_log');
if ($error_log && file_exists($error_log)) {
    $error_log_size = filesize($error_log);
    $error_log_mb = round($error_log_size / 1024 / 1024, 2);
    audit_check(
        "Log de errores PHP",
        $error_log_mb < 10,
        "{$error_log_mb} MB",
        "{$error_log_mb} MB - Revisar errores",
        true
    );
} else {
    audit_info("Log de errores PHP: No configurado o no accesible");
}

// ============================================
// 14. CRON JOBS
// ============================================
audit_header("14. CRON JOBS");

$cron_jobs = _get_cron_array();
$cron_count = 0;
foreach ($cron_jobs as $timestamp => $cron) {
    $cron_count += count($cron);
}
audit_info("Tareas programadas: $cron_count");

// Verificar que WP-Cron esté funcionando
$doing_cron = get_transient('doing_cron');
audit_check(
    "WP-Cron",
    !$doing_cron || (time() - $doing_cron > 300),
    "Funcionando correctamente",
    "Posible problema con cron",
    true
);

// ============================================
// RESUMEN FINAL
// ============================================
audit_header("RESUMEN DE AUDITORÍA");

$success_rate = ($passed_checks / $total_checks) * 100;

echo "\n";
echo "Total de verificaciones: $total_checks\n";
echo AuditColors::SUCCESS . " Pasadas: $passed_checks\n";
echo AuditColors::ERROR . " Fallidas: $failed_checks\n";
echo AuditColors::WARNING . " Advertencias: $warnings\n";
echo "\n";

$status = "";
if ($success_rate >= 90) {
    $status = AuditColors::SUCCESS . " EXCELENTE";
} elseif ($success_rate >= 75) {
    $status = AuditColors::WARNING . " BUENO (mejorable)";
} else {
    $status = AuditColors::ERROR . " REQUIERE ATENCIÓN";
}

echo "Estado general: $status\n";
echo "Tasa de éxito: " . number_format($success_rate, 1) . "%\n";
echo "\n";

// Recomendaciones prioritarias
if ($failed_checks > 0 || $warnings > 5) {
    echo str_repeat("-", 70) . "\n";
    echo "🎯 ACCIONES PRIORITARIAS:\n";
    echo str_repeat("-", 70) . "\n\n";

    if ($failed_checks > 0) {
        echo AuditColors::ERROR . " Resolver $failed_checks problemas críticos\n";
    }
    if ($warnings > 5) {
        echo AuditColors::WARNING . " Revisar $warnings advertencias\n";
    }
}

echo "\n";
echo str_repeat("█", 70) . "\n";
echo "███  AUDITORÍA COMPLETADA  ███\n";
echo str_repeat("█", 70) . "\n\n";
