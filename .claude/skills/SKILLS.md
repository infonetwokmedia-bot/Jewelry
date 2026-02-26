# GitHub Copilot Skills - Tu Joyita Miami

Skills especializados para el sitio web bilingüe de joyería con WordPress + WooCommerce.

## Stack

- **CMS:** WordPress 6.9.1 + WooCommerce 10.5.1
- **Tema:** Astra 4.12.3 (gratuito) — NO Kadence
- **Page Builder:** Elementor 3.35.4
- **Multiidioma:** TranslatePress 3.0.9 — NO Bogo, NO Polylang, NO WPML
- **Infraestructura:** Docker + Traefik
- **Custom Code:** mu-plugins con prefijo `jewelry_`

## Regla Fundamental: TranslatePress

- **Español (es_ES)** = idioma principal (URL: `/`)
- **English (en_US)** = idioma secundario (URL: `/en/`)
- **UNA sola instancia** de cada producto/página/post
- Traducciones almacenadas en tablas `wp_trp_*`
- NO se duplican posts. NO hay `_locale` ni `_bogo_translations`
- Traducción visual: `?trp-edit-translation=true`

---

## 📚 Tabla de Contenidos

1. [Productos](#productos)
2. [Páginas y Contenido](#páginas-y-contenido)
3. [WooCommerce](#woocommerce)
4. [Base de Datos](#base-de-datos)
5. [TranslatePress y Multiidioma](#translatepress-y-multiidioma)
6. [Seguridad](#seguridad)
7. [Testing](#testing)
8. [Deploy](#deploy)

---

## 🛍️ Productos

### Skill 1: Crear Producto WooCommerce

Con TranslatePress se crea UN solo producto (en español). La traducción se hace después visualmente.

```php
function jewelry_create_product( $data, $sku, $price, $category_ids = array() ) {
    $product = new WC_Product_Simple();
    $product->set_name( $data['name'] );
    $product->set_description( $data['description'] );
    $product->set_short_description( $data['short_description'] );
    $product->set_regular_price( $price );
    $product->set_sku( $sku );
    $product->set_catalog_visibility( 'visible' );
    $product->set_status( 'publish' );

    if ( ! empty( $category_ids ) ) {
        $product->set_category_ids( $category_ids );
    }

    $product_id = $product->save();

    return $product_id;
}
```

### Skill 2: Crear Producto Variable (con tallas/materiales)

```php
function jewelry_create_variable_product( $data, $sku, $attributes, $variations ) {
    $product = new WC_Product_Variable();
    $product->set_name( $data['name'] );
    $product->set_description( $data['description'] );
    $product->set_short_description( $data['short_description'] );
    $product->set_sku( $sku );
    $product->set_status( 'publish' );
    $product->set_catalog_visibility( 'visible' );

    // Configurar atributos
    $product_attributes = array();
    foreach ( $attributes as $attr_name => $attr_values ) {
        $attribute = new WC_Product_Attribute();
        $attribute->set_name( $attr_name );
        $attribute->set_options( $attr_values );
        $attribute->set_visible( true );
        $attribute->set_variation( true );
        $product_attributes[] = $attribute;
    }
    $product->set_attributes( $product_attributes );
    $product_id = $product->save();

    // Crear variaciones
    foreach ( $variations as $variation_data ) {
        $variation = new WC_Product_Variation();
        $variation->set_parent_id( $product_id );
        $variation->set_regular_price( $variation_data['price'] );
        $variation->set_sku( $sku . '-' . $variation_data['suffix'] );
        $variation->set_attributes( $variation_data['attributes'] );
        $variation->set_stock_status( 'instock' );
        $variation->save();
    }

    return $product_id;
}
```

### Skill 3: Importar Productos desde CSV

```php
function jewelry_import_products_from_csv( $csv_file_path ) {
    $file = fopen( $csv_file_path, 'r' );
    $header = fgetcsv( $file );
    $imported = 0;
    $errors = array();

    while ( ( $row = fgetcsv( $file ) ) !== false ) {
        $data = array_combine( $header, $row );

        try {
            $product_id = jewelry_create_product(
                array(
                    'name'              => sanitize_text_field( $data['name'] ),
                    'description'       => wp_kses_post( $data['description'] ),
                    'short_description' => wp_kses_post( $data['short_description'] ),
                ),
                sanitize_text_field( $data['sku'] ),
                floatval( $data['price'] )
            );

            if ( $product_id ) {
                $imported++;
                jewelry_log( "Producto importado: {$data['name']} (ID: $product_id)" );
            }
        } catch ( Exception $e ) {
            $errors[] = "Error en SKU {$data['sku']}: " . $e->getMessage();
            jewelry_log( "Error importando: " . $e->getMessage(), 'error' );
        }
    }

    fclose( $file );

    return array(
        'imported' => $imported,
        'errors'   => $errors,
    );
}
```

---

## 📄 Páginas y Contenido

### Skill 4: Crear Página Programáticamente

```php
function jewelry_create_page( $title, $slug, $content = '', $template = '' ) {
    $existing = get_page_by_path( $slug );
    if ( $existing ) {
        return $existing->ID;
    }

    $page_data = array(
        'post_title'   => sanitize_text_field( $title ),
        'post_name'    => sanitize_title( $slug ),
        'post_content' => wp_kses_post( $content ),
        'post_status'  => 'publish',
        'post_type'    => 'page',
        'post_author'  => 1,
    );

    $page_id = wp_insert_post( $page_data );

    if ( ! empty( $template ) ) {
        update_post_meta( $page_id, '_wp_page_template', $template );
    }

    return $page_id;
}
```

### Skill 5: Configurar Menús Bilingües (Astra + TranslatePress)

TranslatePress traduce automáticamente los menús. Solo necesitas crear el menú en español:

```php
function jewelry_setup_menus() {
    $menu_name   = 'Menu Principal';
    $menu_exists = wp_get_nav_menu_object( $menu_name );

    if ( ! $menu_exists ) {
        $menu_id = wp_create_nav_menu( $menu_name );

        wp_update_nav_menu_item( $menu_id, 0, array(
            'menu-item-title'   => 'Inicio',
            'menu-item-url'     => home_url( '/' ),
            'menu-item-status'  => 'publish',
            'menu-item-type'    => 'custom',
        ) );

        wp_update_nav_menu_item( $menu_id, 0, array(
            'menu-item-title'   => 'Tienda',
            'menu-item-url'     => home_url( '/tienda/' ),
            'menu-item-status'  => 'publish',
            'menu-item-type'    => 'custom',
        ) );

        // Asignar a ubicación de Astra
        $locations = get_theme_mod( 'nav_menu_locations' );
        $locations['primary'] = $menu_id;
        set_theme_mod( 'nav_menu_locations', $locations );
    }
}
add_action( 'after_setup_theme', 'jewelry_setup_menus' );
```

---

## 🛒 WooCommerce

### Skill 6: Configurar WooCommerce para Joyería

```php
function jewelry_woocommerce_setup() {
    // Moneda USD
    update_option( 'woocommerce_currency', 'USD' );
    update_option( 'woocommerce_currency_pos', 'left' );

    // Ubicación: Miami, FL
    update_option( 'woocommerce_default_country', 'US:FL' );

    // Impuestos
    update_option( 'woocommerce_calc_taxes', 'yes' );

    // Inventario
    update_option( 'woocommerce_manage_stock', 'yes' );
    update_option( 'woocommerce_notify_low_stock', 'yes' );
    update_option( 'woocommerce_notify_no_stock', 'yes' );

    // Dimensiones
    update_option( 'woocommerce_dimension_unit', 'in' );
    update_option( 'woocommerce_weight_unit', 'oz' );
}
```

### Skill 7: API REST WooCommerce (Dashboard SPA)

```javascript
// Ejemplo de llamada API desde dashboard/js/api.js
async function getProducts(page = 1, perPage = 20) {
    const response = await fetch(
        `${ENV.WC_API_URL}/products?page=${page}&per_page=${perPage}`,
        {
            headers: {
                'Authorization': `Basic ${btoa(ENV.WC_KEY + ':' + ENV.WC_SECRET)}`
            }
        }
    );
    return response.json();
}

async function createOrder(orderData) {
    const response = await fetch(`${ENV.WC_API_URL}/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(ENV.WC_KEY + ':' + ENV.WC_SECRET)}`
        },
        body: JSON.stringify(orderData)
    });
    return response.json();
}
```

---

## 🗄️ Base de Datos

### Skill 8: Backup y Restore con WP-CLI

```bash
# Backup local
docker exec jewelry_wordpress wp db export /tmp/backup.sql --allow-root
docker cp jewelry_wordpress:/tmp/backup.sql ./backups/backup-$(date +%Y%m%d).sql

# Restore local
docker cp ./backups/backup.sql jewelry_wordpress:/tmp/backup.sql
docker exec jewelry_wordpress wp db import /tmp/backup.sql --allow-root

# Backup producción (via SSH)
ssh tujoyita-prod "cd /srv/stacks/tujoyita && docker exec tujoyita_wordpress wp db export /tmp/backup.sql --allow-root"
```

### Skill 9: Consultas Seguras con WPDB

```php
function jewelry_get_products_by_price_range( $min, $max ) {
    global $wpdb;

    $results = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT p.ID, p.post_title, pm.meta_value as price
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
             WHERE p.post_type = 'product'
             AND p.post_status = 'publish'
             AND pm.meta_key = '_regular_price'
             AND CAST(pm.meta_value AS DECIMAL(10,2)) BETWEEN %f AND %f
             ORDER BY CAST(pm.meta_value AS DECIMAL(10,2)) ASC",
            $min,
            $max
        )
    );

    return $results;
}
```

---

## 🌐 TranslatePress y Multiidioma

### Skill 10: Verificar Estado de Traducciones

```bash
# Contar traducciones en TranslatePress
docker exec jewelry_wordpress wp eval "
    global \$wpdb;
    \$count = \$wpdb->get_var('SELECT COUNT(*) FROM ' . \$wpdb->prefix . 'trp_dictionary_es_es_en_us');
    echo 'Total traducciones ES→EN: ' . \$count . PHP_EOL;
" --allow-root
```

### Skill 11: Traducir Strings Programáticamente

```php
/**
 * Insertar traducción directamente en TranslatePress.
 * NOTA: El método recomendado es usar el editor visual.
 * Usar esto solo para automatización masiva.
 */
function jewelry_add_translation( $original_es, $translated_en ) {
    global $wpdb;

    $table = $wpdb->prefix . 'trp_dictionary_es_es_en_us';

    $existing = $wpdb->get_var(
        $wpdb->prepare(
            "SELECT id FROM {$table} WHERE original = %s LIMIT 1",
            $original_es
        )
    );

    if ( $existing ) {
        $wpdb->update(
            $table,
            array( 'translated' => $translated_en, 'status' => 2 ),
            array( 'id' => $existing ),
            array( '%s', '%d' ),
            array( '%d' )
        );
    } else {
        $wpdb->insert(
            $table,
            array(
                'original'   => $original_es,
                'translated' => $translated_en,
                'status'     => 2,
            ),
            array( '%s', '%s', '%d' )
        );
    }
}
```

### Skill 12: URLs Bilingües con TranslatePress

```
Español (base):  /tienda/          /sobre-nosotros/    /contacto/
Inglés (/en/):   /en/shop/         /en/about-us/       /en/contact/
```

TranslatePress maneja los slugs traducidos automáticamente. Configurar en:
- WP Admin → Settings → TranslatePress → Advanced → Custom URL slugs

---

## 🔒 Seguridad

### Skill 13: Sanitización y Validación

```php
// SIEMPRE sanitizar input
$name  = sanitize_text_field( $_POST['product_name'] );
$email = sanitize_email( $_POST['customer_email'] );
$desc  = wp_kses_post( $_POST['description'] );
$price = floatval( $_POST['price'] );
$id    = absint( $_POST['product_id'] );

// SIEMPRE verificar nonces
if ( ! wp_verify_nonce( $_POST['_jewelry_nonce'], 'jewelry_action' ) ) {
    wp_die( 'Security check failed' );
}

// SIEMPRE verificar capabilities
if ( ! current_user_can( 'manage_woocommerce' ) ) {
    wp_die( 'Permission denied' );
}

// SIEMPRE escapar output
echo esc_html( $name );
echo esc_attr( $value );
echo esc_url( $url );
echo wp_kses_post( $html_content );
```

### Skill 14: REST API Segura

```php
function jewelry_register_api_routes() {
    register_rest_route( 'jewelry/v1', '/products/featured', array(
        'methods'             => 'GET',
        'callback'            => 'jewelry_get_featured_products',
        'permission_callback' => function () {
            return current_user_can( 'read' );
        },
    ) );
}
add_action( 'rest_api_init', 'jewelry_register_api_routes' );
```

---

## 🧪 Testing

### Skill 15: Test de Conexión API

```bash
# Test local
curl -s https://dev.tujoyita.com/wp-json/wc/v3/products \
  -u "ck_key:cs_secret" | jq '.[] | {id, name, price}'

# Test producción
curl -s https://tujoyita.com/wp-json/wc/v3/products \
  -u "ck_key:cs_secret" | jq '.[] | {id, name, price}'
```

### Skill 16: Verificar Salud del Sistema

```bash
# Estado de contenedores
docker compose ps

# WP-CLI checks
docker exec jewelry_wordpress wp core version --allow-root
docker exec jewelry_wordpress wp plugin list --allow-root
docker exec jewelry_wordpress wp option get siteurl --allow-root

# Verificar TranslatePress
docker exec jewelry_wordpress wp plugin list --name=translatepress-multilingual --allow-root
```

---

## 🚀 Deploy

### Skill 17: Deploy a Producción

```bash
# Verificar antes de deploy
./scripts/deploy-agent.sh --check

# Deploy completo
./scripts/deploy-agent.sh --force

# Solo verificar estado
./scripts/deploy-agent.sh --status

# Rollback de emergencia
./scripts/deploy-agent.sh --rollback
```

### Skill 18: Estructura de mu-plugins

```php
<?php
/**
 * Plugin Name: Jewelry Custom Feature
 * Description: Feature description for Tu Joyita Miami
 * Version: 1.0.0
 * Author: Tu Joyita Miami
 *
 * @package Jewelry
 */

// Prevenir acceso directo
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Prefijo: jewelry_
function jewelry_custom_feature_init() {
    // Tu código aquí
}
add_action( 'init', 'jewelry_custom_feature_init' );
```

---

## Convenciones del Proyecto

| Elemento | Convención |
|----------|-----------|
| Funciones PHP | `jewelry_nombre_funcion()` (snake_case) |
| Hooks | `jewelry-nombre-hook` (kebab-case) |
| Clases | `Jewelry_Nombre_Clase` (PascalCase) |
| SKU | `JM-CATEGORIA-NUMERO` |
| Archivos mu-plugin | `jewelry-nombre.php` |
| Indentación PHP | 4 espacios |
| Indentación JS/CSS | 2 espacios |
| Commits | Conventional Commits (`feat:`, `fix:`, `docs:`) |

---

*Última actualización: 2026-02-26 — Migrado de Bogo a TranslatePress*
