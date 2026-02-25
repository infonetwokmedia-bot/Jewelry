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

// ─── LIMITAR INTENTOS DE LOGIN ────────────────────────────────────────────
add_action(
    'wp_login_failed',
    function ( $username ) {
        $ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
        $transient_key = 'jewelry_login_attempts_' . md5( $ip );
        $attempts = (int) get_transient( $transient_key );
        $attempts++;
        set_transient( $transient_key, $attempts, HOUR_IN_SECONDS );
        if ( $attempts > 5 ) {
            $delay = min( pow( 2, $attempts - 5 ), 30 );
            sleep( $delay );
        }
    }
);

add_filter(
    'authenticate',
    function ( $user, $username, $password ) {
        if ( empty( $username ) ) {
            return $user;
        }
        $ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
        $transient_key = 'jewelry_login_attempts_' . md5( $ip );
        $attempts = (int) get_transient( $transient_key );
        if ( $attempts >= 15 ) {
            return new WP_Error(
                'too_many_attempts',
                __( 'Too many login attempts. Please try again later.', 'jewelry' )
            );
        }
        return $user;
    },
    30,
    3
);

add_action(
    'wp_login',
    function () {
        $ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
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
