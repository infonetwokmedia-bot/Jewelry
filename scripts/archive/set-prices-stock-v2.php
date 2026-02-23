<?php
/**
 * Asignar precios, pesos y stock REALISTAS a todos los productos.
 *
 * Pesos basados en datos reales de joyería por tipo de eslabón, quilataje,
 * ancho (mm) y largo (pulgadas). Unidad: onzas (oz).
 *
 * Precios calculados con base en:
 *   - Precio oro ~$2,850/troy oz (feb 2026)
 *   - 10K solid: ~$62/g retail ($1,757/oz)
 *   - 10K semi-solid: ~$42/g retail ($1,190/oz)
 *   - 14K solid/general: ~$88/g retail ($2,494/oz)
 *   - 18K: ~$140/g retail ($3,968/oz)
 *   - Zirconia/fashion: precio fijo por pieza
 *   - Diamonds: precio fijo + gold content
 *
 * Conversión: 1 oz = 28.3495 g
 *
 * Usage: wp eval-file set-prices-stock-v2.php --allow-root
 *
 * @package Jewelry
 */

// =====================================================================
// DATOS: peso en oz, precio en USD
// =====================================================================

// === PRODUCTOS SIMPLES ===
$simples = [
    // Tennis Diamante Natural 14K 4mm 20" — 16g oro + 4ct diamantes
    'CAD-DIA-TEN-4-20-NAT-013' => ['price' => 4850.00, 'sale' => 4450.00, 'weight' => 0.56, 'stock' => 1],
    // Gargantilla 18K Variada 18" — 10g
    'GAR-18K-VAR-0-18-UNI-020' => ['price' => 1400.00, 'sale' => '',       'weight' => 0.35, 'stock' => 2],
    // Pulsera Caracol 14K 7" — 7g
    'PUL-14K-CAR-0-7-UNI-021'  => ['price' => 595.00,  'sale' => 545.00,  'weight' => 0.25, 'stock' => 3],
    // Pulsera Pepita 14K 7" — 6g
    'PUL-14K-PEP-0-7-UNI-022'  => ['price' => 510.00,  'sale' => '',       'weight' => 0.21, 'stock' => 4],
    // Pulsera Tennis Zirconia 4mm 7" — 12g
    'PUL-ZIR-TEN-4-7-UNI-024'  => ['price' => 135.00,  'sale' => 115.00,  'weight' => 0.42, 'stock' => 8],
    // Anillo Engagement 14K — 4.5g + diamante ~0.5ct
    'ANI-14K-ENG-0-7-UNI-026'  => ['price' => 2880.00, 'sale' => 2650.00, 'weight' => 0.16, 'stock' => 1],
    // Anillo Double Engagement Lab — 5.2g + lab diamond ~1ct
    'ANI-DLB-ENG-0-7-LAB-027'  => ['price' => 1640.00, 'sale' => 1490.00, 'weight' => 0.18, 'stock' => 2],
    // Aretes Omega Back 14K — 3.5g (par)
    'ARE-14K-OME-0-0-UNI-029'  => ['price' => 295.00,  'sale' => '',       'weight' => 0.12, 'stock' => 5],
    // Aretes Pegasus 14K — 2.8g (par)
    'ARE-14K-PEG-0-0-UNI-030'  => ['price' => 240.00,  'sale' => 215.00,  'weight' => 0.10, 'stock' => 6],
    // Aretes Argolla/Huggie 14K — 4.2g (par)
    'ARE-14K-ALG-0-0-UNI-031'  => ['price' => 355.00,  'sale' => '',       'weight' => 0.15, 'stock' => 4],
    // Dije Virgen 10K — 3.8g
    'DIJ-10K-VIR-0-0-UNI-032'  => ['price' => 210.00,  'sale' => 189.00,  'weight' => 0.13, 'stock' => 7],
    // Dije Cristo 10K — 4.5g
    'DIJ-10K-CRI-0-0-UNI-033'  => ['price' => 250.00,  'sale' => '',       'weight' => 0.16, 'stock' => 5],
];

