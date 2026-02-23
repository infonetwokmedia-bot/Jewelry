# Bogo + Block Editor: Problema y Solución Definitiva

> **Guía técnica reutilizable** para resolver el conflicto entre el plugin Bogo (multiidioma) y el editor de bloques de WordPress con temas clásicos como Kadence, Astra, GeneratePress, etc.

---

## Índice

1. [Descripción del Problema](#1-descripción-del-problema)
2. [Síntomas](#2-síntomas)
3. [Entorno Afectado](#3-entorno-afectado)
4. [Investigación y Causa Raíz](#4-investigación-y-causa-raíz)
5. [Soluciones que NO Funcionan](#5-soluciones-que-no-funcionan)
6. [Solución Definitiva: Selective Admin Disable](#6-solución-definitiva-selective-admin-disable)
7. [Implementación Paso a Paso](#7-implementación-paso-a-paso)
8. [Adaptación a Otros Proyectos](#8-adaptación-a-otros-proyectos)
9. [Verificación](#9-verificación)
10. [FAQ](#10-faq)
11. [Referencias](#11-referencias)

---

## 1. Descripción del Problema

El plugin **Bogo** (por Takayuki Miyoshi / Rock Lobster Inc.) es un plugin multiidioma ligero para WordPress que gestiona traducciones mediante post meta (`_locale`, `_original_post`). A diferencia de WPML o Polylang, no crea tablas extra ni modifica la estructura de la base de datos.

Sin embargo, existe un **bug conocido y no resuelto** (reportado en WordPress.org con 21+ respuestas) donde Bogo impide editar páginas, entradas y productos en el panel de administración cuando se usa con el **editor de bloques (Gutenberg)** y un **tema clásico** (no FSE).

El error fue reportado originalmente en:

- [WordPress.org Support: "Cannot edit page until I disable BOGO"](https://wordpress.org/support/topic/cannot-edit-page-until-i-disable-bogo/)

El autor del plugin (Takayuki Miyoshi) no ha proporcionado una solución al momento de escribir esta guía.

---

## 2. Síntomas

### Error principal

Al intentar editar cualquier página, entrada o producto en wp-admin:

```
"You attempted to edit an item that doesn't exist. Perhaps it was deleted?"
```

### Comportamiento observado

- El error aparece **inmediatamente** al cargar `post.php?post=XXX&action=edit`.
- Afecta a **todos** los tipos de post localizables (page, post, product).
- El error **desaparece inmediatamente** al desactivar Bogo.
- El error **reaparece inmediatamente** al reactivar Bogo.
- No aparece en el editor clásico (TinyMCE), solo en el editor de bloques.
- Afecta tanto a administradores como a editores.

### Lo que NO está roto

- `get_post($id)` retorna el post correctamente.
- `current_user_can('edit_post', $id)` retorna `true`.
- WP_Query encuentra el post sin problemas.
- La base de datos está intacta.
- Los meta `_locale` están correctamente asignados.

---

## 3. Entorno Afectado

### Confirmado con

| Componente | Versión                       |
| ---------- | ----------------------------- |
| WordPress  | 6.7+ (confirmado hasta 6.9.1) |
| Bogo       | 3.7+ (confirmado hasta 3.9.1) |
| PHP        | 8.1+                          |

### Temas afectados (confirmados)

- **Kadence** (tema clásico con soporte para bloques)
- **Astra** (confirmado por el equipo de soporte de Kadence)
- Potencialmente cualquier tema clásico que use el editor de bloques

### Temas NO afectados

- Temas FSE (Full Site Editing) puros como Twenty Twenty-Four
- Sitios que usan el editor clásico (plugin Classic Editor)

### Plugins que agravan el problema

- **Custom Post Type UI** (reportado como trigger adicional)
- **Kadence Blocks** (por las peticiones REST API adicionales)
- **WooCommerce** (por los tipos de post adicionales: product, shop_order, etc.)

---

## 4. Investigación y Causa Raíz

### Metodología de investigación

1. **Revisión del código fuente de Bogo** (GitHub: `rocklobster-in/bogo`)
2. **Simulación PHP en contexto admin** (script con `WP_ADMIN=true`)
3. **Análisis de logs** (`debug.log` de WordPress)
4. **Revisión de hilos de soporte** en WordPress.org
5. **Pruebas de activación/desactivación selectiva**

### Análisis del código fuente de Bogo

#### Archivo: `includes/block-editor/language-panel/index.js`

Este es el archivo clave. Bogo registra un **middleware de `apiFetch`** que intercepta TODAS las peticiones REST API del editor de bloques:

```javascript
// Código compilado (simplificado) de Bogo:
wp.apiFetch.use((options, next) => {
  const lang = bogo.currentPost.lang;
  if (lang) {
    if (typeof options.url === "string" && !hasQueryArg(options.url, "lang")) {
      options.url = addQueryArgs(options.url, { lang: lang });
    }
    if (typeof options.path === "string" && !hasQueryArg(options.path, "lang")) {
      options.path = addQueryArgs(options.path, { lang: lang });
    }
  }
  return next(options);
});
```

**Efecto:** Agrega `?lang=es` (o el idioma del post actual) a **absolutamente todas** las peticiones REST API que hace el block editor. Esto incluye:

- `/wp/v2/pages/123` → `/wp/v2/pages/123?lang=es`
- `/wp/v2/templates` → `/wp/v2/templates?lang=es`
- `/wp/v2/global-styles` → `/wp/v2/global-styles?lang=es`
- `/wp/v2/block-patterns` → `/wp/v2/block-patterns?lang=es`
- `/wp/v2/navigation` → `/wp/v2/navigation?lang=es`

#### Archivo: `includes/query.php`

Bogo modifica las queries SQL mediante `parse_query`, `posts_join`, y `posts_where`:

```php
// En admin, si hay un parámetro 'lang', filtra por locale:
if ( is_admin() ) {
    $locale = $lang; // Del query var
}

// Si $locale está vacío o no es válido:
if ( empty( $locale ) or ! bogo_is_available_locale( $locale ) ) {
    $qv['bogo_suppress_locale_query'] = true;
    return;
}

// Agrega JOIN y WHERE para filtrar por _locale meta:
$join .= " LEFT JOIN $meta_table AS postmeta_bogo ON (...)";
$where .= " AND (1=0 OR postmeta_bogo.meta_value LIKE %s ...)";
```

#### Archivo: `includes/capabilities.php`

Bogo agrega restricciones de capacidades:

```php
// Bloquea edit_post si el usuario no tiene acceso al locale del post:
if ( in_array( $cap, array( 'edit_post', 'delete_post' ), true )
    and $post = get_post( $args[0] )
    and $user_id !== $post->post_author
    and ! user_can( $user_id, 'bogo_access_all_locales' )
) {
    $locale = bogo_get_post_locale( $post->ID );
    if ( ! in_array( $locale, $accessible_locales[$user_id] ) ) {
        $caps[] = 'do_not_allow';
    }
}
```

### Cadena de causas

```
1. Usuario abre post.php?post=123&action=edit
2. WordPress carga el block editor
3. Bogo inyecta el middleware JS (apiFetch)
4. Block editor hace peticiones REST API para templates, estilos globales, etc.
5. Middleware agrega ?lang=es a peticiones de tipos NO localizables
   (wp_template, wp_global_styles, wp_navigation, etc.)
6. Bogo PHP intercepta estas queries y:
   a. NO reconoce el tipo como localizable → supprime la query, O
   b. Aplica filtro de locale que no encuentra resultados
7. El editor no puede cargar los recursos necesarios
8. WordPress muestra el error "item doesn't exist"
```

### ¿Por qué la simulación PHP no muestra el error?

La simulación PHP (archivo ejecutado con `php script.php`) confirma que a nivel de base de datos y capacidades todo está correcto. El problema ocurre en la **capa JavaScript del block editor** cuando las peticiones REST API son interceptadas por el middleware de Bogo. Es un conflicto de runtime en el navegador, no un error de lógica PHP.

---

## 5. Soluciones que NO Funcionan

### ❌ Neutralizar `bogo.currentPost.lang` via inline script

```php
// INTENTO: Vaciar el lang para que el middleware no lo use
add_action('admin_enqueue_scripts', function($hook) {
    wp_add_inline_script('bogo-block-editor',
        'if(typeof bogo!=="undefined") bogo.currentPost.lang="";',
        'after'
    );
}, 100);
```

**Por qué no funciona:** El middleware ya se registró antes de que el inline script se ejecute. El timing de ejecución de scripts en el block editor es impredecible. Además, Bogo tiene otros puntos de entrada que afectan las queries.

### ❌ Suprimir `bogo_suppress_locale_query` para tipos específicos

```php
// INTENTO: Desactivar el filtro de locale para templates y similares
add_action('parse_query', function($query) {
    if (!defined('REST_REQUEST') || !REST_REQUEST) return;
    $skip_types = ['wp_template', 'wp_template_part', 'wp_global_styles'];
    if (in_array($query->query_vars['post_type'] ?? '', $skip_types)) {
        $query->query_vars['bogo_suppress_locale_query'] = true;
    }
}, 5);
```

**Por qué no funciona:** No cubre todos los tipos y endpoints que el block editor consulta. El middleware JS sigue agregando `?lang=` a todas las URLs, lo que puede causar problemas en endpoints que no manejan ese parámetro.

### ❌ Dar acceso a todos los locales al usuario

```php
// INTENTO: Asegurar que el usuario admin tenga acceso a todos los locales
add_filter('bogo_map_meta_cap', function($caps) {
    $caps['bogo_access_all_locales'] = 'manage_options';
    return $caps;
});
```

**Por qué no funciona:** El administrador ya tiene acceso a todos los locales por defecto (`manage_options` → `bogo_access_all_locales`). El problema no es de permisos, es de queries REST API rotas.

---

## 6. Solución Definitiva: Selective Admin Disable

### Principio

> **Desactivar Bogo completamente en el admin de WordPress, pero mantenerlo activo en el frontend.**
>
> Reemplazar la funcionalidad admin de Bogo (meta box de idioma, panel del block editor) con un **meta box personalizado** que gestiona los mismos meta fields (`_locale`, `_original_post`).

### Arquitectura

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│                                                      │
│  Bogo ACTIVO ─── Language Switcher                   │
│               ─── Locale Detection (/en/, /es/)      │
│               ─── Query Filtering por _locale        │
│               ─── URL Rewriting                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                     ADMIN                            │
│                                                      │
│  Bogo DESACTIVADO                                    │
│  MU-Plugin ACTIVO ─── Meta Box de Idioma             │
│                   ─── Columna de Idioma en listas    │
│                   ─── Filtro por idioma              │
│                   ─── Crear/Vincular traducciones    │
│                   ─── Fix posts huérfanos            │
└─────────────────────────────────────────────────────┘
```

### Compatibilidad de datos

La solución es **100% compatible con Bogo** porque:

- Usa los mismos meta fields: `_locale` y `_original_post`
- Usa la misma lógica de vinculación de traducciones
- Si en el futuro Bogo arregla el bug, se puede revertir la solución sin pérdida de datos
- La base de datos no se modifica de ninguna manera incompatible

---

## 7. Implementación Paso a Paso

### Paso 1: Crear el MU-Plugin

Crear el archivo `wp-content/mu-plugins/bogo-admin-fix.php`:

```php
<?php
/**
 * Plugin Name: Bogo Selective Admin Fix
 * Description: Desactiva Bogo en admin para evitar el bug del block editor,
 *              pero provee un meta box personalizado para gestionar idiomas.
 *              Bogo sigue activo en el frontend para el switcher de idioma.
 * Version: 3.0
 * Author: Tu Nombre / Proyecto
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
```

### Paso 2: Desactivar Bogo en Admin

```php
add_filter( 'option_active_plugins', 'jewelry_disable_bogo_in_admin' );
function jewelry_disable_bogo_in_admin( $plugins ) {
    // Solo desactivar en admin HTTP (no en AJAX, Cron, CLI, REST API)
    if ( ! is_admin() ) {
        return $plugins;
    }

    if ( wp_doing_ajax() || wp_doing_cron() ) {
        return $plugins;
    }

    $key = array_search( 'bogo/bogo.php', $plugins, true );

    if ( false !== $key ) {
        unset( $plugins[ $key ] );
    }

    return $plugins;
}
```

**Puntos clave:**

- `option_active_plugins` se filtra antes de que WordPress cargue los plugins.
- `is_admin()` retorna `true` solo en peticiones HTTP al admin (no REST API).
- No afecta AJAX, Cron, REST API ni WP-CLI.
- Bogo sigue en la lista de plugins activos en la BD, solo se excluye en runtime.

### Paso 3: Registrar Tipos de Post Localizables

Si usas WooCommerce u otros CPT, registrarlos como localizables (esto se aplica en frontend donde Bogo SÍ carga):

```php
add_filter( 'bogo_localizable_post_types', 'jewelry_bogo_add_product_type' );
function jewelry_bogo_add_product_type( $post_types ) {
    if ( class_exists( 'WooCommerce' ) && ! in_array( 'product', $post_types, true ) ) {
        $post_types[] = 'product';
    }
    return $post_types;
}
```

### Paso 4: Meta Box de Idioma Personalizado

```php
// Configuración
define( 'JEWELRY_DEFAULT_LOCALE', 'es_ES' );

function jewelry_get_available_languages() {
    return array(
        'es_ES' => 'Español',
        'en_US' => 'English',
    );
}

function jewelry_get_localizable_post_types() {
    return array( 'post', 'page', 'product' );
}

// Registrar meta box
add_action( 'add_meta_boxes', 'jewelry_add_language_meta_box', 10, 2 );
function jewelry_add_language_meta_box( $post_type, $post ) {
    if ( ! in_array( $post_type, jewelry_get_localizable_post_types(), true ) ) {
        return;
    }

    add_meta_box(
        'jewelry-language-box',
        '🌐 Idioma / Language',
        'jewelry_render_language_meta_box',
        null,
        'side',
        'high'
    );
}
```

El meta box renderiza:

1. **Selector de idioma** (dropdown es_ES / en_US)
2. **Lista de traducciones vinculadas** (con enlaces a editar)
3. **Botón para crear nueva traducción** (duplica el post con idioma diferente)
4. **Campo para vincular traducción existente** (por ID de post)

### Paso 5: Guardar el Idioma

```php
add_action( 'save_post', 'jewelry_save_post_language', 10, 2 );
function jewelry_save_post_language( $post_id, $post ) {
    // Verificar nonce
    if ( ! isset( $_POST['jewelry_language_nonce'] ) ||
         ! wp_verify_nonce( $_POST['jewelry_language_nonce'], 'jewelry_save_language' ) ) {
        return;
    }

    if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
        return;
    }

    if ( ! current_user_can( 'edit_post', $post_id ) ) {
        return;
    }

    if ( isset( $_POST['jewelry_post_locale'] ) ) {
        $locale = sanitize_text_field( $_POST['jewelry_post_locale'] );
        $languages = jewelry_get_available_languages();

        if ( isset( $languages[ $locale ] ) ) {
            update_post_meta( $post_id, '_locale', $locale );
        }
    }
}
```

### Paso 6: Crear Traducciones

```php
add_action( 'admin_post_jewelry_create_translation', 'jewelry_handle_create_translation' );
function jewelry_handle_create_translation() {
    $original_id = absint( $_GET['original_post'] ?? 0 );
    $locale = sanitize_text_field( $_GET['locale'] ?? '' );

    // Verificar nonce y permisos...

    $original = get_post( $original_id );

    // Crear copia
    $new_post = array(
        'post_title'   => $original->post_title . ' [' . $locale . ']',
        'post_content' => $original->post_content,
        'post_status'  => 'draft',
        'post_type'    => $original->post_type,
    );
    $new_id = wp_insert_post( $new_post );

    // Asignar locale y vincular
    update_post_meta( $new_id, '_locale', $locale );

    $original_ref = get_post_meta( $original_id, '_original_post', true );
    if ( empty( $original_ref ) ) {
        $original_ref = $original_id;
        update_post_meta( $original_id, '_original_post', $original_ref );
    }
    update_post_meta( $new_id, '_original_post', $original_ref );

    // Redirigir al editor
    wp_safe_redirect( get_edit_post_link( $new_id, 'raw' ) );
    exit;
}
```

### Paso 7: Columna y Filtro de Idioma (opcional pero recomendado)

Agregar una columna con bandera (🇪🇸/🇺🇸) en las listas de posts, y un dropdown de filtrado por idioma.

### Paso 8: Fix de Posts Huérfanos

```php
add_action( 'admin_init', 'jewelry_fix_orphan_post_locales' );
function jewelry_fix_orphan_post_locales() {
    if ( get_transient( 'jewelry_locale_fix_done_v3' ) ) {
        return;
    }

    global $wpdb;
    $orphans = $wpdb->get_results(
        "SELECT p.ID FROM {$wpdb->posts} p
         LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_locale'
         WHERE p.post_type IN ('post','page','product')
         AND p.post_status IN ('publish','draft','private','pending')
         AND pm.meta_id IS NULL LIMIT 200"
    );

    foreach ( $orphans as $orphan ) {
        update_post_meta( $orphan->ID, '_locale', JEWELRY_DEFAULT_LOCALE );
    }

    set_transient( 'jewelry_locale_fix_done_v3', true, DAY_IN_SECONDS );
}
```

---

## 8. Adaptación a Otros Proyectos

Para usar esta solución en otro proyecto WordPress + Bogo:

### Modificar según tu configuración

| Parámetro                              | Qué cambiar                                            |
| -------------------------------------- | ------------------------------------------------------ |
| `JEWELRY_DEFAULT_LOCALE`               | Tu idioma principal (`es_ES`, `ja`, `de_DE`, etc.)     |
| `jewelry_get_available_languages()`    | Tus idiomas (puede ser 3+)                             |
| `jewelry_get_localizable_post_types()` | Tus CPT (`post`, `page`, `product`, `portfolio`, etc.) |
| Prefijo `jewelry_`                     | Prefijo de tu proyecto                                 |

### Para 3+ idiomas

```php
function myproject_get_available_languages() {
    return array(
        'es_ES' => 'Español',
        'en_US' => 'English',
        'fr_FR' => 'Français',
        'pt_BR' => 'Português',
    );
}
```

### Para CPT personalizados

```php
add_filter( 'bogo_localizable_post_types', function( $types ) {
    $types[] = 'portfolio';
    $types[] = 'service';
    return $types;
});

function myproject_get_localizable_post_types() {
    return array( 'post', 'page', 'product', 'portfolio', 'service' );
}
```

### Sin WooCommerce

Eliminar la sección de copia de meta WooCommerce en `jewelry_handle_create_translation()` y quitar `'product'` de los tipos localizables.

---

## 9. Verificación

### Checklist post-implementación

- [ ] **Edición funciona:** Abrir wp-admin → Pages → editar cualquier página → el editor de bloques carga correctamente
- [ ] **Meta box visible:** En la barra lateral del editor, aparece el panel "🌐 Idioma / Language"
- [ ] **Selector funciona:** Puedes cambiar el idioma del post y guardarlo
- [ ] **Traducciones se muestran:** Si hay traducciones vinculadas, aparecen en el meta box
- [ ] **Crear traducción:** El botón "Traducir a [idioma]" crea un draft con el contenido copiado
- [ ] **Columna visible:** En la lista de posts/páginas, aparece la columna 🌐 con banderas
- [ ] **Filtro funciona:** El dropdown "Todos los idiomas" filtra correctamente
- [ ] **Frontend switcher:** El language switcher sigue funcionando en el sitio público
- [ ] **Frontend locale:** Las URLs `/en/` y `/es/` siguen sirviendo el contenido correcto
- [ ] **No hay errores PHP:** Verificar `wp-content/debug.log`

### Comando de verificación rápida

```bash
# Verificar que Bogo está en la lista de plugins activos
docker exec CONTAINER wp plugin list --allow-root | grep bogo

# Verificar que el mu-plugin está cargado
docker exec CONTAINER wp eval 'print_r(array_keys(get_mu_plugins()));' --allow-root

# Verificar posts con locale
docker exec CONTAINER wp eval '
$pages = get_posts(["post_type"=>"page","numberposts"=>-1]);
foreach($pages as $p) {
    echo $p->ID.": ".$p->post_title." [".get_post_meta($p->ID,"_locale",true)."]\n";
}
' --allow-root

# Simular contexto admin (Bogo NO debe cargar)
docker exec CONTAINER php -r '
define("WP_ADMIN", true);
define("ABSPATH", "/var/www/html/");
require ABSPATH."wp-load.php";
echo "Bogo active in admin: ".(function_exists("bogo_get_default_locale")?"YES":"NO")."\n";
'
```

---

## 10. FAQ

### ¿Bogo se desactiva completamente?

**No.** Solo se desactiva en el panel de administración HTTP (`is_admin()`). Sigue activo en:

- Frontend (páginas públicas)
- REST API (para queries de productos, switcher, etc.)
- WP-CLI
- Cron jobs
- AJAX requests

### ¿Qué pasa si Bogo publica un fix en el futuro?

Puedes eliminar el mu-plugin y Bogo funcionará normalmente. Los datos son 100% compatibles porque usamos los mismos meta fields (`_locale`, `_original_post`).

### ¿Funciona con REST API?

Sí. Bogo sigue cargándose para peticiones REST API (la ruta `/wp-json/...` no pasa por `is_admin()`). El language switcher del frontend y las queries de productos siguen filtrando por idioma.

### ¿Puedo usar esto con WPML o Polylang?

No. Esta solución es específica para Bogo. WPML y Polylang usan mecanismos de traducción completamente diferentes (taxonomy terms, tablas separadas, etc.).

### ¿Afecta al rendimiento?

No significativamente. El filtro `option_active_plugins` se ejecuta una vez al cargar WordPress. El meta box agrega una WP_Query extra al editar un post. El impacto es negligible.

### ¿Funciona con el editor clásico?

Sí, pero no es necesario. El bug de Bogo solo afecta al editor de bloques. Si usas el editor clásico (plugin Classic Editor), puedes usar Bogo sin este fix.

### ¿Qué pasa con los productos de WooCommerce?

Funcionan idénticamente. El mu-plugin registra `product` como tipo localizable (en frontend) y proporciona el meta box de idioma (en admin). Al crear traducciones de productos, se copian precio, SKU, stock, imágenes y taxonomías.

---

## 11. Referencias

### Código fuente

- **Bogo GitHub:** [github.com/rocklobster-in/bogo](https://github.com/rocklobster-in/bogo)
- **Archivo clave - middleware JS:** `includes/block-editor/language-panel/index.js` (línea final: `apiFetch.use(...)`)
- **Archivo clave - query filter:** `includes/query.php` (`bogo_parse_query`, `bogo_posts_join`, `bogo_posts_where`)
- **Archivo clave - capabilities:** `includes/capabilities.php` (`bogo_map_meta_cap`)
- **Archivo clave - admin scripts:** `admin/admin.php` (`bogo_admin_enqueue_scripts`)

### Hilos de soporte

- [Cannot edit page until I disable BOGO](https://wordpress.org/support/topic/cannot-edit-page-until-i-disable-bogo/) — 21 respuestas, no resuelto
- [BOGO causes white screen of death in Block Editor](https://wordpress.org/support/topic/bogo-causes-white-screen-of-death-in-block-editor/) — Problema relacionado
- [Lost part of styling in duplicated page](https://wordpress.org/support/topic/lost-part-of-styling-in-duplicated-page/) — Síntoma relacionado

### WordPress APIs utilizadas

- [MU-Plugins](https://developer.wordpress.org/advanced-administration/plugins/mu-plugins/)
- [option_active_plugins filter](https://developer.wordpress.org/reference/hooks/option_option/)
- [add_meta_box](https://developer.wordpress.org/reference/functions/add_meta_box/)
- [register_post_meta](https://developer.wordpress.org/reference/functions/register_post_meta/)
- [admin*post*{action}](https://developer.wordpress.org/reference/hooks/admin_post_action/)

---

## Historial de Versiones de la Solución

| Versión | Fecha      | Descripción                                                                   |
| ------- | ---------- | ----------------------------------------------------------------------------- |
| 1.0     | 2025-02    | Desactivar Bogo completamente en admin (funciona pero sin gestión de idiomas) |
| 2.0     | 2026-02-11 | Smart Fix: neutralizar JS + suprimir queries REST (NO funcionó)               |
| 3.0     | 2026-02-11 | Selective Admin Disable + Meta Box personalizado (solución definitiva)        |

---

\_Documento creado: 2026-02-11 | Proyecto: Remedio Joyería | Stack: WordPress 6.9 + Bogo 3.9.1 + Kadence + WooCommerce_e/) — Síntoma relacionado

### WordPress APIs utilizadas

- [MU-Plugins](https://developer.wordpress.org/advanced-administration/plugins/mu-plugins/)
- [option_active_plugins filter](https://developer.wordpress.org/reference/hooks/option_option/)
- [add_meta_box](https://developer.wordpress.org/reference/functions/add_meta_box/)
- [register_post_meta](https://developer.wordpress.org/reference/functions/register_post_meta/)
- [admin*post*{action}](https://developer.wordpress.org/reference/hooks/admin_post_action/)

---

## Historial de Versiones de la Solución

| Versión | Fecha      | Descripción                                                                   |
| ------- | ---------- | ----------------------------------------------------------------------------- |
| 1.0     | 2025-02    | Desactivar Bogo completamente en admin (funciona pero sin gestión de idiomas) |
| 2.0     | 2026-02-11 | Smart Fix: neutralizar JS + suprimir queries REST (NO funcionó)               |
| 3.0     | 2026-02-11 | Selective Admin Disable + Meta Box personalizado (solución definitiva)        |

---

*Documento creado: 2026-02-11 | Proyecto: Remedio Joyería | Stack: WordPress 6.9 + Bogo 3.9.1 + Kadence + WooCommerce*
