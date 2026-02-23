# Cómo Agregar Selector de Idioma al Header de Kadence

## ✅ Código PHP Agregado

Se ha actualizado `/wp-content/themes/kadence/functions-custom.php` con:

- **Función principal:** `jewelry_language_switcher_html()` - Genera el HTML del selector
- **Shortcode:** `[jewelry_language_selector]` - Para usar en cualquier lugar
- **Auto-inyección:** `jewelry_inject_language_switcher()` - Se agrega automáticamente al header
- **Estilos CSS:** Diseño moderno con banderas 🇺🇸 🇪🇸 y hover effects

## 🚀 SOLUCIÓN AUTOMÁTICA (Ya Está Activa)

El selector de idioma **YA está funcionando** automáticamente en tu sitio. Se ha configurado para aparecer en la **esquina superior derecha** de forma fija (fixed position).

### ¿Qué hace?

- Se inyecta automáticamente usando el hook `wp_body_open`
- Posición: **Fixed top-right** (siempre visible al hacer scroll)
- Se muestra en todas las páginas
- No requiere configuración adicional en el Header Builder

### Verificar que funciona

1. Visita: <https://jewelry.local.dev>
2. Deberías ver **[🇺🇸 EN] [🇪🇸 ES]** en la esquina superior derecha
3. Haz clic en cada bandera para cambiar el idioma

---

## 🎨 PERSONALIZAR LA POSICIÓN

### Opción 1: Cambiar ubicación del selector fijo

Edita [functions-custom.php](../data/wordpress/wp-content/themes/kadence/functions-custom.php), busca la función `jewelry_inject_language_switcher()` (línea ~230) y modifica el estilo:

```php
// Esquina superior derecha (actual)
echo '<div class="jewelry-language-switcher-wrapper" style="position: fixed; top: 10px; right: 20px; z-index: 9999;">';

// Esquina superior izquierda
echo '<div class="jewelry-language-switcher-wrapper" style="position: fixed; top: 10px; left: 20px; z-index: 9999;">';

// Centro superior
echo '<div class="jewelry-language-switcher-wrapper" style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 9999;">';

// Inferior derecha
echo '<div class="jewelry-language-switcher-wrapper" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">';
```

### Opción 2: Desactivar inyección automática

Si prefieres agregarlo manualmente, **comenta** esta línea en functions-custom.php (línea ~241):

```php
// add_action('wp_body_open', 'jewelry_inject_language_switcher');
```

Luego usa una de estas alternativas:

---

## 🔧 ALTERNATIVAS MANUALES (Si desactivaste la auto-inyección)

### Paso 1: Abrir el Header Builder

1. Ve a **WordPress Admin**
2. Navega a: `Appearance → Customize`
3. Haz clic en: **Header**
4. Verás el Header Builder visual

### Paso 2: Agregar Elemento HTML

⚠️ **NOTA:** El elemento HTML del Header Builder de Kadence **NO ejecuta código PHP**, solo muestra HTML estático. Por eso la solución automática (arriba) es la recomendada.

**Si desactivaste la auto-inyección**, usa una de estas alternativas:

### A. Usar Shortcode en Widget

1. Ve a: `Appearance → Widgets`
2. Encuentra el área **"Header"** o crea un widget en la sidebar
3. Agrega un widget **"Shortcode"**
4. Inserta: `[jewelry_language_selector]`
5. Guarda

### B. Usar en Menú

1. Ve a: `Appearance → Menus`
2. Selecciona tu menú principal (primary_navigation_en o primary_navigation_es)
3. En "Custom Links", agrega un enlace personalizado
4. En el campo URL, pon el shortcode: `[jewelry_language_selector]`

**Nota:** Esto funciona solo si el tema permite shortcodes en menús.

### C. Hook de Kadence (Avanzado)

Descomenta la última línea de functions-custom.php:

```php
add_action('kadence_header', 'jewelry_add_language_switcher_to_kadence_header', 20);
```

Esto integrará el selector nativamente en el header de Kadence.

---

1. En el Header Builder, cambia a vista **Mobile** (icono de teléfono)
2. Repite los pasos 2-3 para agregar el selector también en el header móvil
3. Ajusta el tamaño o posición según sea necesario

### Paso 5: Guardar y Publicar

1. Haz clic en **"Publish"** en la parte superior
2. Cierra el Customizer
3. Visita tu sitio para ver el selector en acción

---

## 🔧 Opción 2: Usar Shortcode en Widgets/Bloques

Si prefieres usar el shortcode en otras áreas:

### En un Widget de Texto

1. Ve a: `Appearance → Widgets`
2. Agrega un widget **"Custom HTML"** o **"Text"**
3. Inserta el shortcode: `[jewelry_language_selector]`

### En Bloques de Gutenberg

1. Abre cualquier página o entrada
2. Agrega un bloque **"Shortcode"**
3. Escribe: `[jewelry_language_selector]`

