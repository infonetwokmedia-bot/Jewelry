<?php

/**
 * Plugin Name: Jewelry Authentication
 * Description: Token-based session authentication for the Tu Joyita Miami
 *              Dashboard SPA. Handles login, logout, token verification,
 *              and WC API key authentication.
 * Version: 2.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry_Auth
 *
 * Split from the original jewelry-roles.php monolith (#49).
 * Dependencies (loaded by other mu-plugins in the same request):
 *   - jewelry_format_user()       — from jewelry-api-users.php
 *   - jewelry_get_allowed_roles() — from jewelry-api-users.php
 */

if (! defined('ABSPATH')) {
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH REST ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'jewelry_register_auth_api');

/**
 * Register authentication REST routes.
 */
function jewelry_register_auth_api()
{
    $namespace = 'jewd/v1';

    // POST /jewd/v1/auth/login — Iniciar sesión
    register_rest_route(
        $namespace,
        '/auth/login',
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_api_login',
            'permission_callback' => '__return_true',
        )
    );

    // GET /jewd/v1/auth/verify — Verificar token
    register_rest_route(
        $namespace,
        '/auth/verify',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_api_verify_token',
            'permission_callback' => '__return_true',
        )
    );

    // POST /jewd/v1/auth/logout — Cerrar sesión
    register_rest_route(
        $namespace,
        '/auth/logout',
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_api_logout',
            'permission_callback' => '__return_true',
        )
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN-BASED SESSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /jewd/v1/auth/login
 * Acepta { username, password } → devuelve token + info de usuario.
 */
function jewelry_api_login($request)
{
    $body     = $request->get_json_params();
    $username = isset($body['username']) ? sanitize_user($body['username']) : '';
    $password = isset($body['password']) ? $body['password'] : '';

    if (empty($username) || empty($password)) {
        return new WP_REST_Response(
            array('error' => 'Usuario y contraseña son requeridos'),
            400
        );
    }

    // Autenticar contra WordPress
    $user = wp_authenticate($username, $password);
    if (is_wp_error($user)) {
        // Rate limit: esperar para prevenir brute force
        sleep(1);
        return new WP_REST_Response(
            array('error' => 'Credenciales inválidas'),
            401
        );
    }

    // Verificar que el usuario tiene acceso al dashboard
    if (!user_can($user, 'jewelry_dashboard_access') && !user_can($user, 'manage_options')) {
        return new WP_REST_Response(
            array('error' => 'No tienes permiso para acceder al dashboard'),
            403
        );
    }

    // Generar token único
    $token = wp_generate_password(64, false, false);
    $hash  = hash('sha256', $token);

    // Almacenar en transient (expira en 12 horas)
    set_transient('jewelry_session_' . $hash, array(
        'user_id'    => $user->ID,
        'created_at' => time(),
        'ip'         => jewelry_get_client_ip(),
        'user_agent' => isset($_SERVER['HTTP_USER_AGENT'])
            ? sanitize_text_field(wp_unslash($_SERVER['HTTP_USER_AGENT']))
            : '',
    ), 12 * HOUR_IN_SECONDS);

    // Guardar lista de sesiones activas del usuario
    $sessions = get_user_meta($user->ID, 'jewelry_active_sessions', true);
    if (!is_array($sessions)) {
        $sessions = array();
    }
    $sessions[$hash] = time();
    update_user_meta($user->ID, 'jewelry_active_sessions', $sessions);

    // Determinar permisos del usuario para el frontend
    $permissions = jewelry_get_user_permissions($user);

    $response_data = jewelry_format_user($user);
    $response_data['token']       = $token;
    $response_data['permissions'] = $permissions;
    $response_data['expires_in']  = 12 * 3600;

    return new WP_REST_Response($response_data, 200);
}

/**
 * GET /jewd/v1/auth/verify
 * Header: Authorization: Bearer <token>
 */
function jewelry_api_verify_token($request)
{
    $user = jewelry_authenticate_dashboard_token();
    if (is_wp_error($user)) {
        return new WP_REST_Response(
            array('error' => $user->get_error_message()),
            401
        );
    }

    $response_data = jewelry_format_user($user);
    $response_data['permissions'] = jewelry_get_user_permissions($user);

    return new WP_REST_Response($response_data, 200);
}

/**
 * POST /jewd/v1/auth/logout
 * Header: Authorization: Bearer <token>
 */
function jewelry_api_logout($request)
{
    $token = jewelry_extract_bearer_token();
    if (empty($token)) {
        return new WP_REST_Response(array('logged_out' => true), 200);
    }

    $hash    = hash('sha256', $token);
    $session = get_transient('jewelry_session_' . $hash);

    if ($session) {
        // Limpiar sesión
        delete_transient('jewelry_session_' . $hash);

        // Limpiar de la lista del usuario
        $sessions = get_user_meta($session['user_id'], 'jewelry_active_sessions', true);
        if (is_array($sessions)) {
            unset($sessions[$hash]);
            update_user_meta($session['user_id'], 'jewelry_active_sessions', $sessions);
        }
    }

    return new WP_REST_Response(array('logged_out' => true), 200);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN EXTRACTION & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extraer Bearer token del header Authorization o X-Dashboard-JWT.
 *
 * When the Nginx proxy injects WC Basic auth, the original JWT is
 * forwarded via X-Dashboard-JWT header instead of Authorization.
 */
function jewelry_extract_bearer_token()
{
    $auth_header = '';

    // 1. Try standard Authorization header first
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = sanitize_text_field(wp_unslash($_SERVER['HTTP_AUTHORIZATION']));
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth_header = sanitize_text_field(wp_unslash($_SERVER['REDIRECT_HTTP_AUTHORIZATION']));
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $auth_header = sanitize_text_field($headers['Authorization']);
        }
    }

    if (preg_match('/^Bearer\s+(.+)$/i', $auth_header, $matches)) {
        return $matches[1];
    }

    // 2. Try X-Dashboard-JWT header (set by Nginx proxy when Authorization
    //    is overwritten with WC Basic auth for WooCommerce endpoints).
    if (isset($_SERVER['HTTP_X_DASHBOARD_JWT'])) {
        $jwt_header = sanitize_text_field(wp_unslash($_SERVER['HTTP_X_DASHBOARD_JWT']));
        if (preg_match('/^Bearer\s+(.+)$/i', $jwt_header, $matches)) {
            return $matches[1];
        }
    }

    // Security: query param fallback removed — tokens must be sent via
    // Authorization header to avoid exposure in logs and browser history.
    return '';
}

