# Guía de Traducción Bilingüe - Elementor Widgets

**Objetivo:** Mantener estructura de diseño, traducir solo contenido.

---

## 📊 Widgets Usados en Home Page (Inicio)

| Widget          | Cantidad | Campos a Traducir                |
| --------------- | -------- | -------------------------------- |
| `heading`       | 29       | `title`                          |
| `text-editor`   | 8        | `editor`                         |
| `image-box`     | 7        | `title_text`, `description_text` |
| `image`         | 4        | Ninguno (solo imágenes)          |
| `icon-box`      | 4        | `title_text`, `description_text` |
| `button`        | 4        | `text`                           |
| `video`         | 3        | Ninguno (URLs externas)          |
| `icon`          | 3        | Ninguno                          |
| `text-path`     | 1        | `text`                           |
| `spacer`        | 1        | Ninguno                          |
| `shortcode`     | 1        | Ninguno                          |
| `image-gallery` | 1        | Ninguno                          |
| `icon-list`     | 1        | `text` (en items)                |

---

## 🎯 Proceso de Traducción por Widget

### 1. **Heading** (`heading`)

**Campo JSON:** `settings.title` o `settings.editor`

**Ejemplo ES:**

```json
{
  "widgetType": "heading",
  "settings": {
    "title": "New Handmade Jewelry Collection",
    "header_size": "h1"
  }
}
```

**Traducción EN:**

```json
{
  "widgetType": "heading",
  "settings": {
    "title": "New Handmade Jewelry Collection", // o tu versión en inglés
    "header_size": "h1"
  }
}
```

**⚠️ NO cambiar:** `header_size`, `align`, `_z_index`, posicionamiento

---

### 2. **Text Editor** (`text-editor`)

**Campo JSON:** `settings.editor`

**Contiene:** Párrafos de texto HTML

**Ejemplo ES:**

```json
{
  "widgetType": "text-editor",
  "settings": {
    "editor": "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit...</p>"
  }
}
```

**Traducción:** Reemplazar el contenido HTML dentro de `editor`, mantener etiquetas `<p>`, `<strong>`, `<em>`, etc.

---

### 3. **Image Box** (`image-box`)

**Campos JSON:**

- `settings.title_text` - Título del box
- `settings.description_text` - Descripción

**⚠️ NO cambiar:** `image`, `position`, `image_size`, `content_vertical_alignment`

---

### 4. **Icon Box** (`icon-box`)

**Campos JSON:**

- `settings.title_text` - Título
- `settings.description_text` - Descripción

**⚠️ NO cambiar:** `selected_icon`, `size`, `view`, `align`

---

### 5. **Button** (`button`)

**Campo JSON:** `settings.text`

**Ejemplo:**

```json
{
  "widgetType": "button",
  "settings": {
    "text": "EXPLORE MORE",
    "link": { "url": "#", ... }
  }
}
```

---

### 6. **Icon List** (`icon-list`)

**Campo JSON:** `settings.icon_list[].text`

**Estructura:**

```json
{
  "widgetType": "icon-list",
  "settings": {
    "icon_list": [
      {
        "text": "Our INSTAGRAM",
        "selected_icon": { "value": "fab fa-instagram" }
      }
    ]
  }
}
```

---

### 7. **Text Path** (`text-path`)

**Campo JSON:** `settings.text`

Texto que sigue una ruta/camino (usualmente decorativo)

---

## 🚀 Workflow Recomendado

### OPCIÓN A: Edición Manual en WordPress Admin

1. Ir a wp-admin → Páginas → Home (EN)
2. Editar con Elementor
3. Hacer clic en cada widget y traducir los campos indicados
4. Guardar y publicar

**Ventajas:** Visual, fácil, rápido
**Desventajas:** Requiere acceso a admin interface

### OPCIÓN B: Automatización CLI

Crear script que busque en `_elementor_data` y traduzca campos automáticamente

**Ventajas:** Reproducible, auditable, versionable
**Desventajas:** Más complejo de mantener

---

## 📋 Checklist de Traducción por Página

### Home (Inicio - 1388 → 1403)

- [ ] Traducir 29 headings
- [ ] Traducir 8 text-editors
- [ ] Traducir 7 image-boxes (title + description)
- [ ] Traducir 4 icon-boxes
- [ ] Traducir 4 buttons
- [ ] Traducir 1 text-path
- [ ] Traducir 1 icon-list

### About Us (Nosotros - 1383 → 1404)

- [ ] Analizar estructura
- [ ] Identificar widgets
- [ ] Traducir según campo correspondiente

### Materials (Materiales - 1385 → 1405)

- [ ] Analizar estructura
- [ ] Identificar widgets
- [ ] Traducir según campo correspondiente

### Contacts (Contacto - 1384 → 1406)

- [ ] Analizar estructura
- [ ] Identificar widgets
- [ ] Traducir según campo correspondiente

---

## 🔧 Herramientas Útiles

### Extraer Elementor JSON de una página

```bash
docker exec jewelry_wordpress wp post meta get [PAGE_ID] _elementor_data --allow-root
```

### Buscar campo específico en JSON

```bash
docker exec jewelry_wordpress wp post meta get 1403 _elementor_data --allow-root | grep -o '"title":"[^"]*"'
```

### Contar widgets por tipo

```bash
docker exec jewelry_wordpress wp post meta get 1403 _elementor_data --allow-root | grep -o '"widgetType":"[^"]*"' | sort | uniq -c
```

---

## 📝 Ejemplo Completo: Traducir un Heading

**1. Identificar en Elementor Admin**

- Ir a página Home (EN)
- Editar → Buscar el heading
- Copiar el texto actual

**2. Traducir el texto** (mantener contexto de marca)

```
Original: "New Handmade Jewelry Collection"
Traducción: "Nueva Colección de Joyas Hechas a Mano"
```

**3. Actualizar en Elementor**

- Click en el widget heading
- Pestaña de contenido (content)
- Campo "Title"
- Pegar la traducción
- Guardar

**4. Verificar en frontend**

- Visitar `/en/` en navegador
- Confirmar que cambio aparece

---

## ⚠️ Notas Importantes

1. **NO traducir URLs** - Las categorías y páginas las maneja TranslatePress automáticamente (usa prefijos de URL como `/en/`)
2. **NO cambiar metadatos de diseño** - Mantener `align`, `size`, `position`, `colors`, etc.
3. **Mantener formato HTML** en text-editors - `<p>`, `<strong>`, etc.
4. **Probar en móvil** - Algunos textos truncan en responsive
5. **Revisar longitud de texto** - Algunos idiomas ocupan más espacio
6. **Usar Google Translate solo como referencia** - Después revisar manualmente

---

## 📚 Estructura Widget JSON Típica

```json
{
  "id": "elemento_unico_123",
  "elType": "widget",
  "settings": {
    "title": "TEXTO A TRADUCIR",
    "align": "center",
    "color": "#FFFFFF",
    "_margin": {...},
    "_z_index": 2
  },
  "elements": []
}
```

**Regla simple:** Si está bajo `settings` y es texto legible (no número, no código de color), probablemente hay que traducirlo.

---

**Última actualización:** 2026-02-11
**Para:** Traducción bilingüe ES↔EN Elementor widgets
