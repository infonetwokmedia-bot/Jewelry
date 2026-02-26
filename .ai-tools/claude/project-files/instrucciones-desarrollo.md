# Instrucciones de Desarrollo

Reglas y convenciones del proyecto Jewelry.

---

# GitHub Copilot Instructions - Jewelry Project

## 📋 Contexto del Proyecto

Este es un sitio web **bilingüe (Español/Inglés)** para **Remedio Joyería** en Miami, Florida. El sitio está construido con WordPress + WooCommerce y optimizado para venta de joyas de alta calidad.

### Stack Tecnológico

- **CMS:** WordPress 6.x
- **E-commerce:** WooCommerce 10.5.0
- **Tema:** Astra 4.12.3 1.4.3
- **Multiidioma:** TranslatePress 3.0.9 3.9.1 (NO Polylang, NO WPML)
- **Infraestructura:** Docker + Traefik
- **PHP:** 8.1+
- **MySQL:** 8.0
- **Servidor Web:** Apache (contenedor WordPress oficial)

### URLs del Proyecto

- Frontend: https://jewelry.local.dev
- Admin: https://jewelry.local.dev/wp-admin
- phpMyAdmin: https://phpmyadmin.jewelry.local.dev

### Contenedores Docker

- `jewelry_wordpress` - WordPress + Apache
- `jewelry_mysql` - Base de datos MySQL 8.0
- `jewelry_phpmyadmin` - Gestión de base de datos
- `jewelry_wpcli` - WP-CLI para comandos

## 🌍 REGLA FUNDAMENTAL: CONTENIDO BILINGÜE

**⚠️ CRÍTICO: SIEMPRE crear contenido en AMBOS idiomas simultáneamente**

- **Español (es_ES)** - Idioma principal
- **English (en_US)** - Idioma secundario

### Idiomas Soportados

- Español: `es_ES`
- Inglés: `en_US`

### Plugin TranslatePress para Traducción

Usamos **TranslatePress 3.0.9** (NO Polylang, NO WPML) para gestionar contenido multiidioma.

**SIEMPRE vincular páginas/productos/categorías entre idiomas con TranslatePress:**

```php
// Vincular post/página con su traducción
update_post_meta($post_id_es, 'trp_language', 'es_ES');
update_post_meta($post_id_en, 'trp_language', 'en_US');

// Vincular ambos posts
$trp_translations = array(
    'es_ES' => $post_id_es,
    'en_US' => $post_id_en
);
update_post_meta($post_id_es, 'wp_trp_*', $trp_translations);
update_post_meta($post_id_en, 'wp_trp_*', $trp_translations);
```

## ⚡ Reglas de Desarrollo

### 1. Prefijos y Nomenclatura

- **SIEMPRE** usar prefijo `jewelry_` para todas las funciones custom
- Usar snake_case para funciones PHP: `jewelry_get_products()`
- Usar kebab-case para hooks: `jewelry-custom-hook`
- Usar PascalCase para clases: `Jewelry_Product_Manager`

### 2. WordPress Coding Standards

- Seguir [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/)
- Usar espacios (no tabs) - 4 espacios para PHP
- Usar comillas simples para strings en PHP (excepto cuando se necesite interpolación)
- Documentar funciones con PHPDoc

```php
/**
 * Obtiene productos destacados bilingües.
 *
 * @param string $locale Idioma (es_ES o en_US).
 * @param int    $limit  Número de productos a retornar.
 * @return array Array de productos WC_Product.
 */
function jewelry_get_featured_products( $locale = 'es_ES', $limit = 10 ) {
    // Implementation
}
```

### 3. Seguridad

**SIEMPRE sanitizar y validar datos:**

