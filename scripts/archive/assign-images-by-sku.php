<?php
/**
 * Asignar imágenes importadas a productos por SKU.
 * La primera imagen = destacada (thumbnail), resto = galería.
 */

$results = ['ok' => 0, 'skip' => 0, 'error' => []];

// Todos los SKUs del catálogo (excepting ARE-14K-OME que no tiene imagen)
$skus = [
    'CAD-10K-CUB-5-20-SOL-001',
    'CAD-10K-CUB-6-22-SOL-002',
    'CAD-14K-CUB-5-20-SOL-003',
    'CAD-10K-FRA-5-22-SEM-004',
    'CAD-10K-FIG-6-22-SEM-005',
    'CAD-10K-CBR-5-22-SOL-006',
    'CAD-10K-ROL-4-20-SOL-007',
    'CAD-10K-TOR-4-22-SOL-008',
    'CAD-10K-MON-8-20-SOL-009',
    'CAD-10K-GUC-6-22-SOL-010',
    'CAD-ZIR-TEN-4-20-UNI-011',
    'CAD-ZIR-TEN-5-22-UNI-012',
    'CAD-DIA-TEN-4-20-NAT-013',
    'CAD-OBL-ICE-3-24-SOL-014',
    'GAR-14K-CLO-0-18-UNI-015',
    'GAR-14K-PEP-0-18-UNI-016',
    'GAR-14K-TIF-0-18-UNI-017',
    'GAR-14K-MOR-8-18-SOL-018',
    'GAR-14K-VIS-0-18-UNI-019',
    'GAR-18K-VAR-0-18-UNI-020',
    'PUL-14K-CAR-0-7-UNI-021',
    'PUL-14K-PEP-0-7-UNI-022',
    'PUL-10K-CUB-6-8-SOL-023',
    'PUL-ZIR-TEN-4-7-UNI-024',
    'ANI-14K-MUJ-0-7-UNI-025',
    'ANI-14K-ENG-0-7-UNI-026',
    'ANI-DLB-ENG-0-7-LAB-027',
    'ANI-10K-CRI-0-11-UNI-028',
    // ARE-14K-OME-0-0-UNI-029 → SIN IMAGEN
    'ARE-14K-PEG-0-0-UNI-030',
    'ARE-14K-ALG-0-0-UNI-031',
    'DIJ-10K-VIR-0-0-UNI-032',
    'DIJ-10K-CRI-0-0-UNI-033',
];

foreach ( $skus as $sku ) {
    // Buscar producto por SKU
    $product_id = wc_get_product_id_by_sku( $sku );
    if ( ! $product_id ) {
        $results['error'][] = "Producto no encontrado: {$sku}";
        continue;
    }

    // Buscar attachments cuyo título empieza con el SKU
    $attachments = get_posts([
        'post_type'      => 'attachment',
        'post_status'    => 'inherit',
        'posts_per_page' => 20,
        's'              => $sku,
        'orderby'        => 'title',
        'order'          => 'ASC',
    ]);

    if ( empty( $attachments ) ) {
        $results['skip']++;
        WP_CLI::log( "SKIP (sin attachments): {$sku}" );
        continue;
    }

    // Filtrar solo los que realmente pertenecen a este SKU (evitar falsos positivos)
    $filtered = [];
    foreach ( $attachments as $att ) {
        if ( strpos( $att->post_title, $sku ) === 0 ) {
            $filtered[] = $att;
        }
    }

    if ( empty( $filtered ) ) {
        $results['skip']++;
        WP_CLI::log( "SKIP (no match exacto): {$sku}" );
        continue;
    }

    // Ordenar por título para consistencia
    usort( $filtered, function( $a, $b ) {
        return strcmp( $a->post_title, $b->post_title );
    });

    // Primera imagen = destacada (thumbnail)
    $main_att_id = $filtered[0]->ID;
    set_post_thumbnail( $product_id, $main_att_id );

    // Resto = galería
    $gallery_ids = [];
    for ( $i = 1; $i < count( $filtered ); $i++ ) {
        $gallery_ids[] = $filtered[$i]->ID;
    }

    if ( ! empty( $gallery_ids ) ) {
        update_post_meta( $product_id, '_product_image_gallery', implode( ',', $gallery_ids ) );
    }

    $total_imgs = count( $filtered );
    $gallery_count = count( $gallery_ids );
    WP_CLI::log( "OK: {$sku} (ID {$product_id}) — 1 destacada + {$gallery_count} galería = {$total_imgs} imágenes" );
    $results['ok']++;
}

// Resumen
WP_CLI::log( "\n=== RESUMEN ASIGNACIÓN ===" );
WP_CLI::success( "Productos con imágenes asignadas: {$results['ok']}" );
if ( $results['skip'] > 0 ) {
    WP_CLI::warning( "Productos sin imágenes (skip): {$results['skip']}" );
}
if ( ! empty( $results['error'] ) ) {
    WP_CLI::warning( "Errores: " . count( $results['error'] ) );
    foreach ( $results['error'] as $e ) {
        WP_CLI::warning( "  - {$e}" );
    }
}

echo "\n" . json_encode( $results, JSON_PRETTY_PRINT ) . "\n";
