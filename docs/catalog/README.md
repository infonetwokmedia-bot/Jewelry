# Catálogo de Productos – Remedio Joyería

**Fecha de generación:** 2026-02-16  
**Fuente:** Chat de WhatsApp con Remedio Joyería (exportación 3-5 Feb 2026)  
**Estado:** Pendiente de revisión y carga en WooCommerce

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Productos detectados | 31 |
| Imágenes procesadas | 112 |
| Videos disponibles | 8 |
| Categorías | 6 (+2 ya existentes en WP) |
| Formatos de imagen | WebP + JPG (300px, 800px, 1200px) |

## Archivos Generados

Los archivos del catálogo se generaron en la máquina Windows y deben transferirse al servidor:

```
catalog/
├── data/
│   ├── catalog_editable.csv      ← CSV para revisar/editar (Excel)
│   ├── products.json             ← Datos estructurados completos
│   ├── categories.json           ← 6 categorías detectadas
│   └── woocommerce_import.csv    ← Listo para importar en WooCommerce
├── images/
│   ├── thumbnails/               ← 112 imgs @ 300px (WebP + JPG)
│   ├── medium/                   ← 112 imgs @ 800px (WebP + JPG)
│   └── full/                     ← 112 imgs @ 1200px (WebP + JPG)
└── preview.html                  ← Vista previa visual del catálogo
```

## Flujo de trabajo

```
┌──────────────────────────────────────────────────────────┐
│ 1. REVISAR el catalog_editable.csv                       │
│    - Corregir descripciones en español                   │
│    - Añadir traducciones al inglés (raw_description_en)  │
│    - Marcar web_ready=FALSE en productos a excluir       │
│    - Añadir precios                                      │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 2. TRANSFERIR imágenes al servidor                       │
│    scp -r catalog/images/ dell01-lan:/srv/stacks/        │
│           jewelry/data/wordpress/wp-content/uploads/     │
│           jewelry-catalog/                               │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 3. IMPORTAR en WooCommerce                               │
│    - Actualizar URLs de imágenes en woocommerce_import   │
│    - WP Admin → Productos → Importar CSV                 │
│    - Vincular EN ↔ ES con Bogo                           │
└──────────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────────┐
│ 4. VALIDAR en frontend                                   │
│    - https://jewelry.local.dev/es/tienda/                │
│    - https://jewelry.local.dev/en/shop/                  │
│    - Verificar imágenes, categorías, traducciones        │
└──────────────────────────────────────────────────────────┘
```

## Documentos relacionados

- [PRODUCTOS.md](PRODUCTOS.md) – Lista completa de los 31 productos
- [CATEGORIAS.md](CATEGORIAS.md) – Mapeo de categorías nuevas vs existentes
- [IMPORTACION-WOOCOMMERCE.md](IMPORTACION-WOOCOMMERCE.md) – Guía paso a paso
- [IMAGENES.md](IMAGENES.md) – Convenciones y transferencia de imágenes

## Herramienta de generación

El catálogo se generó con el script `catalog_builder/` ubicado en:
```
C:\Users\pepec\Documents\Jewelry\catalog_builder\
```

Para regenerar desde el CSV editado:
```bash
cd C:\Users\pepec\Documents\Jewelry\catalog_builder
python main.py --from-csv --phase 3
```
