# Problema de Imágenes - RESUELTO ✅

**Fecha:** 2026-02-16  
**Estado:** Completamente resuelto

## Problema Original

Usuario reportó: _"o no tienen y las que tiene no se ven"_ (productos sin imágenes o imágenes que no se muestran)

## Causa Raíz

Las imágenes estaban en `/wp-content/uploads/jewelry-catalog/full/` en lugar de la estructura estándar de WordPress `/wp-content/uploads/YYYY/MM/`. Esto impedía:

1. **Generación de thumbnails** - WordPress no generaba los 8 tamaños requeridos
2. **Integración con Media Library** - No aparecían en la biblioteca de medios
3. **Slug mismatch** - WordPress genera slugs diferentes a los nombres originales

### Ejemplo del problema de slugs:

- **Imagen original:** `cadenas-carol-g-1-01.jpg`
- **Slug de WordPress:** `cardenas-still-carol-g-con` (añade hyphens, modifica texto)
- **SKU del producto:** `PROD-001`

## Solución Implementada

### 1. Mapeo SKU → Slug (31 productos)

Creado array de mapeo en `reimport-product-images.php`:

```php
function jewelry_get_image_slug_from_sku($sku) {
    $mapping = array(
        'PROD-001' => 'cadenas-carol-g-1',
        'PROD-002' => 'cadenas-carol-g-2',
        // ... 31 entries total
    );
    return $mapping[$sku] ?? null;
}
```

### 2. Reimportación Completa

**Script:** `/srv/stacks/jewelry/scripts/reimport-product-images.php`

**Proceso:**

1. Lee cada producto por SKU
2. Mapea SKU → slug de imagen original
3. Copia imagen de `/jewelry-catalog/full/` a `/uploads/2026/02/`
4. Crea attachment en WordPress con metadatos completos
5. Genera 8 tamaños de thumbnails:
   - `thumbnail` (150×150)
   - `medium` (240×300)
   - `medium_large` (768×960)
   - `large` (819×1024)
   - `woocommerce_thumbnail` (300×300)
   - `woocommerce_single` (600×750)
   - `woocommerce_gallery_thumbnail` (100×100)
   - `trp-custom-language-flag` (10×12)
6. Asigna imagen como featured al producto
7. Añade a galería del producto

**Ejecución:**

```bash
docker exec jewelry_wordpress php /var/www/html/reimport-product-images.php import
```

**Resultado:** ✅ **125 imágenes reimportadas** (31 productos × ~4 imágenes por producto)

### 3. Limpieza de Attachments Antiguos

**Script:** `/srv/stacks/jewelry/scripts/cleanup-old-images.php`

```bash
docker exec jewelry_wordpress php /var/www/html/cleanup-old-images.php clean
```

**Resultado:** ✅ **111 attachments antiguos eliminados** de `wp_posts` (apuntaban a `/jewelry-catalog/`)

### 4. Verificación

```bash
# Verificar asignación
Productos con imágenes nuevas: 31 / 31 ✅
Productos con imágenes viejas: 0 / 31 ✅

# Verificar descarga
curl https://jewelry.local.dev/wp-content/uploads/2026/02/cadenas-carol-g-1-01-300x300.jpg
# Resultado: 16KB JPEG válido (300×300)

# Verificar HTML
curl https://jewelry.local.dev/product/cardenas-still-carol-g-con/ | grep "<img"
# Resultado: 10+ tags <img> con src correcto
```

## Resultados

### ✅ Completado

1. **125 imágenes** importadas correctamente a `/wp-content/uploads/2026/02/`
2. **1,000+ thumbnails** generados (8 por imagen)
3. **31 productos** con featured images asignadas
4. **111 attachments** antiguos eliminados de la base de datos
5. **0 errores** en verificación final
6. **Cache limpiado** (WordPress, WooCommerce, Astra)

### Verificación Frontend

**URLs para verificar:**

- Tienda ES: https://jewelry.local.dev/tienda/
- Tienda EN: https://jewelry.local.dev/en/shop/
- Producto ejemplo: https://jewelry.local.dev/product/cardenas-still-carol-g-con/

**Tamaños generados por imagen:**

- Thumbnail 150×150 (para widgets)
- Medium 240×300 (para contenido)
- WooCommerce Thumbnail 300×300 (para loop de productos)
- WooCommerce Single 600×750 (para página de producto)
- WooCommerce Gallery 100×100 (para miniaturas de galería)
- Large 819×1024 (para lightbox)
- Medium Large 768×960 (para tablets)
- TranslatePress Flag 10×12 (para selector de idioma)

## Archivos Clave

| Archivo                       | Propósito                           | Líneas |
| ----------------------------- | ----------------------------------- | ------ |
| `reimport-product-images.php` | Reimportar imágenes con SKU mapping | 250+   |
| `cleanup-old-images.php`      | Eliminar attachments antiguos       | 150+   |
| `clean-duplicate-images.php`  | Limpiar thumbnails duplicados       | 180+   |
| `fix-featured-images.php`     | Reasignar featured images           | 120+   |

## Problema Pendiente

⚠️ **CRÍTICO:** 31 productos sin precio (no se pueden vender)

```sql
SELECT COUNT(*) FROM wp_posts AS p
INNER JOIN wp_postmeta AS pm ON p.ID = pm.post_id
WHERE p.post_type = 'product'
AND pm.meta_key = '_sku'
AND pm.meta_value LIKE 'PROD-%'
AND NOT EXISTS (
    SELECT 1 FROM wp_postmeta AS pm2
    WHERE pm2.post_id = p.ID
    AND pm2.meta_key = '_price'
    AND pm2.meta_value != ''
);
-- Resultado: 31
```

**Acción requerida:** Usuario debe proporcionar precios para los 31 productos del catálogo (PROD-001 a PROD-031).

## Lecciones Aprendidas

1. **WordPress slug generation** - No usar nombres de archivo directamente, siempre mapear con SKU
2. **Ubicación de imágenes** - Deben estar en `/uploads/YYYY/MM/` para integración completa
3. **Thumbnail generation** - WordPress requiere images en estructura estándar
4. **Media library integration** - Copiar archivos no es suficiente, se necesita crear attachments
5. **SKU como ID unificador** - Más confiable que slugs para productos e imágenes

## Comandos Útiles

```bash
# Verificar productos sin imágenes
docker exec jewelry_wordpress php -r "
require '/var/www/html/wp-load.php';
\$args = array('post_type' => 'product', 'posts_per_page' => -1, 'meta_key' => '_sku', 'meta_compare' => 'LIKE', 'meta_value' => 'PROD-%');
\$products = get_posts(\$args);
foreach (\$products as \$product) {
    \$thumb_id = get_post_thumbnail_id(\$product->ID);
    if (empty(\$thumb_id)) {
        echo \$product->post_title . ' - NO IMAGE' . PHP_EOL;
    }
}
"

# Verificar ubicación de imágenes
docker exec jewelry_wordpress find /var/www/html/wp-content/uploads/2026/02/ -type f -name "*.jpg" | wc -l

# Limpiar cache completo
docker exec jewelry_wordpress php -r "require '/var/www/html/wp-load.php'; wp_cache_flush(); flush_rewrite_rules(); echo 'Cache limpiado';"
```

---

**Documento creado:** 2026-02-16  
**Última actualización:** 2026-02-16  
**Estado del problema:** ✅ RESUELTO
