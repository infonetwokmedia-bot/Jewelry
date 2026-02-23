<?php
/**
 * Asignar precios, pesos y stock simulados pero realistas a todos los productos.
 * Basado en precios típicos de joyería en Miami (oro 10k/14k/18k).
 */

// === PRODUCTOS SIMPLES ===
$simples = [
    'CAD-DIA-TEN-4-20-NAT-013' => ['price' => 4850.00, 'sale' => 4250.00, 'weight' => 18.5, 'stock' => 1],
    'GAR-18K-VAR-0-18-UNI-020' => ['price' => 1980.00, 'sale' => '',       'weight' => 12.3, 'stock' => 2],
    'PUL-14K-CAR-0-7-UNI-021'  => ['price' => 680.00,  'sale' => 599.00,  'weight' => 8.2,  'stock' => 3],
    'PUL-14K-PEP-0-7-UNI-022'  => ['price' => 720.00,  'sale' => '',       'weight' => 7.8,  'stock' => 4],
    'PUL-ZIR-TEN-4-7-UNI-024'  => ['price' => 189.00,  'sale' => 159.00,  'weight' => 6.5,  'stock' => 8],
    'ANI-14K-ENG-0-7-UNI-026'  => ['price' => 3200.00, 'sale' => 2850.00, 'weight' => 3.8,  'stock' => 1],
    'ANI-DLB-ENG-0-7-LAB-027'  => ['price' => 1650.00, 'sale' => 1450.00, 'weight' => 3.5,  'stock' => 2],
    'ARE-14K-OME-0-0-UNI-029'  => ['price' => 420.00,  'sale' => '',       'weight' => 4.2,  'stock' => 5],
    'ARE-14K-PEG-0-0-UNI-030'  => ['price' => 380.00,  'sale' => 339.00,  'weight' => 3.6,  'stock' => 6],
    'ARE-14K-ALG-0-0-UNI-031'  => ['price' => 350.00,  'sale' => '',       'weight' => 5.1,  'stock' => 4],
    'DIJ-10K-VIR-0-0-UNI-032'  => ['price' => 245.00,  'sale' => 219.00,  'weight' => 4.8,  'stock' => 7],
    'DIJ-10K-CRI-0-0-UNI-033'  => ['price' => 275.00,  'sale' => '',       'weight' => 5.5,  'stock' => 5],
];

