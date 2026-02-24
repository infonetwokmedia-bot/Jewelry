<?php

/**
 * Plugin Name: Jewelry Dashboard API
 * Plugin URI:  https://jewelry.local.dev
 * Description: REST API endpoints para estadísticas, media management + CORS para dashboard SPA externo.
 * Version:     3.0.0
 * Author:      Jewelry Miami Dev Team
 * Author URI:  https://jewelry.local.dev
 * Text Domain: jewelry-dashboard
 * Requires at least: 6.0
 * Requires PHP: 8.1
 * WC requires at least: 8.0
 * WC tested up to: 10.5
 *
 * @package Jewelry_Dashboard
 */

defined('ABSPATH') || exit;

/**
 * Declare HPOS + Cart/Checkout Blocks compatibility.
 */
add_action('before_woocommerce_init', function () {
    if (class_exists('\Automattic\WooCommerce\Utilities\FeaturesUtil')) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('cart_checkout_blocks', __FILE__, true);
    }
});

/**
 * Allowed origins for CORS — centralized list.
 *
 * @return array
 */
function jewd_allowed_origins()
{
    return array(
        'https://dashboard.jewelry.local.dev',
        'https://dashboard.jewelry.cubaverso.com',
        'https://dashboard.dev.tujoyita.com',
        'https://dev.tujoyita.com',
    );
}

/**
 * CORS headers for the dashboard SPA.
 * Allows GET, POST, PUT, DELETE for full CRUD from dashboard.
 */
