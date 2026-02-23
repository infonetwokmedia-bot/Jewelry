# Restauración de Profundidad Visual - CSS y Colores

**Fecha:** 16 de febrero de 2026  
**Estado:** ✅ Completamente restaurado

---

## 🔍 Problema Detectado

Al investigar los CSS originales del tema, se encontró que:

1. ❌ **CSS custom BORRADO** - 0 bytes (antes: 4,084 bytes)
2. ❌ **Colores globales de Astra NO configurados** - Todos en "No configurado"
3. ❌ **Pérdida de profundidad visual** - Sin sombras, elevaciones ni efectos

**Impacto:**

- Diseño plano sin profundidad
- Sin efectos de hover
- Colores genéricos en lugar de paleta de joyería
- Sin transiciones suaves
- Tarjetas sin elevación

---

## ✅ Solución Aplicada

### 1. Paleta de Colores Globales de Astra (Tema Joyería)

Se configuraron 9 colores globales usando variables CSS de Astra:

| Variable               | Color     | Nombre                | Uso                       |
| ---------------------- | --------- | --------------------- | ------------------------- |
| `--ast-global-color-0` | `#d4af37` | **Dorado principal**  | Botones, precios, enlaces |
| `--ast-global-color-1` | `#b8941f` | **Dorado hover**      | Estados activos           |
| `--ast-global-color-2` | `#1e1e1e` | **Negro**             | Títulos, headings         |
| `--ast-global-color-3` | `#3a3a3a` | **Gris oscuro**       | Texto general             |
| `--ast-global-color-4` | `#ffffff` | **Blanco**            | Backgrounds               |
| `--ast-global-color-5` | `#f9f9f9` | **Gris muy claro**    | BG secundario             |
| `--ast-global-color-6` | `#2c2c2c` | **Negro alternativo** | Elementos oscuros         |
| `--ast-global-color-7` | `#e0e0e0` | **Gris claro**        | Bordes                    |
| `--ast-global-color-8` | `#8b7e66` | **Dorado apagado**    | Detalles sutiles          |

**Resultado:** Paleta coherente inspirada en joyería de lujo (oro, negro, gris).

---

### 2. CSS Custom con Profundidad Visual (10,597 bytes)

#### Efectos de Profundidad Aplicados:

##### A. **Sombras Multicapa (14 instancias)**

```css
/* Tarjetas en reposo */
box-shadow:
  0 1px 3px rgba(0, 0, 0, 0.12),
  0 1px 2px rgba(0, 0, 0, 0.08);

/* Tarjetas en hover - Elevación dramática */
box-shadow:
  0 12px 28px rgba(0, 0, 0, 0.15),
  0 8px 10px rgba(0, 0, 0, 0.1),
  0 0 0 1px rgba(212, 175, 55, 0.2);

/* Botones con sombra dorada */
box-shadow:
  0 4px 12px rgba(212, 175, 55, 0.25),
  0 2px 4px rgba(0, 0, 0, 0.1);
```

**Resultado:** Las tarjetas parecen "flotar" sobre la página.

##### B. **Border-Radius Suavizado (12 instancias)**

```css
border-radius: 12px; /* Tarjetas */
border-radius: 8px; /* Botones pequeños */
border-radius: 16px; /* Galería de producto */
border-radius: 20px; /* Badges */
```

**Resultado:** Bordes suaves y elegantes en lugar de esquinas duras.

##### C. **Elevación en Hover (14 transformaciones)**

```css
/* Tarjetas */
transform: translateY(-8px);

/* Botones */
transform: translateY(-2px);

/* Imágenes */
transform: scale(1.08);
```

**Resultado:** Los productos "se elevan" cuando pasas el cursor sobre ellos.

##### D. **Gradientes Dorados en Botones (4 gradientes)**

```css
background: linear-gradient(135deg, #d4af37 0%, #b8941f 100%);
```

**Resultado:** Botones con profundidad de color, no planos.

