# Guía de Importación WooCommerce

**Prerequisitos:**
- Catálogo revisado en `catalog_editable.csv`
- Imágenes transferidas al servidor
- Categorías nuevas creadas en WooCommerce

---

## Paso 1: Revisar el CSV editable

Abrir `catalog/data/catalog_editable.csv` en Excel:

1. **Columna `raw_description_es`** — Corregir/mejorar descripciones en español
2. **Columna `raw_description_en`** — Escribir traducción al inglés
3. **Columna `web_ready`** — Marcar `FALSE` para excluir productos
4. **Columna `category_es` / `category_en`** — Verificar categoría correcta
5. **Columna `model`** — Verificar modelo detectado
6. **Columna `tags`** — Añadir/quitar etiquetas

Guardar el CSV y regenerar:
```bash
cd C:\Users\pepec\Documents\Jewelry\catalog_builder
python main.py --from-csv
```

## Paso 2: Transferir imágenes al servidor

```bash
# Desde Windows (PowerShell)
scp -r C:\Users\pepec\Documents\Jewelry\catalog\images\* `
  dell01-lan:/srv/stacks/jewelry/data/wordpress/wp-content/uploads/jewelry-catalog/
```

Verificar en el servidor:
```bash
ssh dell01-lan "ls -la /srv/stacks/jewelry/data/wordpress/wp-content/uploads/jewelry-catalog/"
```

Fijar permisos:
```bash
ssh dell01-lan "docker exec jewelry_wordpress chown -R www-data:www-data /var/www/html/wp-content/uploads/jewelry-catalog/"
```

## Paso 3: Actualizar URLs en el CSV de importación

Editar `catalog/data/woocommerce_import.csv`:

**Buscar y reemplazar** en la columna `Images`:
```
images/full/ → https://jewelry.local.dev/wp-content/uploads/jewelry-catalog/full/
```

O si es producción:
```
images/full/ → https://jewelry.cubaverso.com/wp-content/uploads/jewelry-catalog/full/
```

## Paso 4: Importar productos en WooCommerce

### Importar productos en español (idioma principal)

1. Ir a **WP Admin → Productos → Importar**
2. Subir `woocommerce_import.csv`
3. Mapear columnas:
   - `SKU` → SKU
   - `Name` → Nombre
   - `Description` → Descripción
   - `Short description` → Descripción corta
   - `Categories` → Categorías
   - `Tags` → Etiquetas
   - `Images` → Imágenes
   - `Regular price` → Precio regular
4. Click **Ejecutar importación**

### Crear versiones en inglés

Para cada producto importado:

1. Ir a **Productos → Editar** el producto EN español
2. En el panel lateral, sección **Bogo**:
   - Click "Create English version"
3. En el producto EN inglés:
   - Cambiar nombre al inglés
   - Cambiar descripción al inglés
   - Asignar categoría EN correspondiente
   - Las imágenes se comparten automáticamente

### Alternativa: Script WP-CLI para duplicar

```bash
# Listar productos importados
docker exec jewelry_wordpress wp post list --post_type=product \
  --fields=ID,post_title --allow-root

# Para cada producto, crear versión EN con Bogo
# (requiere script personalizado - ver scripts/create-translations.sh)
```

## Paso 5: Verificar

```bash
# Contar productos
docker exec jewelry_wordpress wp post list --post_type=product \
  --post_status=publish --allow-root | wc -l

# Verificar imágenes
docker exec jewelry_wordpress wp post list --post_type=attachment \
  --fields=ID,post_title --allow-root | head -20

# Verificar categorías
docker exec jewelry_wordpress wp term list product_cat \
  --fields=term_id,name,slug,count --allow-root
```

Frontend:
- ES: https://jewelry.local.dev/es/tienda/
- EN: https://jewelry.local.dev/en/shop/

---

## Notas importantes

- **Precios:** El CSV se genera sin precios. Deben añadirse manualmente.
- **Variaciones:** Los productos con múltiples tamaños (mm, pulgadas) deberían
  configurarse como productos variables en WooCommerce.
- **SKU:** Los IDs generados (PROD-001, etc.) son temporales. 
  Asignar SKUs reales al editar el CSV.
- **SEO:** Revisar que los slugs generados son descriptivos y únicos.
