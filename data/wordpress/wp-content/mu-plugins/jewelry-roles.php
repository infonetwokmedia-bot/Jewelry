<?php

/**
 * Plugin Name: Jewelry Roles & User Management
 * Description: Roles custom para Tu Joyita Miami — Dueño, Gerente, Vendedor, Consultor.
 *              Incluye REST API para gestión de usuarios desde el Dashboard SPA.
 * Version: 1.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry_Roles
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

// ═══════════════════════════════════════════════════════════════════════════════
// REST API — GESTIÓN DE USUARIOS DESDE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'jewelry_register_user_api');
add_action('rest_api_init', 'jewelry_register_sales_api');

function jewelry_register_user_api()
{
    $namespace = 'jewd/v1';

    // ── Autenticación ────────────────────────────────────────────────────

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

    // ── Gestión de Usuarios ──────────────────────────────────────────────

    // GET /jewd/v1/users — Listar usuarios con roles de joyería
    register_rest_route(
        $namespace,
        '/users',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_api_list_users',
            'permission_callback' => 'jewelry_api_can_manage_users',
        )
    );

    // POST /jewd/v1/users — Crear usuario
    register_rest_route(
        $namespace,
        '/users',
        array(
            'methods'             => 'POST',
            'callback'            => 'jewelry_api_create_user',
            'permission_callback' => 'jewelry_api_can_manage_users',
        )
    );

    // PUT /jewd/v1/users/(?P<id>\d+) — Editar usuario
    register_rest_route(
        $namespace,
        '/users/(?P<id>\d+)',
        array(
            'methods'             => 'PUT',
            'callback'            => 'jewelry_api_update_user',
            'permission_callback' => 'jewelry_api_can_manage_users',
        )
    );

    // DELETE /jewd/v1/users/(?P<id>\d+) — Eliminar usuario
    register_rest_route(
        $namespace,
        '/users/(?P<id>\d+)',
        array(
            'methods'             => 'DELETE',
            'callback'            => 'jewelry_api_delete_user',
            'permission_callback' => 'jewelry_api_can_manage_users',
        )
    );

    // GET /jewd/v1/roles — Listar roles disponibles
    register_rest_route(
        $namespace,
        '/roles',
        array(
            'methods'             => 'GET',
            'callback'            => 'jewelry_api_list_roles',
            'permission_callback' => 'jewelry_api_can_manage_users',
        )
    );
}

/**
 * Verificar que el usuario actual puede gestionar usuarios.
 * Solo administrator puede gestionar usuarios.
 * Acepta autenticación por Bearer token O WC API keys.
 */
