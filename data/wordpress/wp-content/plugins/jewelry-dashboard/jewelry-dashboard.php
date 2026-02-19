<?php
/**
 * Plugin Name: Jewelry Dashboard API
 * Plugin URI:  https://jewelry.local.dev
 * Description: REST API endpoint para estadísticas del catálogo + CORS para dashboard SPA externo.
 * Version:     2.0.0
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

defined( 'ABSPATH' ) || exit;

/**
 * Declare HPOS + Cart/Checkout Blocks compatibility.
 */
add_action( 'before_woocommerce_init', function () {
    if ( class_exists( '\Automattic\WooCommerce\Utilities\FeaturesUtil' ) ) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
    }
} );

/**
 * CORS headers for the dashboard SPA.
 */
add_action( 'rest_api_init', function () {
    // Remove default CORS and add our own.
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );

    add_filter( 'rest_pre_serve_request', function ( $value ) {
        $allowed_origins = array(
            'https://dashboard.jewelry.local.dev',
            'https://dashboard.jewelry.cubaverso.com',
        );

        $origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? $_SERVER['HTTP_ORIGIN'] : '';

        if ( in_array( $origin, $allowed_origins, true ) ) {
            header( 'Access-Control-Allow-Origin: ' . $origin );
        } else {
            header( 'Access-Control-Allow-Origin: https://dashboard.jewelry.local.dev' );
        }

        header( 'Access-Control-Allow-Methods: GET, OPTIONS' );
        header( 'Access-Control-Allow-Headers: Content-Type, Authorization' );
        header( 'Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages' );
        header( 'Access-Control-Allow-Credentials: true' );

        return $value;
    } );
} );

/**
 * Handle CORS preflight OPTIONS requests.
 */
add_action( 'init', function () {
    if ( isset( $_SERVER['REQUEST_METHOD'] ) && 'OPTIONS' === $_SERVER['REQUEST_METHOD'] ) {
        $allowed_origins = array(
            'https://dashboard.jewelry.local.dev',
            'https://dashboard.jewelry.cubaverso.com',
        );

        $origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? $_SERVER['HTTP_ORIGIN'] : '';

        if ( in_array( $origin, $allowed_origins, true ) ) {
            header( 'Access-Control-Allow-Origin: ' . $origin );
        }

        header( 'Access-Control-Allow-Methods: GET, OPTIONS' );
        header( 'Access-Control-Allow-Headers: Content-Type, Authorization' );
        header( 'Access-Control-Expose-Headers: X-WP-Total, X-WP-TotalPages' );
        header( 'Access-Control-Max-Age: 86400' );
        status_header( 204 );
        exit;
    }
} );

/**
 * Register custom REST API route for catalog stats.
 * Endpoint: /wp-json/jewd/v1/stats
 */
add_action( 'rest_api_init', function () {
    register_rest_route( 'jewd/v1', '/stats', array(
        'methods'             => 'GET',
        'callback'            => 'jewd_get_catalog_stats',
        'permission_callback' => function () {
            // WC REST API keys handle auth via consumer_key/consumer_secret params.
            // Validate the request has valid WC API credentials.
            if ( ! empty( $_GET['consumer_key'] ) && ! empty( $_GET['consumer_secret'] ) ) {
                return jewd_validate_wc_keys(
                    sanitize_text_field( wp_unslash( $_GET['consumer_key'] ) ),
                    sanitize_text_field( wp_unslash( $_GET['consumer_secret'] ) )
                );
            }
            // Fallback: require manage_woocommerce capability (logged-in admin).
            return current_user_can( 'manage_woocommerce' );
        },
    ) );
} );

/**
 * Validate WooCommerce API keys.
 *
 * @param string $consumer_key    The consumer key.
 * @param string $consumer_secret The consumer secret.
 * @return bool
 */
function jewd_validate_wc_keys( $consumer_key, $consumer_secret ) {
    global $wpdb;

    $key = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT consumer_secret, permissions FROM {$wpdb->prefix}woocommerce_api_keys WHERE consumer_key = %s",
            wc_api_hash( $consumer_key )
        )
    );

    if ( ! $key ) {
        return false;
    }

    return hash_equals( $key->consumer_secret, $consumer_secret );
}

/**
 * Calculate and return catalog statistics.
 *
 * @return WP_REST_Response
 */
function jewd_get_catalog_stats() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        return new WP_REST_Response( array( 'error' => 'WooCommerce not active' ), 503 );
    }

    $all_products = wc_get_products( array(
        'status' => array( 'publish', 'draft', 'private' ),
        'limit'  => -1,
        'return' => 'ids',
    ) );

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

    foreach ( $all_products as $product_id ) {
        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            continue;
        }

        $total_products++;
        $ptype = $product->get_type();

        if ( 'variable' === $ptype ) {
            $total_variable++;
            $children = $product->get_children();
            $total_variations += count( $children );

            foreach ( $children as $child_id ) {
                $variation = wc_get_product( $child_id );
                if ( ! $variation ) {
                    continue;
                }

                $qty = $variation->get_stock_quantity();
                if ( null !== $qty ) {
                    $total_stock += max( 0, $qty );
                    if ( $qty <= 2 && $qty > 0 ) {
                        $low_stock_count++;
                    }
                    if ( $qty <= 0 ) {
                        $out_of_stock++;
                    }
                    $price       = (float) $variation->get_price();
                    $total_value += $price * max( 0, $qty );
                }
                $price = (float) $variation->get_price();
                if ( $price > 0 ) {
                    $prices[] = $price;
                }
            }
        } else {
            $total_simple++;
            $qty = $product->get_stock_quantity();
            if ( null !== $qty ) {
                $total_stock += max( 0, $qty );
                if ( $qty <= 2 && $qty > 0 ) {
                    $low_stock_count++;
                }
                if ( $qty <= 0 ) {
                    $out_of_stock++;
                }
                $price       = (float) $product->get_price();
                $total_value += $price * max( 0, $qty );
            }
            $price = (float) $product->get_price();
            if ( $price > 0 ) {
                $prices[] = $price;
            }
        }

        // Categories.
        $terms = get_the_terms( $product_id, 'product_cat' );
        if ( $terms && ! is_wp_error( $terms ) ) {
            foreach ( $terms as $term ) {
                if ( ! isset( $categories[ $term->slug ] ) ) {
                    $categories[ $term->slug ] = array(
                        'name'  => $term->name,
                        'count' => 0,
                    );
                }
                $categories[ $term->slug ]['count']++;
            }
        }
    }

    return new WP_REST_Response( array(
        'total_products'   => $total_products,
        'total_variable'   => $total_variable,
        'total_simple'     => $total_simple,
        'total_variations' => $total_variations,
        'total_stock'      => $total_stock,
        'categories'       => $categories,
        'min_price'        => ! empty( $prices ) ? min( $prices ) : 0,
        'max_price'        => ! empty( $prices ) ? max( $prices ) : 0,
        'low_stock'        => $low_stock_count,
        'out_of_stock'     => $out_of_stock,
        'total_value'      => round( $total_value, 2 ),
    ), 200 );
}
