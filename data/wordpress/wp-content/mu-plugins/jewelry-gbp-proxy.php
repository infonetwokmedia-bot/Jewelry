<?php

/**
 * Plugin Name: Jewelry Google Business Profile Proxy
 * Description: REST API proxy for Google Business Profile. Stores OAuth tokens
 *              securely in wp_options and provides proxy endpoints for the
 *              Dashboard SPA. Never exposes Google OAuth credentials to the frontend.
 * Version: 1.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry_GBP_Proxy
 *
 * Dependencies (loaded by other mu-plugins in the same request):
 *   - jewelry_authenticate_dashboard_token() — from jewelry-auth.php
 *   - jewelry_authenticate_api_request()     — from jewelry-auth.php
 *
 * Endpoints:
 *   GET  /jewd/v1/gbp/reviews              — List reviews
 *   POST /jewd/v1/gbp/reviews/{id}/reply   — Reply to a review
 *   DELETE /jewd/v1/gbp/reviews/{id}/reply  — Delete a review reply
 *   GET  /jewd/v1/gbp/posts                — List posts
 *   POST /jewd/v1/gbp/posts                — Create a post
 *   DELETE /jewd/v1/gbp/posts/{id}          — Delete a post
 *   GET  /jewd/v1/gbp/metrics              — Performance metrics
 *   GET  /jewd/v1/gbp/keywords             — Search keywords
 *   GET  /jewd/v1/gbp/info                 — Location info
 *   POST /jewd/v1/gbp/info                 — Update location info
 *   GET  /jewd/v1/gbp/media                — List media
 *   GET  /jewd/v1/gbp/questions             — List Q&A
 *   POST /jewd/v1/gbp/questions/{id}/answer — Answer a question
 *   GET  /jewd/v1/gbp/oauth/callback       — OAuth callback (one-time setup)
 *   GET  /jewd/v1/gbp/status               — Connection status
 */

if (! defined('ABSPATH')) {
    exit;
}

// Option keys for storing GBP credentials securely in wp_options
define('JEWELRY_GBP_CLIENT_ID', 'jewelry_gbp_client_id');
define('JEWELRY_GBP_CLIENT_SECRET', 'jewelry_gbp_client_secret');
define('JEWELRY_GBP_REFRESH_TOKEN', 'jewelry_gbp_refresh_token');
define('JEWELRY_GBP_ACCESS_TOKEN', 'jewelry_gbp_access_token');
define('JEWELRY_GBP_TOKEN_EXPIRES', 'jewelry_gbp_token_expires');
define('JEWELRY_GBP_ACCOUNT_ID', 'jewelry_gbp_account_id');
define('JEWELRY_GBP_LOCATION_ID', 'jewelry_gbp_location_id');

// Cache TTLs in seconds
define('JEWELRY_GBP_CACHE_REVIEWS', 300);     // 5 min
define('JEWELRY_GBP_CACHE_POSTS', 600);       // 10 min
define('JEWELRY_GBP_CACHE_METRICS', 900);     // 15 min
define('JEWELRY_GBP_CACHE_KEYWORDS', 3600);   // 1 hour
define('JEWELRY_GBP_CACHE_INFO', 1800);       // 30 min
define('JEWELRY_GBP_CACHE_MEDIA', 600);       // 10 min
define('JEWELRY_GBP_CACHE_QUESTIONS', 300);   // 5 min

// Rate limiting
define('JEWELRY_GBP_RATE_LIMIT', 250);        // max requests per window
define('JEWELRY_GBP_RATE_WINDOW', 60);        // window in seconds

// ═══════════════════════════════════════════════════════════════════════════════
// REST ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'jewelry_register_gbp_api');

/**
 * Register all GBP proxy REST routes.
 */