// === VARIACIONES ===
$variaciones = [
    // ---------------------------------------------------------------
    // CADENA CUBAN LINK 10K SOLID 5MM (25-34g)
    // Peso: ~1.39g/pulgada para 5mm 10K solid
    // Precio: peso_g × $62/g
    // ---------------------------------------------------------------
    'CAD-10K-CUB-5-18-SOL-001A' => ['price' => 1550.00, 'sale' => 1395.00, 'weight' => 0.88, 'stock' => 3],
    'CAD-10K-CUB-5-20-SOL-001B' => ['price' => 1735.00, 'sale' => '',       'weight' => 0.99, 'stock' => 4],
    'CAD-10K-CUB-5-22-SOL-001C' => ['price' => 1920.00, 'sale' => 1750.00, 'weight' => 1.09, 'stock' => 2],
    'CAD-10K-CUB-5-24-SOL-001D' => ['price' => 2110.00, 'sale' => '',       'weight' => 1.20, 'stock' => 2],

    // ---------------------------------------------------------------
    // CADENA CUBAN LINK 10K SOLID 6MM (33-45g)
    // Peso: ~1.83g/pulgada para 6mm 10K solid
    // ---------------------------------------------------------------
    'CAD-10K-CUB-6-18-SOL-002A' => ['price' => 2045.00, 'sale' => '',       'weight' => 1.16, 'stock' => 2],
    'CAD-10K-CUB-6-20-SOL-002B' => ['price' => 2295.00, 'sale' => 2095.00, 'weight' => 1.31, 'stock' => 3],
    'CAD-10K-CUB-6-22-SOL-002C' => ['price' => 2540.00, 'sale' => '',       'weight' => 1.45, 'stock' => 2],
    'CAD-10K-CUB-6-24-SOL-002D' => ['price' => 2790.00, 'sale' => 2550.00, 'weight' => 1.59, 'stock' => 1],

    // ---------------------------------------------------------------
    // CADENA CUBAN LINK 14K SOLID 5MM (27-33g)
    // 14K más denso: ~1.50g/pulgada para 5mm
    // Precio: peso_g × $90/g
    // ---------------------------------------------------------------
    'CAD-14K-CUB-5-18-SOL-003A' => ['price' => 2430.00, 'sale' => '',       'weight' => 0.95, 'stock' => 2],
    'CAD-14K-CUB-5-20-SOL-003B' => ['price' => 2700.00, 'sale' => 2450.00, 'weight' => 1.06, 'stock' => 3],
    'CAD-14K-CUB-5-22-SOL-003C' => ['price' => 2970.00, 'sale' => '',       'weight' => 1.16, 'stock' => 1],

    // ---------------------------------------------------------------
    // FRANCO 10K SEMI-SOLID 5-6MM (18-25g)
    // Semi-solid: ~0.90g/pulgada 5mm, ~1.14g/pulgada 6mm
    // Precio: peso_g × $42/g
    // ---------------------------------------------------------------
    'CAD-10K-FRA-5-20-SEM-004A' => ['price' => 755.00,  'sale' => 695.00,  'weight' => 0.63, 'stock' => 4],
    'CAD-10K-FRA-5-22-SEM-004B' => ['price' => 840.00,  'sale' => '',       'weight' => 0.71, 'stock' => 3],
    'CAD-10K-FRA-5-24-SEM-004C' => ['price' => 925.00,  'sale' => 849.00,  'weight' => 0.78, 'stock' => 2],
    'CAD-10K-FRA-6-22-SEM-004D' => ['price' => 1050.00, 'sale' => '',       'weight' => 0.88, 'stock' => 2],

    // ---------------------------------------------------------------
    // FIGARO 10K SEMI-SOLID 6-8MM (16-24g)
    // ---------------------------------------------------------------
    'CAD-10K-FIG-6-20-SEM-005A' => ['price' => 670.00,  'sale' => '',       'weight' => 0.56, 'stock' => 3],
    'CAD-10K-FIG-6-22-SEM-005B' => ['price' => 755.00,  'sale' => 689.00,  'weight' => 0.63, 'stock' => 4],
    'CAD-10K-FIG-8-22-SEM-005C' => ['price' => 1010.00, 'sale' => '',       'weight' => 0.85, 'stock' => 2],

    // ---------------------------------------------------------------
    // CORTE BRILLO 10K SOLID 4-6MM (12-22g)
    // ---------------------------------------------------------------
    'CAD-10K-CBR-4-20-SOL-006A' => ['price' => 745.00,  'sale' => 679.00,  'weight' => 0.42, 'stock' => 5],
    'CAD-10K-CBR-5-20-SOL-006B' => ['price' => 990.00,  'sale' => '',       'weight' => 0.56, 'stock' => 4],
    'CAD-10K-CBR-5-22-SOL-006C' => ['price' => 1115.00, 'sale' => 1019.00, 'weight' => 0.63, 'stock' => 3],
    'CAD-10K-CBR-6-22-SOL-006D' => ['price' => 1365.00, 'sale' => '',       'weight' => 0.78, 'stock' => 2],

    // ---------------------------------------------------------------
    // ROLO 10K SOLID 4-6MM (11-17g)
    // ---------------------------------------------------------------
    'CAD-10K-ROL-4-20-SOL-007A' => ['price' => 680.00,  'sale' => '',       'weight' => 0.39, 'stock' => 5],
    'CAD-10K-ROL-4-22-SOL-007B' => ['price' => 745.00,  'sale' => 679.00,  'weight' => 0.42, 'stock' => 4],
    'CAD-10K-ROL-6-20-SOL-007C' => ['price' => 1055.00, 'sale' => '',       'weight' => 0.60, 'stock' => 3],

    // ---------------------------------------------------------------
    // TORZAL/SOGA 10K SOLID 3-5MM (8-16g)
    // ---------------------------------------------------------------
    'CAD-10K-TOR-3-20-SOL-008A' => ['price' => 495.00,  'sale' => 449.00,  'weight' => 0.28, 'stock' => 6],
    'CAD-10K-TOR-4-20-SOL-008B' => ['price' => 680.00,  'sale' => '',       'weight' => 0.39, 'stock' => 4],
    'CAD-10K-TOR-4-22-SOL-008C' => ['price' => 745.00,  'sale' => 679.00,  'weight' => 0.42, 'stock' => 3],
    'CAD-10K-TOR-5-22-SOL-008D' => ['price' => 990.00,  'sale' => '',       'weight' => 0.56, 'stock' => 2],

    // ---------------------------------------------------------------
    // MONACO CHAIN 10K SOLID 6-10MM (28-58g) — eslabón pesado
    // ---------------------------------------------------------------
    'CAD-10K-MON-6-18-SOL-009A' => ['price' => 1735.00, 'sale' => '',       'weight' => 0.99, 'stock' => 2],
    'CAD-10K-MON-6-20-SOL-009B' => ['price' => 1920.00, 'sale' => 1750.00, 'weight' => 1.09, 'stock' => 3],
    'CAD-10K-MON-8-20-SOL-009C' => ['price' => 2605.00, 'sale' => '',       'weight' => 1.48, 'stock' => 2],
    'CAD-10K-MON-8-22-SOL-009D' => ['price' => 2850.00, 'sale' => 2595.00, 'weight' => 1.62, 'stock' => 1],
    'CAD-10K-MON-10-22-SOL-009E'=> ['price' => 3595.00, 'sale' => '',       'weight' => 2.05, 'stock' => 1],

    // ---------------------------------------------------------------
    // GUCCI 10K SOLID 4-8MM (13-28g)
    // ---------------------------------------------------------------
    'CAD-10K-GUC-4-20-SOL-010A' => ['price' => 805.00,  'sale' => 735.00,  'weight' => 0.46, 'stock' => 4],
    'CAD-10K-GUC-6-20-SOL-010B' => ['price' => 1180.00, 'sale' => '',       'weight' => 0.67, 'stock' => 3],
    'CAD-10K-GUC-6-22-SOL-010C' => ['price' => 1300.00, 'sale' => 1189.00, 'weight' => 0.74, 'stock' => 3],
    'CAD-10K-GUC-8-22-SOL-010D' => ['price' => 1735.00, 'sale' => '',       'weight' => 0.99, 'stock' => 1],

    // ---------------------------------------------------------------
    // TENNIS ZIRCONIA (BAÑO/PLATA) 4MM (25-31g)
    // Precio fijo por pieza, no por peso en oro
    // ---------------------------------------------------------------
    'CAD-ZIR-TEN-4-18-UNI-011A' => ['price' => 185.00,  'sale' => 159.00,  'weight' => 0.88, 'stock' => 10],
    'CAD-ZIR-TEN-4-20-UNI-011B' => ['price' => 210.00,  'sale' => '',       'weight' => 0.99, 'stock' => 8],
    'CAD-ZIR-TEN-4-22-UNI-011C' => ['price' => 235.00,  'sale' => 199.00,  'weight' => 1.09, 'stock' => 6],

    // ---------------------------------------------------------------
    // TENNIS ZIRCONIA (BAÑO/PLATA) 5MM (33-36g)
    // ---------------------------------------------------------------
    'CAD-ZIR-TEN-5-20-UNI-012A' => ['price' => 265.00,  'sale' => '',       'weight' => 1.16, 'stock' => 7],
    'CAD-ZIR-TEN-5-22-UNI-012B' => ['price' => 295.00,  'sale' => 255.00,  'weight' => 1.27, 'stock' => 5],

    // ---------------------------------------------------------------
    // ICED OUT ORO BLANCO 10K SOLID 3MM + CZ (14-15g oro)
    // Precio incluye piedras CZ
    // ---------------------------------------------------------------
    'CAD-OBL-ICE-3-22-SOL-014A' => ['price' => 1495.00, 'sale' => '',       'weight' => 0.49, 'stock' => 2],
    'CAD-OBL-ICE-3-24-SOL-014B' => ['price' => 1650.00, 'sale' => 1495.00, 'weight' => 0.53, 'stock' => 1],

    // ---------------------------------------------------------------
    // GARGANTILLA CLOVER 14K (7-8g)
    // Precio: peso_g × $85/g
    // ---------------------------------------------------------------
    'GAR-14K-CLO-0-16-UNI-015A' => ['price' => 595.00,  'sale' => '',       'weight' => 0.25, 'stock' => 3],
    'GAR-14K-CLO-0-18-UNI-015B' => ['price' => 680.00,  'sale' => 619.00,  'weight' => 0.28, 'stock' => 4],

    // ---------------------------------------------------------------
    // GARGANTILLA PEPITA 14K (6-7g)
    // ---------------------------------------------------------------
    'GAR-14K-PEP-0-16-UNI-016A' => ['price' => 510.00,  'sale' => 465.00,  'weight' => 0.21, 'stock' => 3],
    'GAR-14K-PEP-0-18-UNI-016B' => ['price' => 595.00,  'sale' => '',       'weight' => 0.25, 'stock' => 4],

    // ---------------------------------------------------------------
    // GARGANTILLA TIFFANY 14K (9-10g)
    // ---------------------------------------------------------------
    'GAR-14K-TIF-0-18-UNI-017A' => ['price' => 765.00,  'sale' => '',       'weight' => 0.32, 'stock' => 3],
    'GAR-14K-TIF-0-20-UNI-017B' => ['price' => 850.00,  'sale' => 775.00,  'weight' => 0.35, 'stock' => 2],

    // ---------------------------------------------------------------
    // MONACO ROMANI 14K SOLID 8MM (15-17g) — eslabón grueso
    // Precio: peso_g × $90/g
    // ---------------------------------------------------------------
    'GAR-14K-MOR-8-18-SOL-018A' => ['price' => 1350.00, 'sale' => 1229.00, 'weight' => 0.53, 'stock' => 2],
    'GAR-14K-MOR-8-20-SOL-018B' => ['price' => 1530.00, 'sale' => '',       'weight' => 0.60, 'stock' => 2],

    // ---------------------------------------------------------------
    // VISANTINO 14K (6.5-7.5g)
    // ---------------------------------------------------------------
    'GAR-14K-VIS-0-18-UNI-019A' => ['price' => 550.00,  'sale' => '',       'weight' => 0.23, 'stock' => 4],
    'GAR-14K-VIS-0-20-UNI-019B' => ['price' => 640.00,  'sale' => 579.00,  'weight' => 0.26, 'stock' => 3],

    // ---------------------------------------------------------------
    // MANILLA CUBAN LINK 10K SOLID 6-8MM (15-23g)
    // ---------------------------------------------------------------
    'PUL-10K-CUB-6-7-SOL-023A'  => ['price' => 930.00,  'sale' => '',       'weight' => 0.53, 'stock' => 3],
    'PUL-10K-CUB-6-8-SOL-023B'  => ['price' => 1055.00, 'sale' => 959.00,  'weight' => 0.60, 'stock' => 4],
    'PUL-10K-CUB-8-8-SOL-023C'  => ['price' => 1425.00, 'sale' => '',       'weight' => 0.81, 'stock' => 2],

    // ---------------------------------------------------------------
    // ANILLO MUJER 14K CON PIEDRAS (2.3-3.1g oro + ~$180 piedras)
    // Precio: peso_g × $85/g + $180 piedras
    // ---------------------------------------------------------------
    'ANI-14K-MUJ-0-5-UNI-025A'  => ['price' => 375.00,  'sale' => '',       'weight' => 0.08, 'stock' => 3],
    'ANI-14K-MUJ-0-6-UNI-025B'  => ['price' => 395.00,  'sale' => 359.00,  'weight' => 0.09, 'stock' => 4],
    'ANI-14K-MUJ-0-7-UNI-025C'  => ['price' => 410.00,  'sale' => '',       'weight' => 0.10, 'stock' => 5],
    'ANI-14K-MUJ-0-8-UNI-025D'  => ['price' => 425.00,  'sale' => '',       'weight' => 0.10, 'stock' => 3],
    'ANI-14K-MUJ-0-9-UNI-025E'  => ['price' => 445.00,  'sale' => 399.00,  'weight' => 0.11, 'stock' => 2],

    // ---------------------------------------------------------------
    // ANILLO CARA DE CRISTO 10K (8-9.5g) — anillo grande hombre
    // Precio: peso_g × $58/g
    // ---------------------------------------------------------------
    'ANI-10K-CRI-0-9-UNI-028A'  => ['price' => 465.00,  'sale' => '',       'weight' => 0.28, 'stock' => 3],
    'ANI-10K-CRI-0-10-UNI-028B' => ['price' => 495.00,  'sale' => 449.00,  'weight' => 0.30, 'stock' => 4],
    'ANI-10K-CRI-0-11-UNI-028C' => ['price' => 520.00,  'sale' => '',       'weight' => 0.32, 'stock' => 3],
    'ANI-10K-CRI-0-12-UNI-028D' => ['price' => 550.00,  'sale' => 499.00,  'weight' => 0.34, 'stock' => 2],
];

