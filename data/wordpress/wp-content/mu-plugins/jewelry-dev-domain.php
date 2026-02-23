<?php
/**
 * Plugin Name: Jewelry Dev Domain Mirror
 * Description: Allows accessing the local dev site via dev.tujoyita.com (Cloudflare Tunnel)
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function jewelry_dev_domain_mirror() {
    $host = isset( $_SERVER['HTTP_HOST'] ) ? $_SERVER['HTTP_HOST'] : '';

    if ( 'dev.tujoyita.com' !== $host ) {
        return;
    }

    add_filter( 'option_siteurl', 'jewelry_dev_replace_domain' );
    add_filter( 'option_home', 'jewelry_dev_replace_domain' );
    add_filter( 'wp_get_attachment_url', 'jewelry_dev_replace_domain' );
    add_filter( 'script_loader_src', 'jewelry_dev_replace_domain' );
    add_filter( 'style_loader_src', 'jewelry_dev_replace_domain' );
    add_filter( 'the_content', 'jewelry_dev_replace_content_urls' );

    // Prevent WordPress canonical redirect
    remove_action( 'template_redirect', 'redirect_canonical' );
    add_filter( 'redirect_canonical', '__return_false' );
}

function jewelry_dev_replace_domain( $url ) {
    if ( ! is_string( $url ) ) {
        return $url;
    }
    return str_replace(
        array( 'https://jewelry.local.dev', 'http://jewelry.local.dev' ),
        array( 'https://dev.tujoyita.com', 'https://dev.tujoyita.com' ),
        $url
    );
}

function jewelry_dev_replace_content_urls( $content ) {
    if ( ! is_string( $content ) ) {
        return $content;
    }
    return str_replace( 'jewelry.local.dev', 'dev.tujoyita.com', $content );
}

// Must run before WordPress processes the request
jewelry_dev_domain_mirror();