### En Código PHP (Plantillas)

```php
<?php echo do_shortcode('[jewelry_language_selector]'); ?>
```

---

## 🎯 Características del Selector

### Diseño Visual

- **Banderas:** 🇺🇸 para inglés, 🇪🇸 para español
- **Códigos de idioma:** EN / ES
- **Idioma activo:** Resaltado en azul (#2271b1)
- **Hover effect:** Elevación suave al pasar el mouse
- **Responsive:** Se adapta automáticamente a móviles

### Funcionalidad

- **Cambio inteligente:** Muestra la traducción de la página actual si existe
- **Fallback:** Si no hay traducción, redirige a la home del idioma
- **Atributos SEO:** Incluye `hreflang` para motores de búsqueda
- **Compatible con:** Páginas, productos, posts, archivos

---

## 🔍 Solución de Problemas

### El selector no aparece

1. Verifica que Bogo esté **activado**: `Plugins → Installed Plugins`
2. Confirma que tienes **2 idiomas configurados**: `Settings → Bogo`
3. Limpia caché: `docker compose restart`

### Los enlaces no funcionan

1. Ve a: `Settings → Permalinks`
2. Haz clic en **"Save Changes"** (aunque no cambies nada)
3. Esto regenera las reglas de reescritura de URLs

### El diseño no se ve bien

1. **Personalizar colores:**
   - Edita [functions-custom.php](../data/wordpress/wp-content/themes/kadence/functions-custom.php)
   - Busca la función `jewelry_language_switcher_styles()`
   - Modifica los colores CSS:
     - `.jewelry-lang-link` → Color normal
     - `.jewelry-lang-link.active` → Color activo
     - `.jewelry-lang-link:hover` → Color hover

2. **Cambiar tamaño:**
   - Modifica `font-size` y `padding` en los estilos CSS

3. **Ocultar banderas:**
   - Elimina esta línea del CSS:

   ```css
   .jewelry-lang-link .flag {
     display: none; /* Ocultar banderas */
   }
   ```

### No cambia el idioma al hacer clic

1. Verifica que las páginas estén **vinculadas con Bogo**:

   ```bash
   docker exec jewelry_mysql mysql -u jewelry_user -pjewelry_pass_2026! jewelry_db \
     -e "SELECT post_id, meta_key, meta_value FROM wp_postmeta WHERE meta_key = '_bogo_translations' LIMIT 5;"
   ```

2. Cada página debe tener su traducción vinculada

---

## 📝 Personalización Avanzada

### Cambiar Banderas

Edita `jewelry_language_switcher_html()` en functions-custom.php:

```php
// Líneas ~95-100
if ( 'en_US' === $locale ) {
    $language_name = 'English';  // Cambiar texto
    $flag_emoji = '🇬🇧';         // Cambiar bandera (UK en vez de USA)
}
```

### Solo Mostrar Códigos (sin banderas)

```php
// En jewelry_language_switcher_html(), línea ~120
$output .= sprintf(
    '<a href="%s" class="jewelry-lang-link%s">
        <span class="lang-code">%s</span>
    </a>',  // Elimina la parte de .flag
    ...
);
```

### Agregar Más Idiomas

1. Instala el idioma en: `Settings → General → Site Language`
2. Actívalo en Bogo: `Settings → Bogo`
3. Agrega el código al switch:

```php
elseif ( 'fr_FR' === $locale ) {
    $language_name = 'FR';
    $flag_emoji = '🇫🇷';
}
```

---

## ✅ Checklist Final

- [ ] Archivo functions-custom.php actualizado
- [ ] Contenedor reiniciado: `docker compose restart`
- [ ] Bogo activado con 2 idiomas (en_US, es_ES)
- [ ] Selector agregado al Header Builder
- [ ] Código PHP del selector agregado en elemento HTML
- [ ] Publicados los cambios en el Customizer
- [ ] Testeado en navegador (cambio de idioma funciona)
- [ ] Verificado en móvil (responsive)

---

## 🎥 Ubicaciones Recomendadas en el Header

```
┌─────────────────────────────────────────────────────┐
│  Logo        Navigation Menu           [EN] [ES]  ← TOP RIGHT
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Logo        Navigation Menu [EN] [ES]            ← NEXT TO MENU
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  [EN] [ES]                                         ← TOP LEFT
│  Logo        Navigation Menu
└─────────────────────────────────────────────────────┘
```

**Recomendación:** Top Right es la posición más común y esperada por usuarios.

---

## 📚 Referencias

- **Kadence Header Builder:** <https://www.kadencewp.com/help-center/docs/kadence-theme/header-builder/>
- **Bogo Documentation:** <https://wordpress.org/plugins/bogo/>
- **Proyecto docs:** [BOGO-BLOCK-EDITOR-FIX.md](./BOGO-BLOCK-EDITOR-FIX.md)

---

**Última actualización:** 2026-02-11
