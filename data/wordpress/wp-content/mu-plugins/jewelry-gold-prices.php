<?php

/**
 * Plugin Name: Jewelry Gold & Silver Prices
 * Description: Real-time gold and silver spot prices for Tu Joyita Miami dashboard.
 *              Fetches from MetalPriceAPI.com, caches with WordPress transients.
 * Version: 1.0.0
 * Author: Tu Joyita Miami
 *
 * Endpoints:
 *   GET  jewd/v1/gold/prices  — Returns cached metal prices (all authenticated users)
 *   POST jewd/v1/gold/refresh — Force cache refresh (admin/manager only)
 *
 * @package Jewelry_Gold_Prices
 */

if (! defined('ABSPATH')) {
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// API key — define in wp-config.php: define('JEWD_GOLD_API_KEY', 'your-key');
if (! defined('JEWD_GOLD_API_KEY')) {
    define('JEWD_GOLD_API_KEY', '');
}

// Cache duration in hours (default 8 = ~3 calls/day = ~90/month under 100 free limit)
if (! defined('JEWD_GOLD_CACHE_HOURS')) {
    define('JEWD_GOLD_CACHE_HOURS', 8);
}

// MetalPriceAPI endpoint
define('JEWD_GOLD_API_URL', 'https://api.metalpriceapi.com/v1/latest');

// Karat purities (fraction of pure gold)
define('JEWD_GOLD_KARATS', array(
    '24k' => 24 / 24,   // 99.9% pure
    '22k' => 22 / 24,   // 91.7%
    '18k' => 18 / 24,   // 75.0%
    '14k' => 14 / 24,   // 58.3%
    '10k' => 10 / 24,   // 41.7%
));

// Troy ounce in grams
define('JEWD_TROY_OZ_GRAMS', 31.1035);

// Transient key for cached prices
define('JEWD_GOLD_TRANSIENT', 'jewelry_metal_prices');

// Option key for permanent fallback
define('JEWD_GOLD_FALLBACK_OPTION', 'jewelry_metal_prices_fallback');


// ═══════════════════════════════════════════════════════════════════════════════
// REST API REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'jewelry_register_gold_api');

function jewelry_register_gold_api()
{
    // GET /jewd/v1/gold/prices — any authenticated dashboard user
    register_rest_route(
        'jewd/v1',
        '/gold/prices',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_get_gold_prices_endpoint',
            'permission_callback' => 'jewelry_gold_can_view',
        )
    );

    // POST /jewd/v1/gold/refresh — admin/manager only
    register_rest_route(
        'jewd/v1',
        '/gold/refresh',
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_refresh_gold_prices_endpoint',
            'permission_callback' => 'jewelry_gold_can_manage',
        )
    );
}


// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Any authenticated dashboard user can view gold prices.
 * Reuses the JWT auth from jewelry-roles.php.
 */
function jewelry_gold_can_view()
{
    // Reuse existing auth helper from jewelry-roles.php
    if (function_exists('jewelry_authenticate_dashboard_token')) {
        $user = jewelry_authenticate_dashboard_token();
        if (is_wp_error($user)) {
            // Fallback to WC API key auth
            if (function_exists('jewelry_authenticate_api_request')) {
                $user = jewelry_authenticate_api_request();
                if (is_wp_error($user)) {
                    return false;
                }
            } else {
                return false;
            }
        }
        return user_can($user, 'jewelry_dashboard_access') || user_can($user, 'manage_options');
    }
    // If jewelry-roles.php not loaded yet, deny
    return false;
}

/**
 * Only admins and managers can force-refresh prices.
 */
function jewelry_gold_can_manage()
{
    if (function_exists('jewelry_authenticate_dashboard_token')) {
        $user = jewelry_authenticate_dashboard_token();
        if (is_wp_error($user)) {
            if (function_exists('jewelry_authenticate_api_request')) {
                $user = jewelry_authenticate_api_request();
                if (is_wp_error($user)) {
                    return false;
                }
            } else {
                return false;
            }
        }
        return user_can($user, 'manage_options') || user_can($user, 'manage_woocommerce');
    }
    return false;
}


// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /jewd/v1/gold/prices
 *
 * Returns cached metal prices with karat breakdowns.
 */
function jewelry_get_gold_prices_endpoint(\WP_REST_Request $request)
{
    $data = jewelry_get_metal_prices();

    if (is_wp_error($data)) {
        return new \WP_REST_Response(
            array(
                'success' => false,
                'error'   => $data->get_error_message(),
                'code'    => $data->get_error_code(),
            ),
            503
        );
    }

    return new \WP_REST_Response($data, 200);
}

/**
 * POST /jewd/v1/gold/refresh
 *
 * Force-refresh prices from external API.
 */
function jewelry_refresh_gold_prices_endpoint(\WP_REST_Request $request)
{
    // Delete current cache to force refresh
    delete_transient(JEWD_GOLD_TRANSIENT);

    $data = jewelry_get_metal_prices();

    if (is_wp_error($data)) {
        return new \WP_REST_Response(
            array(
                'success' => false,
                'error'   => $data->get_error_message(),
                'code'    => $data->get_error_code(),
            ),
            503
        );
    }

    $data['refreshed'] = true;
    return new \WP_REST_Response($data, 200);
}


// ═══════════════════════════════════════════════════════════════════════════════
// CORE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get metal prices — from cache or fresh API call.
 *
 * @return array|WP_Error Normalized price data or error.
 */
function jewelry_get_metal_prices()
{
    // 1. Try transient cache first
    $cached = get_transient(JEWD_GOLD_TRANSIENT);
    if ($cached !== false && is_array($cached)) {
        $cached['cached'] = true;
        return $cached;
    }

    // 2. Check if API key is configured
    if (empty(JEWD_GOLD_API_KEY)) {
        // Return demo/fallback data if no API key
        $fallback = get_option(JEWD_GOLD_FALLBACK_OPTION, false);
        if ($fallback) {
            $fallback['cached'] = true;
            $fallback['stale']  = true;
            $fallback['note']   = 'API key not configured — showing last known prices';
            return $fallback;
        }

        // Return demo data for initial setup
        return jewelry_get_demo_prices();
    }

    // 3. Fetch from external API
    $fresh = jewelry_fetch_from_api();

    if (is_wp_error($fresh)) {
        // On API failure, try permanent fallback
        $fallback = get_option(JEWD_GOLD_FALLBACK_OPTION, false);
        if ($fallback) {
            $fallback['cached'] = true;
            $fallback['stale']  = true;
            $fallback['note']   = 'API unavailable — showing last known prices';
            return $fallback;
        }
        return $fresh; // No fallback available, return error
    }

    // 4. Cache the fresh data
    set_transient(JEWD_GOLD_TRANSIENT, $fresh, JEWD_GOLD_CACHE_HOURS * HOUR_IN_SECONDS);

    // 5. Save permanent fallback (survives transient expiry + API outages)
    update_option(JEWD_GOLD_FALLBACK_OPTION, $fresh, false); // autoload=false

    $fresh['cached'] = false;
    return $fresh;
}

/**
 * Fetch fresh prices from MetalPriceAPI.com.
 *
 * API returns rates as: 1 USD = X XAU (inverse of spot price)
 * So: spot_price_usd = 1 / rate
 *
 * @return array|WP_Error
 */