function jewelry_api_can_manage_users()
{
    // Primero intentar Bearer token (dashboard session)
    $user = jewelry_authenticate_dashboard_token();
    if (is_wp_error($user)) {
        // Fallback: WC REST API auth via consumer key/secret
        $user = jewelry_authenticate_api_request();
    }
    if (is_wp_error($user)) {
        return false;
    }
    return user_can($user, 'jewelry_manage_users') || user_can($user, 'manage_options');
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

/**
 * Roles permitidos en el sistema de joyería.
 */
function jewelry_get_allowed_roles()
{
    return array(
        'administrator'  => __('Dueño / Admin', 'jewelry'),
        'shop_manager'   => __('Gerente de Tienda', 'jewelry'),
        'jewelry_seller' => __('Vendedor', 'jewelry'),
        'jewelry_viewer' => __('Consultor / Contador', 'jewelry'),
    );
}

/**
 * GET /jewd/v1/users
 */
function jewelry_api_list_users($request)
{
    $allowed_roles = array_keys(jewelry_get_allowed_roles());

    $args = array(
        'role__in' => $allowed_roles,
        'orderby'  => 'display_name',
        'order'    => 'ASC',
    );

    $users  = get_users($args);
    $result = array();

    foreach ($users as $user) {
        $result[] = jewelry_format_user($user);
    }

    return new WP_REST_Response($result, 200);
}

/**
 * POST /jewd/v1/users
 */
function jewelry_api_create_user($request)
{
    $body = $request->get_json_params();

    // Validar campos obligatorios
    $required = array('username', 'email', 'role');
    foreach ($required as $field) {
        if (empty($body[$field])) {
            return new WP_REST_Response(
                array('error' => sprintf('Campo requerido: %s', $field)),
                400
            );
        }
    }

    $username = sanitize_user($body['username']);
    $email    = sanitize_email($body['email']);
    $role     = sanitize_text_field($body['role']);

    // Validar rol
    $allowed_roles = array_keys(jewelry_get_allowed_roles());
    if (! in_array($role, $allowed_roles, true)) {
        return new WP_REST_Response(
            array('error' => 'Rol no permitido: ' . $role),
            400
        );
    }

    // No permitir crear más administrators (excepto si ya hay menos de 2)
    if ('administrator' === $role) {
        $admin_count = count(get_users(array('role' => 'administrator')));
        if ($admin_count >= 3) {
            return new WP_REST_Response(
                array('error' => 'Máximo 3 administradores permitidos'),
                400
            );
        }
    }

    // Generar password si no se proporciona
    $password = ! empty($body['password']) ? $body['password'] : wp_generate_password(16, true, false);

    $user_id = wp_insert_user(
        array(
            'user_login'   => $username,
            'user_email'   => $email,
            'user_pass'    => $password,
            'display_name' => ! empty($body['display_name']) ? sanitize_text_field($body['display_name']) : $username,
            'first_name'   => ! empty($body['first_name']) ? sanitize_text_field($body['first_name']) : '',
            'last_name'    => ! empty($body['last_name']) ? sanitize_text_field($body['last_name']) : '',
            'role'         => $role,
        )
    );

    if (is_wp_error($user_id)) {
        return new WP_REST_Response(
            array('error' => $user_id->get_error_message()),
            400
        );
    }

    // Guardar metadatos custom
    update_user_meta($user_id, 'jewelry_role_assigned_by', get_current_user_id());
    update_user_meta($user_id, 'jewelry_role_assigned_date', current_time('mysql'));

    if (! empty($body['phone'])) {
        update_user_meta($user_id, 'jewelry_phone', sanitize_text_field($body['phone']));
    }

    $user = get_user_by('id', $user_id);

    $response = jewelry_format_user($user);
    $response['generated_password'] = $password;

    return new WP_REST_Response($response, 201);
}

/**
 * PUT /jewd/v1/users/{id}
 */
function jewelry_api_update_user($request)
{
    $user_id = (int) $request['id'];
    $body    = $request->get_json_params();

    $user = get_user_by('id', $user_id);
    if (! $user) {
        return new WP_REST_Response(array('error' => 'Usuario no encontrado'), 404);
    }

    // No permitir editar el usuario ID 1 (superadmin original)
    if (1 === $user_id && ! empty($body['role']) && 'administrator' !== $body['role']) {
        return new WP_REST_Response(
            array('error' => 'No se puede cambiar el rol del administrador principal'),
            403
        );
    }

    $update_data = array('ID' => $user_id);

    if (! empty($body['email'])) {
        $update_data['user_email'] = sanitize_email($body['email']);
    }
    if (! empty($body['display_name'])) {
        $update_data['display_name'] = sanitize_text_field($body['display_name']);
    }
    if (! empty($body['first_name'])) {
        $update_data['first_name'] = sanitize_text_field($body['first_name']);
    }
    if (! empty($body['last_name'])) {
        $update_data['last_name'] = sanitize_text_field($body['last_name']);
    }
    if (! empty($body['password'])) {
        $update_data['user_pass'] = $body['password'];
    }

    $result = wp_update_user($update_data);
    if (is_wp_error($result)) {
        return new WP_REST_Response(
            array('error' => $result->get_error_message()),
            400
        );
    }

    // Cambiar rol si se especifica
    if (! empty($body['role'])) {
        $allowed_roles = array_keys(jewelry_get_allowed_roles());
        if (in_array($body['role'], $allowed_roles, true)) {
            $user->set_role($body['role']);
        }
    }

    // Metadatos custom
    if (isset($body['phone'])) {
        update_user_meta($user_id, 'jewelry_phone', sanitize_text_field($body['phone']));
    }

    return new WP_REST_Response(jewelry_format_user(get_user_by('id', $user_id)), 200);
}

/**
 * DELETE /jewd/v1/users/{id}
 */
function jewelry_api_delete_user($request)
{
    $user_id = (int) $request['id'];

    // Proteger al admin principal
    if (1 === $user_id) {
        return new WP_REST_Response(
            array('error' => 'No se puede eliminar al administrador principal'),
            403
        );
    }

    $user = get_user_by('id', $user_id);
    if (! $user) {
        return new WP_REST_Response(array('error' => 'Usuario no encontrado'), 404);
    }

    require_once ABSPATH . 'wp-admin/includes/user.php';

    // Reasignar contenido al admin principal
    $deleted = wp_delete_user($user_id, 1);

    if (! $deleted) {
        return new WP_REST_Response(array('error' => 'No se pudo eliminar el usuario'), 500);
    }

    return new WP_REST_Response(
        array(
            'deleted' => true,
            'message' => sprintf('Usuario %s eliminado. Contenido reasignado al admin.', $user->user_login),
        ),
        200
    );
}

/**
 * GET /jewd/v1/roles
 */
function jewelry_api_list_roles($request)
{
    $roles  = jewelry_get_allowed_roles();
    $result = array();

    foreach ($roles as $slug => $label) {
        $role = get_role($slug);
        $caps = $role ? array_keys(array_filter($role->capabilities)) : array();

        // Filtrar solo capabilities relevantes de joyería
        $jewelry_caps = array_filter(
            $caps,
            function ($cap) {
                return strpos($cap, 'jewelry_') === 0
                    || strpos($cap, 'woocommerce') !== false
                    || strpos($cap, 'product') !== false
                    || strpos($cap, 'shop_order') !== false
                    || strpos($cap, 'shop_coupon') !== false;
            }
        );

        $result[] = array(
            'slug'        => $slug,
            'name'        => $label,
            'user_count'  => count(get_users(array('role' => $slug))),
            'capabilities' => array_values($jewelry_caps),
        );
    }

    return new WP_REST_Response($result, 200);
}

/**
 * Formatear usuario para respuesta API.
 */
function jewelry_format_user($user)
{
    $roles       = $user->roles;
    $role_labels = jewelry_get_allowed_roles();
    $primary_role = ! empty($roles) ? reset($roles) : 'subscriber';

    return array(
        'id'           => $user->ID,
        'username'     => $user->user_login,
        'email'        => $user->user_email,
        'display_name' => $user->display_name,
        'first_name'   => $user->first_name,
        'last_name'    => $user->last_name,
        'role'         => $primary_role,
        'role_label'   => isset($role_labels[$primary_role]) ? $role_labels[$primary_role] : $primary_role,
        'phone'        => get_user_meta($user->ID, 'jewelry_phone', true),
        'registered'   => $user->user_registered,
        'avatar_url'   => get_avatar_url($user->ID, array('size' => 96)),
        'is_protected' => (1 === $user->ID),
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTENTICACIÓN — TOKEN-BASED SESSION
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
 * Obtener permisos del usuario para el frontend.
 */
function jewelry_get_user_permissions($user)
{
    return array(
        'dashboard_access' => user_can($user, 'jewelry_dashboard_access') || user_can($user, 'manage_options'),
        'view_products'    => user_can($user, 'jewelry_view_products') || user_can($user, 'manage_options'),
        'edit_products'    => user_can($user, 'jewelry_edit_products') || user_can($user, 'manage_options'),
        'create_orders'    => user_can($user, 'jewelry_create_orders') || user_can($user, 'manage_options'),
        'view_orders'      => user_can($user, 'jewelry_view_orders') || user_can($user, 'manage_options'),
        'view_reports'     => user_can($user, 'jewelry_view_reports') || user_can($user, 'manage_options'),
        'manage_coupons'   => user_can($user, 'jewelry_manage_coupons') || user_can($user, 'manage_options'),
        'manage_users'     => user_can($user, 'jewelry_manage_users') || user_can($user, 'manage_options'),
        'manage_settings'  => user_can($user, 'manage_options'),
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

// ═══════════════════════════════════════════════════════════════════════════════
// REST API — SALES REPORTING (Ticket #15)
// ═══════════════════════════════════════════════════════════════════════════════

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

        // Get line items count
        $qty = intval($wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(oim.meta_value), 0)
             FROM {$wpdb->prefix}woocommerce_order_items oi
             INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta oim
                 ON oi.order_item_id = oim.order_item_id AND oim.meta_key = '_qty'
             WHERE oi.order_id = %d AND oi.order_item_type = 'line_item'",
            intval($row->id)
        )));

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

    $orders = array();
    foreach ($rows as $row) {
        $order_id = intval($row->id);

        // Get line items count
        $qty = intval($wpdb->get_var($wpdb->prepare(
            "SELECT COALESCE(SUM(oim.meta_value), 0)
             FROM {$wpdb->prefix}woocommerce_order_items oi
             INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta oim
                 ON oi.order_item_id = oim.order_item_id AND oim.meta_key = '_qty'
             WHERE oi.order_id = %d AND oi.order_item_type = 'line_item'",
            $order_id
        )));

        // Get seller from meta if not filtering
        $order_seller = $seller;
        if (empty($order_seller)) {
            if ($use_hpos) {
                $order_seller = $wpdb->get_var($wpdb->prepare(
                    "SELECT meta_value FROM {$meta_table} WHERE order_id = %d AND meta_key = '_pos_seller'",
                    $order_id
                ));
            } else {
                $order_seller = get_post_meta($order_id, '_pos_seller', true);
            }
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
