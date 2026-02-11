# Plantillas de Widgets Bilingües - EN (Inglés)

**Propósito:** Ejemplos de widgets traducidos al inglés que puedes copiar y adaptar en tus páginas.

⚠️ **Para usar:**

1. Abre la página EN en editor Elementor
2. Localiza la sección que necesitas
3. Reemplaza el widget existente o añade uno nuevo
4. Copia los valores de `settings` del ejemplo

---

## 🎯 HEADINGS COMUNES

### Hero Title - Large (H1)

```json
{
  "settings": {
    "title": "Welcome to Remedio Jewelry",
    "header_size": "h1",
    "align": "center"
  }
}
```

### Section Title - Medium (H2)

```json
{
  "settings": {
    "title": "Our Jewelry Collection",
    "header_size": "h2",
    "align": "center"
  }
}
```

### Section Title with Decorative Letter - Large

```json
{
  "settings": {
    "title": "T",
    "header_size": "h1",
    "align": "center",
    "_position": "absolute",
    "_z_index": 1,
    "title_color": "#FFFFFF"
  }
}
```

---

## 📝 TEXT EDITORS COMUNES

### Paragraph with HTML

```json
{
  "settings": {
    "editor": "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis.</p>",
    "align": "center",
    "text_color": "#1A202C"
  }
}
```

### Multiple Paragraphs

```json
{
  "settings": {
    "editor": "<p><strong>In our store</strong>, you will be able to find all types of jewelry.</p><p>We offer the best quality and unique designs.</p>",
    "align": "left"
  }
}
```

### White Text on Dark Background

```json
{
  "settings": {
    "editor": "<p>Handcrafted pieces with passion and dedication.</p>",
    "align": "center",
    "text_color": "#FFFFFF"
  }
}
```

---

## 🖼️ IMAGE BOX (Imagen + Título + Descripción)

### Product Card

```json
{
  "widgetType": "image-box",
  "settings": {
    "image": {
      "url": "https://jewelry.local.dev/wp-content/uploads/2022/02/product-1.jpg",
      "id": 584,
      "alt": "Carla golden earrings"
    },
    "title_text": "Carla Golden Earrings",
    "description_text": "$159",
    "position": "left",
    "title_size": "h5",
    "image_space": { "unit": "px", "size": 30 },
    "image_size": { "unit": "%", "size": 60 },
    "content_vertical_alignment": "middle"
  }
}
```

### Feature Box with Icon

```json
{
  "widgetType": "image-box",
  "settings": {
    "image": {
      "url": "https://jewelry.local.dev/wp-content/uploads/2022/02/feature-1.jpg",
      "id": 123
    },
    "title_text": "Premium Quality",
    "description_text": "Crafted with the finest materials",
    "position": "left",
    "title_size": "h5"
  }
}
```

---

## 📌 ICON BOX (Icono + Título + Descripción)

### Service Box

```json
{
  "widgetType": "icon-box",
  "settings": {
    "selected_icon": { "value": "fas fa-truck-pickup", "library": "fa-solid" },
    "title_text": "Free Delivery",
    "description_text": "Fast shipping to your address",
    "position": "left",
    "text_align": "left",
    "icon_size": { "unit": "px", "size": 24 },
    "icon_space": { "unit": "px", "size": 35 },
    "title_bottom_space": { "unit": "px", "size": 10 }
  }
}
```

### Trust Element

```json
{
  "widgetType": "icon-box",
  "settings": {
    "selected_icon": { "value": "far fa-money-bill-alt", "library": "fa-regular" },
    "title_text": "Money Back Guarantee",
    "description_text": "100% satisfaction or refund",
    "view": "stacked",
    "icon_size": { "unit": "px", "size": 24 },
    "primary_color": "#cb3a00"
  }
}
```

---

## 🔘 BUTTONS

### Primary CTA Button

```json
{
  "widgetType": "button",
  "settings": {
    "text": "SHOP NOW",
    "link": { "url": "https://jewelry.local.dev/en/shop/" },
    "align": "center",
    "_margin": { "unit": "px", "top": 30 }
  }
}
```

### Secondary Button

```json
{
  "widgetType": "button",
  "settings": {
    "text": "Learn More",
    "link": { "url": "#about" },
    "align": "left"
  }
}
```

### Button Group (multiple)

```json
[
  {
    "widgetType": "button",
    "settings": {
      "text": "Add to Cart",
      "link": { "url": "#" }
    }
  },
  {
    "widgetType": "button",
    "settings": {
      "text": "View Details",
      "link": { "url": "#" }
    }
  }
]
```

