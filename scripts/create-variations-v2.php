<?php
/**
 * Crear variaciones para los 33 productos del catálogo v2.
 * Ejecutar con: wp eval-file scripts/create-variations-v2.php --allow-root
 */

if ( ! defined( 'ABSPATH' ) ) {
    define( 'ABSPATH', '/var/www/html/' );
}

// Atributos globales (ya existen en la DB)
// pa_ancho-mm: 2mm, 3mm, 4mm, 5mm, 6mm, 7mm, 8mm, 10mm, 12mm
// pa_largo-in: 7", 8", 16", 18", 20", 22", 24"
// pa_talla: 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18

/**
 * Definición de variaciones por SKU de producto padre.
 * Formato: 'SKU_PADRE' => [ ['ancho'=>'', 'largo'=>'', 'talla'=>'', 'sku_var'=>''], ... ]
 * Si un atributo no aplica, se omite del array de esa variación.
 */
$productos = [

    // === CADENAS ===

    // CAD-10K-CUB-5-20-SOL-001 — Cuban Link 10k (multi largo)
    'CAD-10K-CUB-5-20-SOL-001' => [
        ['ancho' => '5mm', 'largo' => '18"', 'sku_var' => 'CAD-10K-CUB-5-18-SOL-001A'],
        ['ancho' => '5mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-CUB-5-20-SOL-001B'],
        ['ancho' => '5mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-CUB-5-22-SOL-001C'],
        ['ancho' => '5mm', 'largo' => '24"', 'sku_var' => 'CAD-10K-CUB-5-24-SOL-001D'],
    ],

    // CAD-10K-CUB-6-22-SOL-002 — Cuban Link 10k 6mm
    'CAD-10K-CUB-6-22-SOL-002' => [
        ['ancho' => '6mm', 'largo' => '18"', 'sku_var' => 'CAD-10K-CUB-6-18-SOL-002A'],
        ['ancho' => '6mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-CUB-6-20-SOL-002B'],
        ['ancho' => '6mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-CUB-6-22-SOL-002C'],
        ['ancho' => '6mm', 'largo' => '24"', 'sku_var' => 'CAD-10K-CUB-6-24-SOL-002D'],
    ],

    // CAD-14K-CUB-5-20-SOL-003 — Cuban Link 14k
    'CAD-14K-CUB-5-20-SOL-003' => [
        ['ancho' => '5mm', 'largo' => '18"', 'sku_var' => 'CAD-14K-CUB-5-18-SOL-003A'],
        ['ancho' => '5mm', 'largo' => '20"', 'sku_var' => 'CAD-14K-CUB-5-20-SOL-003B'],
        ['ancho' => '5mm', 'largo' => '22"', 'sku_var' => 'CAD-14K-CUB-5-22-SOL-003C'],
    ],

    // CAD-10K-FRA-5-22-SEM-004 — Franco 10k
    'CAD-10K-FRA-5-22-SEM-004' => [
        ['ancho' => '5mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-FRA-5-20-SEM-004A'],
        ['ancho' => '5mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-FRA-5-22-SEM-004B'],
        ['ancho' => '5mm', 'largo' => '24"', 'sku_var' => 'CAD-10K-FRA-5-24-SEM-004C'],
        ['ancho' => '6mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-FRA-6-22-SEM-004D'],
    ],

    // CAD-10K-FIG-6-22-SEM-005 — Figaro 3en1 10k
    'CAD-10K-FIG-6-22-SEM-005' => [
        ['ancho' => '6mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-FIG-6-20-SEM-005A'],
        ['ancho' => '6mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-FIG-6-22-SEM-005B'],
        ['ancho' => '8mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-FIG-8-22-SEM-005C'],
    ],

    // CAD-10K-CBR-5-22-SOL-006 — Corte Brillo 10k
    'CAD-10K-CBR-5-22-SOL-006' => [
        ['ancho' => '4mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-CBR-4-20-SOL-006A'],
        ['ancho' => '5mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-CBR-5-20-SOL-006B'],
        ['ancho' => '5mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-CBR-5-22-SOL-006C'],
        ['ancho' => '6mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-CBR-6-22-SOL-006D'],
    ],

    // CAD-10K-ROL-4-20-SOL-007 — Rolo 10k
    'CAD-10K-ROL-4-20-SOL-007' => [
        ['ancho' => '4mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-ROL-4-20-SOL-007A'],
        ['ancho' => '4mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-ROL-4-22-SOL-007B'],
        ['ancho' => '6mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-ROL-6-20-SOL-007C'],
    ],

    // CAD-10K-TOR-4-22-SOL-008 — Torzal Soga 10k
    'CAD-10K-TOR-4-22-SOL-008' => [
        ['ancho' => '3mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-TOR-3-20-SOL-008A'],
        ['ancho' => '4mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-TOR-4-20-SOL-008B'],
        ['ancho' => '4mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-TOR-4-22-SOL-008C'],
        ['ancho' => '5mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-TOR-5-22-SOL-008D'],
    ],

    // CAD-10K-MON-8-20-SOL-009 — Monaco Chain 10k
    'CAD-10K-MON-8-20-SOL-009' => [
        ['ancho' => '6mm', 'largo' => '18"', 'sku_var' => 'CAD-10K-MON-6-18-SOL-009A'],
        ['ancho' => '6mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-MON-6-20-SOL-009B'],
        ['ancho' => '8mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-MON-8-20-SOL-009C'],
        ['ancho' => '8mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-MON-8-22-SOL-009D'],
        ['ancho' => '10mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-MON-10-22-SOL-009E'],
    ],

    // CAD-10K-GUC-6-22-SOL-010 — Gucci 10k
    'CAD-10K-GUC-6-22-SOL-010' => [
        ['ancho' => '4mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-GUC-4-20-SOL-010A'],
        ['ancho' => '6mm', 'largo' => '20"', 'sku_var' => 'CAD-10K-GUC-6-20-SOL-010B'],
        ['ancho' => '6mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-GUC-6-22-SOL-010C'],
        ['ancho' => '8mm', 'largo' => '22"', 'sku_var' => 'CAD-10K-GUC-8-22-SOL-010D'],
    ],

    // CAD-ZIR-TEN-4-20-UNI-011 — Tennis Zirconia 4mm
    'CAD-ZIR-TEN-4-20-UNI-011' => [
        ['ancho' => '4mm', 'largo' => '18"', 'sku_var' => 'CAD-ZIR-TEN-4-18-UNI-011A'],
        ['ancho' => '4mm', 'largo' => '20"', 'sku_var' => 'CAD-ZIR-TEN-4-20-UNI-011B'],
        ['ancho' => '4mm', 'largo' => '22"', 'sku_var' => 'CAD-ZIR-TEN-4-22-UNI-011C'],
    ],

    // CAD-ZIR-TEN-5-22-UNI-012 — Tennis Zirconia 5mm
    'CAD-ZIR-TEN-5-22-UNI-012' => [
        ['ancho' => '5mm', 'largo' => '20"', 'sku_var' => 'CAD-ZIR-TEN-5-20-UNI-012A'],
        ['ancho' => '5mm', 'largo' => '22"', 'sku_var' => 'CAD-ZIR-TEN-5-22-UNI-012B'],
    ],

    // CAD-DIA-TEN-4-20-NAT-013 — Tennis Diamante Natural (pieza única - simple)
    // → No variaciones: producto simple

    // CAD-OBL-ICE-3-24-SOL-014 — Iced Oro Blanco
    'CAD-OBL-ICE-3-24-SOL-014' => [
        ['ancho' => '3mm', 'largo' => '22"', 'sku_var' => 'CAD-OBL-ICE-3-22-SOL-014A'],
        ['ancho' => '3mm', 'largo' => '24"', 'sku_var' => 'CAD-OBL-ICE-3-24-SOL-014B'],
    ],

    // === GARGANTILLAS ===

    // GAR-14K-CLO-0-18-UNI-015 — Clover 14k
    'GAR-14K-CLO-0-18-UNI-015' => [
        ['largo' => '16"', 'sku_var' => 'GAR-14K-CLO-0-16-UNI-015A'],
        ['largo' => '18"', 'sku_var' => 'GAR-14K-CLO-0-18-UNI-015B'],
    ],

    // GAR-14K-PEP-0-18-UNI-016 — Pepper 14k
    'GAR-14K-PEP-0-18-UNI-016' => [
        ['largo' => '16"', 'sku_var' => 'GAR-14K-PEP-0-16-UNI-016A'],
        ['largo' => '18"', 'sku_var' => 'GAR-14K-PEP-0-18-UNI-016B'],
    ],

    // GAR-14K-TIF-0-18-UNI-017 — Tiffany 14k
    'GAR-14K-TIF-0-18-UNI-017' => [
        ['largo' => '18"', 'sku_var' => 'GAR-14K-TIF-0-18-UNI-017A'],
        ['largo' => '20"', 'sku_var' => 'GAR-14K-TIF-0-20-UNI-017B'],
    ],

    // GAR-14K-MOR-8-18-SOL-018 — Monaco Romani 14k
    'GAR-14K-MOR-8-18-SOL-018' => [
        ['ancho' => '8mm', 'largo' => '18"', 'sku_var' => 'GAR-14K-MOR-8-18-SOL-018A'],
        ['ancho' => '8mm', 'largo' => '20"', 'sku_var' => 'GAR-14K-MOR-8-20-SOL-018B'],
    ],

    // GAR-14K-VIS-0-18-UNI-019 — Visantino 14k (3 modelos)
    'GAR-14K-VIS-0-18-UNI-019' => [
        ['largo' => '18"', 'sku_var' => 'GAR-14K-VIS-0-18-UNI-019A'],
        ['largo' => '20"', 'sku_var' => 'GAR-14K-VIS-0-20-UNI-019B'],
    ],

    // GAR-18K-VAR-0-18-UNI-020 — Gargantilla Oro 18k (pieza única - simple)
    // → No variaciones: producto simple

    // === PULSOS Y MANILLAS ===

    // PUL-14K-CAR-0-7-UNI-021 — Pulso Cartier 14k (pieza única - simple)
    // → No variaciones: producto simple

    // PUL-14K-PEP-0-7-UNI-022 — Pulso Pepper 14k (pieza única - simple)
    // → No variaciones: producto simple

    // PUL-10K-CUB-6-8-SOL-023 — Manilla Cuban Link 10k
    'PUL-10K-CUB-6-8-SOL-023' => [
        ['ancho' => '6mm', 'largo' => '7"', 'sku_var' => 'PUL-10K-CUB-6-7-SOL-023A'],
        ['ancho' => '6mm', 'largo' => '8"', 'sku_var' => 'PUL-10K-CUB-6-8-SOL-023B'],
        ['ancho' => '8mm', 'largo' => '8"', 'sku_var' => 'PUL-10K-CUB-8-8-SOL-023C'],
    ],

    // PUL-ZIR-TEN-4-7-UNI-024 — Pulso Tennis Zirconia (pieza única - simple)
    // → No variaciones: producto simple

    // === ANILLOS ===

    // ANI-14K-MUJ-0-7-UNI-025 — Anillo Mujer 14k (por talla)
    'ANI-14K-MUJ-0-7-UNI-025' => [
        ['talla' => '5', 'sku_var' => 'ANI-14K-MUJ-0-5-UNI-025A'],
        ['talla' => '6', 'sku_var' => 'ANI-14K-MUJ-0-6-UNI-025B'],
        ['talla' => '7', 'sku_var' => 'ANI-14K-MUJ-0-7-UNI-025C'],
        ['talla' => '8', 'sku_var' => 'ANI-14K-MUJ-0-8-UNI-025D'],
        ['talla' => '9', 'sku_var' => 'ANI-14K-MUJ-0-9-UNI-025E'],
    ],

    // ANI-14K-ENG-0-7-UNI-026 — Anillo Compromiso Diamante Natural (pieza única - simple)
    // → No variaciones: producto simple

    // ANI-DLB-ENG-0-7-LAB-027 — Anillo Compromiso Diamante Lab (pieza única - simple)
    // → No variaciones: producto simple

    // ANI-10K-CRI-0-11-UNI-028 — Anillo Cara de Cristo 10k (tallas)
    'ANI-10K-CRI-0-11-UNI-028' => [
        ['talla' => '9',  'sku_var' => 'ANI-10K-CRI-0-9-UNI-028A'],
        ['talla' => '10', 'sku_var' => 'ANI-10K-CRI-0-10-UNI-028B'],
        ['talla' => '11', 'sku_var' => 'ANI-10K-CRI-0-11-UNI-028C'],
        ['talla' => '12', 'sku_var' => 'ANI-10K-CRI-0-12-UNI-028D'],
    ],

    // === ARETES (todos simples — talla única) ===
    // ARE-14K-OME-0-0-UNI-029 → simple
    // ARE-14K-PEG-0-0-UNI-030 → simple
    // ARE-14K-ALG-0-0-UNI-031 → simple

    // === DIJES (todos simples) ===
    // DIJ-10K-VIR-0-0-UNI-032 → simple
    // DIJ-10K-CRI-0-0-UNI-033 → simple
];

