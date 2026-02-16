# Imágenes del Catálogo – Convenciones y Transferencia

---

## Estructura de imágenes generadas

```
catalog/images/
├── thumbnails/          ← 300px max (para grids, listados)
│   ├── cadenas-carol-g-1-01.webp
│   ├── cadenas-carol-g-1-01.jpg
│   └── ...
├── medium/              ← 800px max (para páginas de producto)
│   ├── cadenas-carol-g-1-01.webp
│   ├── cadenas-carol-g-1-01.jpg
│   └── ...
└── full/                ← 1200px max (para zoom/lightbox)
    ├── cadenas-carol-g-1-01.webp
    ├── cadenas-carol-g-1-01.jpg
    └── ...
```

## Convención de nombres

Formato: `{categoria}-{modelo}-{producto_num}-{imagen_num}.{ext}`

Ejemplos:
- `cadenas-carol-g-1-01.webp` → Cadena Carol G, producto 1, imagen 1
- `gargantillas-tiffany-2-01.jpg` → Gargantilla Tiffany, producto 2, imagen 1
- `cadenas-cuban-link-24-15.webp` → Cadena Cuban Link, producto 24, imagen 15

## Formatos

| Formato | Uso | Calidad |
|---------|-----|---------|
| **WebP** | Navegadores modernos (Chrome, Firefox, Edge, Safari 14+) | 82% |
| **JPG** | Fallback para navegadores antiguos | 85% |

### Uso en WordPress/WooCommerce

WooCommerce auto-genera sus propios thumbnails. Para mejor resultado:

```html
<!-- Usar picture element para WebP con fallback JPG -->
<picture>
  <source srcset="cadenas-carol-g-1-01.webp" type="image/webp">
  <img src="cadenas-carol-g-1-01.jpg" alt="Cadena Carol G con Zirconia">
</picture>
```

O dejar que WordPress maneje los tamaños nativamente subiendo solo el `full/`.

## Transferencia al servidor

### Opción A: Solo full (recomendado para WooCommerce)

WooCommerce regenera thumbnails automáticamente. Subir solo `full/`:

```powershell
# Desde Windows PowerShell
scp -r "C:\Users\pepec\Documents\Jewelry\catalog\images\full\*" `
  dell01-lan:/srv/stacks/jewelry/data/wordpress/wp-content/uploads/jewelry-catalog/
```

### Opción B: Todos los tamaños (para uso custom)

```powershell
scp -r "C:\Users\pepec\Documents\Jewelry\catalog\images\*" `
  dell01-lan:/srv/stacks/jewelry/data/wordpress/wp-content/uploads/jewelry-catalog/
```

### Permisos post-transferencia

```bash
ssh dell01-lan "docker exec jewelry_wordpress bash -c '
  chown -R www-data:www-data /var/www/html/wp-content/uploads/jewelry-catalog/
  find /var/www/html/wp-content/uploads/jewelry-catalog/ -type f -exec chmod 644 {} \;
  find /var/www/html/wp-content/uploads/jewelry-catalog/ -type d -exec chmod 755 {} \;
'"
```

## Estadísticas de imágenes

| Producto | Imágenes | Videos | Nota |
|----------|----------|--------|------|
| PROD-025 (Rolo) | 28 | 0 | Mayor cantidad de imágenes |
| PROD-028 (Tiffany/Militar) | 26 | 0 | Gran variedad |
| PROD-024 (Cuban Link) | 20 | 2 | Incluye videos demostración |
| PROD-021 (Tenis diamantes) | 6 | 1 | Producto premium |
| PROD-022 (Anillo compromiso) | 1 | 6 | Mayoría en video |
| Resto | 1-3 | 0 | Estándar |

## Imágenes originales

Las imágenes originales (sin procesar) están en:
```
C:\Users\pepec\Documents\Jewelry\Chat\
```

Si se necesita reprocesar con diferentes tamaños o calidad, editar
`config.py` y ejecutar:
```bash
python main.py --from-csv --phase 2
```

## Referencia adicional: Cadena Cubana

En `Chat/Descargas/Cadena Cubana/` hay 3 imágenes de referencia WebP:
- `cuban_link_chain_handmade.webp`
- `Cuban_link_chain_with_traditional_box_clasp.webp`
- `Miami_Cuban_link_chain_closeup.webp`

Estas son imágenes de referencia/stock que pueden usarse como imágenes
decorativas en la página de categoría "Cuban Link".