function jewelry_register_gbp_api()
{
    $ns = 'jewd/v1';

    // Status / OAuth
    register_rest_route($ns, '/gbp/status', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_gbp_status',
        'permission_callback' => 'jewelry_gbp_can_manage',
    ));

    register_rest_route($ns, '/gbp/oauth/callback', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_gbp_oauth_callback',
        'permission_callback' => '__return_true', // Public — Google redirects here
    ));

    register_rest_route($ns, '/gbp/oauth/init', array(
        'methods'             => 'POST',
        'callback'            => 'jewelry_gbp_oauth_init',
        'permission_callback' => 'jewelry_gbp_can_manage',
    ));

    // Reviews
    register_rest_route($ns, '/gbp/reviews', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_gbp_list_reviews',
        'permission_callback' => 'jewelry_gbp_can_view',
    ));

    register_rest_route($ns, '/gbp/reviews/(?P<reviewId>[a-zA-Z0-9_-]+)/reply', array(
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_gbp_reply_review',
            'permission_callback' => 'jewelry_gbp_can_manage',
        ),
        array(
            'methods'             => 'DELETE',
            'callback'            => 'jewelry_gbp_delete_reply',
            'permission_callback' => 'jewelry_gbp_can_manage',
        ),
    ));

    // Posts
    register_rest_route($ns, '/gbp/posts', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_gbp_list_posts',
            'permission_callback' => 'jewelry_gbp_can_view',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_gbp_create_post',
            'permission_callback' => 'jewelry_gbp_can_manage',
        ),
    ));

    register_rest_route($ns, '/gbp/posts/(?P<postId>[a-zA-Z0-9_-]+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'jewelry_gbp_delete_post',
        'permission_callback' => 'jewelry_gbp_can_manage',
    ));

    // Metrics
    register_rest_route($ns, '/gbp/metrics', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_gbp_get_metrics',
        'permission_callback' => 'jewelry_gbp_can_view',
    ));

    register_rest_route($ns, '/gbp/keywords', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_gbp_get_keywords',
        'permission_callback' => 'jewelry_gbp_can_view',
    ));

    // Info
    register_rest_route($ns, '/gbp/info', array(
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_gbp_get_info',
            'permission_callback' => 'jewelry_gbp_can_view',
        ),
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_gbp_update_info',
            'permission_callback' => 'jewelry_gbp_can_manage',
        ),
    ));

    // Media
    register_rest_route($ns, '/gbp/media', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_gbp_list_media',
        'permission_callback' => 'jewelry_gbp_can_view',
    ));

    // Q&A
    register_rest_route($ns, '/gbp/questions', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_gbp_list_questions',
        'permission_callback' => 'jewelry_gbp_can_view',
    ));

    register_rest_route($ns, '/gbp/questions/(?P<questionId>[a-zA-Z0-9_-]+)/answer', array(
        'methods'             => 'POST',
        'callback'            => 'jewelry_gbp_answer_question',
        'permission_callback' => 'jewelry_gbp_can_manage',
    ));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION CALLBACKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Only administrators and shop_managers can manage GBP (write operations).
 */
function jewelry_gbp_can_manage()
{
    $user = jewelry_authenticate_api_request();
    if (is_wp_error($user)) {
        return $user;
    }
    return current_user_can('manage_woocommerce') || current_user_can('manage_options');
}

/**
 * Viewers, sellers, managers, admins can view GBP data.
 */
function jewelry_gbp_can_view()
{
    $user = jewelry_authenticate_api_request();
    if (is_wp_error($user)) {
        return $user;
    }
    return current_user_can('read');
}

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check connection status.
 */
function jewelry_gbp_status()
{
    $refresh = get_option(JEWELRY_GBP_REFRESH_TOKEN, '');
    $account = get_option(JEWELRY_GBP_ACCOUNT_ID, '');
    $location = get_option(JEWELRY_GBP_LOCATION_ID, '');

    return rest_ensure_response(array(
        'connected'  => ! empty($refresh),
        'hasAccount' => ! empty($account),
        'hasLocation' => ! empty($location),
        'accountId'  => $account ? '***' . substr($account, -4) : null,
        'locationId' => $location ? '***' . substr($location, -4) : null,
    ));
}

/**
 * Initialize OAuth flow — returns the Google authorization URL.
 * Admin POSTs client_id + client_secret, we store them and return the auth URL.
 */
