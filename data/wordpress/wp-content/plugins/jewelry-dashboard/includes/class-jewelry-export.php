<?php
/**
 * Export class — handles CSV and JSON exports.
 *
 * @package Jewelry_Dashboard
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class Jewelry_Export
 */
class Jewelry_Export {

    /**
     * AJAX handler: export products as CSV (returns download URL).
     */
    public function ajax_export_csv() {
        check_ajax_referer( 'jewd_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_send_json_error( 'Unauthorized', 403 );
        }

        $products = wc_get_products( array(
            'status' => array( 'publish', 'draft', 'private' ),
            'limit'  => -1,
        ) );

        $rows = array();
        $rows[] = array(
            'Type', 'ID', 'SKU', 'Name', 'Status', 'Categories',
            'Regular Price', 'Sale Price', 'Price', 'Stock Status',
            'Stock Qty', 'Weight', 'Date Created', 'Parent SKU', 'Attributes',
        );

        foreach ( $products as $product ) {
            $cats  = wp_get_post_terms( $product->get_id(), 'product_cat', array( 'fields' => 'names' ) );
            $cstr  = is_array( $cats ) ? implode( ', ', $cats ) : '';

            if ( $product->is_type( 'variable' ) ) {
                $attrs_str = $this->format_attributes( $product );
                $rows[] = array(
                    'variable',
                    $product->get_id(),
                    $product->get_sku(),
                    $product->get_name(),
                    $product->get_status(),
                    $cstr,
                    $product->get_regular_price(),
                    $product->get_sale_price(),
                    $product->get_price(),
                    $product->get_stock_status(),
                    '',
                    '',
                    $product->get_date_created() ? $product->get_date_created()->date( 'Y-m-d' ) : '',
                    '',
                    $attrs_str,
                );

                foreach ( $product->get_children() as $child_id ) {
                    $v = wc_get_product( $child_id );
                    if ( ! $v ) continue;

                    $va = $v->get_attributes();
                    $va_str = array();
                    foreach ( $va as $k => $val ) {
                        $va_str[] = wc_attribute_label( $k, $product ) . ':' . $val;
                    }

                    $rows[] = array(
                        'variation',
                        $v->get_id(),
                        $v->get_sku(),
                        '',
                        $v->get_status(),
                        '',
                        $v->get_regular_price(),
                        $v->get_sale_price(),
                        $v->get_price(),
                        $v->get_stock_status(),
                        $v->get_stock_quantity(),
                        $v->get_weight(),
                        '',
                        $product->get_sku(),
                        implode( '; ', $va_str ),
                    );
                }
            } else {
                $rows[] = array(
                    'simple',
                    $product->get_id(),
                    $product->get_sku(),
                    $product->get_name(),
                    $product->get_status(),
                    $cstr,
                    $product->get_regular_price(),
                    $product->get_sale_price(),
                    $product->get_price(),
                    $product->get_stock_status(),
                    $product->get_stock_quantity(),
                    $product->get_weight(),
                    $product->get_date_created() ? $product->get_date_created()->date( 'Y-m-d' ) : '',
                    '',
                    '',
                );
            }
        }

        // Build CSV string.
        $csv = '';
        foreach ( $rows as $row ) {
            $csv .= implode( ',', array_map( function( $cell ) {
                return '"' . str_replace( '"', '""', (string) $cell ) . '"';
            }, $row ) ) . "\n";
        }

        wp_send_json_success( array(
            'csv'      => $csv,
            'filename' => 'jewelry_catalog_' . gmdate( 'Y-m-d_His' ) . '.csv',
            'count'    => count( $rows ) - 1,
        ) );
    }

    /**
     * AJAX handler: export products as JSON.
     */
    public function ajax_export_json() {
        check_ajax_referer( 'jewd_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_send_json_error( 'Unauthorized', 403 );
        }

        $api      = new Jewelry_API();
        $products = wc_get_products( array(
            'status' => array( 'publish', 'draft', 'private' ),
            'limit'  => -1,
        ) );

        $result = array();
        foreach ( $products as $product ) {
            $fmt = new ReflectionMethod( 'Jewelry_API', 'format_product' );
            $fmt->setAccessible( true );
            $result[] = $fmt->invoke( $api, $product );
        }

        wp_send_json_success( array(
            'json'     => $result,
            'filename' => 'jewelry_catalog_' . gmdate( 'Y-m-d_His' ) . '.json',
            'count'    => count( $result ),
        ) );
    }

    /**
     * Format product attributes for CSV.
     *
     * @param WC_Product $product The product.
     * @return string
     */
    private function format_attributes( $product ) {
        $attrs = $product->get_attributes();
        $parts = array();
        foreach ( $attrs as $attr ) {
            $label   = wc_attribute_label( $attr->get_name(), $product );
            $options = $attr->get_options();
            if ( $attr->is_taxonomy() ) {
                $names = array();
                foreach ( $options as $tid ) {
                    $t = get_term( $tid );
                    if ( $t && ! is_wp_error( $t ) ) {
                        $names[] = $t->name;
                    }
                }
                $options = $names;
            }
            $parts[] = $label . ':' . implode( '|', $options );
        }
        return implode( '; ', $parts );
    }
}
