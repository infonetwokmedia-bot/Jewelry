# GitHub Copilot Skills - Jewelry Project

Guía completa de skills especializados para desarrollo eficiente del sitio web de joyería bilingüe.

## 📚 Tabla de Contenidos

1. [Productos](#productos)
2. [Páginas y Contenido](#páginas-y-contenido)
3. [WooCommerce](#woocommerce)
4. [Base de Datos](#base-de-datos)
5. [TranslatePress y Multiidioma](#translatepress-y-multiidioma)
6. [Gutenberg](#gutenberg)
7. [Seguridad](#seguridad)
8. [Testing y Datos de Prueba](#testing-y-datos-de-prueba)
9. [Optimización con Copilot](#optimización-con-copilot)

---

## 🛍️ Productos

### Skill 1: Crear Producto Bilingüe Completo

**Prompt para Copilot:**

```
Create a bilingual WooCommerce product using TranslatePress.
Product details:
- Spanish (primary): [name_es], [description_es], [price]
- SKU: [sku]
- Categories: [categories]
Create ONE product in Spanish. Translation to English is done visually via TranslatePress.
```

**Código esperado:**

```php
function jewelry_create_bilingual_product( $data_es, $sku, $price, $categories = array() ) {
    // Crear UN SOLO producto en español (idioma principal)
    $product = new WC_Product_Simple();
    $product->set_name( $data_es['name'] );
    $product->set_description( $data_es['description'] );
    $product->set_short_description( $data_es['short_description'] );
    $product->set_regular_price( $price );
    $product->set_sku( $sku );
    $product->set_catalog_visibility( 'visible' );
    $product->set_category_ids( $categories );
    $product->set_status( 'publish' );
    $product_id = $product->save();

    // La traducción al inglés se hace visualmente con TranslatePress:
    // 1. Ir al frontend del producto
    // 2. Añadir ?trp-edit-translation=true a la URL
    // 3. Clic en cada texto para traducirlo
    // Las traducciones se almacenan en tablas wp_trp_*

    return $product_id;
}
```

### Skill 2: Importar Productos desde CSV

**Prompt para Copilot:**

```
Create a function to import products from CSV file.
CSV structure: sku, name_es, description_es, short_description_es, price, category_slug
Create products in Spanish (primary). English translations done via TranslatePress.
Include error handling and logging.
```

**Uso:**

```php
// Ejemplo de CSV:
// sku,name_es,description_es,short_description_es,price,category_slug
// CUB001,Cadena Cubana 10k,Descripción ES,Desc corta,499.99,cadenas

function jewelry_import_products_from_csv( $csv_file_path ) {
    $file = fopen( $csv_file_path, 'r' );
    $header = fgetcsv( $file );
    $imported = 0;
    $errors = array();

    while ( ( $row = fgetcsv( $file ) ) !== false ) {
        $data = array_combine( $header, $row );

        try {
            $data_es = array(
                'name' => $data['name_es'],
                'description' => $data['description_es'],
                'short_description' => $data['short_description_es'],
            );

            // Obtener ID de categoría
            $cat = get_term_by( 'slug', $data['category_slug'], 'product_cat' );
            $categories = $cat ? array( $cat->term_id ) : array();

            jewelry_create_bilingual_product( $data_es, $data['sku'], $data['price'], $categories );
            $imported++;

        } catch ( Exception $e ) {
            $errors[] = "Error in row {$imported}: " . $e->getMessage();
        }
    }

    fclose( $file );

    // Nota: Las traducciones al inglés se hacen visualmente con TranslatePress
    // desde el frontend: ?trp-edit-translation=true

    return array(
        'imported' => $imported,
        'errors' => $errors
    );
}
```

### Skill 3: Actualizar Precios Masivamente

**Prompt para Copilot:**

```
Create a function to bulk update product prices by category or SKU pattern.
Support percentage increase/decrease and fixed amount adjustment.
With TranslatePress, only ONE product exists per item (no duplicates).
```

**Código:**

```php
function jewelry_bulk_update_prices( $category_slug = '', $sku_pattern = '', $adjustment_type = 'percentage', $adjustment_value = 0 ) {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'post_status' => 'publish',
    );

    if ( $category_slug ) {
        $args['tax_query'] = array(
            array(
                'taxonomy' => 'product_cat',
                'field' => 'slug',
                'terms' => $category_slug
            )
        );
    }

    $products = get_posts( $args );
    $updated = 0;

    foreach ( $products as $post ) {
        $product = wc_get_product( $post->ID );

        if ( $sku_pattern && ! preg_match( "/{$sku_pattern}/", $product->get_sku() ) ) {
            continue;
        }

        $current_price = $product->get_regular_price();

        if ( 'percentage' === $adjustment_type ) {
            $new_price = $current_price * ( 1 + ( $adjustment_value / 100 ) );
        } else {
            $new_price = $current_price + $adjustment_value;
        }

        $product->set_regular_price( $new_price );
        $product->save();

        // Con TranslatePress, solo existe UN producto (no hay duplicado EN).
        // El precio se muestra automáticamente en ambos idiomas.

        $updated++;
    }

    return $updated;
}

// Uso:
// Aumentar 10% todos los productos de "cadenas"
jewelry_bulk_update_prices( 'cadenas', '', 'percentage', 10 );

// Reducir $50 todos los productos con SKU que contenga "CUB"
jewelry_bulk_update_prices( '', 'CUB', 'fixed', -50 );
```

### Skill 4: Crear Variaciones de Productos

**Prompt para Copilot:**

```
Create a variable product with size variations (6mm, 8mm, 10mm) in Spanish.
Each variation has different price. Translation via TranslatePress (no duplicates).
```

**Código:**

```php
function jewelry_create_variable_product( $base_name_es, $variations ) {
    // Crear atributo de tamaño si no existe
    $attribute_name = 'pa_ancho-mm';

    // Producto variable en español (ÚNICA instancia)
    $product = new WC_Product_Variable();
    $product->set_name( $base_name_es );
    $product->set_status( 'publish' );

    $attribute = new WC_Product_Attribute();
    $attribute->set_name( $attribute_name );
    $attribute->set_options( array_keys( $variations ) );
    $attribute->set_visible( true );
    $attribute->set_variation( true );
    $product->set_attributes( array( $attribute ) );

    $product_id = $product->save();

    // Crear variaciones
    foreach ( $variations as $size => $price ) {
        $variation = new WC_Product_Variation();
        $variation->set_parent_id( $product_id );
        $variation->set_regular_price( $price );
        $variation->set_attributes( array( $attribute_name => $size ) );
        $variation->set_stock_status( 'instock' );
        $variation->save();
    }

    // La traducción al inglés se hace con TranslatePress:
    // Ir a la URL del producto + ?trp-edit-translation=true
    // Traducir nombre, descripción y atributos visualmente

    return $product_id;
}

// Uso:
jewelry_create_variable_product(
    'Cadena Cubana Miami',
    array(
        '6mm' => 399.99,
        '8mm' => 549.99,
        '10mm' => 699.99
    )
);
```

---

## 📄 Páginas y Contenido

### Skill 5: Crear Página con Template

**Prompt para Copilot:**

```
Create a page in Spanish with custom template.
With TranslatePress, create ONE page. Translate visually from the frontend.
Set page template and featured image.
```

**Código:**

```php
function jewelry_create_page_with_template( $title_es, $content_es, $template = '', $featured_image_id = 0 ) {
    // Crear UNA SOLA página en español (idioma principal)
    $page_data = array(
        'post_title'    => $title_es,
        'post_content'  => $content_es,
        'post_status'   => 'publish',
        'post_type'     => 'page',
        'post_author'   => 1,
    );

    $page_id = wp_insert_post( $page_data );

    if ( $template ) {
        update_post_meta( $page_id, '_wp_page_template', $template );
    }

    if ( $featured_image_id ) {
        set_post_thumbnail( $page_id, $featured_image_id );
    }

    // La traducción al inglés se hace visualmente con TranslatePress:
    // 1. Ir al frontend de la página
    // 2. Añadir ?trp-edit-translation=true a la URL
    // 3. Clic en cada texto para traducirlo
    // Las traducciones se almacenan en tablas wp_trp_*

    return $page_id;
}
```

---

## 🛒 WooCommerce

### Skill 6: Personalizar Emails de WooCommerce Bilingües

**Prompt para Copilot:**

```
Override WooCommerce email templates to support TranslatePress multilingual.
Detect order language and send email in correct language.
```

**Código:**

```php
/**
 * Detectar idioma de una orden y enviar email correspondiente.
 */
function jewelry_get_order_language( $order_id ) {
    $order = wc_get_order( $order_id );
    $locale = get_post_meta( $order_id, '_order_locale', true );

    if ( ! $locale ) {
        // Detectar por URL o configuración del sitio
        $locale = get_locale();
    }

    return $locale;
}

/**
 * Cambiar idioma antes de enviar emails.
 */
add_filter( 'woocommerce_email_setup_locale', 'jewelry_email_setup_locale' );
function jewelry_email_setup_locale( $email ) {
    if ( isset( $email->object ) && is_a( $email->object, 'WC_Order' ) ) {
        $locale = jewelry_get_order_language( $email->object->get_id() );

        if ( $locale ) {
            switch_to_locale( $locale );

            // Recargar traducciones de WooCommerce
            $wc_domain = 'woocommerce';
            unload_textdomain( $wc_domain );
            load_textdomain( $wc_domain, WP_LANG_DIR . "/woocommerce/woocommerce-{$locale}.mo" );
        }
    }
}

/**
 * Guardar idioma de la orden al crearla.
 */
add_action( 'woocommerce_checkout_order_processed', 'jewelry_save_order_language', 10, 1 );
function jewelry_save_order_language( $order_id ) {
    $locale = jewelry_get_current_locale();
    update_post_meta( $order_id, '_order_locale', $locale );
}
```

### Skill 7: Agregar Campos Personalizados en Checkout

**Prompt para Copilot:**

```
Add custom checkout field "Gift message" with bilingual labels.
Validate, save to order meta, and display in admin and emails.
```

**Código:**

```php
/**
 * Agregar campo personalizado al checkout.
 */
add_action( 'woocommerce_after_order_notes', 'jewelry_add_checkout_custom_field' );
function jewelry_add_checkout_custom_field( $checkout ) {
    $locale = jewelry_get_current_locale();

    $label = ( 'es_ES' === $locale )
        ? 'Mensaje de regalo (opcional)'
        : 'Gift message (optional)';

    $placeholder = ( 'es_ES' === $locale )
        ? 'Escriba su mensaje aquí...'
        : 'Write your message here...';

    woocommerce_form_field( 'gift_message', array(
        'type'        => 'textarea',
        'class'       => array( 'gift-message-field form-row-wide' ),
        'label'       => $label,
        'placeholder' => $placeholder,
        'required'    => false,
    ), $checkout->get_value( 'gift_message' ) );
}

/**
 * Validar campo personalizado.
 */
add_action( 'woocommerce_checkout_process', 'jewelry_validate_custom_checkout_field' );
function jewelry_validate_custom_checkout_field() {
    if ( isset( $_POST['gift_message'] ) && strlen( $_POST['gift_message'] ) > 500 ) {
        $locale = jewelry_get_current_locale();
        $error = ( 'es_ES' === $locale )
            ? 'El mensaje de regalo no puede exceder 500 caracteres.'
            : 'Gift message cannot exceed 500 characters.';
        wc_add_notice( $error, 'error' );
    }
}

/**
 * Guardar campo en la orden.
 */
add_action( 'woocommerce_checkout_update_order_meta', 'jewelry_save_custom_checkout_field' );
function jewelry_save_custom_checkout_field( $order_id ) {
    if ( isset( $_POST['gift_message'] ) && ! empty( $_POST['gift_message'] ) ) {
        $gift_message = sanitize_textarea_field( $_POST['gift_message'] );
        update_post_meta( $order_id, '_gift_message', $gift_message );
    }
}

/**
 * Mostrar en admin de la orden.
 */
add_action( 'woocommerce_admin_order_data_after_billing_address', 'jewelry_display_custom_field_in_admin' );
function jewelry_display_custom_field_in_admin( $order ) {
    $gift_message = get_post_meta( $order->get_id(), '_gift_message', true );

    if ( $gift_message ) {
        echo '<p><strong>Gift Message:</strong> ' . esc_html( $gift_message ) . '</p>';
    }
}
```

---

## 💾 Base de Datos

### Skill 8: Ejecutar Comandos WP-CLI en Docker

**Prompt para Copilot:**

```
Create helper functions to execute WP-CLI commands inside Docker container.
Include commands for: list plugins, export/import database, flush cache.
```

**Comandos útiles:**

```bash
# Listar plugins
docker exec jewelry_wordpress wp plugin list --allow-root

# Activar/desactivar plugins
docker exec jewelry_wordpress wp plugin activate woocommerce --allow-root
docker exec jewelry_wordpress wp plugin deactivate plugin-name --allow-root

# Listar productos
docker exec jewelry_wordpress wp post list --post_type=product --allow-root

# Crear producto desde CLI
docker exec jewelry_wordpress wp post create \
  --post_type=product \
  --post_title="Producto Prueba" \
  --post_status=publish \
  --allow-root

# Exportar base de datos
docker exec jewelry_mysql mysqldump \
  -u jewelry_user \
  -p'password' \
  jewelry_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Importar base de datos
docker exec -i jewelry_mysql mysql \
  -u jewelry_user \
  -p'password' \
  jewelry_db < backup.sql

# Flush permalinks
docker exec jewelry_wordpress wp rewrite flush --allow-root

# Limpiar cache
docker exec jewelry_wordpress wp cache flush --allow-root

# Regenerar miniaturas
docker exec jewelry_wordpress wp media regenerate --yes --allow-root

# Buscar y reemplazar en DB
docker exec jewelry_wordpress wp search-replace \
  'old-url.com' \
  'new-url.com' \
  --allow-root

# Ver versión de WordPress
docker exec jewelry_wordpress wp core version --allow-root

# Actualizar plugins
docker exec jewelry_wordpress wp plugin update --all --allow-root
```

### Skill 9: Backups y Restauración

**Script de backup:**

```bash
#!/bin/bash
# backup-jewelry.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/jewelry-backups"
mkdir -p $BACKUP_DIR

echo "Backing up database..."
docker exec jewelry_mysql mysqldump \
  -u jewelry_user \
  -ppassword \
  jewelry_db > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

echo "Backing up uploads..."
tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" \
  data/wordpress/wp-content/uploads/

echo "Backing up theme customizations..."
tar -czf "$BACKUP_DIR/theme_custom_$TIMESTAMP.tar.gz" \
  data/wordpress/wp-content/themes/kadence/functions-custom.php

echo "Backup completed: $BACKUP_DIR"
ls -lh $BACKUP_DIR/*$TIMESTAMP*
```

### Skill 10: Queries Personalizadas con WP_Query

**Prompt para Copilot:**

```
Create WP_Query examples for common jewelry website queries:
1. Get featured products
2. Get products by price range
3. Get recent blog posts
4. Get products from specific category with pagination
Note: TranslatePress handles language filtering automatically — no _locale meta needed.
```

**Código:**

```php
/**
 * Obtener productos destacados.
 * Con TranslatePress, NO se necesita filtrar por _locale.
 * TranslatePress traduce el contenido automáticamente según el idioma activo.
 */
function jewelry_get_featured_products( $limit = 10 ) {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $limit,
        'meta_query' => array(
            array(
                'key' => '_featured',
                'value' => 'yes',
            ),
        ),
    );

    return new WP_Query( $args );
}

/**
 * Obtener productos por rango de precio.
 */
function jewelry_get_products_by_price_range( $min_price, $max_price, $limit = 20 ) {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $limit,
        'meta_query' => array(
            array(
                'key' => '_price',
                'value' => array( $min_price, $max_price ),
                'compare' => 'BETWEEN',
                'type' => 'NUMERIC',
            ),
        ),
        'orderby' => 'meta_value_num',
        'meta_key' => '_price',
        'order' => 'ASC',
    );

    return new WP_Query( $args );
}

/**
 * Obtener posts recientes del blog.
 */
function jewelry_get_recent_posts( $limit = 5 ) {
    $args = array(
        'post_type' => 'post',
        'posts_per_page' => $limit,
        'orderby' => 'date',
        'order' => 'DESC',
    );

    return new WP_Query( $args );
}

/**
 * Obtener productos de categoría con paginación.
 */
function jewelry_get_products_by_category( $category_slug, $paged = 1, $per_page = 12 ) {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $per_page,
        'paged' => $paged,
        'tax_query' => array(
            array(
                'taxonomy' => 'product_cat',
                'field' => 'slug',
                'terms' => $category_slug,
            ),
        ),
    );

    return new WP_Query( $args );
}
```

---

## 🌐 TranslatePress y Multiidioma

### Skill 11: Verificar Estado de Traducciones

**Prompt para Copilot:**

```
Create utility functions to check translation status with TranslatePress.
Query wp_trp_* tables to find untranslated content.
```

**Código:**

```php
/**
 * Obtener estadísticas de traducciones de TranslatePress.
 */
function jewelry_get_translation_stats() {
    global $wpdb;

    $table = $wpdb->prefix . 'trp_dictionary_es_es_en_us';

    $total      = $wpdb->get_var( "SELECT COUNT(*) FROM {$table}" );
    $translated = $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE translated != '' AND translated IS NOT NULL" );
    $pending    = $total - $translated;

    return array(
        'total'      => $total,
        'translated' => $translated,
        'pending'    => $pending,
        'percentage' => $total > 0 ? round( ( $translated / $total ) * 100, 1 ) : 0,
    );
}

/**
 * Buscar texto sin traducir en TranslatePress.
 */
function jewelry_find_untranslated_strings( $limit = 50 ) {
    global $wpdb;

    $table = $wpdb->prefix . 'trp_dictionary_es_es_en_us';

    return $wpdb->get_results( $wpdb->prepare(
        "SELECT original, status FROM {$table} WHERE translated = '' OR translated IS NULL LIMIT %d",
        $limit
    ) );
}

/**
 * Verificar si un texto específico tiene traducción.
 */
function jewelry_check_translation( $text ) {
    global $wpdb;

    $table = $wpdb->prefix . 'trp_dictionary_es_es_en_us';

    return $wpdb->get_row( $wpdb->prepare(
        "SELECT original, translated, status FROM {$table} WHERE original = %s",
        $text
    ) );
}
```

### Skill 12: Generar Reporte de Traducciones

**Prompt para Copilot:**

```
Create admin tool to generate a translation coverage report.
Query TranslatePress tables for translation status per content type.
```

**Código:**

```php
/**
 * Generar reporte completo de traducciones.
 */
function jewelry_generate_translation_report() {
    $stats = jewelry_get_translation_stats();
    $untranslated = jewelry_find_untranslated_strings( 20 );

    $report = array(
        'stats'        => $stats,
        'untranslated' => $untranslated,
    );

    return $report;
}

/**
 * Mostrar reporte en admin.
 */
function jewelry_display_translation_report() {
    $report = jewelry_generate_translation_report();

    echo '<div class="wrap">';
    echo '<h1>Translation Report</h1>';
    echo '<p>Total strings: ' . esc_html( $report['stats']['total'] ) . '</p>';
    echo '<p>Translated: ' . esc_html( $report['stats']['translated'] ) . ' (' . esc_html( $report['stats']['percentage'] ) . '%)</p>';
    echo '<p>Pending: ' . esc_html( $report['stats']['pending'] ) . '</p>';

    if ( ! empty( $report['untranslated'] ) ) {
        echo '<h2>Untranslated Strings (sample)</h2>';
        echo '<ul>';
        foreach ( $report['untranslated'] as $item ) {
            echo '<li>' . esc_html( $item->original ) . '</li>';
        }
        echo '</ul>';
    }

    echo '</div>';
}
```

### Skill 13: Usar el Language Switcher de TranslatePress

**Prompt para Copilot:**

```
Show how to use the TranslatePress language switcher shortcode
and how to detect the current language programmatically.
```

**Código:**

```php
/**
 * Usar el shortcode de TranslatePress para el language switcher.
 * TranslatePress proporciona su propio switcher — no necesitas crear uno custom.
 */

// En cualquier template o widget:
echo do_shortcode( '[language-switcher]' );

/**
 * Obtener idioma actual con TranslatePress.
 */
function jewelry_get_current_locale() {
    global $TRP_LANGUAGE;
    if ( ! empty( $TRP_LANGUAGE ) ) {
        return $TRP_LANGUAGE;
    }
    return get_locale();
}

/**
 * Verificar si TranslatePress está activo.
 */
function jewelry_is_translatepress_active() {
    return class_exists( 'TRP_Translate_Press' );
}

/**
 * Obtener URL en otro idioma (TranslatePress lo maneja automáticamente).
 * Las URLs en inglés llevan prefijo /en/: /en/shop/, /en/about-us/, etc.
 */
```

---

## 🧩 Gutenberg

### Skill 14: Bloques Gutenberg Personalizados

**Prompt para Copilot:**

```
Create custom Gutenberg block "Featured Products Carousel" that shows featured products.
Include block controls for category selection and number of products.
TranslatePress handles translation automatically — no _locale filtering needed.
```

**Código (registro del bloque):**

```php
/**
 * Registrar bloque personalizado de productos destacados.
 */
add_action( 'init', 'jewelry_register_featured_products_block' );
function jewelry_register_featured_products_block() {
    register_block_type( 'jewelry/featured-products', array(
        'render_callback' => 'jewelry_render_featured_products_block',
        'attributes' => array(
            'numberOfProducts' => array(
                'type' => 'number',
                'default' => 4,
            ),
            'categoryId' => array(
                'type' => 'number',
                'default' => 0,
            ),
        ),
    ) );
}

/**
 * Render del bloque.
 * Con TranslatePress, NO se filtra por _locale.
 * TranslatePress traduce el contenido automáticamente según el idioma activo.
 */
function jewelry_render_featured_products_block( $attributes ) {
    $number = isset( $attributes['numberOfProducts'] ) ? intval( $attributes['numberOfProducts'] ) : 4;
    $category_id = isset( $attributes['categoryId'] ) ? intval( $attributes['categoryId'] ) : 0;

    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $number,
        'meta_query' => array(
            array(
                'key' => '_featured',
                'value' => 'yes',
            ),
        ),
    );

    if ( $category_id > 0 ) {
        $args['tax_query'] = array(
            array(
                'taxonomy' => 'product_cat',
                'field' => 'term_id',
                'terms' => $category_id,
            ),
        );
    }

    $query = new WP_Query( $args );

    if ( ! $query->have_posts() ) {
        return '<p>No featured products found.</p>';
    }

    ob_start();

    echo '<div class="jewelry-featured-products">';

    while ( $query->have_posts() ) {
        $query->the_post();
        wc_get_template_part( 'content', 'product' );
    }

    echo '</div>';

    wp_reset_postdata();

    return ob_get_clean();
}
```

---

## 🔒 Seguridad

### Skill 15: Rate Limiting y Seguridad

**Prompt para Copilot:**

```
Implement rate limiting for checkout and login forms.
Add security headers and sanitization for all custom inputs.
```

**Código:**

```php
/**
 * Rate limiting para formularios.
 */
function jewelry_check_rate_limit( $action, $max_attempts = 5, $time_window = 300 ) {
    $ip = $_SERVER['REMOTE_ADDR'];
    $transient_key = "jewelry_rate_{$action}_{$ip}";

    $attempts = get_transient( $transient_key );

    if ( false === $attempts ) {
        set_transient( $transient_key, 1, $time_window );
        return true;
    }

    if ( $attempts >= $max_attempts ) {
        return false;
    }

    set_transient( $transient_key, $attempts + 1, $time_window );
    return true;
}

/**
 * Aplicar rate limiting en checkout.
 */
add_action( 'woocommerce_checkout_process', 'jewelry_checkout_rate_limit' );
function jewelry_checkout_rate_limit() {
    if ( ! jewelry_check_rate_limit( 'checkout', 10, 600 ) ) {
        $locale = jewelry_get_current_locale();
        $error = ( 'es_ES' === $locale )
            ? 'Demasiados intentos. Por favor espere unos minutos.'
            : 'Too many attempts. Please wait a few minutes.';
        wc_add_notice( $error, 'error' );
    }
}

/**
 * Agregar security headers.
 */
add_action( 'send_headers', 'jewelry_add_security_headers' );
function jewelry_add_security_headers() {
    header( 'X-Content-Type-Options: nosniff' );
    header( 'X-Frame-Options: SAMEORIGIN' );
    header( 'X-XSS-Protection: 1; mode=block' );
    header( 'Referrer-Policy: strict-origin-when-cross-origin' );
}
```

---

## 🧪 Testing y Datos de Prueba

### Skill 16: Crear Datos de Prueba

**Prompt para Copilot:**

```
Create function to generate test products in both languages for development.
Include various categories, price ranges, and product types.
```

**Código:**

```php
/**
 * Generar productos de prueba bilingües.
 */
function jewelry_create_test_products( $count = 10 ) {
    $categories_es = array( 'cadenas-de-oro', 'pulseras', 'urban-iced-out' );
    $categories_en = array( 'gold-chains', 'bracelets', 'urban-iced-out' );

    $products_created = 0;

    for ( $i = 1; $i <= $count; $i++ ) {
        $price = rand( 299, 999 ) . '.99';
        $sku = 'TEST-' . str_pad( $i, 4, '0', STR_PAD_LEFT );

        $cat_index = rand( 0, count( $categories_es ) - 1 );
        $cat_es = get_term_by( 'slug', $categories_es[ $cat_index ], 'product_cat' );
        $cat_en = get_term_by( 'slug', $categories_en[ $cat_index ], 'product_cat' );

        $data_es = array(
            'name' => "Producto de Prueba #{$i}",
            'description' => "Descripción detallada del producto de prueba #{$i}",
            'short_description' => "Descripción corta #{$i}"
        );

        $data_en = array(
            'name' => "Test Product #{$i}",
            'description' => "Detailed description of test product #{$i}",
            'short_description' => "Short description #{$i}"
        );

        $categories = array(
            'es' => $cat_es ? array( $cat_es->term_id ) : array(),
            'en' => $cat_en ? array( $cat_en->term_id ) : array()
        );

        jewelry_create_bilingual_product( $data_es, $data_en, $sku, $price, $categories );
        $products_created++;
    }

    return $products_created;
}

/**
 * Limpiar productos de prueba.
 */
function jewelry_delete_test_products() {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => '_sku',
                'value' => 'TEST-',
                'compare' => 'LIKE'
            )
        )
    );

    $products = get_posts( $args );
    $deleted = 0;

    foreach ( $products as $product ) {
        wp_delete_post( $product->ID, true );
        $deleted++;
    }

    return $deleted;
}
```

---

## 💡 Optimización con Copilot

### Tips para Usar Copilot Eficientemente

1. **Contexto Claro en Comentarios**

   ```php
   // Create a bilingual product for Miami Cuban Link 10k 6mm
   // Spanish: Cadena Cubana Miami 10k 6mm
   // English: Miami Cuban Link 10k 6mm
   // Price: $499.99, SKU: CUB-10K-6MM
   // Translate product with TranslatePress
   ```

2. **Usar Nombres Descriptivos**

   ```php
   // ✅ Bueno
   function jewelry_create_bilingual_product_with_variations()

   // ❌ Malo
   function create_prod()
   ```

3. **Documentación PHPDoc Completa**

   ```php
   /**
    * Creates a WooCommerce product with TranslatePress translation.
    *
    * @param array $data_es Spanish product data (name, description, short_description).
    * @param array $data_en English product data (name, description, short_description).
    * @param string $sku Product SKU.
    * @param float $price Regular price.
    * @param array $categories Category IDs array with 'es' and 'en' keys.
    * @return array Array with created product IDs array('es' => id, 'en' => id).
    */
   ```

4. **Usar Variables con Nombres en Contexto**

   ```php
   $product_es // Copilot sabrá que es producto en español
   $product_en // Copilot sabrá que es producto en inglés
   $locale     // Copilot lo usará para detección de idioma
   ```

5. **Escribir Tests con Describe/It Style**

   ```php
   // Test: should create bilingual product with TranslatePress translation
   // Given: product data in Spanish and English
   // When: calling jewelry_create_bilingual_product
   // Then: should return both product IDs and both should be linked
   ```

6. **Solicitar Código Seguro**

   ```php
   // Create checkout field with:
   // - Nonce verification
   // - Input sanitization
   // - Output escaping
   // - Rate limiting
   ```

7. **Especificar Estándares**
   ```php
   // Follow WordPress Coding Standards
   // Use 4 spaces indentation
   // Use Yoda conditions
   // Prefix all functions with jewelry_
   ```

---

## 📚 Recursos Adicionales

- **WordPress Developer Docs:** https://developer.wordpress.org/
- **WooCommerce Code Reference:** https://woocommerce.github.io/code-reference/
- **TranslatePress:** https://translatepress.com/docs/
- **WordPress Coding Standards:** https://developer.wordpress.org/coding-standards/
- **Docker Documentation:** https://docs.docker.com/
- **WP-CLI Commands:** https://developer.wordpress.org/cli/commands/

---

**Nota:** Todos estos skills están diseñados para el proyecto Jewelry con contenido bilingüe (Español/Inglés) usando TranslatePress. El contenido se crea una vez en español y se traduce visualmente desde el frontend.