function jewelry_gbp_oauth_init(WP_REST_Request $request)
{
    $client_id = sanitize_text_field($request->get_param('client_id'));
    $client_secret = sanitize_text_field($request->get_param('client_secret'));

    if (empty($client_id) || empty($client_secret)) {
        return new WP_Error(
            'missing_credentials',
            'client_id and client_secret are required.',
            array('status' => 400)
        );
    }

    // Store securely in wp_options
    update_option(JEWELRY_GBP_CLIENT_ID, $client_id, false);
    update_option(JEWELRY_GBP_CLIENT_SECRET, $client_secret, false);

    // Build Google OAuth URL
    $redirect_uri = rest_url('jewd/v1/gbp/oauth/callback');
    // Use a transient for state verification (wp_nonce fails on OAuth redirect without session)
    $state = wp_generate_password(32, false);
    set_transient('jewelry_gbp_oauth_state', $state, 600); // 10 min expiry

    $auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query(array(
        'client_id'     => $client_id,
        'redirect_uri'  => $redirect_uri,
        'response_type' => 'code',
        'scope'         => 'https://www.googleapis.com/auth/business.manage',
        'access_type'   => 'offline',
        'prompt'        => 'consent',
        'state'         => $state,
    ));

    return rest_ensure_response(array(
        'authUrl'     => $auth_url,
        'redirectUri' => $redirect_uri,
        'message'     => 'Open authUrl in your browser to authorize. Add redirectUri to your Google Cloud Console OAuth credentials.',
    ));
}

/**
 * OAuth callback — Google redirects here with ?code=...&state=...
 * Exchanges code for tokens and stores the refresh token.
 */
