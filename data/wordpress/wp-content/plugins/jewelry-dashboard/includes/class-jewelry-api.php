<?php
/**
 * API class — handles AJAX requests and WooCommerce data retrieval.
 *
 * @package Jewelry_Dashboard
 */

defined( 'ABSPATH' ) || exit;

/**
 * Class Jewelry_API
 */
class Jewelry_API {

    /**
     * AJAX handler: get products with filters and pagination.
     */
    public function ajax_get_products() {
        check_ajax_referer( 'jewd_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_send_json_error( 'Unauthorized', 403 );
        }

        $search   = isset( $_POST['search'] ) ? sanitize_text_field( wp_unslash( $_POST['search'] ) ) : '';
        $category = isset( $_POST['category'] ) ? sanitize_text_field( wp_unslash( $_POST['category'] ) ) : '';
        $type     = isset( $_POST['type'] ) ? sanitize_text_field( wp_unslash( $_POST['type'] ) ) : '';
        $stock    = isset( $_POST['stock'] ) ? sanitize_text_field( wp_unslash( $_POST['stock'] ) ) : '';
        $page     = isset( $_POST['page'] ) ? absint( $_POST['page'] ) : 1;
        $per_page = isset( $_POST['per_page'] ) ? absint( $_POST['per_page'] ) : 50;

        $args = array(
            'status'   => array( 'publish', 'draft', 'private' ),
            'limit'    => $per_page,
            'page'     => $page,
            'orderby'  => 'date',
            'order'    => 'DESC',
            'paginate' => true,
        );

        // Search filter.
        if ( ! empty( $search ) ) {
            $args['s'] = $search;
        }

        // Category filter.
        if ( ! empty( $category ) ) {
            $args['category'] = array( $category );
        }

        // Type filter.
        if ( ! empty( $type ) ) {
            $args['type'] = $type;
        }

        // Stock status filter.
        if ( ! empty( $stock ) ) {
            $args['stock_status'] = $stock;
        }

        $results  = wc_get_products( $args );
        $products = array();

        foreach ( $results->products as $product ) {
            $products[] = $this->format_product( $product );
        }

        wp_send_json_success( array(
            'products'    => $products,
            'total'       => $results->total,
            'total_pages' => $results->max_num_pages,
            'page'        => $page,
            'per_page'    => $per_page,
        ) );
    }

    /**
     * AJAX handler: get dashboard statistics.
     */
    public function ajax_get_stats() {
        check_ajax_referer( 'jewd_nonce', 'nonce' );

        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_send_json_error( 'Unauthorized', 403 );
        }

        $all_products = wc_get_products( array(
            'status' => array( 'publish', 'draft', 'private' ),
            'limit'  => -1,
            'return' => 'ids',
        ) );

        $total_products    = 0;
        $total_variable    = 0;
        $total_simple      = 0;
        $total_variations  = 0;
        $total_stock       = 0;
        $categories        = array();
        $prices            = array();
        $low_stock_count   = 0;
        $out_of_stock      = 0;
        $total_value       = 0;

        foreach ( $all_products as $product_id ) {
            $product = wc_get_product( $product_id );
            if ( ! $product ) {
                continue;
            }

            $total_products++;
            $ptype = $product->get_type();

            if ( 'variable' === $ptype ) {
                $total_variable++;
                $children = $product->get_children();
                $total_variations += count( $children );

                foreach ( $children as $child_id ) {
                    $variation = wc_get_product( $child_id );
                    if ( $variation ) {
                        $qty = $variation->get_stock_quantity();
                        if ( null !== $qty ) {
                            $total_stock += max( 0, $qty );
                            if ( $qty <= 2 && $qty > 0 ) {
                                $low_stock_count++;
                            }
                            if ( $qty <= 0 ) {
                                $out_of_stock++;
                            }
                            $price = (float) $variation->get_price();
                            $total_value += $price * max( 0, $qty );
                        }
                        $price = (float) $variation->get_price();
                        if ( $price > 0 ) {
                            $prices[] = $price;
                        }
                    }
                }
            } else {
                $total_simple++;
                $qty = $product->get_stock_quantity();
                if ( null !== $qty ) {
                    $total_stock += max( 0, $qty );
                    if ( $qty <= 2 && $qty > 0 ) {
                        $low_stock_count++;
                    }
                    if ( $qty <= 0 ) {
                        $out_of_stock++;
                    }
                    $price = (float) $product->get_price();
                    $total_value += $price * max( 0, $qty );
                }
                $price = (float) $product->get_price();
                if ( $price > 0 ) {
                    $prices[] = $price;
                }
            }

            // Collect categories.
            $terms = get_the_terms( $product_id, 'product_cat' );
            if ( $terms && ! is_wp_error( $terms ) ) {
                foreach ( $terms as $term ) {
                    if ( ! isset( $categories[ $term->slug ] ) ) {
                        $categories[ $term->slug ] = array(
                            'name'  => $term->name,
                            'count' => 0,
                        );
                    }
                    $categories[ $term->slug ]['count']++;
                }
            }
        }

