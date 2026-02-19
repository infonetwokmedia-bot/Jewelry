<?php

/**
 * Limpiar imagenes huerfanas (attachments sin uso real)
 *
 * Uso:
 *   php clean-orphan-images.php dry-run
 *   php clean-orphan-images.php delete
 *
 * @package Jewelry
 */

require_once('/var/www/html/wp-load.php');

if (!defined('ABSPATH')) {
    die('No se puede cargar WordPress');
}

$mode = $argv[1] ?? 'dry-run';
$do_delete = ($mode === 'delete');

function jewelry_attachment_is_used($attachment_id)
{
    // Usado como imagen destacada
    $featured = get_posts(array(
        'post_type' => 'any',
        'post_status' => 'any',
        'meta_query' => array(
            array(
                'key' => '_thumbnail_id',
                'value' => $attachment_id,
                'compare' => '='
            )
        ),
        'fields' => 'ids',
        'posts_per_page' => 1
    ));

    if (!empty($featured)) {
        return true;
    }

    // Usado en galeria de productos (CSV de IDs)
    $gallery = get_posts(array(
        'post_type' => 'product',
        'post_status' => 'any',
        'meta_query' => array(
            array(
                'key' => '_product_image_gallery',
                'value' => (string) $attachment_id,
                'compare' => 'LIKE'
            )
        ),
        'fields' => 'ids',
        'posts_per_page' => 1
    ));

    return !empty($gallery);
}

$orphans = get_posts(array(
    'post_type' => 'attachment',
    'post_parent' => 0,
    'posts_per_page' => -1,
    'post_mime_type' => 'image',
    'fields' => 'ids'
));

$total = count($orphans);
$deleted = 0;
$skipped = 0;

echo "Total imagenes huerfanas (post_parent=0): {$total}" . PHP_EOL;

foreach ($orphans as $attachment_id) {
    $used = jewelry_attachment_is_used($attachment_id);
    $url = wp_get_attachment_url($attachment_id);
    $title = get_the_title($attachment_id);

    if ($used) {
        $skipped++;
        echo "SKIP usado: {$attachment_id} | {$title} | {$url}" . PHP_EOL;
        continue;
    }

    if ($do_delete) {
        $result = wp_delete_attachment($attachment_id, true);
        if ($result) {
            $deleted++;
            echo "DELETE: {$attachment_id} | {$title} | {$url}" . PHP_EOL;
        } else {
            $skipped++;
            echo "FAIL: {$attachment_id} | {$title} | {$url}" . PHP_EOL;
        }
    } else {
        echo "DRY: {$attachment_id} | {$title} | {$url}" . PHP_EOL;
    }
}

echo PHP_EOL;
echo "Resumen:" . PHP_EOL;
echo "- Total: {$total}" . PHP_EOL;
if ($do_delete) {
    echo "- Eliminadas: {$deleted}" . PHP_EOL;
    echo "- Omitidas: {$skipped}" . PHP_EOL;
} else {
    echo "- Modo dry-run (sin borrar)" . PHP_EOL;
}
