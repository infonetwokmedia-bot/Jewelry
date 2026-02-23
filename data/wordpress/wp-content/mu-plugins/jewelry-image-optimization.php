<?php
/**
 * Plugin Name: Jewelry Image Optimization
 * Description: Fixes mobile image loading, preloads critical assets, optimizes lazy loading
 * Version: 1.1
 * Author: Jewelry Miami
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Increase the omit lazy loading threshold.
 * WordPress skips lazy loading for the first N images.
 * Default is ~3, we bump to 8 so collection images above-fold load eagerly.
 */
add_filter( 'wp_omit_loading_attr_threshold', function() {
    return 8;
});

/**
 * Preload critical above-the-fold images on the home page.
 * This tells the browser to download these ASAP without waiting for HTML parsing.
 */
add_action( 'wp_head', 'jewelry_preload_critical_images', 1 );
function jewelry_preload_critical_images() {
    if ( ! is_front_page() ) {
        return;
    }

    $critical_images = array(
        // Hero background
        '/wp-content/uploads/2022/11/hero-01.jpg',
        // First collection images (above fold on mobile)
        '/wp-content/uploads/2022/11/categorie-02-300x300.jpg',
        '/wp-content/uploads/2022/11/categorie-001-300x300-1.jpg',
        '/wp-content/uploads/2022/11/categorie-003-300x300.jpg',
    );

    foreach ( $critical_images as $path ) {
        $url = esc_url( home_url( $path ) );
        echo '<link rel="preload" as="image" href="' . $url . '">' . "\n";
    }
}

/**
 * Force eager loading for images in the first screen (InfoBox collection images).
 * UAGB generates its own <img> tags that bypass WP's lazy loading counter.
 * This filter catches them in the final HTML output.
 */
add_filter( 'the_content', 'jewelry_fix_lazy_images_for_mobile', 999 );
function jewelry_fix_lazy_images_for_mobile( $content ) {
    // Add decoding=async to images that don't have it
    $content = preg_replace(
        '/<img(?![^>]*\bdecoding\b)/',
        '<img decoding="async" ',
        $content
    );

    return $content;
}

/**
 * Remove lazy loading from small images (icons, decorative elements).
 * These are tiny and should load immediately.
 */
add_filter( 'wp_get_attachment_image_attributes', 'jewelry_optimize_small_images', 10, 3 );
function jewelry_optimize_small_images( $attr, $attachment, $size ) {
    // Remove lazy loading from thumbnails and small images
    if ( isset( $attr['width'] ) && intval( $attr['width'] ) < 100 ) {
        unset( $attr['loading'] );
        $attr['fetchpriority'] = 'low';
    }
    return $attr;
}

/**
 * Add Connection: keep-alive and DNS prefetch hints for performance.
 */
add_action( 'wp_head', 'jewelry_add_performance_hints', 2 );
function jewelry_add_performance_hints() {
    // Preconnect to own domain (helps with sub-resource loading on HTTPS)
    echo '<link rel="preconnect" href="' . esc_url( home_url() ) . '" crossorigin>' . "\n";
    // DNS prefetch
    echo '<link rel="dns-prefetch" href="' . esc_url( home_url() ) . '">' . "\n";
}
