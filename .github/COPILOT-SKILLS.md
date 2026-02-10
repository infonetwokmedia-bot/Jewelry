# GitHub Copilot Skills - Jewelry Project

Guía completa de skills especializados para desarrollo eficiente del sitio web de joyería bilingüe.

## 📚 Tabla de Contenidos

1. [Productos](#productos)
2. [Páginas y Contenido](#páginas-y-contenido)
3. [WooCommerce](#woocommerce)
4. [Base de Datos](#base-de-datos)
5. [Bogo y Multiidioma](#bogo-y-multiidioma)
6. [Gutenberg](#gutenberg)
7. [Seguridad](#seguridad)
8. [Testing y Datos de Prueba](#testing-y-datos-de-prueba)
9. [Optimización con Copilot](#optimización-con-copilot)

---

## 🛍️ Productos

### Skill 1: Crear Producto Bilingüe Completo

**Prompt para Copilot:**
```
Create a complete bilingual WooCommerce product using Bogo plugin.
Product details:
- Spanish: [name_es], [description_es], [price]
- English: [name_en], [description_en], [price]
- SKU: [sku]
- Categories: [categories]
Link both products with Bogo meta fields.
```

**Código esperado:**
```php
function jewelry_create_bilingual_product( $data_es, $data_en, $sku, $price, $categories = array() ) {
    // Producto en español
    $product_es = new WC_Product_Simple();
    $product_es->set_name( $data_es['name'] );
    $product_es->set_description( $data_es['description'] );
    $product_es->set_short_description( $data_es['short_description'] );
    $product_es->set_regular_price( $price );
    $product_es->set_sku( $sku . '-ES' );
    $product_es->set_catalog_visibility( 'visible' );
    $product_es->set_category_ids( $categories['es'] );
    $product_id_es = $product_es->save();
    
    update_post_meta( $product_id_es, '_locale', 'es_ES' );
    
    // Producto en inglés
    $product_en = new WC_Product_Simple();
    $product_en->set_name( $data_en['name'] );
    $product_en->set_description( $data_en['description'] );
    $product_en->set_short_description( $data_en['short_description'] );
    $product_en->set_regular_price( $price );
    $product_en->set_sku( $sku . '-EN' );
    $product_en->set_catalog_visibility( 'visible' );
    $product_en->set_category_ids( $categories['en'] );
    $product_id_en = $product_en->save();
    
    update_post_meta( $product_id_en, '_locale', 'en_US' );
    
    // Vincular con Bogo
    $translations = array(
        'es_ES' => $product_id_es,
        'en_US' => $product_id_en
    );
    update_post_meta( $product_id_es, '_bogo_translations', $translations );
    update_post_meta( $product_id_en, '_bogo_translations', $translations );
    
    return array( 'es' => $product_id_es, 'en' => $product_id_en );
}
```

### Skill 2: Importar Productos desde CSV

**Prompt para Copilot:**
```
Create a function to import bilingual products from CSV file.
CSV structure: sku, name_es, name_en, description_es, description_en, price, category_es, category_en
Parse CSV and create products in both languages linked with Bogo.
Include error handling and logging.
```

**Uso:**
```php
// Ejemplo de CSV:
// sku,name_es,name_en,description_es,description_en,price,category_es,category_en
// CUB001,Cadena Cubana 10k,Cuban Link 10k,Descripción ES,Description EN,499.99,cadenas-de-oro,gold-chains

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
                'short_description' => ''
            );
            
            $data_en = array(
                'name' => $data['name_en'],
                'description' => $data['description_en'],
                'short_description' => ''
            );
            
            // Obtener IDs de categorías
            $cat_es = get_term_by( 'slug', $data['category_es'], 'product_cat' );
            $cat_en = get_term_by( 'slug', $data['category_en'], 'product_cat' );
            
            $categories = array(
                'es' => $cat_es ? array( $cat_es->term_id ) : array(),
                'en' => $cat_en ? array( $cat_en->term_id ) : array()
            );
            
            jewelry_create_bilingual_product( $data_es, $data_en, $data['sku'], $data['price'], $categories );
            $imported++;
            
        } catch ( Exception $e ) {
            $errors[] = "Error in row {$imported}: " . $e->getMessage();
        }
    }
    
    fclose( $file );
    
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
Update both Spanish and English linked products.
```

**Código:**
```php
function jewelry_bulk_update_prices( $category_slug = '', $sku_pattern = '', $adjustment_type = 'percentage', $adjustment_value = 0 ) {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => '_locale',
                'value' => 'es_ES'
            )
        )
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
        
        // Actualizar también el producto en inglés
        $translations = get_post_meta( $post->ID, '_bogo_translations', true );
        if ( isset( $translations['en_US'] ) ) {
            $product_en = wc_get_product( $translations['en_US'] );
            $product_en->set_regular_price( $new_price );
            $product_en->save();
        }
        
        $updated++;
    }
    
    return $updated;
}

// Uso:
// Aumentar 10% todos los productos de "cadenas-de-oro"
jewelry_bulk_update_prices( 'cadenas-de-oro', '', 'percentage', 10 );

// Reducir $50 todos los productos con SKU que contenga "CUB"
jewelry_bulk_update_prices( '', 'CUB', 'fixed', -50 );
```

### Skill 4: Crear Variaciones de Productos

**Prompt para Copilot:**
```
Create a variable product with size variations (6mm, 8mm, 10mm) in both languages.
Each variation has different price. Link parent products with Bogo.
```

**Código:**
```php
function jewelry_create_variable_product_bilingual( $base_name_es, $base_name_en, $variations ) {
    // Crear atributo de tamaño si no existe
    $attribute_name = 'pa_size';
    
    if ( ! taxonomy_exists( $attribute_name ) ) {
        wc_create_attribute( array(
            'name' => 'Size',
            'slug' => 'size',
            'type' => 'select',
            'has_archives' => false
        ) );
    }
    
    // Producto variable en español
    $product_es = new WC_Product_Variable();
    $product_es->set_name( $base_name_es );
    
    $attribute_es = new WC_Product_Attribute();
    $attribute_es->set_name( $attribute_name );
    $attribute_es->set_options( array_keys( $variations ) );
    $attribute_es->set_visible( true );
    $attribute_es->set_variation( true );
    $product_es->set_attributes( array( $attribute_es ) );
    
    $product_id_es = $product_es->save();
    update_post_meta( $product_id_es, '_locale', 'es_ES' );
    
    // Producto variable en inglés
    $product_en = new WC_Product_Variable();
    $product_en->set_name( $base_name_en );
    
    $attribute_en = new WC_Product_Attribute();
    $attribute_en->set_name( $attribute_name );
    $attribute_en->set_options( array_keys( $variations ) );
    $attribute_en->set_visible( true );
    $attribute_en->set_variation( true );
    $product_en->set_attributes( array( $attribute_en ) );
    
    $product_id_en = $product_en->save();
    update_post_meta( $product_id_en, '_locale', 'en_US' );
    
    // Crear variaciones
    foreach ( $variations as $size => $price ) {
        // Variación ES
        $variation_es = new WC_Product_Variation();
        $variation_es->set_parent_id( $product_id_es );
        $variation_es->set_regular_price( $price );
        $variation_es->set_attributes( array( $attribute_name => $size ) );
        $variation_es->save();
        
        // Variación EN
        $variation_en = new WC_Product_Variation();
        $variation_en->set_parent_id( $product_id_en );
        $variation_en->set_regular_price( $price );
        $variation_en->set_attributes( array( $attribute_name => $size ) );
        $variation_en->save();
    }
    
    // Vincular con Bogo
    $translations = array(
        'es_ES' => $product_id_es,
        'en_US' => $product_id_en
    );
    update_post_meta( $product_id_es, '_bogo_translations', $translations );
    update_post_meta( $product_id_en, '_bogo_translations', $translations );
    
    return array( 'es' => $product_id_es, 'en' => $product_id_en );
}

// Uso:
jewelry_create_variable_product_bilingual(
    'Cadena Cubana Miami',
    'Miami Cuban Link',
    array(
        '6mm' => 399.99,
        '8mm' => 549.99,
        '10mm' => 699.99
    )
);
```

---

## 📄 Páginas y Contenido

### Skill 5: Crear Página Bilingüe con Template

**Prompt para Copilot:**
```
Create a bilingual page with custom template.
Include Spanish and English content, link with Bogo.
Set page template and featured image.
```

**Código:**
```php
function jewelry_create_page_with_template( $title_es, $title_en, $content_es, $content_en, $template = '', $featured_image_id = 0 ) {
    // Página en español
    $page_data_es = array(
        'post_title'    => $title_es,
        'post_content'  => $content_es,
        'post_status'   => 'publish',
        'post_type'     => 'page',
        'post_author'   => 1,
    );
    
    $page_id_es = wp_insert_post( $page_data_es );
    
    update_post_meta( $page_id_es, '_locale', 'es_ES' );
    
    if ( $template ) {
        update_post_meta( $page_id_es, '_wp_page_template', $template );
    }
    
    if ( $featured_image_id ) {
        set_post_thumbnail( $page_id_es, $featured_image_id );
    }
    
    // Página en inglés
    $page_data_en = array(
        'post_title'    => $title_en,
        'post_content'  => $content_en,
        'post_status'   => 'publish',
        'post_type'     => 'page',
        'post_author'   => 1,
    );
    
    $page_id_en = wp_insert_post( $page_data_en );
    
    update_post_meta( $page_id_en, '_locale', 'en_US' );
    
    if ( $template ) {
        update_post_meta( $page_id_en, '_wp_page_template', $template );
    }
    
    if ( $featured_image_id ) {
        set_post_thumbnail( $page_id_en, $featured_image_id );
    }
    
    // Vincular con Bogo
    $translations = array(
        'es_ES' => $page_id_es,
        'en_US' => $page_id_en
    );
    update_post_meta( $page_id_es, '_bogo_translations', $translations );
    update_post_meta( $page_id_en, '_bogo_translations', $translations );
    
    return array( 'es' => $page_id_es, 'en' => $page_id_en );
}
```

---

## 🛒 WooCommerce

### Skill 6: Personalizar Emails de WooCommerce Bilingües

**Prompt para Copilot:**
```
Override WooCommerce email templates to support Bogo multilingual.
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
1. Get featured products in current language
2. Get products by price range in current language
3. Get recent blog posts in current language
4. Get products from specific category with pagination
```

**Código:**
```php
/**
 * Obtener productos destacados en el idioma actual.
 */
function jewelry_get_featured_products( $limit = 10 ) {
    $locale = jewelry_get_current_locale();
    
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $limit,
        'meta_query' => array(
            'relation' => 'AND',
            array(
                'key' => '_locale',
                'value' => $locale,
            ),
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
    $locale = jewelry_get_current_locale();
    
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $limit,
        'meta_query' => array(
            'relation' => 'AND',
            array(
                'key' => '_locale',
                'value' => $locale,
            ),
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
    $locale = jewelry_get_current_locale();
    
    $args = array(
        'post_type' => 'post',
        'posts_per_page' => $limit,
        'meta_query' => array(
            array(
                'key' => '_locale',
                'value' => $locale,
            ),
        ),
        'orderby' => 'date',
        'order' => 'DESC',
    );
    
    return new WP_Query( $args );
}

/**
 * Obtener productos de categoría con paginación.
 */
function jewelry_get_products_by_category( $category_slug, $paged = 1, $per_page = 12 ) {
    $locale = jewelry_get_current_locale();
    
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
        'meta_query' => array(
            array(
                'key' => '_locale',
                'value' => $locale,
            ),
        ),
    );
    
    return new WP_Query( $args );
}
```

---

## 🌐 Bogo y Multiidioma

### Skill 11: Vincular Entidades con Bogo

**Prompt para Copilot:**
```
Create utility functions to link posts/products/terms with Bogo.
Include validation to ensure both locales exist before linking.
```

**Código:**
```php
/**
 * Vincular dos posts/productos con Bogo.
 */
function jewelry_link_posts_bogo( $post_id_es, $post_id_en ) {
    // Validar que ambos posts existan
    if ( ! get_post( $post_id_es ) || ! get_post( $post_id_en ) ) {
        return new WP_Error( 'invalid_post', 'One or both posts do not exist' );
    }
    
    // Establecer locales
    update_post_meta( $post_id_es, '_locale', 'es_ES' );
    update_post_meta( $post_id_en, '_locale', 'en_US' );
    
    // Crear vinculación bidireccional
    $translations = array(
        'es_ES' => $post_id_es,
        'en_US' => $post_id_en
    );
    
    update_post_meta( $post_id_es, '_bogo_translations', $translations );
    update_post_meta( $post_id_en, '_bogo_translations', $translations );
    
    return true;
}

/**
 * Vincular términos (categorías, etiquetas) con Bogo.
 */
function jewelry_link_terms_bogo( $term_id_es, $term_id_en, $taxonomy = 'product_cat' ) {
    // Validar términos
    if ( ! term_exists( $term_id_es, $taxonomy ) || ! term_exists( $term_id_en, $taxonomy ) ) {
        return new WP_Error( 'invalid_term', 'One or both terms do not exist' );
    }
    
    // Establecer locales
    update_term_meta( $term_id_es, '_locale', 'es_ES' );
    update_term_meta( $term_id_en, '_locale', 'en_US' );
    
    // Crear vinculación
    $translations = array(
        'es_ES' => $term_id_es,
        'en_US' => $term_id_en
    );
    
    update_term_meta( $term_id_es, '_bogo_translations', $translations );
    update_term_meta( $term_id_en, '_bogo_translations', $translations );
    
    return true;
}

/**
 * Obtener traducción de un post.
 */
function jewelry_get_translation( $post_id, $target_locale ) {
    $translations = get_post_meta( $post_id, '_bogo_translations', true );
    
    if ( isset( $translations[ $target_locale ] ) ) {
        return $translations[ $target_locale ];
    }
    
    return null;
}
```

### Skill 12: Detectar Contenido Sin Traducir

**Prompt para Copilot:**
```
Create admin tool to detect products/pages without translations.
Generate report with missing translations.
```

**Código:**
```php
/**
 * Detectar productos sin traducción.
 */
function jewelry_find_untranslated_products() {
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => '_locale',
                'value' => 'es_ES',
            ),
        ),
    );
    
    $products = get_posts( $args );
    $untranslated = array();
    
    foreach ( $products as $product ) {
        $translations = get_post_meta( $product->ID, '_bogo_translations', true );
        
        if ( ! isset( $translations['en_US'] ) || ! get_post( $translations['en_US'] ) ) {
            $untranslated[] = array(
                'id' => $product->ID,
                'title' => $product->post_title,
                'edit_link' => get_edit_post_link( $product->ID ),
            );
        }
    }
    
    return $untranslated;
}

/**
 * Generar reporte de contenido sin traducir.
 */
function jewelry_generate_translation_report() {
    $report = array(
        'products' => jewelry_find_untranslated_products(),
        'pages' => jewelry_find_untranslated_pages(),
    );
    
    return $report;
}
```

### Skill 13: Crear Language Switcher Personalizado

**Prompt para Copilot:**
```
Create custom language switcher widget that shows current language flags.
Include dropdown with available translations of current page.
```

**Código:**
```php
/**
 * Shortcode para language switcher personalizado.
 */
add_shortcode( 'jewelry_language_switcher', 'jewelry_language_switcher_shortcode' );
function jewelry_language_switcher_shortcode() {
    $current_locale = jewelry_get_current_locale();
    $post_id = get_the_ID();
    
    $translations = get_post_meta( $post_id, '_bogo_translations', true );
    
    if ( ! $translations || count( $translations ) < 2 ) {
        return '';
    }
    
    $output = '<div class="jewelry-language-switcher">';
    
    foreach ( $translations as $locale => $trans_id ) {
        if ( $locale === $current_locale ) {
            continue; // Skip current language
        }
        
        $url = get_permalink( $trans_id );
        $flag = ( 'es_ES' === $locale ) ? '🇪🇸' : '🇺🇸';
        $label = ( 'es_ES' === $locale ) ? 'Español' : 'English';
        
        $output .= sprintf(
            '<a href="%s" class="language-switch-link" data-locale="%s">%s %s</a>',
            esc_url( $url ),
            esc_attr( $locale ),
            $flag,
            esc_html( $label )
        );
    }
    
    $output .= '</div>';
    
    return $output;
}
```

---

## 🧩 Gutenberg

### Skill 14: Bloques Gutenberg Personalizados

**Prompt para Copilot:**
```
Create custom Gutenberg block "Featured Products Carousel" that shows products in current language.
Include block controls for category selection and number of products.
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
 */
function jewelry_render_featured_products_block( $attributes ) {
    $locale = jewelry_get_current_locale();
    $number = isset( $attributes['numberOfProducts'] ) ? intval( $attributes['numberOfProducts'] ) : 4;
    $category_id = isset( $attributes['categoryId'] ) ? intval( $attributes['categoryId'] ) : 0;
    
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => $number,
        'meta_query' => array(
            'relation' => 'AND',
            array(
                'key' => '_locale',
                'value' => $locale,
            ),
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
   // Link both products with Bogo
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
    * Creates a bilingual WooCommerce product with Bogo linking.
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
   // Test: should create bilingual product and link with Bogo
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
- **Bogo Plugin:** https://wordpress.org/plugins/bogo/
- **WordPress Coding Standards:** https://developer.wordpress.org/coding-standards/
- **Docker Documentation:** https://docs.docker.com/
- **WP-CLI Commands:** https://developer.wordpress.org/cli/commands/

---

**Nota:** Todos estos skills están diseñados para el proyecto Jewelry con contenido bilingüe (Español/Inglés) usando Bogo. Siempre crear contenido en ambos idiomas simultáneamente.
