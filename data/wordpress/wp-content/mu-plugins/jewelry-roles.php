<?php

/**
 * Plugin Name: Jewelry Roles & Capabilities
 * Description: Custom roles for Tu Joyita Miami — Seller, Viewer, and extra
 *              capabilities for Shop Manager and Administrator.
 *              Also syncs WC order stats for REST-created orders.
 * Version: 2.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry_Roles
 *
 * Split from the original jewelry-roles.php monolith (#49).
 * Related files:
 *   - jewelry-auth.php         — JWT token authentication
 *   - jewelry-api-users.php    — Users REST API
 *   - jewelry-api-sales.php    — Sales REST API
 */

if (! defined('ABSPATH')) {
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES CUSTOM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Registrar roles custom al activar. Se ejecuta en cada carga para asegurar
 * que los roles existan (mu-plugins no tienen activate hook).
 */
add_action('init', 'jewelry_register_custom_roles');

function jewelry_register_custom_roles()
{
    // Solo registrar si aún no existen
    if (get_role('jewelry_seller') && get_role('jewelry_viewer')) {
        return;
    }

    // ── Vendedor ─────────────────────────────────────────────────────────
    // Puede ver productos, crear pedidos manuales, ver inventario.
    // NO puede eliminar productos, cambiar precios, ni gestionar cupones.
    add_role(
        'jewelry_seller',
        __('Vendedor', 'jewelry'),
        array(
            'read'                   => true,
            'edit_posts'             => false,
            'delete_posts'           => false,
            // WooCommerce — Productos (solo lectura)
            'read_product'           => true,
            'edit_product'           => false,
            'delete_product'         => false,
            'edit_products'          => false,
            'publish_products'       => false,
            // WooCommerce — Pedidos (crear y editar propios)
            'edit_shop_order'        => true,
            'read_shop_order'        => true,
            'delete_shop_order'      => false,
            'edit_shop_orders'       => true,
            'publish_shop_orders'    => true,
            'read_private_shop_orders' => true,
            // WooCommerce — sin cupones
            'edit_shop_coupon'       => false,
            'read_shop_coupon'       => false,
            // WooCommerce general
            'view_woocommerce_reports' => false,
            'manage_woocommerce'     => false,
            // Dashboard access
            'jewelry_dashboard_access' => true,
            'jewelry_view_products'    => true,
            'jewelry_create_orders'    => true,
        )
    );

    // ── Consultor / Contador ─────────────────────────────────────────────
    // Solo lectura: reportes, inventario, pedidos. No modifica nada.
    add_role(
        'jewelry_viewer',
        __('Consultor', 'jewelry'),
        array(
            'read'                     => true,
            'edit_posts'               => false,
            'delete_posts'             => false,
            // WooCommerce — solo lectura
            'read_product'             => true,
            'read_shop_order'          => true,
            'read_shop_coupon'         => true,
            'read_private_shop_orders' => true,
            'view_woocommerce_reports' => true,
            // Dashboard access (solo lectura)
            'jewelry_dashboard_access' => true,
            'jewelry_view_products'    => true,
            'jewelry_view_orders'      => true,
            'jewelry_view_reports'     => true,
        )
    );

    // ── Agregar capacidades al Shop Manager existente ────────────────────
    $shop_manager = get_role('shop_manager');
    if ($shop_manager) {
        $shop_manager->add_cap('jewelry_dashboard_access');
        $shop_manager->add_cap('jewelry_view_products');
        $shop_manager->add_cap('jewelry_edit_products');
        $shop_manager->add_cap('jewelry_create_orders');
        $shop_manager->add_cap('jewelry_view_orders');
        $shop_manager->add_cap('jewelry_view_reports');
        $shop_manager->add_cap('jewelry_manage_coupons');
    }

    // ── Agregar capacidades al Administrator ─────────────────────────────
    $admin = get_role('administrator');
    if ($admin) {
        $admin->add_cap('jewelry_dashboard_access');
        $admin->add_cap('jewelry_view_products');
        $admin->add_cap('jewelry_edit_products');
        $admin->add_cap('jewelry_create_orders');
        $admin->add_cap('jewelry_view_orders');
        $admin->add_cap('jewelry_view_reports');
        $admin->add_cap('jewelry_manage_coupons');
        $admin->add_cap('jewelry_manage_users');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORDER STATS AUTO-SYNC (Ticket #15)
// Ensures wp_wc_order_stats is populated when orders are created via REST API.
// ═══════════════════════════════════════════════════════════════════════════════

add_action('woocommerce_new_order', 'jewelry_sync_order_stats', 20, 1);
add_action('woocommerce_order_status_changed', 'jewelry_sync_order_stats', 20, 1);

/**
 * Sync a WC order into the wp_wc_order_stats table used by WC Analytics.
 *
 * HPOS + REST API orders don't always auto-populate this table,
 * causing WC Analytics reports to show $0.
 *
 * @param int $order_id The order ID.
 */
function jewelry_sync_order_stats($order_id)
{
    if (! class_exists('\Automattic\WooCommerce\Admin\API\Reports\Orders\Stats\DataStore')) {
        return;
    }
    try {
        \Automattic\WooCommerce\Admin\API\Reports\Orders\Stats\DataStore::sync_order($order_id);
    } catch (\Exception $e) {
        error_log('jewelry_sync_order_stats error for order ' . $order_id . ': ' . $e->getMessage());
    }
}