##### E. **Transiciones Suaves (9 transiciones)**

```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

**Resultado:** Animaciones fluidas y naturales (curva de aceleración).

##### F. **Animaciones de Entrada (fadeInUp)**

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Con delays escalonados:

- Producto 1: 0.05s
- Producto 2: 0.10s
- Producto 3: 0.15s
- Producto 4: 0.20s

**Resultado:** Los productos aparecen progresivamente al cargar la página.

---

## 📊 Comparación Antes vs. Después

### ANTES (CSS borrado)

| Característica | Estado              |
| -------------- | ------------------- |
| Sombras        | ❌ 0                |
| Profundidad    | ❌ Diseño plano     |
| Hover effects  | ❌ Ninguno          |
| Border-radius  | ❌ Esquinas duras   |
| Colores        | ❌ Genéricos        |
| Animaciones    | ❌ Sin transiciones |
| Gradientes     | ❌ Colores planos   |
| Elevación      | ❌ Sin efecto       |

### DESPUÉS (Restaurado)

| Característica | Estado              | Cantidad            |
| -------------- | ------------------- | ------------------- |
| Sombras        | ✅ Multicapa        | 14 instancias       |
| Profundidad    | ✅ Efecto 3D        | Sombras + elevación |
| Hover effects  | ✅ Zoom + elevación | 10 estilos :hover   |
| Border-radius  | ✅ Suavizado        | 12 instancias       |
| Colores        | ✅ Paleta joyería   | 9 colores globales  |
| Animaciones    | ✅ fadeInUp         | 9 transiciones      |
| Gradientes     | ✅ Dorado           | 4 gradientes        |
| Elevación      | ✅ -8px hover       | 14 transforms       |

---

## 🎨 Efectos Visuales Destacados

### 1. Tarjetas de Producto

**En reposo:**

- Sombra sutil (1px-3px)
- Border-radius 12px
- Background blanco

**En hover:**

- Elevación -8px
- Sombra profunda (12px-28px)
- Borde dorado sutil
- Imagen zoom 1.08x

### 2. Botones

**Características:**

- Gradiente dorado (135deg)
- Sombra dorada (rgba 212, 175, 55)
- Uppercase + letter-spacing
- Efecto ripple simulado (círculo blanco)

**En hover:**

- Elevación -2px
- Sombra más intensa
- Gradiente más claro

### 3. Precios

**Estilo:**

- Color dorado #d4af37
- Font-weight 700
- Text-shadow dorado
- Tamaño 1.3em (loop), 2em (individual)

### 4. Imágenes

**Características:**

- Border-radius 12px (arriba)
- Object-fit: cover
- Transition 0.4s cubic-bezier

**En hover:**

- Scale 1.08
- Sin distorsión

---

## 🔧 Tecnologías Utilizadas

1. **Variables CSS de Astra** - Sistema de colores global
2. **Box-shadow multicapa** - Profundidad realista
3. **Cubic-bezier** - Curvas de animación naturales
4. **CSS Grid** - Layout responsivo 4-3-2
5. **Transform** - Elevación y zoom
6. **Linear-gradient** - Efectos de color
7. **Keyframes** - Animaciones personalizadas

---

## 📦 Archivos Generados

### restore-css-depth.php

**Ubicación:** `/srv/stacks/jewelry/scripts/restore-css-depth.php`

**Funciones:**

1. Configura 9 colores globales en `astra-settings`
2. Aplica 10,597 bytes de CSS custom
3. Limpia cache (WordPress, Astra, WooCommerce)
4. Regenera permalinks

**Uso:**

```bash
docker cp /srv/stacks/jewelry/scripts/restore-css-depth.php jewelry_wordpress:/var/www/html/
docker exec jewelry_wordpress php /var/www/html/restore-css-depth.php
```

---

## ✅ Verificación

### Colores Globales

```bash
docker exec jewelry_wordpress php -r "
require '/var/www/html/wp-load.php';
\$opts = get_option('astra-settings');
for (\$i = 0; \$i <= 8; \$i++) {
    echo \"Color \$i: \" . \$opts['global-color-'.\$i] . PHP_EOL;
}
"
```

**Resultado esperado:**

```
Color 0: #d4af37
Color 1: #b8941f
Color 2: #1e1e1e
...
```

### CSS Custom

```bash
docker exec jewelry_wordpress php -r "
require '/var/www/html/wp-load.php';
echo strlen(get_option('astra_theme_custom_css')) . ' bytes';
"
```

**Resultado esperado:** `10597 bytes`

---

## 🌐 URLs de Verificación

- **Tienda ES:** https://jewelry.local.dev/tienda/
- **Tienda EN:** https://jewelry.local.dev/en/shop/
- **Producto individual:** https://jewelry.local.dev/product/cardenas-still-carol-g-con/

**Si no ves cambios:**

- Presiona `Ctrl+F5` (Windows/Linux)
- Presiona `Cmd+Shift+R` (Mac)
- Limpia cache del navegador

---

## 📊 Métricas de Profundidad

| Métrica              | Valor             | Comparación |
| -------------------- | ----------------- | ----------- |
| **Box-shadows**      | 14                | Antes: 0    |
| **Border-radius**    | 12 instancias     | Antes: 0    |
| **Hover effects**    | 10 :hover         | Antes: 0    |
| **Transformaciones** | 14 transform      | Antes: 0    |
| **Gradientes**       | 4 linear-gradient | Antes: 0    |
| **Transiciones**     | 9 transition      | Antes: 0    |
| **Animaciones**      | 1 @keyframes      | Antes: 0    |
| **Colores globales** | 9 configurados    | Antes: 0    |

---

## 💡 Técnicas de Profundidad Visual Aplicadas

### 1. Material Design Elevation

Inspirado en Material Design de Google:

- **Nivel 1** (reposo): 1-3px shadow
- **Nivel 2** (hover): 8-12px shadow
- **Nivel 3** (activo): 12-28px shadow

### 2. Layer Stacking

Múltiples capas de sombra para profundidad realista:

```css
box-shadow:
  0 12px 28px rgba(0, 0, 0, 0.15),
  /* Sombra principal */ 0 8px 10px rgba(0, 0, 0, 0.1),
  /* Sombra media */ 0 0 0 1px rgba(212, 175, 55, 0.2); /* Borde sutil */
