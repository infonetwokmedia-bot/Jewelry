<?php
/**
 * Fix variation attribute values: use term slugs instead of term names.
 *
 * Problem: create-variations-v2.php stored term names (e.g., "18"") as
 * variation attribute values, but WooCommerce dropdowns use term slugs ("18").
 * This caused a mismatch where selecting a variation in the frontend didn't
 * find the corresponding variation.
 *
 * Fix: Replace all variation attribute_pa_largo-in values with sanitized
 * slugs (removes the " character).
 *
 * Usage: wp eval-file fix-variation-slugs.php --allow-root
 *
 * @package Jewelry
 */

echo "=== CORRIGIENDO SLUGS DE VARIACIÓN ===\n\n";

$fixed = 0;
$vars  = get_posts(
    array(
        'post_type'   => 'product_variation',
        'post_status' => 'publish',
        'numberposts' => -1,
    )
);

$meta_keys = array( 'attribute_pa_largo-in', 'attribute_pa_ancho-mm', 'attribute_pa_talla' );

foreach ( $vars as $v ) {
    foreach ( $meta_keys as $meta_key ) {
        $raw = get_post_meta( $v->ID, $meta_key, true );
        if ( '' === $raw || false === $raw ) {
            continue;
        }

        $slug = sanitize_title( $raw );

        if ( $raw !== $slug ) {
            update_post_meta( $v->ID, $meta_key, $slug );
            $sku = get_post_meta( $v->ID, '_sku', true );
            echo "  ✓ [{$v->ID}] {$sku}: {$meta_key} [{$raw}] → [{$slug}]\n";
            $fixed++;
        }
    }
}

echo "\nTotal corregidos: {$fixed}\n";

// Flush caches
wc_delete_product_transients();
echo "✓ Transients limpiados\n";