/**
 * Productos que van como "simple" (sin variaciones).
 * Estos deben marcarse como simple + asignar SKU directo.
 */
$simples = [
    'CAD-DIA-TEN-4-20-NAT-013',
    'GAR-18K-VAR-0-18-UNI-020',
    'PUL-14K-CAR-0-7-UNI-021',
    'PUL-14K-PEP-0-7-UNI-022',
    'PUL-ZIR-TEN-4-7-UNI-024',
    'ANI-14K-ENG-0-7-UNI-026',
    'ANI-DLB-ENG-0-7-LAB-027',
    'ARE-14K-OME-0-0-UNI-029',
    'ARE-14K-PEG-0-0-UNI-030',
    'ARE-14K-ALG-0-0-UNI-031',
    'DIJ-10K-VIR-0-0-UNI-032',
    'DIJ-10K-CRI-0-0-UNI-033',
];

// =====================================================================
// EJECUCIÓN
// =====================================================================

WP_CLI::log( "=== INICIANDO CREACIÓN DE VARIACIONES ===" );

$total_vars = 0;
$total_simples = 0;
$errores = [];

// --- 1. Marcar productos simples ---
foreach ( $simples as $sku_padre ) {
    $posts = get_posts([
        'post_type'   => 'product',
        'post_status' => 'draft',
        'meta_key'    => '_sku',
        'meta_value'  => $sku_padre,
        'numberposts' => 1,
    ]);

    if ( empty( $posts ) ) {
        $errores[] = "SIMPLE no encontrado: {$sku_padre}";
        continue;
    }

    $pid = $posts[0]->ID;

    // Marcar como simple
    wp_set_object_terms( $pid, 'simple', 'product_type' );
    update_post_meta( $pid, '_manage_stock', 'yes' );
    update_post_meta( $pid, '_stock_status', 'instock' );
    update_post_meta( $pid, '_stock', 0 );
    update_post_meta( $pid, '_visibility', 'visible' );

    WP_CLI::log( "✓ Simple: {$sku_padre} (ID {$pid})" );
    $total_simples++;
}