function jewelry_gbp_oauth_callback(WP_REST_Request $request)
{
    $code = sanitize_text_field($request->get_param('code'));
    $state = sanitize_text_field($request->get_param('state'));
    $error = sanitize_text_field($request->get_param('error'));

    if (! empty($error)) {
        return new WP_Error('oauth_error', 'Google OAuth error: ' . $error, array('status' => 400));
    }

    if (empty($code)) {
        return new WP_Error('missing_code', 'Authorization code not received.', array('status' => 400));
    }

    // Verify state via transient (not nonce — OAuth redirect has no WordPress session)
    $stored_state = get_transient('jewelry_gbp_oauth_state');
    if (empty($stored_state) || ! hash_equals($stored_state, $state)) {
        return new WP_Error('invalid_state', 'Invalid or expired OAuth state parameter.', array('status' => 403));
    }
    delete_transient('jewelry_gbp_oauth_state');

    $client_id = get_option(JEWELRY_GBP_CLIENT_ID, '');
    $client_secret = get_option(JEWELRY_GBP_CLIENT_SECRET, '');

    if (empty($client_id) || empty($client_secret)) {
        return new WP_Error('not_configured', 'OAuth credentials not configured. Run /gbp/oauth/init first.', array('status' => 400));
    }

    $redirect_uri = rest_url('jewd/v1/gbp/oauth/callback');

    // Exchange code for tokens
    $response = wp_remote_post('https://oauth2.googleapis.com/token', array(
        'body' => array(
            'code'          => $code,
            'client_id'     => $client_id,
            'client_secret' => $client_secret,
            'redirect_uri'  => $redirect_uri,
            'grant_type'    => 'authorization_code',
        ),
    ));

    if (is_wp_error($response)) {
        return new WP_Error('token_exchange_failed', $response->get_error_message(), array('status' => 500));
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (isset($body['error'])) {
        return new WP_Error('token_error', $body['error_description'] ?? $body['error'], array('status' => 400));
    }

    // Store tokens
    if (! empty($body['refresh_token'])) {
        update_option(JEWELRY_GBP_REFRESH_TOKEN, $body['refresh_token'], false);
    }
    if (! empty($body['access_token'])) {
        update_option(JEWELRY_GBP_ACCESS_TOKEN, $body['access_token'], false);
        update_option(JEWELRY_GBP_TOKEN_EXPIRES, time() + intval($body['expires_in'] ?? 3600), false);
    }

    // Return a simple HTML success page
    $html = '<!DOCTYPE html><html><head><title>GBP Connected</title></head>';
    $html .= '<body style="font-family:sans-serif;text-align:center;padding:50px">';
    $html .= '<h1 style="color:#27ae60">&#10004; Google Business Profile Connected</h1>';
    $html .= '<p>Tu Joyita Miami is now connected to your Google Business Profile.</p>';
    $html .= '<p>You can close this window and return to the dashboard.</p>';
    $html .= '</body></html>';

    // Output HTML directly
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT (internal)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a valid access token, refreshing if expired.
 *
 * @return string|WP_Error Access token or error.
 */
function jewelry_gbp_get_access_token()
{
    $access_token = get_option(JEWELRY_GBP_ACCESS_TOKEN, '');
    $expires = intval(get_option(JEWELRY_GBP_TOKEN_EXPIRES, 0));

    // If token is still valid (with 60s buffer), return it
    if (! empty($access_token) && $expires > (time() + 60)) {
        return $access_token;
    }

    // Refresh the token
    $refresh_token = get_option(JEWELRY_GBP_REFRESH_TOKEN, '');
    $client_id = get_option(JEWELRY_GBP_CLIENT_ID, '');
    $client_secret = get_option(JEWELRY_GBP_CLIENT_SECRET, '');

    if (empty($refresh_token) || empty($client_id) || empty($client_secret)) {
        return new WP_Error('not_connected', 'Google Business Profile is not connected. Complete OAuth setup first.', array('status' => 401));
    }

    $response = wp_remote_post('https://oauth2.googleapis.com/token', array(
        'body' => array(
            'refresh_token' => $refresh_token,
            'client_id'     => $client_id,
            'client_secret' => $client_secret,
            'grant_type'    => 'refresh_token',
        ),
    ));

    if (is_wp_error($response)) {
        return new WP_Error('refresh_failed', $response->get_error_message(), array('status' => 500));
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (isset($body['error'])) {
        return new WP_Error('refresh_error', $body['error_description'] ?? $body['error'], array('status' => 401));
    }

    $new_token = sanitize_text_field($body['access_token'] ?? '');
    if (empty($new_token)) {
        return new WP_Error('no_token', 'No access token in refresh response.', array('status' => 500));
    }

    update_option(JEWELRY_GBP_ACCESS_TOKEN, $new_token, false);
    update_option(JEWELRY_GBP_TOKEN_EXPIRES, time() + intval($body['expires_in'] ?? 3600), false);

    return $new_token;
}

/**
 * Make an authenticated request to a Google API.
 *
 * @param string $url     Full API URL.
 * @param string $method  HTTP method (GET, POST, PATCH, DELETE).
 * @param array  $body    Request body (for POST/PATCH).
 * @return array|WP_Error Decoded response or error.
 */
function jewelry_gbp_api_request($url, $method = 'GET', $body = null)
{
    $token = jewelry_gbp_get_access_token();
    if (is_wp_error($token)) {
        return $token;
    }

    $args = array(
        'method'  => $method,
        'headers' => array(
            'Authorization' => 'Bearer ' . $token,
            'Content-Type'  => 'application/json',
        ),
        'timeout' => 30,
    );

    if ($body !== null && in_array($method, array('POST', 'PATCH'), true)) {
        $args['body'] = wp_json_encode($body);
    }

    $response = wp_remote_request($url, $args);

    if (is_wp_error($response)) {
        return $response;
    }

    $code = wp_remote_retrieve_response_code($response);
    $decoded = json_decode(wp_remote_retrieve_body($response), true);

    if ($code >= 400) {
        $error_msg = isset($decoded['error']['message']) ? $decoded['error']['message'] : 'Google API error';
        return new WP_Error('google_api_error', $error_msg, array('status' => $code));
    }

    return $decoded;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Build resource path
// ═══════════════════════════════════════════════════════════════════════════════

function jewelry_gbp_account_path()
{
    return 'accounts/' . get_option(JEWELRY_GBP_ACCOUNT_ID, '');
}

function jewelry_gbp_location_path()
{
    return jewelry_gbp_account_path() . '/locations/' . get_option(JEWELRY_GBP_LOCATION_ID, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE LAYER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get cached response for a GBP endpoint.
 *
 * @param string $key Cache key suffix.
 * @return array|false Cached data or false.
 */
function jewelry_gbp_cache_get($key)
{
    $cache_key = 'jewelry_gbp_' . md5($key);
    $cached = get_transient($cache_key);
    return $cached !== false ? $cached : false;
}

/**
 * Store a response in cache.
 *
 * @param string $key  Cache key suffix.
 * @param mixed  $data Data to cache.
 * @param int    $ttl  TTL in seconds.
 */
function jewelry_gbp_cache_set($key, $data, $ttl)
{
    $cache_key = 'jewelry_gbp_' . md5($key);
    set_transient($cache_key, $data, $ttl);
}

/**
 * Invalidate cache entries matching a prefix.
 *
 * @param string $prefix Prefix to match (e.g. 'reviews', 'posts').
 */
function jewelry_gbp_cache_invalidate($prefix)
{
    global $wpdb;
    $like = $wpdb->esc_like('_transient_jewelry_gbp_') . '%';
    // Delete matching transients — we use a brute approach: delete by known keys
    // since transient names are hashed, we track invalidation by group
    $group_key = 'jewelry_gbp_inv_' . $prefix;
    $keys = get_option($group_key, array());
    foreach ($keys as $k) {
        delete_transient($k);
    }
    update_option($group_key, array(), false);
}

/**
 * Track a cache key for later invalidation.
 */
function jewelry_gbp_cache_track($prefix, $key)
{
    $cache_key = 'jewelry_gbp_' . md5($key);
    $group_key = 'jewelry_gbp_inv_' . $prefix;
    $keys = get_option($group_key, array());
    if (! in_array($cache_key, $keys, true)) {
        $keys[] = $cache_key;
        // Keep max 50 tracked keys per group
        if (count($keys) > 50) {
            $keys = array_slice($keys, -50);
        }
        update_option($group_key, $keys, false);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check and enforce rate limiting on Google API calls.
 *
 * @return true|WP_Error True if allowed, error if rate limited.
 */
function jewelry_gbp_check_rate_limit()
{
    $key = 'jewelry_gbp_rate_' . get_current_user_id();
    $count = (int) get_transient($key);

    if ($count >= JEWELRY_GBP_RATE_LIMIT) {
        return new WP_Error(
            'rate_limited',
            'Too many GBP API requests. Please wait before retrying.',
            array('status' => 429)
        );
    }

    set_transient($key, $count + 1, JEWELRY_GBP_RATE_WINDOW);
    return true;
}

/**
 * Make a cached, rate-limited request to Google API.
 *
 * @param string $cache_key   Unique cache key for this request.
 * @param string $cache_group Group name for invalidation (e.g. 'reviews').
 * @param int    $ttl         Cache TTL in seconds.
 * @param string $url         Google API URL.
 * @param string $method      HTTP method.
 * @param array  $body        Request body.
 * @return array|WP_Error Response data or error.
 */
function jewelry_gbp_cached_request($cache_key, $cache_group, $ttl, $url, $method = 'GET', $body = null)
{
    // Check cache first for GET requests
    if ($method === 'GET') {
        $cached = jewelry_gbp_cache_get($cache_key);
        if ($cached !== false) {
            return $cached;
        }
    }

    // Rate limit check
    $rate_check = jewelry_gbp_check_rate_limit();
    if (is_wp_error($rate_check)) {
        return $rate_check;
    }

    $result = jewelry_gbp_api_request($url, $method, $body);
    if (is_wp_error($result)) {
        return $result;
    }

    // Cache successful GET responses
    if ($method === 'GET') {
        jewelry_gbp_cache_set($cache_key, $result, $ttl);
        jewelry_gbp_cache_track($cache_group, $cache_key);
    }

    return $result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════════════════

function jewelry_gbp_list_reviews(WP_REST_Request $request)
{
    $page_size = absint($request->get_param('pageSize') ?: 50);
    $page_token = sanitize_text_field($request->get_param('pageToken') ?: '');
    $order_by = sanitize_text_field($request->get_param('orderBy') ?: 'updateTime desc');

    $url = 'https://mybusiness.googleapis.com/v4/' . jewelry_gbp_location_path() . '/reviews';
    $url .= '?' . http_build_query(array_filter(array(
        'pageSize'  => $page_size,
        'pageToken' => $page_token,
        'orderBy'   => $order_by,
    )));

    $cache_key = 'reviews_' . $page_size . '_' . $page_token . '_' . $order_by;
    $result = jewelry_gbp_cached_request($cache_key, 'reviews', JEWELRY_GBP_CACHE_REVIEWS, $url);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

function jewelry_gbp_reply_review(WP_REST_Request $request)
{
    $review_id = sanitize_text_field($request['reviewId']);
    $comment = sanitize_textarea_field($request->get_param('comment'));

    if (empty($comment)) {
        return new WP_Error('missing_comment', 'Reply comment is required.', array('status' => 400));
    }

    $url = 'https://mybusiness.googleapis.com/v4/' . jewelry_gbp_location_path()
           . '/reviews/' . $review_id . '/reply';

    $result = jewelry_gbp_api_request($url, 'POST', array('comment' => $comment));
    if (is_wp_error($result)) {
        return $result;
    }

    jewelry_gbp_cache_invalidate('reviews');
    return rest_ensure_response($result);
}

function jewelry_gbp_delete_reply(WP_REST_Request $request)
{
    $review_id = sanitize_text_field($request['reviewId']);

    $url = 'https://mybusiness.googleapis.com/v4/' . jewelry_gbp_location_path()
           . '/reviews/' . $review_id . '/reply';

    $result = jewelry_gbp_api_request($url, 'DELETE');
    if (is_wp_error($result)) {
        return $result;
    }

    jewelry_gbp_cache_invalidate('reviews');
    return rest_ensure_response(array('deleted' => true));
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSTS
// ═══════════════════════════════════════════════════════════════════════════════

function jewelry_gbp_list_posts(WP_REST_Request $request)
{
    $page_size = absint($request->get_param('pageSize') ?: 20);
    $page_token = sanitize_text_field($request->get_param('pageToken') ?: '');

    $url = 'https://mybusiness.googleapis.com/v4/' . jewelry_gbp_location_path() . '/localPosts';
    $url .= '?' . http_build_query(array_filter(array(
        'pageSize'  => $page_size,
        'pageToken' => $page_token,
    )));

    $cache_key = 'posts_' . $page_size . '_' . $page_token;
    $result = jewelry_gbp_cached_request($cache_key, 'posts', JEWELRY_GBP_CACHE_POSTS, $url);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

function jewelry_gbp_create_post(WP_REST_Request $request)
{
    $body = $request->get_json_params();

    // Sanitize required fields
    $post_data = array(
        'summary'      => sanitize_textarea_field($body['summary'] ?? ''),
        'languageCode' => sanitize_text_field($body['languageCode'] ?? 'es'),
        'topicType'    => sanitize_text_field($body['topicType'] ?? 'STANDARD'),
    );

    if (empty($post_data['summary'])) {
        return new WP_Error('missing_summary', 'Post summary is required.', array('status' => 400));
    }

    // Optional CTA
    if (! empty($body['callToActionType'])) {
        $post_data['callToAction'] = array(
            'actionType' => sanitize_text_field($body['callToActionType']),
        );
        if (! empty($body['callToActionUrl'])) {
            $post_data['callToAction']['url'] = esc_url_raw($body['callToActionUrl']);
        }
    }

    // Optional event
    if (! empty($body['eventTitle'])) {
        $post_data['event'] = array(
            'title' => sanitize_text_field($body['eventTitle']),
        );
        if (! empty($body['eventStartDate'])) {
            $post_data['event']['schedule']['startDate'] = jewelry_gbp_parse_date($body['eventStartDate']);
        }
        if (! empty($body['eventEndDate'])) {
            $post_data['event']['schedule']['endDate'] = jewelry_gbp_parse_date($body['eventEndDate']);
        }
    }

    // Optional offer
    if (! empty($body['couponCode'])) {
        $post_data['offer'] = array(
            'couponCode' => sanitize_text_field($body['couponCode']),
        );
        if (! empty($body['redeemUrl'])) {
            $post_data['offer']['redeemOnlineUrl'] = esc_url_raw($body['redeemUrl']);
        }
    }

    $url = 'https://mybusiness.googleapis.com/v4/' . jewelry_gbp_location_path() . '/localPosts';

    $result = jewelry_gbp_api_request($url, 'POST', $post_data);
    if (is_wp_error($result)) {
        return $result;
    }

    jewelry_gbp_cache_invalidate('posts');
    return rest_ensure_response($result);
}

function jewelry_gbp_delete_post(WP_REST_Request $request)
{
    $post_id = sanitize_text_field($request['postId']);

    $url = 'https://mybusiness.googleapis.com/v4/' . jewelry_gbp_location_path()
           . '/localPosts/' . $post_id;

    $result = jewelry_gbp_api_request($url, 'DELETE');
    if (is_wp_error($result)) {
        return $result;
    }

    jewelry_gbp_cache_invalidate('posts');
    return rest_ensure_response(array('deleted' => true));
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════════════════════

function jewelry_gbp_get_metrics(WP_REST_Request $request)
{
    $start = sanitize_text_field($request->get_param('startDate') ?: gmdate('Y-m-d', strtotime('-30 days')));
    $end = sanitize_text_field($request->get_param('endDate') ?: gmdate('Y-m-d'));
    $metric = sanitize_text_field($request->get_param('metric') ?: 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS');

    $location = 'locations/' . get_option(JEWELRY_GBP_LOCATION_ID, '');
    $url = 'https://businessprofileperformance.googleapis.com/v1/' . $location
           . ':getDailyMetricsTimeSeries?' . http_build_query(array(
               'dailyMetric'           => $metric,
               'dailyRange.start_date' => $start,
               'dailyRange.end_date'   => $end,
           ));

    $cache_key = 'metrics_' . $metric . '_' . $start . '_' . $end;
    $result = jewelry_gbp_cached_request($cache_key, 'metrics', JEWELRY_GBP_CACHE_METRICS, $url);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

function jewelry_gbp_get_keywords(WP_REST_Request $request)
{
    $start = sanitize_text_field($request->get_param('startDate') ?: gmdate('Y-m-d', strtotime('-30 days')));
    $end = sanitize_text_field($request->get_param('endDate') ?: gmdate('Y-m-d'));

    $location = 'locations/' . get_option(JEWELRY_GBP_LOCATION_ID, '');
    $url = 'https://businessprofileperformance.googleapis.com/v1/' . $location
           . '/searchkeywords/impressions/monthly?' . http_build_query(array(
               'monthlyRange.start_month.year'  => gmdate('Y', strtotime($start)),
               'monthlyRange.start_month.month' => gmdate('n', strtotime($start)),
               'monthlyRange.end_month.year'    => gmdate('Y', strtotime($end)),
               'monthlyRange.end_month.month'   => gmdate('n', strtotime($end)),
           ));

    $cache_key = 'keywords_' . $start . '_' . $end;
    $result = jewelry_gbp_cached_request($cache_key, 'keywords', JEWELRY_GBP_CACHE_KEYWORDS, $url);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS INFO
// ═══════════════════════════════════════════════════════════════════════════════

function jewelry_gbp_get_info()
{
    $location = 'locations/' . get_option(JEWELRY_GBP_LOCATION_ID, '');
    $url = 'https://mybusinessbusinessinformation.googleapis.com/v1/' . $location
           . '?readMask=name,title,phoneNumbers,websiteUri,storefrontAddress,regularHours,specialHours,categories,profile';

    $cache_key = 'info_' . $location;
    $result = jewelry_gbp_cached_request($cache_key, 'info', JEWELRY_GBP_CACHE_INFO, $url);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

function jewelry_gbp_update_info(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    $update_fields = array();
    $update_mask = array();

    if (isset($body['phone'])) {
        $update_fields['phoneNumbers'] = array('primaryPhone' => sanitize_text_field($body['phone']));
        $update_mask[] = 'phoneNumbers';
    }
    if (isset($body['website'])) {
        $update_fields['websiteUri'] = esc_url_raw($body['website']);
        $update_mask[] = 'websiteUri';
    }
    if (isset($body['description'])) {
        $update_fields['profile'] = array('description' => sanitize_textarea_field($body['description']));
        $update_mask[] = 'profile.description';
    }

    if (empty($update_mask)) {
        return new WP_Error('no_fields', 'No fields to update.', array('status' => 400));
    }

    $location = 'locations/' . get_option(JEWELRY_GBP_LOCATION_ID, '');
    $url = 'https://mybusinessbusinessinformation.googleapis.com/v1/' . $location
           . '?updateMask=' . implode(',', $update_mask);

    $result = jewelry_gbp_api_request($url, 'PATCH', $update_fields);
    if (is_wp_error($result)) {
        return $result;
    }

    jewelry_gbp_cache_invalidate('info');
    return rest_ensure_response($result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA
// ═══════════════════════════════════════════════════════════════════════════════

function jewelry_gbp_list_media(WP_REST_Request $request)
{
    $page_size = absint($request->get_param('pageSize') ?: 50);

    $url = 'https://mybusiness.googleapis.com/v4/' . jewelry_gbp_location_path() . '/media';
    $url .= '?pageSize=' . $page_size;

    $cache_key = 'media_' . $page_size;
    $result = jewelry_gbp_cached_request($cache_key, 'media', JEWELRY_GBP_CACHE_MEDIA, $url);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Q&A
// ═══════════════════════════════════════════════════════════════════════════════

function jewelry_gbp_list_questions(WP_REST_Request $request)
{
    $page_size = absint($request->get_param('pageSize') ?: 20);
    $page_token = sanitize_text_field($request->get_param('pageToken') ?: '');

    $location = 'locations/' . get_option(JEWELRY_GBP_LOCATION_ID, '');
    $url = 'https://mybusinessqanda.googleapis.com/v1/' . $location . '/questions';
    $url .= '?' . http_build_query(array_filter(array(
        'pageSize'  => $page_size,
        'pageToken' => $page_token,
    )));

    $cache_key = 'questions_' . $page_size . '_' . $page_token;
    $result = jewelry_gbp_cached_request($cache_key, 'questions', JEWELRY_GBP_CACHE_QUESTIONS, $url);
    if (is_wp_error($result)) {
        return $result;
    }

    return rest_ensure_response($result);
}

function jewelry_gbp_answer_question(WP_REST_Request $request)
{
    $question_id = sanitize_text_field($request['questionId']);
    $text = sanitize_textarea_field($request->get_param('text'));

    if (empty($text)) {
        return new WP_Error('missing_text', 'Answer text is required.', array('status' => 400));
    }

    $location = 'locations/' . get_option(JEWELRY_GBP_LOCATION_ID, '');
    $url = 'https://mybusinessqanda.googleapis.com/v1/' . $location
           . '/questions/' . $question_id . '/answers:upsert';

    $result = jewelry_gbp_api_request($url, 'POST', array('text' => $text));
    if (is_wp_error($result)) {
        return $result;
    }

    jewelry_gbp_cache_invalidate('questions');
    return rest_ensure_response($result);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATE HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a YYYY-MM-DD date string into Google's Date object {year, month, day}.
 */
function jewelry_gbp_parse_date($date_str)
{
    $parts = explode('-', sanitize_text_field($date_str));
    return array(
        'year'  => intval($parts[0] ?? 0),
        'month' => intval($parts[1] ?? 0),
        'day'   => intval($parts[2] ?? 0),
    );
}
