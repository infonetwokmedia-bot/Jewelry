<?php
/**
 * Plugin Name: Jewelry Dashboard
 * Plugin URI:  https://jewelry.local.dev
 * Description: Dashboard profesional para gestión del catálogo WooCommerce de Jewelry Miami.
 * Version:     1.0.0
 * Author:      Jewelry Miami Dev Team
 * Author URI:  https://jewelry.local.dev
 * Text Domain: jewelry-dashboard
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.1
 * WC requires at least: 8.0
 * WC tested up to: 10.5
 *
 * @package Jewelry_Dashboard
 */

defined( 'ABSPATH' ) || exit;

/**
 * Declare compatibility with WooCommerce features (HPOS, etc.).
 */
add_action(
    'before_woocommerce_init',
    function () {
        if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
        }
    }
);

// Plugin constants.
define( 'JEWD_VERSION', '1.0.0' );
define( 'JEWD_PLUGIN_FILE', __FILE__ );
define( 'JEWD_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'JEWD_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'JEWD_ASSETS_URL', JEWD_PLUGIN_URL . 'admin/assets/' );

/**
 * Check if WooCommerce is active before initializing.
 */
function jewd_check_requirements() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', 'jewd_woocommerce_missing_notice' );
        return false;
    }
    return true;
}

/**
 * Admin notice when WooCommerce is not active.
 */
function jewd_woocommerce_missing_notice() {
    ?>
    <div class="notice notice-error">
        <p>
            <strong>Jewelry Dashboard</strong> requiere
            <a href="https://woocommerce.com/" target="_blank">WooCommerce</a>
            para funcionar. Por favor, instala y activa WooCommerce.
        </p>
    </div>
    <?php
}

/**
 * Initialize the plugin after all plugins are loaded.
 */
function jewd_init() {
    if ( ! jewd_check_requirements() ) {
        return;
    }

    require_once JEWD_PLUGIN_DIR . 'includes/class-jewelry-dashboard.php';
    require_once JEWD_PLUGIN_DIR . 'includes/class-jewelry-api.php';
    require_once JEWD_PLUGIN_DIR . 'includes/class-jewelry-export.php';

    Jewelry_Dashboard::instance();
}
add_action( 'plugins_loaded', 'jewd_init' );

/**
 * Activation hook.
 */
function jewd_activate() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        deactivate_plugins( plugin_basename( __FILE__ ) );
        wp_die(
            esc_html__( 'Jewelry Dashboard requiere WooCommerce activo.', 'jewelry-dashboard' ),
            'Plugin Activation Error',
            array( 'back_link' => true )
        );
    }
    // Flush rewrite rules for any custom endpoints.
    flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'jewd_activate' );

/**
 * Deactivation hook.
 */
function jewd_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'jewd_deactivate' );