// =====================================================================
// EJECUTAR
// =====================================================================

WP_CLI::log( '=== ASIGNANDO PRECIOS, PESOS Y STOCK (V2 - OZ REALISTAS) ===' );
WP_CLI::log( '' );
WP_CLI::log( 'Referencia de cálculo:' );
WP_CLI::log( '  Oro ~$2,850/troy oz (feb 2026)' );
WP_CLI::log( '  10K solid: ~$62/g retail | 10K semi: ~$42/g' );
WP_CLI::log( '  14K solid: ~$90/g | 14K fashion: ~$85/g' );
WP_CLI::log( '  18K: ~$140/g | Zirconia: precio fijo' );
WP_CLI::log( '  1 oz = 28.35g' );
WP_CLI::log( '' );

$ok = 0;
$err = [];

// --- Productos simples ---
foreach ( $simples as $sku => $data ) {
    $pid = wc_get_product_id_by_sku( $sku );
    if ( ! $pid ) {
        $err[] = "Simple no encontrado: {$sku}";
        continue;
    }

    $product = wc_get_product( $pid );
    $product->set_regular_price( $data['price'] );
    if ( ! empty( $data['sale'] ) ) {
        $product->set_sale_price( $data['sale'] );
        $product->set_price( $data['sale'] );
    } else {
        $product->set_sale_price( '' );
        $product->set_price( $data['price'] );
    }
    $product->set_weight( $data['weight'] );
    $product->set_stock_quantity( $data['stock'] );
    $product->set_manage_stock( true );
    $product->set_stock_status( 'instock' );
    $product->save();

    $grams = round( $data['weight'] * 28.3495, 1 );
    $final = ! empty( $data['sale'] ) ? $data['sale'] : $data['price'];
    WP_CLI::log( "  Simple: {$sku} → \${$final} | {$data['weight']} oz ({$grams}g) | stock:{$data['stock']}" );
    $ok++;
}