```php
// Sanitizar texto
$text = sanitize_text_field( $_POST['field'] );

// Sanitizar email
$email = sanitize_email( $_POST['email'] );

// Sanitizar URL
$url = esc_url( $_POST['url'] );

// Validar nonce en formularios
if ( ! isset( $_POST['jewelry_nonce'] ) || ! wp_verify_nonce( $_POST['jewelry_nonce'], 'jewelry_action' ) ) {
    wp_die( 'Acción no autorizada' );
}

// Escapar salida
echo esc_html( $user_input );
echo esc_attr( $attribute_value );
echo esc_url( $url );
```

### 4. Base de Datos

**NUNCA usar SQL directo** - Usar WP_Query, get_posts(), o WP database abstraction:

```php
// ✅ CORRECTO - Usar WP_Query
$args = array(
    'post_type' => 'product',
    'posts_per_page' => 10,
    'meta_query' => array(
        array(
            'key' => 'trp_language',
            'value' => 'es_ES',
        ),
    ),
);
$query = new WP_Query( $args );

// ❌ INCORRECTO - SQL directo
// $results = $wpdb->get_results( "SELECT * FROM wp_posts WHERE post_type = 'product'" );
```

### 5. Hooks y Filtros

Usar acciones y filtros de WordPress apropiadamente:

```php
// Action hooks
add_action( 'init', 'jewelry_register_custom_post_types' );
add_action( 'wp_enqueue_scripts', 'jewelry_enqueue_assets' );

// Filter hooks
add_filter( 'the_content', 'jewelry_modify_content' );
add_filter( 'woocommerce_product_title', 'jewelry_custom_product_title' );
```

## 📝 Ejemplos de Código

### Crear Producto Bilingüe Completo

```php
/**
 * Crea un producto WooCommerce bilingüe con TranslatePress.
 *
 * @param array $data_es Datos del producto en español.
 * @param array $data_en Datos del producto en inglés.
 * @return array IDs de los productos creados.
 */
function jewelry_create_bilingual_product( $data_es, $data_en ) {
    // Crear producto en español
    $product_es = new WC_Product_Simple();
    $product_es->set_name( $data_es['name'] );
    $product_es->set_description( $data_es['description'] );
    $product_es->set_short_description( $data_es['short_description'] );
    $product_es->set_regular_price( $data_es['price'] );
    $product_es->set_sku( $data_es['sku'] );
    $product_id_es = $product_es->save();
    
    // Marcar como español
    update_post_meta( $product_id_es, 'trp_language', 'es_ES' );
    
    // Crear producto en inglés
    $product_en = new WC_Product_Simple();
    $product_en->set_name( $data_en['name'] );
    $product_en->set_description( $data_en['description'] );
    $product_en->set_short_description( $data_en['short_description'] );
    $product_en->set_regular_price( $data_en['price'] );
    $product_en->set_sku( $data_en['sku'] );
    $product_id_en = $product_en->save();
    
    // Marcar como inglés
    update_post_meta( $product_id_en, 'trp_language', 'en_US' );
    
    // Vincular con TranslatePress
    $translations = array(
        'es_ES' => $product_id_es,
        'en_US' => $product_id_en
    );
    update_post_meta( $product_id_es, 'wp_trp_*', $translations );
    update_post_meta( $product_id_en, 'wp_trp_*', $translations );
    
    return array(
        'es' => $product_id_es,
        'en' => $product_id_en
    );
}
```

### Crear Página Bilingüe

```php
/**
 * Crea una página bilingüe con TranslatePress.
 */
function jewelry_create_bilingual_page( $title_es, $title_en, $content_es, $content_en ) {
    // Crear página en español
    $page_es = array(
        'post_title'   => $title_es,
        'post_content' => $content_es,
        'post_status'  => 'publish',
        'post_type'    => 'page',
    );
    $page_id_es = wp_insert_post( $page_es );
    update_post_meta( $page_id_es, 'trp_language', 'es_ES' );
    
    // Crear página en inglés
    $page_en = array(
        'post_title'   => $title_en,
        'post_content' => $content_en,
        'post_status'  => 'publish',
        'post_type'    => 'page',
    );
    $page_id_en = wp_insert_post( $page_en );
    update_post_meta( $page_id_en, 'trp_language', 'en_US' );
    
    // Vincular páginas
    $translations = array(
        'es_ES' => $page_id_es,
        'en_US' => $page_id_en
    );
    update_post_meta( $page_id_es, 'wp_trp_*', $translations );
    update_post_meta( $page_id_en, 'wp_trp_*', $translations );
    
    return array( 'es' => $page_id_es, 'en' => $page_id_en );
}
```

