<?php

/**
 * Plugin Name: Jewelry Dynamic Pricing
 * Description: Dynamic metal-weight-based pricing for jewelry products.
 *              Products can use fixed price (default) or calculate price
 *              from metal weight × spot price × markup.
 * Version: 1.0.0
 * Author: Tu Joyita Miami
 *
 * Meta fields per product:
 *   _jewelry_pricing_mode   — 'fixed' (default) or 'by_weight'
 *   _jewelry_metal_type     — e.g. 'gold_14k', 'silver_925'
 *   _jewelry_metal_weight   — weight in grams (float)
 *   _jewelry_markup_pct     — markup percentage (float, e.g. 30 = 30%)
 *
 * Depends on: jewelry-gold-prices.php (transient JEWD_GOLD_TRANSIENT)
 *
 * @package Jewelry_Dynamic_Pricing
 */

if (! defined('ABSPATH')) {
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported metal types with labels and mapping to gold-prices.php data.
 */
define('JEWD_METAL_TYPES', array(
    'gold_24k'   => array('label' => 'Oro 24K (99.9%)',  'metal' => 'gold',   'karat' => '24k'),
    'gold_22k'   => array('label' => 'Oro 22K (91.7%)',  'metal' => 'gold',   'karat' => '22k'),
    'gold_18k'   => array('label' => 'Oro 18K (75.0%)',  'metal' => 'gold',   'karat' => '18k'),
    'gold_14k'   => array('label' => 'Oro 14K (58.3%)',  'metal' => 'gold',   'karat' => '14k'),
    'gold_10k'   => array('label' => 'Oro 10K (41.7%)',  'metal' => 'gold',   'karat' => '10k'),
    'silver_999' => array('label' => 'Plata 999 (99.9%)', 'metal' => 'silver', 'purity' => '999'),
    'silver_925' => array('label' => 'Plata 925 (92.5%)', 'metal' => 'silver', 'purity' => '925'),
));

define('JEWD_PRICING_MODES', array('fixed', 'by_weight'));

/**
 * Labor cost per gram (mano de obra) in USD.
 * Applied to all by_weight products: labor_value = weight × JEWD_LABOR_PER_GRAM.
 */
define('JEWD_LABOR_PER_GRAM', 3.00);

/**
 * In-memory cache to avoid repeated transient lookups within a single request.
 */
global $jewd_metal_prices_cache;
$jewd_metal_prices_cache = null;

/**
 * Guard against recursive price filter calls.
 */
global $jewd_price_filter_active;
$jewd_price_filter_active = false;


// ═══════════════════════════════════════════════════════════════════════════════
// META FIELD REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

add_action('init', 'jewelry_register_pricing_meta');

/**
 * Register product meta fields for dynamic pricing.
 */
function jewelry_register_pricing_meta()
{
    $meta_fields = array(
        '_jewelry_pricing_mode' => array(
            'type'              => 'string',
            'description'       => 'Pricing mode: fixed or by_weight',
            'single'            => true,
            'default'           => 'fixed',
            'sanitize_callback' => 'jewelry_sanitize_pricing_mode',
            'show_in_rest'      => true,
        ),
        '_jewelry_metal_type' => array(
            'type'              => 'string',
            'description'       => 'Metal type key (e.g. gold_14k, silver_925)',
            'single'            => true,
            'default'           => 'gold_14k',
            'sanitize_callback' => 'jewelry_sanitize_metal_type',
            'show_in_rest'      => true,
        ),
        '_jewelry_metal_weight' => array(
            'type'              => 'number',
            'description'       => 'Metal weight in grams',
            'single'            => true,
            'default'           => 0,
            'sanitize_callback' => 'jewelry_sanitize_metal_weight',
            'show_in_rest'      => true,
        ),
        '_jewelry_markup_pct' => array(
            'type'              => 'number',
            'description'       => 'Markup percentage over metal value',
            'single'            => true,
            'default'           => 0,
            'sanitize_callback' => 'jewelry_sanitize_markup_pct',
            'show_in_rest'      => true,
        ),
    );

    foreach ($meta_fields as $key => $args) {
        register_post_meta('product', $key, $args);
        // Also register for product variations (WC uses post_type 'product_variation')
        register_post_meta('product_variation', $key, $args);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// SANITIZE CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize pricing mode — must be 'fixed' or 'by_weight'.
 *
 * @param string $value Raw input.
 * @return string Sanitized value.
 */
function jewelry_sanitize_pricing_mode($value)
{
    $value = sanitize_text_field($value);
    return in_array($value, JEWD_PRICING_MODES, true) ? $value : 'fixed';
}

/**
 * Sanitize metal type — must be a known key from JEWD_METAL_TYPES.
 *
 * @param string $value Raw input.
 * @return string Sanitized value.
 */
function jewelry_sanitize_metal_type($value)
{
    $value = sanitize_text_field($value);
    return array_key_exists($value, JEWD_METAL_TYPES) ? $value : 'gold_14k';
}

/**
 * Sanitize metal weight — float >= 0, max 9999.99.
 *
 * @param mixed $value Raw input.
 * @return float Sanitized value.
 */
function jewelry_sanitize_metal_weight($value)
{
    $value = floatval($value);
    if ($value < 0) {
        return 0.0;
    }
    if ($value > 9999.99) {
        return 9999.99;
    }
    return round($value, 2);
}

/**
 * Sanitize markup percentage — float >= 0, max 500.
 *
 * @param mixed $value Raw input.
 * @return float Sanitized value.
 */
function jewelry_sanitize_markup_pct($value)
{
    $value = floatval($value);
    if ($value < 0) {
        return 0.0;
    }
    if ($value > 500) {
        return 500.0;
    }
    return round($value, 2);
}


// ═══════════════════════════════════════════════════════════════════════════════
// WOOCOMMERCE REST API INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

add_filter('woocommerce_rest_prepare_product_object', 'jewelry_add_pricing_to_rest_response', 10, 3);

/**
 * Add dynamic pricing data to WC REST API product response.
 * This adds a top-level 'jewelry_pricing' object to the product JSON.
 *
 * @param WP_REST_Response $response The response object.
 * @param WC_Product       $product  Product object.
 * @param WP_REST_Request  $request  Request object.
 * @return WP_REST_Response
 */
function jewelry_add_pricing_to_rest_response($response, $product, $request)
{
    $product_id = $product->get_id();
    $mode       = get_post_meta($product_id, '_jewelry_pricing_mode', true) ?: 'fixed';
    $metal_type = get_post_meta($product_id, '_jewelry_metal_type', true) ?: 'gold_14k';
    $weight     = (float) get_post_meta($product_id, '_jewelry_metal_weight', true);
    $markup     = (float) get_post_meta($product_id, '_jewelry_markup_pct', true);

    $pricing_data = array(
        'mode'        => $mode,
        'metal_type'  => $metal_type,
        'weight_g'    => $weight,
        'markup_pct'  => $markup,
    );

    // Include calculated price and breakdown for by_weight products
    if ($mode === 'by_weight') {
        $breakdown = jewelry_calculate_price_breakdown($product_id);
        $pricing_data['calculated_price'] = $breakdown['total'];
        $pricing_data['metal_price_per_g'] = $breakdown['price_per_gram'];
        $pricing_data['metal_value']       = $breakdown['metal_value'];
        $pricing_data['labor_value']       = $breakdown['labor_value'];
        $pricing_data['markup_value']      = $breakdown['markup_value'];
    }

    $data = $response->get_data();
    $data['jewelry_pricing'] = $pricing_data;
    $response->set_data($data);

    return $response;
}

add_action('woocommerce_rest_insert_product_object', 'jewelry_save_pricing_from_rest', 10, 2);

/**
 * Save dynamic pricing meta from WC REST API requests (PUT/POST).
 * Reads from the 'jewelry_pricing' key in the request body.
 *
 * @param WC_Product      $product Product object.
 * @param WP_REST_Request $request Request object.
 */
function jewelry_save_pricing_from_rest($product, $request)
{
    $pricing = $request->get_param('jewelry_pricing');
    if (! is_array($pricing)) {
        return;
    }

    $product_id = $product->get_id();

    if (isset($pricing['mode'])) {
        update_post_meta($product_id, '_jewelry_pricing_mode', jewelry_sanitize_pricing_mode($pricing['mode']));
    }
    if (isset($pricing['metal_type'])) {
        update_post_meta($product_id, '_jewelry_metal_type', jewelry_sanitize_metal_type($pricing['metal_type']));
    }
    if (isset($pricing['weight_g'])) {
        update_post_meta($product_id, '_jewelry_metal_weight', jewelry_sanitize_metal_weight($pricing['weight_g']));
    }
    if (isset($pricing['markup_pct'])) {
        update_post_meta($product_id, '_jewelry_markup_pct', jewelry_sanitize_markup_pct($pricing['markup_pct']));
    }

    // When saving by_weight product, also update the WC regular_price as reference
    $mode = get_post_meta($product_id, '_jewelry_pricing_mode', true);
    if ($mode === 'by_weight') {
        $calculated = jewelry_calculate_dynamic_price($product_id);
        if ($calculated > 0) {
            $product->set_regular_price($calculated);
            $product->set_price($calculated);
            $product->save();
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// WOOCOMMERCE REST API — VARIATION INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

add_filter('woocommerce_rest_prepare_product_variation_object', 'jewelry_add_pricing_to_variation_rest_response', 10, 3);

/**
 * Add dynamic pricing data to WC REST API variation response.
 * Includes both variation-specific data and inherited values from parent.
 *
 * @param WP_REST_Response        $response  The response object.
 * @param WC_Product_Variation    $variation Variation object.
 * @param WP_REST_Request         $request   Request object.
 * @return WP_REST_Response
 */
function jewelry_add_pricing_to_variation_rest_response($response, $variation, $request)
{
    $variation_id = $variation->get_id();
    $parent_id    = $variation->get_parent_id();

    // Pricing mode comes from parent
    $parent_mode = get_post_meta($parent_id, '_jewelry_pricing_mode', true) ?: 'fixed';

    // Variation-level overrides (may be empty = inherit)
    $var_metal_type = get_post_meta($variation_id, '_jewelry_metal_type', true);
    $var_weight     = (float) get_post_meta($variation_id, '_jewelry_metal_weight', true);
    $var_markup_raw = get_post_meta($variation_id, '_jewelry_markup_pct', true);

    // Parent defaults
    $parent_metal_type = get_post_meta($parent_id, '_jewelry_metal_type', true) ?: 'gold_14k';
    $parent_markup     = (float) get_post_meta($parent_id, '_jewelry_markup_pct', true);

    $pricing_data = array(
        'parent_mode'  => $parent_mode,
        'metal_type'   => $var_metal_type ?: '',
        'weight_g'     => $var_weight,
        'markup_pct'   => $var_markup_raw !== '' && $var_markup_raw !== false ? (float) $var_markup_raw : null,
        'parent_metal_type' => $parent_metal_type,
        'parent_markup_pct' => $parent_markup,
    );

    if ($parent_mode === 'by_weight') {
        $breakdown = jewelry_calculate_variation_breakdown($variation_id, $parent_id);
        $pricing_data['calculated_price']  = $breakdown['total'];
        $pricing_data['metal_price_per_g'] = $breakdown['price_per_gram'];
        $pricing_data['metal_value']       = $breakdown['metal_value'];
        $pricing_data['labor_value']       = $breakdown['labor_value'];
        $pricing_data['markup_value']      = $breakdown['markup_value'];
        $pricing_data['effective_metal_type'] = $breakdown['metal_type'];
        $pricing_data['effective_markup_pct'] = $breakdown['markup_pct'];
        $pricing_data['inherited']         = $breakdown['inherited'];
    }

    $data = $response->get_data();
    $data['jewelry_pricing'] = $pricing_data;
    $response->set_data($data);

    return $response;
}

add_action('woocommerce_rest_insert_product_variation_object', 'jewelry_save_pricing_from_variation_rest', 10, 2);

/**
 * Save dynamic pricing meta from WC REST API variation requests (PUT/POST).
 * Reads from the 'jewelry_pricing' key in the request body.
 *
 * @param WC_Product_Variation $variation Variation object.
 * @param WP_REST_Request      $request   Request object.
 */
function jewelry_save_pricing_from_variation_rest($variation, $request)
{
    $pricing = $request->get_param('jewelry_pricing');
    if (! is_array($pricing)) {
        return;
    }

    $variation_id = $variation->get_id();
    $parent_id    = $variation->get_parent_id();

    if (isset($pricing['metal_type'])) {
        if ($pricing['metal_type'] === '' || $pricing['metal_type'] === null) {
            delete_post_meta($variation_id, '_jewelry_metal_type');
        } else {
            update_post_meta($variation_id, '_jewelry_metal_type', jewelry_sanitize_metal_type($pricing['metal_type']));
        }
    }
    if (isset($pricing['weight_g'])) {
        update_post_meta($variation_id, '_jewelry_metal_weight', jewelry_sanitize_metal_weight($pricing['weight_g']));
    }
    if (array_key_exists('markup_pct', $pricing)) {
        if ($pricing['markup_pct'] === '' || $pricing['markup_pct'] === null) {
            delete_post_meta($variation_id, '_jewelry_markup_pct');
        } else {
            update_post_meta($variation_id, '_jewelry_markup_pct', jewelry_sanitize_markup_pct($pricing['markup_pct']));
        }
    }

    // When parent is by_weight, update the WC regular_price as reference
    $parent_mode = get_post_meta($parent_id, '_jewelry_pricing_mode', true);
    if ($parent_mode === 'by_weight') {
        $calculated = jewelry_calculate_variation_price($variation_id, $parent_id);
        if ($calculated > 0) {
            $variation->set_regular_price($calculated);
            $variation->set_price($calculated);
            $variation->save();
        }
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
// REST API — PRICING ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'jewelry_register_pricing_api');

/**
 * Register custom REST endpoints for pricing.
 */
function jewelry_register_pricing_api()
{
    // GET /jewd/v1/pricing/metal-types — list available metal types
    register_rest_route(
        'jewd/v1',
        '/pricing/metal-types',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_get_metal_types_endpoint',
            'permission_callback' => 'jewelry_gold_can_view',
        )
    );

    // POST /jewd/v1/pricing/calculate — calculate price for given params
    register_rest_route(
        'jewd/v1',
        '/pricing/calculate',
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_calculate_price_endpoint',
            'permission_callback' => 'jewelry_gold_can_view',
            'args'                => array(
                'metal_type' => array(
                    'required'          => true,
                    'sanitize_callback' => 'jewelry_sanitize_metal_type',
                ),
                'weight_g' => array(
                    'required'          => true,
                    'sanitize_callback' => 'jewelry_sanitize_metal_weight',
                ),
                'markup_pct' => array(
                    'required'          => false,
                    'default'           => 0,
                    'sanitize_callback' => 'jewelry_sanitize_markup_pct',
                ),
            ),
        )
    );

    // POST /jewd/v1/pricing/sync — force sync all by_weight products
    register_rest_route(
        'jewd/v1',
        '/pricing/sync',
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_sync_prices_endpoint',
            'permission_callback' => 'jewelry_gold_can_manage',
        )
    );
}

/**
 * GET /jewd/v1/pricing/metal-types
 *
 * Returns available metal types with labels and current prices.
 */
function jewelry_get_metal_types_endpoint(\WP_REST_Request $request)
{
    $prices = jewelry_get_cached_metal_prices();
    $result = array();

    foreach (JEWD_METAL_TYPES as $key => $info) {
        $ppg = jewelry_get_metal_price_per_gram($key, $prices);
        $result[] = array(
            'key'           => $key,
            'label'         => $info['label'],
            'metal'         => $info['metal'],
            'price_per_gram' => $ppg,
        );
    }

    return new \WP_REST_Response(array(
        'success'     => true,
        'metal_types' => $result,
    ), 200);
}

/**
 * POST /jewd/v1/pricing/calculate
 *
 * Calculate price from metal_type + weight + markup without saving.
 */
function jewelry_calculate_price_endpoint(\WP_REST_Request $request)
{
    $metal_type = $request->get_param('metal_type');
    $weight     = (float) $request->get_param('weight_g');
    $markup     = (float) $request->get_param('markup_pct');

    $prices  = jewelry_get_cached_metal_prices();
    $ppg     = jewelry_get_metal_price_per_gram($metal_type, $prices);
    $metal_value = round($weight * $ppg, 2);
    $labor_value = round($weight * JEWD_LABOR_PER_GRAM, 2);
    $markup_value = round($metal_value * ($markup / 100), 2);
    $total = round($metal_value + $labor_value + $markup_value, 2);

    $type_info = JEWD_METAL_TYPES[$metal_type] ?? array('label' => $metal_type);

    return new \WP_REST_Response(array(
        'success'        => true,
        'metal_type'     => $metal_type,
        'metal_label'    => $type_info['label'],
        'weight_g'       => $weight,
        'price_per_gram' => $ppg,
        'metal_value'    => $metal_value,
        'labor_per_gram' => JEWD_LABOR_PER_GRAM,
        'labor_value'    => $labor_value,
        'markup_pct'     => $markup,
        'markup_value'   => $markup_value,
        'total'          => $total,
    ), 200);
}

/**
 * POST /jewd/v1/pricing/sync
 *
 * Force sync regular_price for all by_weight products.
 */
function jewelry_sync_prices_endpoint(\WP_REST_Request $request)
{
    $result = jewelry_sync_all_dynamic_prices();
    return new \WP_REST_Response(array_merge(array('success' => true), $result), 200);
}


// ═══════════════════════════════════════════════════════════════════════════════
// WOOCOMMERCE PRICE HOOKS (DP-2)
// ═══════════════════════════════════════════════════════════════════════════════

add_filter('woocommerce_product_get_price', 'jewelry_dynamic_price_filter', 10, 2);
add_filter('woocommerce_product_get_regular_price', 'jewelry_dynamic_price_filter', 10, 2);
add_filter('woocommerce_product_variation_get_price', 'jewelry_dynamic_variation_price_filter', 10, 2);
add_filter('woocommerce_product_variation_get_regular_price', 'jewelry_dynamic_variation_price_filter', 10, 2);

/**
 * Filter WooCommerce product price for by_weight products.
 * Calculates price dynamically from metal weight × spot price × markup.
 *
 * @param string     $price   Current price.
 * @param WC_Product $product Product object.
 * @return string Filtered price.
 */
function jewelry_dynamic_price_filter($price, $product)
{
    global $jewd_price_filter_active;

    // Prevent infinite recursion
    if ($jewd_price_filter_active) {
        return $price;
    }

    $product_id = $product->get_id();
    if (! $product_id) {
        return $price;
    }

    $mode = get_post_meta($product_id, '_jewelry_pricing_mode', true);
    if ($mode !== 'by_weight') {
        return $price;
    }

    $jewd_price_filter_active = true;
    $calculated = jewelry_calculate_dynamic_price($product_id);
    $jewd_price_filter_active = false;

    // Fallback to existing price if calculation fails
    return $calculated > 0 ? $calculated : $price;
}

/**
 * Filter WooCommerce variation price for by_weight products.
 * Inherits pricing_mode from parent; uses variation's own weight/metal_type/markup
 * or falls back to parent's values.
 *
 * @param string     $price     Current price.
 * @param WC_Product $variation Variation object.
 * @return string Filtered price.
 */
function jewelry_dynamic_variation_price_filter($price, $variation)
{
    global $jewd_price_filter_active;

    if ($jewd_price_filter_active) {
        return $price;
    }

    $variation_id = $variation->get_id();
    $parent_id    = $variation->get_parent_id();
    if (! $variation_id || ! $parent_id) {
        return $price;
    }

    // Pricing mode is set at parent level
    $mode = get_post_meta($parent_id, '_jewelry_pricing_mode', true);
    if ($mode !== 'by_weight') {
        return $price;
    }

    $jewd_price_filter_active = true;
    $calculated = jewelry_calculate_variation_price($variation_id, $parent_id);
    $jewd_price_filter_active = false;

    return $calculated > 0 ? $calculated : $price;
}


// ═══════════════════════════════════════════════════════════════════════════════
// CORE CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate the dynamic price for a product.
 *
 * @param int $product_id WooCommerce product ID.
 * @return float Calculated price, or 0 on failure.
 */
function jewelry_calculate_dynamic_price($product_id)
{
    $breakdown = jewelry_calculate_price_breakdown($product_id);
    return $breakdown['total'];
}

/**
 * Calculate full price breakdown for a product.
 *
 * @param int $product_id WooCommerce product ID.
 * @return array{total: float, metal_value: float, labor_value: float, markup_value: float, price_per_gram: float}
 */
function jewelry_calculate_price_breakdown($product_id)
{
    $empty = array(
        'total'          => 0.0,
        'metal_value'    => 0.0,
        'labor_value'    => 0.0,
        'markup_value'   => 0.0,
        'price_per_gram' => 0.0,
    );

    $metal_type = get_post_meta($product_id, '_jewelry_metal_type', true);
    $weight     = (float) get_post_meta($product_id, '_jewelry_metal_weight', true);
    $markup_pct = (float) get_post_meta($product_id, '_jewelry_markup_pct', true);

    if ($weight <= 0) {
        return $empty;
    }

    if (! array_key_exists($metal_type, JEWD_METAL_TYPES)) {
        return $empty;
    }

    $prices = jewelry_get_cached_metal_prices();
    $price_per_gram = jewelry_get_metal_price_per_gram($metal_type, $prices);

    if ($price_per_gram <= 0) {
        return $empty;
    }

    $metal_value  = round($weight * $price_per_gram, 2);
    $labor_value  = round($weight * JEWD_LABOR_PER_GRAM, 2);
    $markup_value = round($metal_value * ($markup_pct / 100), 2);
    $total        = round($metal_value + $labor_value + $markup_value, 2);

    return array(
        'total'          => $total,
        'metal_value'    => $metal_value,
        'labor_value'    => $labor_value,
        'markup_value'   => $markup_value,
        'price_per_gram' => $price_per_gram,
    );
}

/**
 * Calculate the dynamic price for a variation, inheriting parent defaults.
 *
 * @param int $variation_id Variation ID.
 * @param int $parent_id    Parent product ID.
 * @return float Calculated price, or 0 on failure.
 */
function jewelry_calculate_variation_price($variation_id, $parent_id)
{
    $breakdown = jewelry_calculate_variation_breakdown($variation_id, $parent_id);
    return $breakdown['total'];
}

/**
 * Calculate full price breakdown for a variation.
 * Inherits metal_type and markup_pct from parent if not set on the variation.
 * Weight MUST be set on the variation itself (each size/variant may weigh differently).
 *
 * @param int $variation_id Variation ID.
 * @param int $parent_id    Parent product ID.
 * @return array{total: float, metal_value: float, labor_value: float, markup_value: float, price_per_gram: float, metal_type: string, weight: float, markup_pct: float, inherited: array}
 */
function jewelry_calculate_variation_breakdown($variation_id, $parent_id)
{
    $empty = array(
        'total'          => 0.0,
        'metal_value'    => 0.0,
        'labor_value'    => 0.0,
        'markup_value'   => 0.0,
        'price_per_gram' => 0.0,
        'metal_type'     => '',
        'weight'         => 0.0,
        'markup_pct'     => 0.0,
        'inherited'      => array(),
    );

    // Weight is variation-specific (required)
    $weight = (float) get_post_meta($variation_id, '_jewelry_metal_weight', true);
    if ($weight <= 0) {
        return $empty;
    }

    // Metal type: variation override or inherit from parent
    $inherited = array();
    $metal_type = get_post_meta($variation_id, '_jewelry_metal_type', true);
    if (! $metal_type || ! array_key_exists($metal_type, JEWD_METAL_TYPES)) {
        $metal_type = get_post_meta($parent_id, '_jewelry_metal_type', true);
        $inherited[] = 'metal_type';
    }
    if (! array_key_exists($metal_type, JEWD_METAL_TYPES)) {
        return $empty;
    }

    // Markup: variation override or inherit from parent
    $markup_pct_raw = get_post_meta($variation_id, '_jewelry_markup_pct', true);
    if ($markup_pct_raw === '' || $markup_pct_raw === false) {
        $markup_pct = (float) get_post_meta($parent_id, '_jewelry_markup_pct', true);
        $inherited[] = 'markup_pct';
    } else {
        $markup_pct = (float) $markup_pct_raw;
    }

    $prices = jewelry_get_cached_metal_prices();
    $price_per_gram = jewelry_get_metal_price_per_gram($metal_type, $prices);

    if ($price_per_gram <= 0) {
        return $empty;
    }

    $metal_value  = round($weight * $price_per_gram, 2);
    $labor_value  = round($weight * JEWD_LABOR_PER_GRAM, 2);
    $markup_value = round($metal_value * ($markup_pct / 100), 2);
    $total        = round($metal_value + $labor_value + $markup_value, 2);

    return array(
        'total'          => $total,
        'metal_value'    => $metal_value,
        'labor_value'    => $labor_value,
        'markup_value'   => $markup_value,
        'price_per_gram' => $price_per_gram,
        'metal_type'     => $metal_type,
        'weight'         => $weight,
        'markup_pct'     => $markup_pct,
        'inherited'      => $inherited,
    );
}

/**
 * Get the price per gram for a given metal type.
 *
 * @param string     $metal_type Metal type key (e.g. 'gold_14k').
 * @param array|null $prices     Optional pre-fetched metal prices data.
 * @return float Price per gram in USD, or 0 on failure.
 */
function jewelry_get_metal_price_per_gram($metal_type, $prices = null)
{
    if (! array_key_exists($metal_type, JEWD_METAL_TYPES)) {
        return 0.0;
    }

    if ($prices === null) {
        $prices = jewelry_get_cached_metal_prices();
    }

    if (empty($prices) || ! is_array($prices)) {
        return 0.0;
    }

    $info = JEWD_METAL_TYPES[$metal_type];

    if ($info['metal'] === 'gold') {
        $karat = $info['karat'];
        return (float) ($prices['gold']['karats'][$karat]['per_gram'] ?? 0);
    }

    if ($info['metal'] === 'silver') {
        $purity = $info['purity'] ?? '925';
        $key = 'per_gram_' . $purity;
        return (float) ($prices['silver'][$key] ?? 0);
    }

    return 0.0;
}

/**
 * Get cached metal prices with per-request memoization.
 *
 * @return array Metal prices data, or empty array on failure.
 */
function jewelry_get_cached_metal_prices()
{
    global $jewd_metal_prices_cache;

    if ($jewd_metal_prices_cache !== null) {
        return $jewd_metal_prices_cache;
    }

    // Use the jewelry-gold-prices.php function if available
    if (function_exists('jewelry_get_metal_prices')) {
        $data = jewelry_get_metal_prices();
        if (! is_wp_error($data) && is_array($data)) {
            $jewd_metal_prices_cache = $data;
            return $data;
        }
    }

    // Direct transient fallback
    $cached = get_transient(defined('JEWD_GOLD_TRANSIENT') ? JEWD_GOLD_TRANSIENT : 'jewelry_metal_prices');
    if ($cached && is_array($cached)) {
        $jewd_metal_prices_cache = $cached;
        return $cached;
    }

    // Permanent fallback
    $fallback = get_option(defined('JEWD_GOLD_FALLBACK_OPTION') ? JEWD_GOLD_FALLBACK_OPTION : 'jewelry_metal_prices_fallback', false);
    if ($fallback && is_array($fallback)) {
        $jewd_metal_prices_cache = $fallback;
        return $fallback;
    }

    $jewd_metal_prices_cache = array();
    return array();
}


// ═══════════════════════════════════════════════════════════════════════════════
// CRON SYNC (DP-3)
// ═══════════════════════════════════════════════════════════════════════════════

add_action('init', 'jewelry_schedule_price_sync');
add_action('jewelry_cron_sync_dynamic_prices', 'jewelry_sync_all_dynamic_prices');

/**
 * Schedule the price sync cron job (every 8 hours).
 */
function jewelry_schedule_price_sync()
{
    if (! wp_next_scheduled('jewelry_cron_sync_dynamic_prices')) {
        wp_schedule_event(time(), 'jewelry_eight_hours', 'jewelry_cron_sync_dynamic_prices');
    }
}

add_filter('cron_schedules', 'jewelry_add_eight_hour_schedule');

/**
 * Add custom 8-hour cron schedule.
 *
 * @param array $schedules Existing schedules.
 * @return array Modified schedules.
 */
function jewelry_add_eight_hour_schedule($schedules)
{
    $schedules['jewelry_eight_hours'] = array(
        'interval' => 8 * HOUR_IN_SECONDS,
        'display'  => 'Every 8 hours (Jewelry price sync)',
    );
    return $schedules;
}

/**
 * Sync regular_price for all products in by_weight mode.
 *
 * @return array{synced: int, skipped: int, errors: int}
 */
function jewelry_sync_all_dynamic_prices()
{
    // Reset per-request cache to get fresh prices
    global $jewd_metal_prices_cache;
    $jewd_metal_prices_cache = null;

    $product_ids = get_posts(array(
        'post_type'      => 'product',
        'posts_per_page' => 200,
        'meta_key'       => '_jewelry_pricing_mode',
        'meta_value'     => 'by_weight',
        'fields'         => 'ids',
        'post_status'    => array('publish', 'draft', 'private'),
    ));

    $synced  = 0;
    $skipped = 0;
    $errors  = 0;

    foreach ($product_ids as $product_id) {
        $calculated = jewelry_calculate_dynamic_price($product_id);

        if ($calculated > 0) {
            update_post_meta($product_id, '_price', $calculated);
            update_post_meta($product_id, '_regular_price', $calculated);
            $synced++;
        } else {
            $skipped++;
        }

        // Also sync all variations of this product
        $product = wc_get_product($product_id);
        if ($product && $product->is_type('variable')) {
            $variation_ids = $product->get_children();
            foreach ($variation_ids as $vid) {
                $v_calculated = jewelry_calculate_variation_price($vid, $product_id);
                if ($v_calculated > 0) {
                    update_post_meta($vid, '_price', $v_calculated);
                    update_post_meta($vid, '_regular_price', $v_calculated);
                    $synced++;
                } else {
                    $skipped++;
                }
            }
        }
    }

    return array(
        'synced'  => $synced,
        'skipped' => $skipped,
        'errors'  => $errors,
        'total'   => count($product_ids),
    );
}


// ═══════════════════════════════════════════════════════════════════════════════
// WOOCOMMERCE ADMIN METABOX
// ═══════════════════════════════════════════════════════════════════════════════

add_action('woocommerce_product_options_pricing', 'jewelry_render_pricing_metabox');
add_action('woocommerce_process_product_meta', 'jewelry_save_pricing_metabox');

/**
 * Render dynamic pricing fields in WooCommerce product edit screen.
 */
function jewelry_render_pricing_metabox()
{
    global $post;
    $product_id = $post->ID;
    $mode       = get_post_meta($product_id, '_jewelry_pricing_mode', true) ?: 'fixed';
    $metal_type = get_post_meta($product_id, '_jewelry_metal_type', true) ?: 'gold_14k';
    $weight     = get_post_meta($product_id, '_jewelry_metal_weight', true) ?: '';
    $markup     = get_post_meta($product_id, '_jewelry_markup_pct', true) ?: '';

    echo '<div class="options_group">';
    echo '<p class="form-field"><strong>💰 Precio Dinámico por Peso</strong></p>';

    // Pricing mode
    woocommerce_wp_select(array(
        'id'      => '_jewelry_pricing_mode',
        'label'   => 'Modo de precio',
        'value'   => $mode,
        'options' => array(
            'fixed'     => 'Fijo (manual)',
            'by_weight' => 'Por peso del metal',
        ),
    ));

    // Metal type
    $metal_options = array();
    foreach (JEWD_METAL_TYPES as $key => $info) {
        $metal_options[$key] = $info['label'];
    }
    woocommerce_wp_select(array(
        'id'      => '_jewelry_metal_type',
        'label'   => 'Tipo de metal',
        'value'   => $metal_type,
        'options' => $metal_options,
    ));

    // Weight
    woocommerce_wp_text_input(array(
        'id'                => '_jewelry_metal_weight',
        'label'             => 'Peso del metal (g)',
        'value'             => $weight,
        'type'              => 'number',
        'custom_attributes' => array('step' => '0.01', 'min' => '0', 'max' => '9999.99'),
    ));

    // Markup
    woocommerce_wp_text_input(array(
        'id'                => '_jewelry_markup_pct',
        'label'             => 'Markup (%)',
        'description'       => 'Porcentaje sobre valor del metal (mano de obra, diseño)',
        'desc_tip'          => true,
        'value'             => $markup,
        'type'              => 'number',
        'custom_attributes' => array('step' => '0.01', 'min' => '0', 'max' => '500'),
    ));

    // Show calculated price preview
    if ($mode === 'by_weight' && $weight > 0) {
        $breakdown = jewelry_calculate_price_breakdown($product_id);
        if ($breakdown['total'] > 0) {
            echo '<p class="form-field">';
            echo '<label>Precio calculado</label>';
            echo '<span style="font-size:1.2em;font-weight:bold;color:#2e7d32">';
            echo '$' . number_format($breakdown['total'], 2);
            echo '</span>';
            echo '<span class="description" style="margin-left:10px">';
            echo esc_html($weight) . 'g × $' . number_format($breakdown['price_per_gram'], 2) . '/g';
            if ($markup > 0) {
                echo ' + ' . esc_html($markup) . '% markup';
            }
            echo '</span>';
            echo '</p>';
        }
    }

    echo '</div>';
}

/**
 * Save dynamic pricing meta from WooCommerce product edit screen.
 *
 * @param int $product_id Product ID.
 */
function jewelry_save_pricing_metabox($product_id)
{
    if (isset($_POST['_jewelry_pricing_mode'])) {
        update_post_meta(
            $product_id,
            '_jewelry_pricing_mode',
            jewelry_sanitize_pricing_mode(wp_unslash($_POST['_jewelry_pricing_mode']))
        );
    }
    if (isset($_POST['_jewelry_metal_type'])) {
        update_post_meta(
            $product_id,
            '_jewelry_metal_type',
            jewelry_sanitize_metal_type(wp_unslash($_POST['_jewelry_metal_type']))
        );
    }
    if (isset($_POST['_jewelry_metal_weight'])) {
        update_post_meta(
            $product_id,
            '_jewelry_metal_weight',
            jewelry_sanitize_metal_weight(wp_unslash($_POST['_jewelry_metal_weight']))
        );
    }
    if (isset($_POST['_jewelry_markup_pct'])) {
        update_post_meta(
            $product_id,
            '_jewelry_markup_pct',
            jewelry_sanitize_markup_pct(wp_unslash($_POST['_jewelry_markup_pct']))
        );
    }

    // Update reference price for by_weight products
    $mode = get_post_meta($product_id, '_jewelry_pricing_mode', true);
    if ($mode === 'by_weight') {
        $calculated = jewelry_calculate_dynamic_price($product_id);
        if ($calculated > 0) {
            update_post_meta($product_id, '_price', $calculated);
            update_post_meta($product_id, '_regular_price', $calculated);
        }
    }
}