function jewelry_fetch_from_api()
{
    $url = add_query_arg(
        array(
            'api_key'    => JEWD_GOLD_API_KEY,
            'base'       => 'USD',
            'currencies' => 'XAU,XAG',
        ),
        JEWD_GOLD_API_URL
    );

    $response = wp_remote_get($url, array(
        'timeout'   => 15,
        'sslverify' => true,
        'headers'   => array(
            'Accept' => 'application/json',
        ),
    ));

    if (is_wp_error($response)) {
        return new \WP_Error(
            'jewelry_api_request_failed',
            'Failed to connect to metal price API: ' . $response->get_error_message()
        );
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code !== 200) {
        return new \WP_Error(
            'jewelry_api_http_error',
            'Metal price API returned HTTP ' . $code
        );
    }

    $body = wp_remote_retrieve_body($response);
    $json = json_decode($body, true);

    if (! $json || empty($json['success'])) {
        $msg = isset($json['error']['info']) ? $json['error']['info'] : 'Unknown API error';
        return new \WP_Error('jewelry_api_error', $msg);
    }

    // Parse rates — API returns 1 USD = X XAU (inverse)
    $rates = $json['rates'] ?? array();
    $xau_rate = $rates['USDXAU'] ?? 0;
    $xag_rate = $rates['USDXAG'] ?? 0;

    if ($xau_rate <= 0 || $xag_rate <= 0) {
        return new \WP_Error('jewelry_api_invalid_rates', 'API returned invalid rates');
    }

    // Convert: spot price = 1 / rate (since rate is "how many oz per 1 USD")
    $gold_spot_oz  = round(1 / $xau_rate, 2);
    $silver_spot_oz = round(1 / $xag_rate, 2);

    return jewelry_build_price_data($gold_spot_oz, $silver_spot_oz, $json['timestamp'] ?? time());
}

/**
 * Build the normalized price data structure from spot prices.
 *
 * @param float $gold_oz   Gold spot price per troy ounce in USD.
 * @param float $silver_oz Silver spot price per troy ounce in USD.
 * @param int   $timestamp Unix timestamp of the price data.
 * @return array
 */
function jewelry_build_price_data($gold_oz, $silver_oz, $timestamp)
{
    $gold_per_gram = $gold_oz / JEWD_TROY_OZ_GRAMS;
    $silver_per_gram = $silver_oz / JEWD_TROY_OZ_GRAMS;

    // Calculate price per gram for each karat
    $karats = array();
    foreach (JEWD_GOLD_KARATS as $label => $purity) {
        $karats[$label] = array(
            'purity'   => round($purity * 100, 1),
            'per_gram' => round($gold_per_gram * $purity, 2),
            'per_oz'   => round($gold_oz * $purity, 2),
        );
    }

    // Previous prices for change calculation
    $prev = get_option(JEWD_GOLD_FALLBACK_OPTION, false);
    $gold_change  = 0;
    $silver_change = 0;
    if ($prev && ! empty($prev['gold']['spot_oz'])) {
        $prev_gold = $prev['gold']['spot_oz'];
        $gold_change = $prev_gold > 0 ? round((($gold_oz - $prev_gold) / $prev_gold) * 100, 2) : 0;
    }
    if ($prev && ! empty($prev['silver']['spot_oz'])) {
        $prev_silver = $prev['silver']['spot_oz'];
        $silver_change = $prev_silver > 0 ? round((($silver_oz - $prev_silver) / $prev_silver) * 100, 2) : 0;
    }

    return array(
        'success'       => true,
        'timestamp'     => gmdate('c', $timestamp),
        'fetched_at'    => gmdate('c'),
        'cache_expires' => gmdate('c', time() + (JEWD_GOLD_CACHE_HOURS * HOUR_IN_SECONDS)),
        'source'        => 'metalpriceapi.com',
        'gold'          => array(
            'spot_oz'     => $gold_oz,
            'per_gram'    => round($gold_per_gram, 2),
            'change_pct'  => $gold_change,
            'karats'      => $karats,
        ),
        'silver'        => array(
            'spot_oz'      => $silver_oz,
            'per_gram_999' => round($silver_per_gram, 2),
            'per_gram_925' => round($silver_per_gram * 0.925, 2),
            'change_pct'   => $silver_change,
        ),
    );
}

/**
 * Demo prices for when no API key is configured.
 * Uses approximate market values so the UI renders properly.
 */
function jewelry_get_demo_prices()
{
    return jewelry_build_demo_data(2650.00, 31.25);
}

/**
 * Build demo data structure (same shape as real data).
 */
function jewelry_build_demo_data($gold_oz, $silver_oz)
{
    $data = jewelry_build_price_data($gold_oz, $silver_oz, time());
    $data['demo']    = true;
    $data['note']    = 'Demo prices — configure JEWD_GOLD_API_KEY in wp-config.php for real data';
    $data['gold']['change_pct']   = 0;
    $data['silver']['change_pct'] = 0;
    return $data;
}