add_action('rest_api_init', function () {
    // Remove default CORS and add our own.
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');

    add_filter('rest_pre_serve_request', function ($value) {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

        if (in_array($origin, jewd_allowed_origins(), true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        } else {
            header('Access-Control-Allow-Origin: https://dashboard.jewelry.local.dev');
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
        header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages');
        header('Access-Control-Allow-Credentials: true');

        return $value;
    });
});

/**
 * Handle CORS preflight OPTIONS requests.
 */
add_action('init', function () {
    if (isset($_SERVER['REQUEST_METHOD']) && 'OPTIONS' === $_SERVER['REQUEST_METHOD']) {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

        if (in_array($origin, jewd_allowed_origins(), true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce');
        header('Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages');
        header('Access-Control-Max-Age: 86400');
        status_header(204);
        exit;
    }
});

/**
 * Register custom REST API route for catalog stats.
 * Endpoint: /wp-json/jewd/v1/stats
 */
add_action('rest_api_init', function () {
    register_rest_route('jewd/v1', '/stats', array(
        'methods'             => 'GET',
        'callback'            => 'jewd_get_catalog_stats',
        'permission_callback' => function () {
            // WC REST API keys handle auth via consumer_key/consumer_secret params.
            // Validate the request has valid WC API credentials.
            if (! empty($_GET['consumer_key']) && ! empty($_GET['consumer_secret'])) {
                return jewd_validate_wc_keys(
                    sanitize_text_field(wp_unslash($_GET['consumer_key'])),
                    sanitize_text_field(wp_unslash($_GET['consumer_secret']))
                );
            }
            // Fallback: require manage_woocommerce capability (logged-in admin).
            return current_user_can('manage_woocommerce');
        },
    ));
});

/**
 * Validate WooCommerce API keys.
 *
 * @param string $consumer_key    The consumer key.
 * @param string $consumer_secret The consumer secret.
 * @return bool
 */
function jewd_validate_wc_keys($consumer_key, $consumer_secret)
{
    global $wpdb;

    $key = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT consumer_secret, permissions FROM {$wpdb->prefix}woocommerce_api_keys WHERE consumer_key = %s",
            wc_api_hash($consumer_key)
        )
    );

    if (! $key) {
        return false;
    }

    return hash_equals($key->consumer_secret, $consumer_secret);
}

/**
 * Calculate and return catalog statistics.
 *
 * @return WP_REST_Response
 */
function jewd_get_catalog_stats()
{
    if (! class_exists('WooCommerce')) {
        return new WP_REST_Response(array('error' => 'WooCommerce not active'), 503);
    }

    $all_products = wc_get_products(array(
        'status' => array('publish', 'draft', 'private'),
        'limit'  => -1,
        'return' => 'ids',
    ));

    $total_products   = 0;
    $total_variable   = 0;
    $total_simple     = 0;
    $total_variations = 0;
    $total_stock      = 0;
    $categories       = array();
    $prices           = array();
    $low_stock_count  = 0;
    $out_of_stock     = 0;
    $total_value      = 0;

    foreach ($all_products as $product_id) {
        $product = wc_get_product($product_id);
        if (! $product) {
            continue;
        }

        $total_products++;
        $ptype = $product->get_type();

        if ('variable' === $ptype) {
            $total_variable++;
            $children = $product->get_children();
            $total_variations += count($children);

            foreach ($children as $child_id) {
                $variation = wc_get_product($child_id);
                if (! $variation) {
                    continue;
                }

                $qty = $variation->get_stock_quantity();
                if (null !== $qty) {
                    $total_stock += max(0, $qty);
                    if ($qty <= 2 && $qty > 0) {
                        $low_stock_count++;
                    }
                    if ($qty <= 0) {
                        $out_of_stock++;
                    }
                    $price       = (float) $variation->get_price();
                    $total_value += $price * max(0, $qty);
                }
                $price = (float) $variation->get_price();
                if ($price > 0) {
                    $prices[] = $price;
                }
            }
        } else {
            $total_simple++;
            $qty = $product->get_stock_quantity();
            if (null !== $qty) {
                $total_stock += max(0, $qty);
                if ($qty <= 2 && $qty > 0) {
                    $low_stock_count++;
                }
                if ($qty <= 0) {
                    $out_of_stock++;
                }
                $price       = (float) $product->get_price();
                $total_value += $price * max(0, $qty);
            }
            $price = (float) $product->get_price();
            if ($price > 0) {
                $prices[] = $price;
            }
        }

        // Categories.
        $terms = get_the_terms($product_id, 'product_cat');
        if ($terms && ! is_wp_error($terms)) {
            foreach ($terms as $term) {
                if (! isset($categories[$term->slug])) {
                    $categories[$term->slug] = array(
                        'name'  => $term->name,
                        'count' => 0,
                    );
                }
                $categories[$term->slug]['count']++;
            }
        }
    }

    return new WP_REST_Response(array(
        'total_products'   => $total_products,
        'total_variable'   => $total_variable,
        'total_simple'     => $total_simple,
        'total_variations' => $total_variations,
        'total_stock'      => $total_stock,
        'categories'       => $categories,
        'min_price'        => ! empty($prices) ? min($prices) : 0,
        'max_price'        => ! empty($prices) ? max($prices) : 0,
        'low_stock'        => $low_stock_count,
        'out_of_stock'     => $out_of_stock,
        'total_value'      => round($total_value, 2),
    ), 200);
}

/* =========================================================================
 * MEDIA MANAGEMENT ENDPOINTS
 * ========================================================================= */

/**
 * Register media upload and delete routes.
 * POST   /wp-json/jewd/v1/media       — upload image
 * DELETE /wp-json/jewd/v1/media/<id>   — delete image
 */
add_action('rest_api_init', function () {

    // Upload image.
    register_rest_route('jewd/v1', '/media', array(
        'methods'             => 'POST',
        'callback'            => 'jewd_upload_media',
        'permission_callback' => 'jewd_media_permission_check',
    ));

    // Delete image.
    register_rest_route('jewd/v1', '/media/(?P<id>\d+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'jewd_delete_media',
        'permission_callback' => 'jewd_media_permission_check',
        'args'                => array(
            'id' => array(
                'validate_callback' => function ($param) {
                    return is_numeric($param);
                },
            ),
        ),
    ));
});

/**
 * Permission check for media endpoints.
 * Validates WC API keys or logged-in admin.
 *
 * @return bool
 */
function jewd_media_permission_check()
{
    // Check query params (GET-style auth used by dashboard).
    $ck = '';
    $cs = '';

    // phpcs:ignore WordPress.Security.NonceVerification.Recommended
    if (! empty($_GET['consumer_key']) && ! empty($_GET['consumer_secret'])) {
        $ck = sanitize_text_field(wp_unslash($_GET['consumer_key']));
        $cs = sanitize_text_field(wp_unslash($_GET['consumer_secret']));
    }

    // Also check POST body for multipart uploads.
    // phpcs:ignore WordPress.Security.NonceVerification.Missing
    if (empty($ck) && ! empty($_POST['consumer_key']) && ! empty($_POST['consumer_secret'])) {
        $ck = sanitize_text_field(wp_unslash($_POST['consumer_key']));
        $cs = sanitize_text_field(wp_unslash($_POST['consumer_secret']));
    }

    if (! empty($ck) && ! empty($cs)) {
        return jewd_validate_wc_keys($ck, $cs);
    }

    return current_user_can('upload_files');
}

/**
 * Handle image upload.
 * Accepts multipart/form-data with a 'file' field.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function jewd_upload_media(WP_REST_Request $request)
{
    // Require WordPress media functions.
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    // Validate file exists.
    if (empty($_FILES['file'])) {
        return new WP_REST_Response(
            array('error' => 'No file provided. Send as multipart/form-data with field name "file".'),
            400
        );
    }

    // Validate file type — only images.
    $allowed_types = array('image/jpeg', 'image/png', 'image/gif', 'image/webp');
    $file_type     = wp_check_filetype($_FILES['file']['name']);
    if (! in_array($_FILES['file']['type'], $allowed_types, true) && ! in_array($file_type['type'], $allowed_types, true)) {
        return new WP_REST_Response(
            array('error' => 'Invalid file type. Allowed: jpg, png, gif, webp.'),
            400
        );
    }

    // Validate file size — max 5MB.
    $max_size = 5 * 1024 * 1024;
    if ($_FILES['file']['size'] > $max_size) {
        return new WP_REST_Response(
            array('error' => 'File too large. Maximum size: 5MB.'),
            400
        );
    }

    // Use media_handle_upload to process the file.
    $attachment_id = media_handle_upload('file', 0);

    if (is_wp_error($attachment_id)) {
        return new WP_REST_Response(
            array('error' => $attachment_id->get_error_message()),
            500
        );
    }

    // Build response with useful data.
    $url       = wp_get_attachment_url($attachment_id);
    $meta      = wp_get_attachment_metadata($attachment_id);
    $thumb_url = wp_get_attachment_image_url($attachment_id, 'thumbnail');
    $medium    = wp_get_attachment_image_url($attachment_id, 'medium');

    return new WP_REST_Response(array(
        'id'        => $attachment_id,
        'url'       => $url,
        'thumbnail' => $thumb_url ?: $url,
        'medium'    => $medium ?: $url,
        'filename'  => basename(get_attached_file($attachment_id)),
        'width'     => $meta['width'] ?? null,
        'height'    => $meta['height'] ?? null,
        'filesize'  => $_FILES['file']['size'],
    ), 201);
}

/**
 * Handle image deletion.
 *
 * @param WP_REST_Request $request The request object.
 * @return WP_REST_Response
 */
function jewd_delete_media(WP_REST_Request $request)
{
    $id = (int) $request->get_param('id');

    // Verify the attachment exists.
    $post = get_post($id);
    if (! $post || 'attachment' !== $post->post_type) {
        return new WP_REST_Response(
            array('error' => 'Attachment not found.', 'id' => $id),
            404
        );
    }

    // Delete permanently.
    $deleted = wp_delete_attachment($id, true);

    if (! $deleted) {
        return new WP_REST_Response(
            array('error' => 'Failed to delete attachment.', 'id' => $id),
            500
        );
    }

    return new WP_REST_Response(array(
        'deleted' => true,
        'id'      => $id,
    ), 200);
}