```

### 3. Parallax Simulado

Diferentes velocidades de movimiento:

- Tarjetas: -8px
- Botones: -2px
- Imágenes: scale 1.08

### 4. Color Depth

- Text-shadow en precios dorados
- Gradientes en botones
- Sombra dorada en elementos interactivos

---

## 🚀 Próximos Pasos

1. ✅ Colores configurados
2. ✅ CSS con profundidad aplicado
3. ✅ Cache limpiado
4. ⏭️ Verificar en navegador (Ctrl+F5)
5. ⏭️ Probar en mobile/tablet
6. ⏭️ Ajustar intensidad de sombras si es necesario

---

## 📝 Notas Técnicas

### CSS Storage

El CSS se guarda en `wp_options`:

- **Option name:** `astra_theme_custom_css`
- **Size:** 10,597 bytes
- **Formato:** String sin minificar

### Color Storage

Los colores se guardan en `wp_options`:

- **Option name:** `astra-settings`
- **Keys:** `global-color-0` through `global-color-8`
- **Formato:** Array serializado

### Cache Layers

Caches limpiados automáticamente:

1. WordPress object cache (`wp_cache_flush()`)
2. Astra dynamic CSS transient
3. Astra theme options transient
4. WooCommerce products transients
5. Rewrite rules (`flush_rewrite_rules()`)

---

**Documento creado:** 16 de febrero de 2026  
**Estado:** ✅ Profundidad visual completamente restaurada  
**CSS Size:** 10,597 bytes (antes: 0)  
**Colores:** 9/9 configurados (antes: 0/9)