// === VARIACIONES ===
$variaciones = [
    // CADENAS CUBAN LINK 10K 5MM
    'CAD-10K-CUB-5-18-SOL-001A' => ['price' => 1250.00, 'sale' => 1099.00, 'weight' => 28.0, 'stock' => 3],
    'CAD-10K-CUB-5-20-SOL-001B' => ['price' => 1380.00, 'sale' => 1199.00, 'weight' => 31.2, 'stock' => 4],
    'CAD-10K-CUB-5-22-SOL-001C' => ['price' => 1520.00, 'sale' => 1349.00, 'weight' => 34.5, 'stock' => 2],
    'CAD-10K-CUB-5-24-SOL-001D' => ['price' => 1650.00, 'sale' => 1449.00, 'weight' => 37.8, 'stock' => 2],

    // CADENAS CUBAN LINK 10K 6MM
    'CAD-10K-CUB-6-18-SOL-002A' => ['price' => 1580.00, 'sale' => '',       'weight' => 35.0, 'stock' => 2],
    'CAD-10K-CUB-6-20-SOL-002B' => ['price' => 1750.00, 'sale' => 1599.00, 'weight' => 39.0, 'stock' => 3],
    'CAD-10K-CUB-6-22-SOL-002C' => ['price' => 1920.00, 'sale' => '',       'weight' => 43.0, 'stock' => 2],
    'CAD-10K-CUB-6-24-SOL-002D' => ['price' => 2080.00, 'sale' => 1899.00, 'weight' => 47.0, 'stock' => 1],

    // CADENAS CUBAN LINK 14K 5MM
    'CAD-14K-CUB-5-18-SOL-003A' => ['price' => 1850.00, 'sale' => '',       'weight' => 30.0, 'stock' => 2],
    'CAD-14K-CUB-5-20-SOL-003B' => ['price' => 2050.00, 'sale' => 1899.00, 'weight' => 33.5, 'stock' => 3],
    'CAD-14K-CUB-5-22-SOL-003C' => ['price' => 2250.00, 'sale' => '',       'weight' => 37.0, 'stock' => 1],

    // FRANCO 10K
    'CAD-10K-FRA-5-20-SEM-004A' => ['price' => 890.00,  'sale' => 799.00,  'weight' => 22.0, 'stock' => 4],
    'CAD-10K-FRA-5-22-SEM-004B' => ['price' => 980.00,  'sale' => '',       'weight' => 24.5, 'stock' => 3],
    'CAD-10K-FRA-5-24-SEM-004C' => ['price' => 1070.00, 'sale' => 949.00,  'weight' => 27.0, 'stock' => 2],
    'CAD-10K-FRA-6-22-SEM-004D' => ['price' => 1180.00, 'sale' => '',       'weight' => 29.5, 'stock' => 2],

    // FIGARO 10K
    'CAD-10K-FIG-6-20-SEM-005A' => ['price' => 780.00,  'sale' => '',       'weight' => 20.0, 'stock' => 3],
    'CAD-10K-FIG-6-22-SEM-005B' => ['price' => 860.00,  'sale' => 779.00,  'weight' => 22.0, 'stock' => 4],
    'CAD-10K-FIG-8-22-SEM-005C' => ['price' => 1120.00, 'sale' => '',       'weight' => 28.5, 'stock' => 2],

    // CORTE BRILLO 10K
    'CAD-10K-CBR-4-20-SOL-006A' => ['price' => 620.00,  'sale' => 549.00,  'weight' => 15.0, 'stock' => 5],
    'CAD-10K-CBR-5-20-SOL-006B' => ['price' => 750.00,  'sale' => '',       'weight' => 18.5, 'stock' => 4],
    'CAD-10K-CBR-5-22-SOL-006C' => ['price' => 830.00,  'sale' => 749.00,  'weight' => 20.5, 'stock' => 3],
    'CAD-10K-CBR-6-22-SOL-006D' => ['price' => 980.00,  'sale' => '',       'weight' => 24.0, 'stock' => 2],

    // ROLO 10K
    'CAD-10K-ROL-4-20-SOL-007A' => ['price' => 580.00,  'sale' => '',       'weight' => 14.0, 'stock' => 5],
    'CAD-10K-ROL-4-22-SOL-007B' => ['price' => 640.00,  'sale' => 579.00,  'weight' => 15.5, 'stock' => 4],
    'CAD-10K-ROL-6-20-SOL-007C' => ['price' => 820.00,  'sale' => '',       'weight' => 20.0, 'stock' => 3],

    // TORZAL SOGA 10K
    'CAD-10K-TOR-3-20-SOL-008A' => ['price' => 420.00,  'sale' => 379.00,  'weight' => 10.5, 'stock' => 6],
    'CAD-10K-TOR-4-20-SOL-008B' => ['price' => 560.00,  'sale' => '',       'weight' => 14.0, 'stock' => 4],
    'CAD-10K-TOR-4-22-SOL-008C' => ['price' => 620.00,  'sale' => 559.00,  'weight' => 15.5, 'stock' => 3],
    'CAD-10K-TOR-5-22-SOL-008D' => ['price' => 780.00,  'sale' => '',       'weight' => 19.5, 'stock' => 2],

    // MONACO CHAIN 10K
    'CAD-10K-MON-6-18-SOL-009A' => ['price' => 1350.00, 'sale' => '',       'weight' => 32.0, 'stock' => 2],
    'CAD-10K-MON-6-20-SOL-009B' => ['price' => 1500.00, 'sale' => 1349.00, 'weight' => 36.0, 'stock' => 3],
    'CAD-10K-MON-8-20-SOL-009C' => ['price' => 1950.00, 'sale' => '',       'weight' => 46.0, 'stock' => 2],
    'CAD-10K-MON-8-22-SOL-009D' => ['price' => 2150.00, 'sale' => 1949.00, 'weight' => 51.0, 'stock' => 1],
    'CAD-10K-MON-10-22-SOL-009E'=> ['price' => 2680.00, 'sale' => '',       'weight' => 63.0, 'stock' => 1],

    // GUCCI 10K
    'CAD-10K-GUC-4-20-SOL-010A' => ['price' => 650.00,  'sale' => 579.00,  'weight' => 16.0, 'stock' => 4],
    'CAD-10K-GUC-6-20-SOL-010B' => ['price' => 920.00,  'sale' => '',       'weight' => 22.5, 'stock' => 3],
    'CAD-10K-GUC-6-22-SOL-010C' => ['price' => 1020.00, 'sale' => 899.00,  'weight' => 25.0, 'stock' => 3],
    'CAD-10K-GUC-8-22-SOL-010D' => ['price' => 1380.00, 'sale' => '',       'weight' => 33.0, 'stock' => 1],

    // TENNIS ZIRCONIA 4MM
    'CAD-ZIR-TEN-4-18-UNI-011A' => ['price' => 220.00,  'sale' => 189.00,  'weight' => 8.0,  'stock' => 10],
    'CAD-ZIR-TEN-4-20-UNI-011B' => ['price' => 245.00,  'sale' => '',       'weight' => 9.0,  'stock' => 8],
    'CAD-ZIR-TEN-4-22-UNI-011C' => ['price' => 270.00,  'sale' => 229.00,  'weight' => 10.0, 'stock' => 6],

    // TENNIS ZIRCONIA 5MM
    'CAD-ZIR-TEN-5-20-UNI-012A' => ['price' => 295.00,  'sale' => '',       'weight' => 11.5, 'stock' => 7],
    'CAD-ZIR-TEN-5-22-UNI-012B' => ['price' => 325.00,  'sale' => 279.00,  'weight' => 12.5, 'stock' => 5],

    // ICED ORO BLANCO
    'CAD-OBL-ICE-3-22-SOL-014A' => ['price' => 1680.00, 'sale' => '',       'weight' => 16.0, 'stock' => 2],
    'CAD-OBL-ICE-3-24-SOL-014B' => ['price' => 1850.00, 'sale' => 1699.00, 'weight' => 17.5, 'stock' => 1],

    // GARGANTILLA CLOVER 14K
    'GAR-14K-CLO-0-16-UNI-015A' => ['price' => 890.00,  'sale' => '',       'weight' => 9.0,  'stock' => 3],
    'GAR-14K-CLO-0-18-UNI-015B' => ['price' => 980.00,  'sale' => 879.00,  'weight' => 10.2, 'stock' => 4],

    // GARGANTILLA PEPPER 14K
    'GAR-14K-PEP-0-16-UNI-016A' => ['price' => 820.00,  'sale' => 749.00,  'weight' => 8.5,  'stock' => 3],
    'GAR-14K-PEP-0-18-UNI-016B' => ['price' => 920.00,  'sale' => '',       'weight' => 9.5,  'stock' => 4],

    // GARGANTILLA TIFFANY 14K
    'GAR-14K-TIF-0-18-UNI-017A' => ['price' => 1050.00, 'sale' => '',       'weight' => 11.0, 'stock' => 3],
    'GAR-14K-TIF-0-20-UNI-017B' => ['price' => 1180.00, 'sale' => 1049.00, 'weight' => 12.5, 'stock' => 2],

    // MONACO ROMANI 14K
    'GAR-14K-MOR-8-18-SOL-018A' => ['price' => 1450.00, 'sale' => 1299.00, 'weight' => 18.0, 'stock' => 2],
    'GAR-14K-MOR-8-20-SOL-018B' => ['price' => 1620.00, 'sale' => '',       'weight' => 20.0, 'stock' => 2],

    // VISANTINO 14K
    'GAR-14K-VIS-0-18-UNI-019A' => ['price' => 780.00,  'sale' => '',       'weight' => 8.0,  'stock' => 4],
    'GAR-14K-VIS-0-20-UNI-019B' => ['price' => 870.00,  'sale' => 799.00,  'weight' => 9.0,  'stock' => 3],

    // MANILLA CUBAN LINK 10K
    'PUL-10K-CUB-6-7-SOL-023A'  => ['price' => 680.00,  'sale' => '',       'weight' => 18.0, 'stock' => 3],
    'PUL-10K-CUB-6-8-SOL-023B'  => ['price' => 780.00,  'sale' => 699.00,  'weight' => 21.0, 'stock' => 4],
    'PUL-10K-CUB-8-8-SOL-023C'  => ['price' => 1050.00, 'sale' => '',       'weight' => 28.0, 'stock' => 2],

    // ANILLO MUJER 14K (TALLAS)
    'ANI-14K-MUJ-0-5-UNI-025A'  => ['price' => 320.00,  'sale' => '',       'weight' => 2.8,  'stock' => 3],
    'ANI-14K-MUJ-0-6-UNI-025B'  => ['price' => 340.00,  'sale' => 299.00,  'weight' => 3.0,  'stock' => 4],
    'ANI-14K-MUJ-0-7-UNI-025C'  => ['price' => 360.00,  'sale' => '',       'weight' => 3.2,  'stock' => 5],
    'ANI-14K-MUJ-0-8-UNI-025D'  => ['price' => 380.00,  'sale' => '',       'weight' => 3.4,  'stock' => 3],
    'ANI-14K-MUJ-0-9-UNI-025E'  => ['price' => 400.00,  'sale' => 349.00,  'weight' => 3.6,  'stock' => 2],

    // ANILLO CARA DE CRISTO 10K (TALLAS)
    'ANI-10K-CRI-0-9-UNI-028A'  => ['price' => 480.00,  'sale' => '',       'weight' => 6.5,  'stock' => 3],
    'ANI-10K-CRI-0-10-UNI-028B' => ['price' => 520.00,  'sale' => 459.00,  'weight' => 7.0,  'stock' => 4],
    'ANI-10K-CRI-0-11-UNI-028C' => ['price' => 560.00,  'sale' => '',       'weight' => 7.5,  'stock' => 3],
    'ANI-10K-CRI-0-12-UNI-028D' => ['price' => 600.00,  'sale' => 529.00,  'weight' => 8.0,  'stock' => 2],
];

