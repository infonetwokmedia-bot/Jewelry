<?php

/**
 * Plugin Name: Jewelry Sales API
 * Description: REST API for sales reporting from the Tu Joyita Miami Dashboard
 *              SPA. Provides stats, by-seller breakdown, and today's orders.
 * Version: 2.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry_API_Sales
 *
 * Split from the original jewelry-roles.php monolith (#49).
 * Dependencies (loaded by other mu-plugins in the same request):
 *   - jewelry_authenticate_dashboard_token() — from jewelry-auth.php
 *   - jewelry_authenticate_api_request()     — from jewelry-auth.php
 *   - jewelry_period_boundary_utc()          — defined in this file
 */

if (! defined('ABSPATH')) {
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES REST ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'jewelry_register_sales_api');

/**
 * Register sales REST routes.
 */
function jewelry_register_sales_api()
{
    // GET /jewd/v1/sales/stats — Sales totals (today, week, month)
    register_rest_route(
        'jewd/v1',
        '/sales/stats',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_get_sales_stats',
            'permission_callback' => 'jewelry_api_can_view_sales',
        )
    );

    // GET /jewd/v1/sales/by-seller — Sales grouped by seller (admin/manager)
    // Requires manage_woocommerce or manage_options capability
    register_rest_route(
        'jewd/v1',
        '/sales/by-seller',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_get_sales_by_seller',
            'permission_callback' => 'jewelry_api_can_manage_sales', // checks manage_woocommerce / manage_options
        )
    );

    // GET /jewd/v1/sales/today — Today's individual orders for POS panel
    register_rest_route(
        'jewd/v1',
        '/sales/today',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_get_sales_today',
            'permission_callback' => 'jewelry_api_can_view_sales',
        )
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Permission: any authenticated dashboard user can view sales stats.
 */
function jewelry_api_can_view_sales()
{
    $user = jewelry_authenticate_dashboard_token();
    if (is_wp_error($user)) {
        // Fallback: validate WC API keys against database
        $user = jewelry_authenticate_api_request();
        if (is_wp_error($user)) {
            return false;
        }
        return user_can($user, 'jewelry_dashboard_access') || user_can($user, 'manage_options');
    }
    return user_can($user, 'jewelry_dashboard_access') || user_can($user, 'manage_options');
}

/**
 * Permission: only admin/manager can view sales by seller.
 */
