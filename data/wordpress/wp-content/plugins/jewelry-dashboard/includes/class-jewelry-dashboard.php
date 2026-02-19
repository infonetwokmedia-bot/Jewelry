<?php
/**
 * Main Dashboard class — registers admin menu, enqueues assets, renders page.
 *
 * @package Jewelry_Dashboard
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class Jewelry_Dashboard
 */
class Jewelry_Dashboard {

    /**
     * Singleton instance.
     *
     * @var Jewelry_Dashboard|null
     */
    private static $instance = null;

    /**
     * API handler.
     *
     * @var Jewelry_API
     */
    public $api;

    /**
     * Export handler.
     *
     * @var Jewelry_Export
     */
    public $export;

    /**
     * Get singleton instance.
     *
     * @return Jewelry_Dashboard
     */
    public static function instance() {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor — hook everything.
     */
    private function __construct() {
        $this->api    = new Jewelry_API();
        $this->export = new Jewelry_Export();

        add_action( 'admin_menu', array( $this, 'register_menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );

        // AJAX endpoints.
        add_action( 'wp_ajax_jewd_get_products', array( $this->api, 'ajax_get_products' ) );
        add_action( 'wp_ajax_jewd_get_stats', array( $this->api, 'ajax_get_stats' ) );
        add_action( 'wp_ajax_jewd_export_csv', array( $this->export, 'ajax_export_csv' ) );
        add_action( 'wp_ajax_jewd_export_json', array( $this->export, 'ajax_export_json' ) );
    }

    /**
     * Register the admin menu page.
     */
    public function register_menu() {
        add_menu_page(
            __( 'Jewelry Dashboard', 'jewelry-dashboard' ),
            __( 'Jewelry Dashboard', 'jewelry-dashboard' ),
            'manage_woocommerce',
            'jewelry-dashboard',
            array( $this, 'render_dashboard' ),
            'dashicons-diamond',
            56
        );
    }

    /**
     * Enqueue CSS and JS only on our dashboard page.
     *
     * @param string $hook_suffix The current admin page hook.
     */
    public function enqueue_assets( $hook_suffix ) {
        if ( 'toplevel_page_jewelry-dashboard' !== $hook_suffix ) {
            return;
        }

        wp_enqueue_style(
            'jewd-dashboard',
            JEWD_ASSETS_URL . 'css/dashboard.css',
            array(),
            JEWD_VERSION
        );

        wp_enqueue_script(
            'jewd-dashboard',
            JEWD_ASSETS_URL . 'js/dashboard.js',
            array( 'jquery' ),
            JEWD_VERSION,
            true
        );

        wp_localize_script( 'jewd-dashboard', 'jewdData', array(
            'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
            'nonce'    => wp_create_nonce( 'jewd_nonce' ),
            'adminUrl' => admin_url(),
            'siteUrl'  => home_url(),
        ) );
    }

    /**
     * Render the dashboard page (loads the view template).
     */
    public function render_dashboard() {
        // Security check.
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( esc_html__( 'No tienes permisos para acceder a esta página.', 'jewelry-dashboard' ) );
        }
        include JEWD_PLUGIN_DIR . 'admin/views/dashboard-page.php';
    }
}