---

## 🎨 ICON LIST (Lista de Iconos + Texto)

### Social Links

```json
{
  "widgetType": "icon-list",
  "settings": {
    "icon_list": [
      {
        "text": "Our INSTAGRAM",
        "selected_icon": { "value": "fab fa-instagram", "library": "fa-brands" }
      },
      {
        "text": "Follow us on Facebook",
        "selected_icon": { "value": "fab fa-facebook", "library": "fa-brands" }
      }
    ],
    "icon_align": "center",
    "icon_size": { "unit": "px", "size": 30 }
  }
}
```

### Features Checklist

```json
{
  "widgetType": "icon-list",
  "settings": {
    "icon_list": [
      {
        "text": "Handmade with love",
        "selected_icon": { "value": "fas fa-check", "library": "fa-solid" }
      },
      {
        "text": "Ethically sourced materials",
        "selected_icon": { "value": "fas fa-check" }
      },
      {
        "text": "Lifetime guarantee",
        "selected_icon": { "value": "fas fa-check" }
      }
    ]
  }
}
```

---

## 📺 VIDEOS (No requiere traducción)

```json
{
  "widgetType": "video",
  "settings": {
    "youtube_url": "https://www.youtube.com/watch?v=...",
    "show_image_overlay": "yes",
    "image_overlay": { "url": "..." },
    "show_play_icon": "yes"
  }
}
```

---

## 📸 IMAGES (No requieren traducción)

```json
{
  "widgetType": "image",
  "settings": {
    "image": {
      "url": "https://jewelry.local.dev/wp-content/uploads/...",
      "id": 123
    },
    "object-fit": "cover",
    "image_size": "full"
  }
}
```

---

## 🏷️ TEXT PATH (Texto decorativo en ruta)

```json
{
  "widgetType": "text-path",
  "settings": {
    "text": "JEWELRY FOR EVERYONE",
    "path": "line",
    "rotation": { "unit": "deg", "size": 275 },
    "align": "left",
    "size": { "unit": "px", "size": 300 }
  }
}
```

---

## 🎞️ IMAGE GALLERY (No requiere traducción)

```json
{
  "widgetType": "image-gallery",
  "settings": {
    "wp_gallery": [
      { "id": 787, "url": "..." },
      { "id": 788, "url": "..." }
    ],
    "thumbnail_size": "full",
    "gallery_columns": 6
  }
}
```

---

## 🎯 PATRON DE USO RECOMENDADO

**Para cada sección grande:**

1. **Copiar la estructura completa de la página ES**

   ```bash
   docker exec jewelry_wordpress wp post meta get 1388 _elementor_data --allow-root > home-es-structure.json
   ```

2. **Usar el archivo copiado como referencia**
   - Ver exact ID del widget que necesitas traducir
   - Ubicar en la page EN
   - Reemplazar sus valores de texto

3. **No tocar:**
   - IDs de elementos
   - Estilos (colors, fonts, sizes)
   - Posicionamiento (margin, padding, z-index)
   - URLs de imágenes

4. **Solo cambiar:**
   - `title`, `editor`, `text` - Campos de texto
   - `description_text`, `title_text` - Textos de widgets
   - Links (si necesitan apuntar a URLs EN)

---

## 📋 PLANTILLA DE SECTION COMPLETA (Hero)

```json
{
  "id": "hero-section",
  "elType": "section",
  "elements": [
    {
      "id": "hero-column",
      "elType": "column",
      "elements": [
        {
          "id": "hero-image",
          "elType": "widget",
          "widgetType": "image",
          "settings": {
            "image": {
              "url": "https://jewelry.local.dev/.../hero-image.jpg"
            }
          }
        },
        {
          "id": "hero-content",
          "elType": "section",
          "elements": [
            {
              "id": "hero-title",
              "elType": "widget",
              "widgetType": "heading",
              "settings": {
                "title": "Welcome to Our Jewelry World",
                "header_size": "h1",
                "align": "center"
              }
            },
            {
              "id": "hero-text",
              "elType": "widget",
              "widgetType": "text-editor",
              "settings": {
                "editor": "<p>Discover unique, handcrafted pieces that tell your story.</p>",
                "align": "center"
              }
            },
            {
              "id": "hero-button",
              "elType": "widget",
              "widgetType": "button",
              "settings": {
                "text": "EXPLORE COLLECTION",
                "link": { "url": "https://jewelry.local.dev/en/shop/" }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

**Última actualización:** 2026-02-11
**Uso:** Copiar valores de `settings` para reemplazar en páginas EN