### Funciones Custom en functions-custom.php

Ubicación: `data/wordpress/wp-content/themes/astra/functions-custom.php`

```php
<?php
/**
 * Funciones personalizadas del tema Astra
 * Archivo: functions-custom.php
 */

// Prevenir acceso directo
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Cambiar menú según idioma usando TranslatePress.
 */
function jewelry_switch_menu_by_language( $args ) {
    $locale = gettrp_language();
    
    if ( 'es_ES' === $locale && 'primary' === $args['theme_location'] ) {
        $args['menu'] = 'primary_navigation_es';
    } elseif ( 'en_US' === $locale && 'primary' === $args['theme_location'] ) {
        $args['menu'] = 'primary_navigation_en';
    }
    
    return $args;
}
add_filter( 'wp_nav_menu_args', 'jewelry_switch_menu_by_language' );

/**
 * Obtener idioma actual de TranslatePress.
 */
function jewelry_get_currenttrp_language() {
    if ( function_exists( 'trp_translate' ) ) {
        return trp_translate();
    }
    return gettrp_language();
}

/**
 * Verificar si un post tiene traducción.
 */
function jewelry_has_translation( $post_id, $targettrp_language ) {
    $translations = get_post_meta( $post_id, 'wp_trp_*', true );
    return isset( $translations[ $targettrp_language ] );
}
```

### Cambio de Menú Según Idioma

El proyecto usa menús separados por idioma:

- `primary_navigation_es` - Menú en español
- `primary_navigation_en` - Menú en inglés

Cambio automático implementado en `functions-custom.php` con el hook `wp_nav_menu_args`.

## 🎨 Estilo de Código

### PHP

- Usar 4 espacios para indentación (no tabs)
- Usar Yoda conditions: `if ( 'value' === $variable )`
- Espacios alrededor de operadores: `$result = $a + $b`
- Abrir llaves en la misma línea

```php
function jewelry_example_function( $param1, $param2 ) {
    if ( 'value' === $param1 ) {
        return $param2;
    }
    return false;
}
```

### JavaScript

- Usar 2 espacios para indentación
- Usar `const` y `let`, NO `var`
- Usar template literals para strings con variables

```javascript
const jewelryApp = {
  init() {
    const locale = document.documentElement.lang;
    if (locale === 'es-ES') {
      this.loadSpanishContent();
    }
  }
};
```

### CSS

- Usar 2 espacios para indentación
- Usar kebab-case para clases: `.jewelry-product-card`
- Agrupar propiedades relacionadas

```css
.jewelry-product-card {
  display: flex;
  flex-direction: column;
  
  padding: 1rem;
  margin-bottom: 1rem;
  
  background: #fff;
  border: 1px solid #ddd;
}
```

## 📦 Formato de Commits

Usar **Conventional Commits**:

```
feat: añadir filtro de productos por precio
fix: corregir vinculación de productos con TranslatePress
docs: actualizar documentación de instalación
style: ajustar espaciado en archivo CSS
refactor: optimizar función jewelry_get_products
test: añadir tests para creación de productos
chore: actualizar dependencias de Docker
```

Tipos:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato, espacios (no afecta código)
- `refactor`: Refactorización de código
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

## 🔧 Comandos Útiles

### WP-CLI en Docker