function jewelry_api_can_manage_sales()
{
    $user = jewelry_authenticate_dashboard_token();
    if (is_wp_error($user)) {
        // Fallback: validate WC API keys against database
        $user = jewelry_authenticate_api_request();
        if (is_wp_error($user)) {
            return false;
        }
        return user_can($user, 'manage_options') || user_can($user, 'manage_woocommerce');
    }
    return user_can($user, 'manage_options') || user_can($user, 'manage_woocommerce');
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE/TIME HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert a period boundary to UTC for database queries against date_created_gmt.
 *
 * WordPress stores order dates in UTC (date_created_gmt). To find "today"
 * in the store's local timezone (America/New_York), we calculate midnight
 * in that timezone and convert to UTC. Without this, after 7-8 PM Miami
 * time UTC already rolls over to the next day.
 *
 * @param string $period 'today', 'week', or 'month'.
 * @return string UTC datetime string (Y-m-d H:i:s).
 */
function jewelry_period_boundary_utc($period = 'today')
{
    $tz  = wp_timezone();
    $utc = new DateTimeZone('UTC');
    $now = new DateTimeImmutable('now', $tz);

    switch ($period) {
        case 'today':
            $local = new DateTimeImmutable($now->format('Y-m-d') . ' 00:00:00', $tz);
            break;
        case 'week':
            // Monday of current week in local time.
            $monday = new DateTimeImmutable('monday this week', $tz);
            $local  = new DateTimeImmutable($monday->format('Y-m-d') . ' 00:00:00', $tz);
            break;
        case 'month':
            $local = new DateTimeImmutable($now->format('Y-m-01') . ' 00:00:00', $tz);
            break;
        default:
            $local = new DateTimeImmutable($now->format('Y-m-d') . ' 00:00:00', $tz);
            break;
    }

    return $local->setTimezone($utc)->format('Y-m-d H:i:s');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES QUERY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query sales for a given period, optionally filtered by _pos_seller.
 *
 * @param string $since     Date string (Y-m-d H:i:s) in UTC.
 * @param string $seller    Optional seller username.
 * @return array { total, count, items }
 */
function jewelry_query_sales_period($since, $seller = '')
{
    global $wpdb;

    // Use HPOS tables (wp_wc_orders) if available, else wp_posts
    $orders_table = $wpdb->prefix . 'wc_orders';
    $meta_table   = $wpdb->prefix . 'wc_orders_meta';

    $use_hpos = $wpdb->get_var("SHOW TABLES LIKE '{$orders_table}'") === $orders_table;

    if ($use_hpos) {
        // HPOS path
        $sql = "SELECT COALESCE(SUM(o.total_amount), 0) as total,
                       COUNT(o.id) as count
                FROM {$orders_table} o";

        $where = array(
            $wpdb->prepare("o.date_created_gmt >= %s", $since),
            "o.status IN ('wc-completed', 'wc-processing')",
            "o.type = 'shop_order'",
        );

        if (! empty($seller)) {
            $sql .= " INNER JOIN {$meta_table} om ON o.id = om.order_id";
            $where[] = "om.meta_key = '_pos_seller'";
            $where[] = $wpdb->prepare("om.meta_value = %s", $seller);
        }

        $sql .= ' WHERE ' . implode(' AND ', $where);
    } else {
        // Legacy path (wp_posts + wp_postmeta)
        $sql = "SELECT COALESCE(SUM(pm_total.meta_value), 0) as total,
                       COUNT(p.ID) as count
                FROM {$wpdb->posts} p
                INNER JOIN {$wpdb->postmeta} pm_total ON p.ID = pm_total.post_id AND pm_total.meta_key = '_order_total'";

        $where = array(
            $wpdb->prepare("p.post_date_gmt >= %s", $since),
            "p.post_status IN ('wc-completed', 'wc-processing')",
            "p.post_type = 'shop_order'",
        );

        if (! empty($seller)) {
            $sql .= " INNER JOIN {$wpdb->postmeta} pm_seller ON p.ID = pm_seller.post_id";
            $where[] = "pm_seller.meta_key = '_pos_seller'";
            $where[] = $wpdb->prepare("pm_seller.meta_value = %s", $seller);
        }

        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    $row = $wpdb->get_row($sql);

    // Count line items (items sold)
    $items = 0;
    if ($row && $row->count > 0) {
        $items_sql = "SELECT COALESCE(SUM(oim.meta_value), 0) as items
                      FROM {$wpdb->prefix}woocommerce_order_items oi
                      INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta oim
                          ON oi.order_item_id = oim.order_item_id AND oim.meta_key = '_qty'
                      WHERE oi.order_item_type = 'line_item'";

        if ($use_hpos) {
            $items_sql .= " AND oi.order_id IN (
                SELECT o.id FROM {$orders_table} o";
            $items_where = array(
                $wpdb->prepare("o.date_created_gmt >= %s", $since),
                "o.status IN ('wc-completed', 'wc-processing')",
                "o.type = 'shop_order'",
            );
            if (! empty($seller)) {
                $items_sql .= " INNER JOIN {$meta_table} om ON o.id = om.order_id";
                $items_where[] = "om.meta_key = '_pos_seller'";
                $items_where[] = $wpdb->prepare("om.meta_value = %s", $seller);
            }
            $items_sql .= ' WHERE ' . implode(' AND ', $items_where) . ')';
        } else {
            $items_sql .= " AND oi.order_id IN (
                SELECT p.ID FROM {$wpdb->posts} p";
            $items_where = array(
                $wpdb->prepare("p.post_date_gmt >= %s", $since),
                "p.post_status IN ('wc-completed', 'wc-processing')",
                "p.post_type = 'shop_order'",
            );
            if (! empty($seller)) {
                $items_sql .= " INNER JOIN {$wpdb->postmeta} pm_seller ON p.ID = pm_seller.post_id";
                $items_where[] = "pm_seller.meta_key = '_pos_seller'";
                $items_where[] = $wpdb->prepare("pm_seller.meta_value = %s", $seller);
            }
            $items_sql .= ' WHERE ' . implode(' AND ', $items_where) . ')';
        }

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $items_row = $wpdb->get_row($items_sql);
        $items = $items_row ? intval($items_row->items) : 0;
    }

    return array(
        'total' => round(floatval($row->total), 2),
        'count' => intval($row->count),
        'items' => $items,
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /jewd/v1/sales/stats
 *
 * Returns sales totals for today, week, and month.
 * Accepts optional ?seller=username to filter by _pos_seller.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function jewelry_get_sales_stats($request)
{
    global $wpdb;

    $seller = sanitize_text_field($request->get_param('seller'));

    // Security: identify the real user via JWT token (wp_get_current_user
    // returns ID=0 when authenticated via WC API keys).
    $auth_user = jewelry_authenticate_dashboard_token();
    if (! is_wp_error($auth_user) && $auth_user->ID) {
        if (! user_can($auth_user, 'manage_options') && ! user_can($auth_user, 'manage_woocommerce')) {
            // Sellers can only see their own sales — override any param
            $seller = $auth_user->user_login;
        }
    } else {
        // WC API key auth — permission_callback already validated the key.
        // Resolve the user from the validated key for seller filtering.
        $api_user = jewelry_authenticate_api_request();
        if (! is_wp_error($api_user) && $api_user->ID) {
            if (! user_can($api_user, 'manage_options') && ! user_can($api_user, 'manage_woocommerce')) {
                $seller = $api_user->user_login;
            }
        }
    }

    $periods = array(
        'today' => jewelry_period_boundary_utc('today'),
        'week'  => jewelry_period_boundary_utc('week'),
        'month' => jewelry_period_boundary_utc('month'),
    );

    $results = array();

    foreach ($periods as $key => $since) {
        $results[$key] = jewelry_query_sales_period($since, $seller);
    }

    return new \WP_REST_Response($results, 200);
}

/**
 * GET /jewd/v1/sales/by-seller
 *
 * Returns detailed sales data grouped by seller (admin/manager only).
 * Includes display_name, avg ticket, payment method breakdown, and individual orders.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function jewelry_get_sales_by_seller($request)
{
    global $wpdb;

    $period = sanitize_text_field($request->get_param('period')) ?: 'month';

    $since = jewelry_period_boundary_utc($period);

    $orders_table = $wpdb->prefix . 'wc_orders';
    $meta_table   = $wpdb->prefix . 'wc_orders_meta';
    $use_hpos     = $wpdb->get_var("SHOW TABLES LIKE '{$orders_table}'") === $orders_table;

    // Fetch individual orders with seller info for detailed breakdown
    if ($use_hpos) {
        $sql = $wpdb->prepare(
            "SELECT o.id, o.total_amount as total, o.payment_method,
                    o.date_created_gmt as date_created, o.status,
                    om.meta_value as seller
             FROM {$orders_table} o
             INNER JOIN {$meta_table} om ON o.id = om.order_id AND om.meta_key = '_pos_seller'
             WHERE o.date_created_gmt >= %s
               AND o.status IN ('wc-completed', 'wc-processing')
               AND o.type = 'shop_order'
             ORDER BY o.date_created_gmt DESC",
            $since
        );
    } else {
        $sql = $wpdb->prepare(
            "SELECT p.ID as id, pm_total.meta_value as total,
                    pm_method.meta_value as payment_method,
                    p.post_date_gmt as date_created, p.post_status as status,
                    pm_seller.meta_value as seller
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm_seller ON p.ID = pm_seller.post_id AND pm_seller.meta_key = '_pos_seller'
             INNER JOIN {$wpdb->postmeta} pm_total ON p.ID = pm_total.post_id AND pm_total.meta_key = '_order_total'
             LEFT JOIN {$wpdb->postmeta} pm_method ON p.ID = pm_method.post_id AND pm_method.meta_key = '_payment_method'
             WHERE p.post_date_gmt >= %s
               AND p.post_status IN ('wc-completed', 'wc-processing')
               AND p.post_type = 'shop_order'
             ORDER BY p.post_date_gmt DESC",
            $since
        );
    }

    // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    $rows = $wpdb->get_results($sql);

    // Pre-fetch all line item quantities in a single batch query (avoids N+1)
    $qty_map = array();
    if (!empty($rows)) {
        $order_ids = array_map(function ($r) { return intval($r->id); }, $rows);
        $placeholders = implode(',', array_fill(0, count($order_ids), '%d'));
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $qty_sql = $wpdb->prepare(
            "SELECT oi.order_id, COALESCE(SUM(oim.meta_value), 0) as qty
             FROM {$wpdb->prefix}woocommerce_order_items oi
             INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta oim
                 ON oi.order_item_id = oim.order_item_id AND oim.meta_key = '_qty'
             WHERE oi.order_item_type = 'line_item'
               AND oi.order_id IN ($placeholders)
             GROUP BY oi.order_id",
            ...$order_ids
        );
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $qty_rows = $wpdb->get_results($qty_sql);
        foreach ($qty_rows as $qr) {
            $qty_map[intval($qr->order_id)] = intval($qr->qty);
        }
    }

    // Group by seller with detailed breakdown
    $grouped = array();
    foreach ($rows as $row) {
        $seller = $row->seller;
        if (! isset($grouped[$seller])) {
            $grouped[$seller] = array(
                'orders'  => array(),
                'methods' => array(),
            );
        }
        $total  = round(floatval($row->total), 2);
        $method = $row->payment_method ?: 'pos';

        // Get line items count from pre-fetched map
        $qty = isset($qty_map[intval($row->id)]) ? $qty_map[intval($row->id)] : 0;

        $grouped[$seller]['orders'][] = array(
            'id'     => intval($row->id),
            'total'  => $total,
            'qty'    => $qty,
            'method' => $method,
            'time'   => $row->date_created,
        );

        if (! isset($grouped[$seller]['methods'][$method])) {
            $grouped[$seller]['methods'][$method] = array('total' => 0, 'count' => 0);
        }
        $grouped[$seller]['methods'][$method]['total'] += $total;
        $grouped[$seller]['methods'][$method]['count']++;
    }

    // Build response with enriched data
    $sellers = array();
    foreach ($grouped as $username => $data) {
        $order_count = count($data['orders']);
        $total       = array_sum(array_column($data['orders'], 'total'));
        $avg_ticket  = $order_count > 0 ? round($total / $order_count, 2) : 0;
        $total_items = array_sum(array_column($data['orders'], 'qty'));

        // Resolve display_name from WP user
        $wp_user      = get_user_by('login', $username);
        $display_name = $wp_user ? $wp_user->display_name : $username;

        // Payment methods breakdown
        $methods = array();
        foreach ($data['methods'] as $method_name => $method_data) {
            $methods[] = array(
                'method' => $method_name,
                'total'  => round($method_data['total'], 2),
                'count'  => $method_data['count'],
            );
        }

        $sellers[] = array(
            'username'     => $username,
            'display_name' => $display_name,
            'total'        => round($total, 2),
            'count'        => $order_count,
            'items'        => $total_items,
            'avg_ticket'   => $avg_ticket,
            'methods'      => $methods,
            'orders'       => $data['orders'],
        );
    }

    // Sort by total descending
    usort($sellers, function ($a, $b) {
        return $b['total'] <=> $a['total'];
    });

    return new \WP_REST_Response($sellers, 200);
}

/**
 * GET /jewd/v1/sales/today
 *
 * Returns individual orders created today (for POS dashboard panel).
 * Accepts optional ?seller=username to filter by _pos_seller.
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response
 */
function jewelry_get_sales_today($request)
{
    global $wpdb;

    $seller      = sanitize_text_field($request->get_param('seller'));

    // Security: identify the real user via JWT token (wp_get_current_user
    // returns ID=0 when authenticated via WC API keys).
    $auth_user = jewelry_authenticate_dashboard_token();
    if (! is_wp_error($auth_user) && $auth_user->ID) {
        if (! user_can($auth_user, 'manage_options') && ! user_can($auth_user, 'manage_woocommerce')) {
            // Sellers can only see their own sales — override any param
            $seller = $auth_user->user_login;
        }
    } else {
        // WC API key auth — permission_callback already validated the key.
        // Resolve the user from the validated key for seller filtering.
        $api_user = jewelry_authenticate_api_request();
        if (! is_wp_error($api_user) && $api_user->ID) {
            if (! user_can($api_user, 'manage_options') && ! user_can($api_user, 'manage_woocommerce')) {
                $seller = $api_user->user_login;
            }
        }
    }
    $today_start = jewelry_period_boundary_utc('today');

    $orders_table = $wpdb->prefix . 'wc_orders';
    $meta_table   = $wpdb->prefix . 'wc_orders_meta';
    $use_hpos     = $wpdb->get_var("SHOW TABLES LIKE '{$orders_table}'") === $orders_table;

    if ($use_hpos) {
        $sql = "SELECT o.id, o.total_amount as total, o.date_created_gmt as date_created,
                       o.payment_method, o.status
                FROM {$orders_table} o";

        $where = array(
            $wpdb->prepare("o.date_created_gmt >= %s", $today_start),
            "o.status IN ('wc-completed', 'wc-processing')",
            "o.type = 'shop_order'",
        );

        if (! empty($seller)) {
            $sql .= " INNER JOIN {$meta_table} om ON o.id = om.order_id";
            $where[] = "om.meta_key = '_pos_seller'";
            $where[] = $wpdb->prepare("om.meta_value = %s", $seller);
        }

        $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY o.date_created_gmt DESC';
    } else {
        $sql = "SELECT p.ID as id, pm_total.meta_value as total, p.post_date_gmt as date_created,
                       pm_method.meta_value as payment_method, p.post_status as status
                FROM {$wpdb->posts} p
                INNER JOIN {$wpdb->postmeta} pm_total ON p.ID = pm_total.post_id AND pm_total.meta_key = '_order_total'
                LEFT JOIN {$wpdb->postmeta} pm_method ON p.ID = pm_method.post_id AND pm_method.meta_key = '_payment_method'";

        $where = array(
            $wpdb->prepare("p.post_date_gmt >= %s", $today_start),
            "p.post_status IN ('wc-completed', 'wc-processing')",
            "p.post_type = 'shop_order'",
        );

        if (! empty($seller)) {
            $sql .= " INNER JOIN {$wpdb->postmeta} pm_seller ON p.ID = pm_seller.post_id";
            $where[] = "pm_seller.meta_key = '_pos_seller'";
            $where[] = $wpdb->prepare("pm_seller.meta_value = %s", $seller);
        }

        $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY p.post_date_gmt DESC';
    }

    // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    $rows = $wpdb->get_results($sql);

    // Pre-fetch all line item quantities in a single batch query (avoids N+1)
    $qty_map = array();
    $seller_map = array();
    if (!empty($rows)) {
        $order_ids = array_map(function ($r) { return intval($r->id); }, $rows);
        $placeholders = implode(',', array_fill(0, count($order_ids), '%d'));

        // Batch qty query
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $qty_sql = $wpdb->prepare(
            "SELECT oi.order_id, COALESCE(SUM(oim.meta_value), 0) as qty
             FROM {$wpdb->prefix}woocommerce_order_items oi
             INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta oim
                 ON oi.order_item_id = oim.order_item_id AND oim.meta_key = '_qty'
             WHERE oi.order_item_type = 'line_item'
               AND oi.order_id IN ($placeholders)
             GROUP BY oi.order_id",
            ...$order_ids
        );
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $qty_rows = $wpdb->get_results($qty_sql);
        foreach ($qty_rows as $qr) {
            $qty_map[intval($qr->order_id)] = intval($qr->qty);
        }

        // Batch seller lookup (only when not filtering by seller)
        if (empty($seller)) {
            if ($use_hpos) {
                // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
                $seller_sql = $wpdb->prepare(
                    "SELECT order_id, meta_value as seller
                     FROM {$meta_table}
                     WHERE meta_key = '_pos_seller'
                       AND order_id IN ($placeholders)",
                    ...$order_ids
                );
                // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
                $seller_rows = $wpdb->get_results($seller_sql);
                foreach ($seller_rows as $sr) {
                    $seller_map[intval($sr->order_id)] = $sr->seller;
                }
            } else {
                // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
                $seller_sql = $wpdb->prepare(
                    "SELECT post_id as order_id, meta_value as seller
                     FROM {$wpdb->postmeta}
                     WHERE meta_key = '_pos_seller'
                       AND post_id IN ($placeholders)",
                    ...$order_ids
                );
                // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
                $seller_rows = $wpdb->get_results($seller_sql);
                foreach ($seller_rows as $sr) {
                    $seller_map[intval($sr->order_id)] = $sr->seller;
                }
            }
        }
    }

    $orders = array();
    foreach ($rows as $row) {
        $order_id = intval($row->id);

        // Get line items count from pre-fetched map
        $qty = isset($qty_map[$order_id]) ? $qty_map[$order_id] : 0;

        // Get seller from pre-fetched map or filter parameter
        $order_seller = $seller;
        if (empty($order_seller)) {
            $order_seller = isset($seller_map[$order_id]) ? $seller_map[$order_id] : '';
        }

        $orders[] = array(
            'id'     => $order_id,
            'number' => $order_id,
            'total'  => round(floatval($row->total), 2),
            'qty'    => $qty,
            'method' => $row->payment_method ?: 'pos',
            'seller' => $order_seller ?: '',
            'time'   => $row->date_created,
        );
    }

    return new \WP_REST_Response($orders, 200);
}