// --- Variaciones ---
foreach ( $variaciones as $sku_var => $data ) {
    $var_id = wc_get_product_id_by_sku( $sku_var );
    if ( ! $var_id ) {
        $err[] = "Variación no encontrada: {$sku_var}";
        continue;
    }

    $variation = wc_get_product( $var_id );
    $variation->set_regular_price( $data['price'] );
    if ( ! empty( $data['sale'] ) ) {
        $variation->set_sale_price( $data['sale'] );
        $variation->set_price( $data['sale'] );
    } else {
        $variation->set_sale_price( '' );
        $variation->set_price( $data['price'] );
    }
    $variation->set_weight( $data['weight'] );
    $variation->set_stock_quantity( $data['stock'] );
    $variation->set_manage_stock( true );
    $variation->set_stock_status( 'instock' );
    $variation->save();

    $grams = round( $data['weight'] * 28.3495, 1 );
    $final = ! empty( $data['sale'] ) ? $data['sale'] : $data['price'];
    WP_CLI::log( "  Var: {$sku_var} → \${$final} | {$data['weight']} oz ({$grams}g) | stock:{$data['stock']}" );
    $ok++;
}

// --- Sincronizar precios de productos variables (min/max) ---
WP_CLI::log( '' );
WP_CLI::log( '--- Sincronizando precios de productos variables ---' );
$variables = get_posts( [
    'post_type'   => 'product',
    'post_status' => 'publish',
    'numberposts' => -1,
    'tax_query'   => [ [ 'taxonomy' => 'product_type', 'field' => 'slug', 'terms' => 'variable' ] ],
] );
foreach ( $variables as $vp ) {
    $product = wc_get_product( $vp->ID );
    if ( $product && is_a( $product, 'WC_Product_Variable' ) ) {
        WC_Product_Variable::sync( $vp->ID );
        WP_CLI::log( '  Sync: ' . get_post_meta( $vp->ID, '_sku', true ) . " (ID {$vp->ID})" );
    }
}

// --- Limpiar transients ---
wc_delete_product_transients();

// --- Resumen ---
WP_CLI::log( '' );
WP_CLI::log( '=== RESUMEN ===' );
WP_CLI::success( "Actualizados: {$ok}" );
if ( ! empty( $err ) ) {
    WP_CLI::warning( 'Errores: ' . count( $err ) );
    foreach ( $err as $e ) {
        WP_CLI::warning( "  - {$e}" );
    }
} else {
    WP_CLI::success( 'Sin errores.' );
}