```bash
# Estructura básica
docker exec jewelry_wordpress wp --allow-root [comando]

# Listar plugins
docker exec jewelry_wordpress wp plugin list --allow-root

# Activar/desactivar plugin
docker exec jewelry_wordpress wp plugin activate woocommerce --allow-root
docker exec jewelry_wordpress wp plugin deactivate plugin-name --allow-root

# Listar productos
docker exec jewelry_wordpress wp post list --post_type=product --allow-root

# Crear producto
docker exec jewelry_wordpress wp post create --post_type=product --post_title="Producto" --post_status=publish --allow-root

# Regenerar permalinks
docker exec jewelry_wordpress wp rewrite flush --allow-root

# Limpiar cache
docker exec jewelry_wordpress wp cache flush --allow-root

# Exportar/importar base de datos
docker exec jewelry_mysql mysqldump -u jewelry_user -p jewelry_db > backup.sql
docker exec -i jewelry_mysql mysql -u jewelry_user -p jewelry_db < backup.sql
```

### Docker Compose

```bash
# Iniciar contenedores
docker compose up -d

# Detener contenedores
docker compose down

# Ver logs
docker compose logs -f wordpress
docker compose logs -f mysql

# Reiniciar servicios
docker compose restart wordpress
```

## 📌 Prioridades Actuales

Ver `PROYECTO-ESTADO.md` para el estado actualizado. Prioridades principales:

1. **Productos:** Crear ~50+ productos del catálogo WhatsApp
2. **Contenido:** Completar páginas About Us, Materials, Blog posts
3. **Emails:** Configurar emails de WooCommerce bilingües
4. **SEO:** Instalar y configurar plugin SEO (Yoast/Rank Math)
5. **Diseño:** Personalizar header/footer por idioma

## 🔍 Archivos Importantes

### Estructura del Proyecto

```
/home/runner/work/Jewelry/Jewelry/
├── docker-compose.yml                 # Configuración Docker
├── .env                              # Variables de entorno
├── data/
│   ├── mysql/                        # Base de datos (ignorar en git)
│   └── wordpress/                    # Archivos WordPress
│       └── wp-content/
│           ├── themes/
│           │   └── astra/
│           │       └── functions-custom.php    # Personalizaciones
│           ├── plugins/              # Plugins instalados
│           └── uploads/              # Media (ignorar en git)
├── README.md                         # Documentación principal
└── PROYECTO-ESTADO.md               # Estado del proyecto
```

### Archivos a Modificar

- **Personalizaciones del tema:** `data/wordpress/wp-content/themes/astra/functions-custom.php`
- **Plugins custom:** `data/wordpress/wp-content/plugins/jewelry-custom/`
- **Uploads:** `data/wordpress/wp-content/uploads/` (no versionar)

### Archivos a NO Modificar

- Core de WordPress: `data/wordpress/wp-admin/`, `data/wordpress/wp-includes/`
- Core de plugins: `data/wordpress/wp-content/plugins/[plugin-name]/` (excepto si es custom)
- Base de datos: `data/mysql/` (ignorar en git)

## 🚀 Workflow de Desarrollo

1. **Crear funcionalidad en español primero**
2. **Inmediatamente crear la versión en inglés**
3. **Vincular ambas versiones con TranslatePress**
4. **Probar en ambos idiomas**
5. **Commit con mensaje convencional**

## 📚 Referencias

- [WordPress Developer Docs](https://developer.wordpress.org/)
- [WooCommerce Docs](https://woocommerce.github.io/code-reference/)
- [TranslatePress Plugin](https://wordpress.org/plugins/translatepress-multilingual/)
- [Astra Theme Docs](https://www.astrawp.com/documentation/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)

---

**Recuerda:** SIEMPRE crear contenido en AMBOS idiomas y vincular con TranslatePress. Usa prefijo `jewelry_` para funciones custom. Sanitiza todas las entradas. Usa WP_Query en lugar de SQL directo.
