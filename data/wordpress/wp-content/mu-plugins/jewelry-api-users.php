<?php

/**
 * Plugin Name: Jewelry Users API
 * Description: REST API for user management from the Tu Joyita Miami Dashboard
 *              SPA. CRUD operations for jewelry roles, role listing, and
 *              user formatting.
 * Version: 2.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry_API_Users
 *
 * Split from the original jewelry-roles.php monolith (#49).
 * Dependencies (loaded by other mu-plugins in the same request):
 *   - jewelry_authenticate_dashboard_token() — from jewelry-auth.php
 *   - jewelry_authenticate_api_request()     — from jewelry-auth.php
 */

if (! defined('ABSPATH')) {
    exit;
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER REST ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

add_action('rest_api_init', 'jewelry_register_user_api');

/**
 * Register user management REST routes.
 *
 * Note: Auth routes (/auth/login, /auth/verify, /auth/logout) are now
 * registered in jewelry-auth.php via jewelry_register_auth_api().
 */
function jewelry_register_user_api()
{
    $namespace = 'jewd/v1';

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

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES & USER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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
// USER CRUD ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

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
