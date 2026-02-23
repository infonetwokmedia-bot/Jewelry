# GitHub Copilot Instructions - Jewelry Project

## Contexto del Proyecto

Este es un sitio web **bilingue (Espanol/Ingles)** para **Jewelry Miami** en Miami, Florida. El sitio esta construido con WordPress + WooCommerce y optimizado para venta de joyas de alta calidad.

### Stack Tecnologico

- **CMS:** WordPress 6.9.1
- **E-commerce:** WooCommerce 10.5.1
- **Tema:** Astra 4.12.3 (gratuito)
- **Page Builder:** Elementor 3.35.4
- **Starter Template:** Jewellery Store 04 (Astra Starter Templates)
- **Multiidioma:** TranslatePress 3.0.9 (NO Bogo, NO Polylang, NO WPML)
- **Infraestructura:** Docker + Traefik
- **PHP:** 8.1+
- **MySQL:** 8.0
- **Servidor Web:** Apache (contenedor WordPress oficial)

### URLs del Proyecto

- Frontend ES: https://jewelry.local.dev
- Frontend EN: https://jewelry.local.dev/en/
- Admin: https://jewelry.local.dev/wp-admin
- phpMyAdmin: https://phpmyadmin.jewelry.local.dev

### Contenedores Docker

- `jewelry_wordpress` - WordPress + Apache
- `jewelry_mysql` - Base de datos MySQL 8.0
- `jewelry_phpmyadmin` - Gestion de base de datos

### WP-CLI

WP-CLI esta disponible como servicio en docker-compose:

```bash
docker compose run --rm wpcli wp [COMANDO] --allow-root
```

### Repositorios y Cuentas GitHub

- **Produccion (origin):** `tujoyitamiami-cpu/tujoyita` — cuenta Pro + Copilot Pro+
- **Legacy:** `infonetwokmedia-bot/Jewelry` — repo original (read-only mirror)
- **Personal:** `ppkapiro/Jewelry` — fork personal para otros proyectos

### Dominio de Produccion

- **Produccion:** https://tujoyita.com (Hetzner VPS)
- **Dev local:** https://jewelry.local.dev

## REGLA FUNDAMENTAL: CONTENIDO BILINGUE

**CRITICO: El contenido se gestiona con TranslatePress**

- **Espanol (es_ES)** - Idioma principal (URL base: `/`)
- **English (en_US)** - Idioma secundario (URL: `/en/`)

### Como funciona TranslatePress

- **NO se duplican posts/paginas/productos**. Existe UNA sola instancia de cada contenido.
- Las traducciones se almacenan en tablas propias de TranslatePress (`wp_trp_*`).
- Se traduce visualmente desde el frontend: `https://jewelry.local.dev/?trp-edit-translation=true`.
- El language switcher aparece automaticamente (flotante o como shortcode).
- Las URLs en ingles llevan el prefijo `/en/`: `/en/shop/`, `/en/about-us/`, etc.

### Traducir contenido

1. Ir al frontend del sitio
2. En la admin bar, clic en **"Translate Page"** o ir a `?trp-edit-translation=true`
3. Clic en cualquier texto para editarlo
4. Guardar

### Shortcode del Language Switcher

```php
echo do_shortcode( '[language-switcher]' );
```

## Reglas de Desarrollo

### 1. Prefijos y Nomenclatura

- **SIEMPRE** usar prefijo `jewelry_` para todas las funciones custom
- Usar snake_case para funciones PHP: `jewelry_get_products()`
- Usar kebab-case para hooks: `jewelry-custom-hook`
- Usar PascalCase para clases: `Jewelry_Product_Manager`

### 2. WordPress Coding Standards

- Seguir WordPress Coding Standards
- Usar espacios (no tabs) - 4 espacios para PHP
- Usar comillas simples para strings en PHP
- Documentar funciones con PHPDoc

### 3. Seguridad

SIEMPRE sanitizar y validar datos. Usar nonces en formularios. Escapar salida.

### 4. Base de Datos

NUNCA usar SQL directo - Usar WP_Query, get_posts(), o WP database abstraction.

### 5. Hooks y Filtros

Usar acciones y filtros de WordPress apropiadamente.

## Personalizacion del Tema

### Elementor

El diseno del sitio se edita con **Elementor**:

- Editar paginas: Admin > Paginas > Editar con Elementor
- NO editar templates PHP directamente a menos que sea necesario

### Funciones Custom

Para personalizaciones usar **child theme** o **plugin custom**:

- **Child theme:** `data/wordpress/wp-content/themes/astra-child/functions.php`
- **Plugin custom:** `data/wordpress/wp-content/plugins/jewelry-custom/jewelry-custom.php`

NO modificar archivos de Astra directamente.

## Formato de Commits

Usar Conventional Commits: feat, fix, docs, style, refactor, test, chore

## Prioridades Actuales

1. **Produccion:** Preparar deploy a Hetzner VPS con dominio tujoyita.com
2. **Contenido:** Completar paginas pendientes (Materials, Contact, Blog)
3. **Traduccion:** Traducir todo el contenido al ingles con TranslatePress
4. **SEO:** Instalar y configurar Rank Math SEO
5. **Performance:** Cache, CDN, optimizacion de imagenes
6. **CI/CD:** Automatizar deploy y backups

## Archivos Importantes

### Estructura del Proyecto

```
/srv/stacks/jewelry/
├── docker-compose.yml
├── .env
├── data/
│   ├── mysql/
│   └── wordpress/
│       └── wp-content/
│           ├── themes/astra/
│           ├── plugins/
│           │   ├── elementor/
│           │   ├── woocommerce/
│           │   ├── translatepress-multilingual/
│           │   ├── astra-sites/
│           │   └── contact-form-7/
│           └── uploads/
├── backups/
├── docs/
├── scripts/
└── README.md
```

### Archivos a NO Modificar

- Core de WordPress: `data/wordpress/wp-admin/`, `data/wordpress/wp-includes/`
- Core de plugins/temas: No modificar Astra, Elementor, WooCommerce, TranslatePress
- Base de datos: `data/mysql/`

## Workflow de Desarrollo

1. **Crear contenido en espanol** (idioma principal)
2. **Traducir al ingles** usando TranslatePress (visual, desde el frontend)
3. **Revisar traducciones** en ambos idiomas
4. **Commit con mensaje convencional**

## Referencias

- [TranslatePress Docs](https://translatepress.com/docs/translatepress/)
- [Astra Theme Docs](https://wpastra.com/docs/)
- [Elementor Docs](https://developers.elementor.com/)
- [WooCommerce Docs](https://woocommerce.github.io/code-reference/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)

---

**Recuerda:** El contenido se traduce con TranslatePress (NO duplicar posts). Usa prefijo `jewelry_` para funciones custom. Sanitiza todas las entradas. El diseno se edita con Elementor.