        $min_price = ! empty( $prices ) ? min( $prices ) : 0;
        $max_price = ! empty( $prices ) ? max( $prices ) : 0;

        wp_send_json_success( array(
            'total_products'   => $total_products,
            'total_variable'   => $total_variable,
            'total_simple'     => $total_simple,
            'total_variations' => $total_variations,
            'total_stock'      => $total_stock,
            'categories'       => $categories,
            'min_price'        => $min_price,
            'max_price'        => $max_price,
            'low_stock'        => $low_stock_count,
            'out_of_stock'     => $out_of_stock,
            'total_value'      => round( $total_value, 2 ),
        ) );
    }

    /**
     * Format a WC_Product into a JSON-friendly array.
     *
     * @param WC_Product $product The product object.
     * @return array
     */
    private function format_product( $product ) {
        $data = array(
            'id'           => $product->get_id(),
            'type'         => $product->get_type(),
            'sku'          => $product->get_sku(),
            'name'         => $product->get_name(),
            'status'       => $product->get_status(),
            'price'        => $product->get_price(),
            'regular_price'=> $product->get_regular_price(),
            'sale_price'   => $product->get_sale_price(),
            'stock_status' => $product->get_stock_status(),
            'stock_qty'    => $product->get_stock_quantity(),
            'weight'       => $product->get_weight(),
            'date_created' => $product->get_date_created() ? $product->get_date_created()->date( 'Y-m-d' ) : '',
            'short_desc'   => $product->get_short_description(),
            'description'  => wp_strip_all_tags( $product->get_description() ),
            'image'        => '',
            'gallery'      => array(),
            'categories'   => array(),
            'tags'         => array(),
            'attributes'   => array(),
            'variations'   => array(),
            'edit_url'     => get_edit_post_link( $product->get_id(), 'raw' ),
            'view_url'     => $product->get_permalink(),
        );

        // Main image.
        $image_id = $product->get_image_id();
        if ( $image_id ) {
            $data['image'] = wp_get_attachment_image_url( $image_id, 'thumbnail' );
        }

        // Gallery.
        $gallery_ids = $product->get_gallery_image_ids();
        foreach ( $gallery_ids as $gid ) {
            $url = wp_get_attachment_image_url( $gid, 'thumbnail' );
            if ( $url ) {
                $data['gallery'][] = $url;
            }
        }

        // Categories.
        $terms = get_the_terms( $product->get_id(), 'product_cat' );
        if ( $terms && ! is_wp_error( $terms ) ) {
            foreach ( $terms as $term ) {
                $data['categories'][] = $term->name;
            }
        }

        // Tags.
        $tags = get_the_terms( $product->get_id(), 'product_tag' );
        if ( $tags && ! is_wp_error( $tags ) ) {
            foreach ( $tags as $tag ) {
                $data['tags'][] = $tag->name;
            }
        }

        // Attributes (for variable products).
        if ( $product->is_type( 'variable' ) ) {
            $attrs = $product->get_attributes();
            foreach ( $attrs as $attr ) {
                $name    = $attr->get_name();
                $label   = wc_attribute_label( $name, $product );
                $options = $attr->get_options();

                // If taxonomy-based, get term names.
                if ( $attr->is_taxonomy() ) {
                    $term_names = array();
                    foreach ( $options as $term_id ) {
                        $t = get_term( $term_id );
                        if ( $t && ! is_wp_error( $t ) ) {
                            $term_names[] = $t->name;
                        }
                    }
                    $options = $term_names;
                }

                $data['attributes'][ $label ] = $options;
            }

            // Variations.
            $children = $product->get_children();
            foreach ( $children as $child_id ) {
                $variation = wc_get_product( $child_id );
                if ( ! $variation ) {
                    continue;
                }

                $var_data = array(
                    'id'            => $variation->get_id(),
                    'sku'           => $variation->get_sku(),
                    'price'         => $variation->get_price(),
                    'regular_price' => $variation->get_regular_price(),
                    'sale_price'    => $variation->get_sale_price(),
                    'stock_status'  => $variation->get_stock_status(),
                    'stock_qty'     => $variation->get_stock_quantity(),
                    'weight'        => $variation->get_weight(),
                    'image'         => '',
                    'attributes'    => array(),
                    'description'   => $variation->get_description(),
                );

                // Variation image.
                $var_img = $variation->get_image_id();
                if ( $var_img ) {
                    $var_data['image'] = wp_get_attachment_image_url( $var_img, 'thumbnail' );
                }

                // Variation attributes.
                $var_attrs = $variation->get_attributes();
                foreach ( $var_attrs as $key => $value ) {
                    $label = wc_attribute_label( $key, $product );
                    $var_data['attributes'][ $label ] = $value;
                }

                $data['variations'][] = $var_data;
            }

            // Price range for variable.
            $data['price_min'] = $product->get_variation_price( 'min' );
            $data['price_max'] = $product->get_variation_price( 'max' );
        }

        return $data;
    }
}