/**
 * Autenticar request de dashboard usando Bearer token.
 *
 * @return WP_User|WP_Error
 */
function jewelry_authenticate_dashboard_token()
{
    $token = jewelry_extract_bearer_token();
    if (empty($token)) {
        return new WP_Error('no_token', 'Token de autenticación requerido', array('status' => 401));
    }

    $hash    = hash('sha256', $token);
    $session = get_transient('jewelry_session_' . $hash);

    if (!$session || empty($session['user_id'])) {
        return new WP_Error('invalid_token', 'Token inválido o expirado', array('status' => 401));
    }

    $user = get_user_by('id', $session['user_id']);
    if (!$user) {
        delete_transient('jewelry_session_' . $hash);
        return new WP_Error('user_not_found', 'Usuario no encontrado', array('status' => 401));
    }

    return $user;
}

/**
 * Autenticar request usando WC API keys.
 * Acepta Authorization: Basic header (preferido) o consumer_key/consumer_secret en query params (legacy).
 */
function jewelry_authenticate_api_request()
{
    $consumer_key = '';

    // 1. Intentar Authorization: Basic header (preferido — no expone keys en logs)
    $auth_header = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = sanitize_text_field(wp_unslash($_SERVER['HTTP_AUTHORIZATION']));
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $auth_header = sanitize_text_field(wp_unslash($_SERVER['REDIRECT_HTTP_AUTHORIZATION']));
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) {
            $auth_header = sanitize_text_field($headers['Authorization']);
        }
    }

    if (! empty($auth_header) && preg_match('/^Basic\s+(.+)$/i', $auth_header, $matches)) {
        // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
        $decoded = base64_decode($matches[1], true);
        if ($decoded && strpos($decoded, ':') !== false) {
            list($consumer_key) = explode(':', $decoded, 2);
            $consumer_key = sanitize_text_field($consumer_key);
        }
    }

    // 2. Fallback: query params (legacy support)
    if (empty($consumer_key)) {
        // phpcs:disable WordPress.Security.NonceVerification.Recommended
        $consumer_key = isset($_GET['consumer_key'])
            ? sanitize_text_field(wp_unslash($_GET['consumer_key']))
            : '';
        // phpcs:enable
    }

    if (empty($consumer_key)) {
        return new WP_Error('no_auth', 'Authentication required', array('status' => 401));
    }

    // Buscar el API key en la BD de WooCommerce
    global $wpdb;
    $key = $wpdb->get_row(
        $wpdb->prepare(
            "SELECT key_id, user_id, permissions, consumer_key, consumer_secret
             FROM {$wpdb->prefix}woocommerce_api_keys
             WHERE consumer_key = %s",
            wc_api_hash($consumer_key)
        )
    );

    if (! $key) {
        return new WP_Error('invalid_key', 'Invalid API key', array('status' => 401));
    }

    return get_user_by('id', $key->user_id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtener permisos del usuario para el frontend.
 */
function jewelry_get_user_permissions($user)
{
    return array(
        'dashboard_access'   => user_can($user, 'jewelry_dashboard_access') || user_can($user, 'manage_options'),
        'view_products'      => user_can($user, 'jewelry_view_products') || user_can($user, 'manage_options'),
        'edit_products'      => user_can($user, 'jewelry_edit_products') || user_can($user, 'manage_options'),
        'create_orders'      => user_can($user, 'jewelry_create_orders') || user_can($user, 'manage_options'),
        'view_orders'        => user_can($user, 'jewelry_view_orders') || user_can($user, 'manage_options'),
        'view_reports'       => user_can($user, 'jewelry_view_reports') || user_can($user, 'manage_options'),
        'manage_coupons'     => user_can($user, 'jewelry_manage_coupons') || user_can($user, 'manage_options'),
        'manage_users'       => user_can($user, 'jewelry_manage_users') || user_can($user, 'manage_options'),
        'manage_settings'    => user_can($user, 'manage_options'),
        'manage_woocommerce' => user_can($user, 'manage_woocommerce') || user_can($user, 'manage_options'),
    );
}

/**
 * Obtener IP del cliente.
 */
function jewelry_get_client_ip()
{
    $ip_keys = array('HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR');
    foreach ($ip_keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ip = sanitize_text_field(wp_unslash($_SERVER[$key]));
            // Si hay múltiples IPs (X-Forwarded-For), tomar la primera
            if (strpos($ip, ',') !== false) {
                $ip = trim(explode(',', $ip)[0]);
            }
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}
