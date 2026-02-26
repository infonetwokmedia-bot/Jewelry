# Contexto del Proyecto Jewelry

Este archivo contiene toda la información relevante del proyecto para Claude.

---

# Contexto Compartido - Proyecto Jewelry

## 📋 Información General

**Proyecto:** Sitio Web de Joyería - Remedio Joyería Miami
**Stack:** WordPress 6.x + WooCommerce 10.5.0 + Docker + Traefik
**Idiomas:** Bilingüe (Español/Inglés) con TranslatePress 3.9.1
**Tema:** Astra 4.12.3 1.4.3
**Repositorio:** infonetwokmedia-bot/Jewelry

## 🌐 URLs del Proyecto

- **Frontend:** <https://jewelry.local.dev>
- **Admin:** <https://jewelry.local.dev/wp-admin>
- **phpMyAdmin:** <https://phpmyadmin.jewelry.local.dev>

## 🎯 Objetivo Principal

Crear un ecommerce bilingüe profesional para venta de joyas de alta calidad con:

- Catálogo de ~50+ productos
- Contenido en español e inglés
- Experiencia de usuario optimizada
- SEO multiidioma
- Checkout y emails personalizados

## 🔧 Tecnologías Clave

### Backend

- PHP 8.1+
- MySQL 8.0
- Apache (contenedor WordPress oficial)
- WP-CLI para automatización

### Plugins Principales

- **WooCommerce 10.5.0** - Ecommerce
- **TranslatePress 3.0.9** - Multiidioma (NO Polylang, NO WPML)
- **Astra Blocks** - Constructor de páginas
- **WooCommerce Stripe Gateway** - Pagos

### Contenedores Docker

- `jewelry_wordpress` - WordPress + Apache
- `jewelry_mysql` - Base de datos
- `jewelry_phpmyadmin` - Gestión DB
- `jewelry_wpcli` - Comandos WP-CLI

## 📐 Estructura del Proyecto

```
/srv/stacks/jewelry/
├── docker-compose.yml          # Configuración Docker
├── .env                        # Variables de entorno
├── data/
│   ├── mysql/                  # Base de datos (gitignore)
│   └── wordpress/              # Archivos WordPress
│       └── wp-content/
│           ├── themes/
│           │   └── astra/
│           │       └── functions-custom.php  # ⚠️ Personalizaciones aquí
│           ├── plugins/        # Plugins instalados
│           └── uploads/        # Media (gitignore)
├── .github/
│   ├── agents/                 # 6 Custom Agents de Copilot
│   ├── COPILOT-SKILLS.md      # Skills de referencia
│   └── copilot-instructions.md # Instrucciones generales
├── .claude/
│   └── skills/
│       └── SKILLS.md          # Skills específicos para Claude
└── .ai-tools/                  # ⭐ Recursos para IAs (este directorio)
```

## ⚡ REGLA FUNDAMENTAL: CONTENIDO BILINGÜE

**⚠️ CRÍTICO: SIEMPRE crear contenido en AMBOS idiomas simultáneamente**

### Idiomas

- **Español (es_ES)** - Idioma principal
- **English (en_US)** - Idioma secundario

### Plugin TranslatePress para Traducción

```php
// SIEMPRE vincular entidades entre idiomas
update_post_meta($post_id_es, 'trp_language', 'es_ES');
update_post_meta($post_id_en, 'trp_language', 'en_US');

$trp_translations = array(
    'es_ES' => $post_id_es,
    'en_US' => $post_id_en
);
update_post_meta($post_id_es, 'wp_trp_*', $trp_translations);
update_post_meta($post_id_en, 'wp_trp_*', $trp_translations);
```

## 🔒 Reglas de Seguridad

### SIEMPRE Sanitizar Entradas

```php
$text = sanitize_text_field( $_POST['field'] );
$email = sanitize_email( $_POST['email'] );
$url = esc_url( $_POST['url'] );
```

### Validar Nonces

```php
if ( ! wp_verify_nonce( $_POST['jewelry_nonce'], 'jewelry_action' ) ) {
    wp_die( 'Acción no autorizada' );
}
```

### Escapar Salidas

```php
echo esc_html( $user_input );
echo esc_attr( $attribute_value );
echo esc_url( $url );
```

## 📝 Convenciones de Código

### Prefijos

- **SIEMPRE** usar prefijo `jewelry_` para funciones custom
- snake_case para funciones PHP: `jewelry_get_products()`
- kebab-case para hooks: `jewelry-custom-hook`
- PascalCase para clases: `Jewelry_Product_Manager`

### WordPress Coding Standards

- 4 espacios para indentación PHP (no tabs)
- Yoda conditions: `if ( 'value' === $variable )`
- Abrir llaves en la misma línea
- PHPDoc para todas las funciones

### Base de Datos

**NUNCA usar SQL directo** - Usar WP_Query, get_posts(), o WP database abstraction

## 🎨 Archivos Importantes

### ⚠️ MODIFICAR AQUÍ

- `data/wordpress/wp-content/themes/astra/functions-custom.php` - Personalizaciones del tema
- `data/wordpress/wp-content/plugins/jewelry-custom/` - Plugins custom (si se crea)

### ❌ NO MODIFICAR

- Core de WordPress: `wp-admin/`, `wp-includes/`
- Core de plugins instalados (excepto custom)
- `data/mysql/` - Base de datos (gitignore)

## 🚀 Comandos Comunes

### WP-CLI en Docker

```bash
# Estructura básica
docker exec jewelry_wordpress wp --allow-root [comando]

# Listar productos
docker exec jewelry_wordpress wp post list --post_type=product --allow-root

# Crear producto
docker exec jewelry_wordpress wp post create --post_type=product --post_title="Producto" --post_status=publish --allow-root

# Limpiar cache
docker exec jewelry_wordpress wp cache flush --allow-root
```

### Docker Compose

```bash
docker compose up -d        # Iniciar
docker compose down         # Detener
docker compose restart      # Reiniciar
docker compose logs -f      # Ver logs
```

## 📊 Estado Actual del Proyecto

Ver archivo `PROYECTO-ESTADO.md` en la raíz para el estado actualizado.

### Prioridades

1. **Productos:** Crear ~50+ productos del catálogo
2. **Contenido:** Completar páginas About Us, Materials, Blog
3. **Emails:** Configurar emails WooCommerce bilingües
4. **SEO:** Instalar y configurar plugin SEO
5. **Diseño:** Personalizar header/footer por idioma

## 🔗 Referencias

- [WordPress Developer Docs](https://developer.wordpress.org/)
- [WooCommerce Docs](https://woocommerce.github.io/code-reference/)
- [TranslatePress Plugin](https://wordpress.org/plugins/translatepress-multilingual/)
- [Astra Theme Docs](https://www.astrawp.com/documentation/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)

## 💡 Tips para IAs

1. **Contenido Bilingüe:** Cuando crees cualquier contenido (producto, página, post), SIEMPRE preguntar o crear versión en ambos idiomas
2. **Prefijos:** Verificar que todas las funciones custom usen `jewelry_` como prefijo
3. **Seguridad:** Validar que todo input esté sanitizado y todo output escapado
4. **WP Standards:** Seguir WordPress Coding Standards en todo momento
5. **TranslatePress:** Traducciones en tablas `wp_trp_*`
6. **Testing:** Probar en ambos idiomas antes de considerar completa una tarea
7. **Documentación:** Usar PHPDoc para todas las funciones custom

---

**Última actualización:** 10 de febrero de 2026
**Mantenedor:** GitHub Copilot + Claude + Equipo de Desarrollo