// --- 2. Crear variaciones para productos variables ---
foreach ( $productos as $sku_padre => $variaciones ) {
    $posts = get_posts([
        'post_type'   => 'product',
        'post_status' => 'draft',
        'meta_key'    => '_sku',
        'meta_value'  => $sku_padre,
        'numberposts' => 1,
    ]);

    if ( empty( $posts ) ) {
        $errores[] = "VARIABLE no encontrado: {$sku_padre}";
        continue;
    }

    $pid = $posts[0]->ID;

    // Marcar como variable
    wp_set_object_terms( $pid, 'variable', 'product_type' );
    update_post_meta( $pid, '_visibility', 'visible' );

    // Determinar qué atributos usa este producto
    $usa_ancho = false;
    $usa_largo = false;
    $usa_talla = false;

    foreach ( $variaciones as $v ) {
        if ( isset( $v['ancho'] ) ) $usa_ancho = true;
        if ( isset( $v['largo'] ) ) $usa_largo = true;
        if ( isset( $v['talla'] ) ) $usa_talla = true;
    }

    // Recolectar valores únicos por atributo
    $valores_ancho = [];
    $valores_largo = [];
    $valores_talla = [];

    foreach ( $variaciones as $v ) {
        if ( isset( $v['ancho'] ) ) $valores_ancho[] = $v['ancho'];
        if ( isset( $v['largo'] ) ) $valores_largo[] = $v['largo'];
        if ( isset( $v['talla'] ) ) $valores_talla[] = $v['talla'];
    }

    // Asignar atributos al producto padre
    $atributos_producto = [];

    if ( $usa_ancho ) {
        $atributos_producto['pa_ancho-mm'] = [
            'name'         => 'pa_ancho-mm',
            'value'        => implode( ' | ', array_unique( $valores_ancho ) ),
            'position'     => 0,
            'is_visible'   => 1,
            'is_variation' => 1,
            'is_taxonomy'  => 1,
        ];
        // Asignar términos al producto
        $term_ids = [];
        foreach ( array_unique( $valores_ancho ) as $val ) {
            $term = get_term_by( 'name', $val, 'pa_ancho-mm' );
            if ( $term ) $term_ids[] = $term->term_id;
        }
        wp_set_object_terms( $pid, $term_ids, 'pa_ancho-mm' );
    }

    if ( $usa_largo ) {
        $atributos_producto['pa_largo-in'] = [
            'name'         => 'pa_largo-in',
            'value'        => implode( ' | ', array_unique( $valores_largo ) ),
            'position'     => $usa_ancho ? 1 : 0,
            'is_visible'   => 1,
            'is_variation' => 1,
            'is_taxonomy'  => 1,
        ];
        $term_ids = [];
        foreach ( array_unique( $valores_largo ) as $val ) {
            $term = get_term_by( 'name', $val, 'pa_largo-in' );
            if ( $term ) $term_ids[] = $term->term_id;
        }
        wp_set_object_terms( $pid, $term_ids, 'pa_largo-in' );
    }

    if ( $usa_talla ) {
        $atributos_producto['pa_talla'] = [
            'name'         => 'pa_talla',
            'value'        => implode( ' | ', array_unique( $valores_talla ) ),
            'position'     => 0,
            'is_visible'   => 1,
            'is_variation' => 1,
            'is_taxonomy'  => 1,
        ];
        $term_ids = [];
        foreach ( array_unique( $valores_talla ) as $val ) {
            $term = get_term_by( 'name', $val, 'pa_talla' );
            if ( $term ) $term_ids[] = $term->term_id;
        }
        wp_set_object_terms( $pid, $term_ids, 'pa_talla' );
    }

    update_post_meta( $pid, '_product_attributes', $atributos_producto );

    // Crear cada variación
    foreach ( $variaciones as $v ) {
        $attr_var = [];

        if ( isset( $v['ancho'] ) ) {
            $term = get_term_by( 'name', $v['ancho'], 'pa_ancho-mm' );
            if ( $term ) $attr_var['attribute_pa_ancho-mm'] = $term->slug;
        }
        if ( isset( $v['largo'] ) ) {
            $term = get_term_by( 'name', $v['largo'], 'pa_largo-in' );
            if ( $term ) $attr_var['attribute_pa_largo-in'] = $term->slug;
        }
        if ( isset( $v['talla'] ) ) {
            $term = get_term_by( 'name', $v['talla'], 'pa_talla' );
            if ( $term ) $attr_var['attribute_pa_talla'] = $term->slug;
        }

        $var_id = wp_insert_post([
            'post_title'  => 'Variation of ' . get_the_title( $pid ),
            'post_name'   => 'product-' . $pid . '-variation',
            'post_status' => 'publish',
            'post_parent' => $pid,
            'post_type'   => 'product_variation',
            'guid'        => home_url() . '/?product_variation=product-' . $pid,
        ]);

        if ( is_wp_error( $var_id ) ) {
            $errores[] = "Error creando variación {$v['sku_var']}: " . $var_id->get_error_message();
            continue;
        }

        // Meta de la variación
        update_post_meta( $var_id, '_sku',          $v['sku_var'] );
        update_post_meta( $var_id, '_price',         '' );
        update_post_meta( $var_id, '_regular_price', '' );
        update_post_meta( $var_id, '_sale_price',    '' );
        update_post_meta( $var_id, '_weight',        '' );
        update_post_meta( $var_id, '_stock_status',  'instock' );
        update_post_meta( $var_id, '_manage_stock',  'yes' );
        update_post_meta( $var_id, '_stock',         0 );

        // Atributos de la variación
        foreach ( $attr_var as $attr_key => $attr_val ) {
            update_post_meta( $var_id, $attr_key, $attr_val );
        }

        $total_vars++;
    }

    WP_CLI::log( "✓ Variable: {$sku_padre} (ID {$pid}) — " . count($variaciones) . " variaciones" );
}

// --- RESUMEN ---
WP_CLI::log( "\n=== RESUMEN ===" );
WP_CLI::success( "Productos simples marcados: {$total_simples}" );
WP_CLI::success( "Variaciones creadas: {$total_vars}" );

if ( ! empty( $errores ) ) {
    WP_CLI::warning( "Errores encontrados: " . count($errores) );
    foreach ( $errores as $e ) {
        WP_CLI::warning( "  - {$e}" );
    }
} else {
    WP_CLI::success( "Sin errores." );
}

WP_CLI::log( "\nPendiente por variación: precio, peso, stock (datos de Remberto)" );