// =====================================================================
// EJECUTAR
// =====================================================================

WP_CLI::log( '=== ASIGNANDO PRECIOS, PESOS Y STOCK ===' );
$ok = 0; $err = [];

// --- Productos simples ---
foreach ( $simples as $sku => $data ) {
    $pid = wc_get_product_id_by_sku( $sku );
    if ( ! $pid ) { $err[] = "Simple no encontrado: {$sku}"; continue; }

    $product = wc_get_product( $pid );
    $product->set_regular_price( $data['price'] );
    if ( ! empty( $data['sale'] ) ) {
        $product->set_sale_price( $data['sale'] );
        $product->set_price( $data['sale'] );
    } else {
        $product->set_price( $data['price'] );
    }
    $product->set_weight( $data['weight'] );
    $product->set_stock_quantity( $data['stock'] );
    $product->set_manage_stock( true );
    $product->set_stock_status( 'instock' );
    $product->save();

    $final = ! empty( $data['sale'] ) ? $data['sale'] : $data['price'];
    WP_CLI::log( "  Simple: {$sku} → \${$final} | {$data['weight']}g | stock:{$data['stock']}" );
    $ok++;
}

// --- Variaciones ---
foreach ( $variaciones as $sku_var => $data ) {
    $var_id = wc_get_product_id_by_sku( $sku_var );
    if ( ! $var_id ) { $err[] = "Variación no encontrada: {$sku_var}"; continue; }

    $variation = wc_get_product( $var_id );
    $variation->set_regular_price( $data['price'] );
    if ( ! empty( $data['sale'] ) ) {
        $variation->set_sale_price( $data['sale'] );
        $variation->set_price( $data['sale'] );
    } else {
        $variation->set_price( $data['price'] );
    }
    $variation->set_weight( $data['weight'] );
    $variation->set_stock_quantity( $data['stock'] );
    $variation->set_manage_stock( true );
    $variation->set_stock_status( 'instock' );
    $variation->save();

    $final = ! empty( $data['sale'] ) ? $data['sale'] : $data['price'];
    WP_CLI::log( "  Var: {$sku_var} → \${$final} | {$data['weight']}g | stock:{$data['stock']}" );
    $ok++;
}

// --- Sincronizar precios de productos variables (min/max) ---
WP_CLI::log( "\n--- Sincronizando precios de productos variables ---" );
$variables = get_posts([
    'post_type'   => 'product',
    'post_status' => 'publish',
    'numberposts' => -1,
    'tax_query'   => [['taxonomy'=>'product_type','field'=>'slug','terms'=>'variable']],
]);
foreach ( $variables as $vp ) {
    $product = wc_get_product( $vp->ID );
    if ( $product && is_a( $product, 'WC_Product_Variable' ) ) {
        $product->sync( $product );
        WC_Product_Variable::sync( $vp->ID );
        WP_CLI::log( "  Sync: " . get_post_meta($vp->ID, '_sku', true) . " (ID {$vp->ID})" );
    }
}

// --- Resumen ---
WP_CLI::log( "\n=== RESUMEN ===" );
WP_CLI::success( "Actualizados: {$ok}" );
if ( ! empty( $err ) ) {
    WP_CLI::warning( "Errores: " . count($err) );
    foreach ( $err as $e ) WP_CLI::warning( "  - {$e}" );
} else {
    WP_CLI::success( "Sin errores." );
}
