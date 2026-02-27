<?php
/**
 * Plugin Name: Jewelry Security Hardening
 * Description: Seguridad adicional para Tu Joyita Miami — deshabilita XML-RPC, oculta versión WP, protege login.
 * Version: 1.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry_Security
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ─── DESHABILITAR XML-RPC ───────────────────────────────────────────────────
add_filter( 'xmlrpc_enabled', '__return_false' );

add_action(
    'init',
    function () {
        if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) {
            status_header( 403 );
            exit( 'XML-RPC is disabled.' );
        }
    }
);

remove_action( 'wp_head', 'rsd_link' );
remove_action( 'wp_head', 'wlwmanifest_link' );

// ─── OCULTAR VERSIÓN DE WORDPRESS ──────────────────────────────────────────
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );

// ─── REST API: BLOQUEAR ENUMERACIÓN DE USUARIOS ───────────────────────────
add_filter(
    'rest_authentication_errors',
    function ( $result ) {
        if ( true === $result || is_wp_error( $result ) ) {
            return $result;
        }
        $current_route = isset( $GLOBALS['wp']->query_vars['rest_route'] )
            ? $GLOBALS['wp']->query_vars['rest_route']
            : '';
        if ( strpos( $current_route, '/wp/v2/users' ) !== false && ! is_user_logged_in() ) {
            return new WP_Error(
                'rest_forbidden',
                __( 'Access denied.', 'jewelry' ),
                array( 'status' => 403 )
            );
        }
        return $result;
    }
);

// ─── LIMITAR INTENTOS DE LOGIN (HTTP 429 — no bloquea workers PHP) ────────
// Nota: jewelry_get_client_ip() definida en jewelry-auth.php (cargado antes).

/**
 * Registrar intento fallido de login.
 */
add_action(
    'wp_login_failed',
    function ( $username ) {
        $ip            = jewelry_get_client_ip();
        $transient_key = 'jewelry_login_attempts_' . md5( $ip );
        $attempts      = (int) get_transient( $transient_key );
        $attempts++;
        $lockout_seconds = 15 * MINUTE_IN_SECONDS;
        set_transient( $transient_key, $attempts, $lockout_seconds );

        if ( $attempts >= 5 ) {
            // Log para monitoreo.
            error_log(
                sprintf(
                    '[Jewelry Security] Login bloqueado: IP=%s, usuario=%s, intentos=%d',
                    $ip,
                    sanitize_user( $username ),
                    $attempts
                )
            );
        }
    }
);

/**
 * Bloquear login si se exceden 5 intentos — retorna HTTP 429 inmediatamente.
 * NO usa sleep() para no bloquear workers PHP.
 */
add_filter(
    'authenticate',
    function ( $user, $username, $password ) {
        if ( empty( $username ) ) {
            return $user;
        }

        $ip            = jewelry_get_client_ip();
        $transient_key = 'jewelry_login_attempts_' . md5( $ip );
        $attempts      = (int) get_transient( $transient_key );

        if ( $attempts >= 5 ) {
            $lockout_seconds = 15 * MINUTE_IN_SECONDS;
            $remaining       = $lockout_seconds; // Máximo posible (transients no exponen TTL).

            // Header Retry-After para clientes bien comportados.
            if ( ! headers_sent() ) {
                header( 'Retry-After: ' . $remaining );
            }

            wp_die(
                sprintf(
                    /* translators: %d: minutes remaining */
                    __( 'Demasiados intentos de login. Intente de nuevo en %d minutos.', 'jewelry' ),
                    (int) ceil( $remaining / 60 )
                ),
                __( 'Acceso bloqueado', 'jewelry' ),
                array( 'response' => 429 )
            );
        }

        return $user;
    },
    30,
    3
);

/**
 * Limpiar intentos al login exitoso.
 */
add_action(
    'wp_login',
    function () {
        $ip = jewelry_get_client_ip();
        delete_transient( 'jewelry_login_attempts_' . md5( $ip ) );
    }
);

// ─── LIMPIAR HEAD ─────────────────────────────────────────────────────────
remove_action( 'wp_head', 'wp_shortlink_wp_head' );
remove_action( 'wp_head', 'rest_output_link_wp_head' );
remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
remove_action( 'wp_head', 'wp_resource_hints', 2 );
remove_action( 'wp_head', 'feed_links', 2 );
remove_action( 'wp_head', 'feed_links_extra', 3 );

// ─── DESHABILITAR AUTHOR ARCHIVES (evita user enumeration) ────────────────
add_action(
    'template_redirect',
    function () {
        if ( is_author() && ! is_user_logged_in() ) {
            wp_safe_redirect( home_url(), 301 );
            exit;
        }
    }
);
