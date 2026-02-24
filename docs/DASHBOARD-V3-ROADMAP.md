# Dashboard v3.0 — Roadmap, Tickets & TDD Checklist

> **Documento maestro de seguimiento.** Cada ticket tiene su test definido ANTES de implementar (TDD).
> **Última actualización:** 2026-02-24
> **Estado global:** 🟢 Fase 3 — Completado (6/6)

---

## Índice

1. [Estado Global](#estado-global)
2. [Convenciones TDD](#convenciones-tdd)
3. [FASE 1 — Gestión de Imágenes](#fase-1--gestión-de-imágenes)
4. [FASE 2 — Edición Completa de Producto](#fase-2--edición-completa-de-producto)
5. [FASE 3 — CRUD Completo (Crear/Eliminar)](#fase-3--crud-completo-creareliminar)
6. [FASE 4 — Navegación y Secciones](#fase-4--navegación-y-secciones)
7. [FASE 5 — UX Polish y Accesibilidad](#fase-5--ux-polish-y-accesibilidad)
8. [Dependencias Backend](#dependencias-backend)
9. [Log de Progreso](#log-de-progreso)

---

## Estado Global

| Fase                     | Tickets | Completados | Estado        |
| ------------------------ | ------- | ----------- | ------------- |
| Fase 1 — Imágenes        | 8       | 8           | 🟢 Completado |
| Fase 2 — Editor completo | 7       | 7           | 🟢 Completado |
| Fase 3 — CRUD            | 6       | 6           | 🟢 Completado |
| Fase 4 — Navegación      | 5       | 0           | ⚪ Pendiente  |
| Fase 5 — Polish          | 6       | 0           | ⚪ Pendiente  |
| **Backend**              | 5       | 4           | 🟡 Parcial    |
| **TOTAL**                | **37**  | **21**      | **57%**       |

**Leyenda:** 🔴 En curso | 🟡 Parcial | 🟢 Completado | ⚪ Pendiente | ❌ Bloqueado

---

## Convenciones TDD

Cada ticket sigue el ciclo **Red → Green → Refactor**:

1. **RED:** Escribir el test primero (manual o automatizado). Debe fallar.
2. **GREEN:** Implementar el código mínimo para que el test pase.
3. **REFACTOR:** Limpiar código sin romper tests.

### Tipos de Test

| Tipo                 | Herramienta                | Para qué                                                  |
| -------------------- | -------------------------- | --------------------------------------------------------- |
| **API Test**         | `curl` / script bash       | Validar endpoints REST responden correctamente            |
| **UI Test**          | Checklist manual navegador | Validar que la UI muestra/oculta elementos esperados      |
| **Integration Test** | Script PHP via WP-CLI      | Validar que WP + WooCommerce procesan datos correctamente |
| **E2E Smoke**        | Navegador manual           | Flujo completo: acción → API → resultado visual           |

### Plantilla de Test por Ticket

```
TEST: [Nombre del test]
TIPO: API | UI | Integration | E2E
PRE-CONDICIÓN: [Estado requerido antes del test]
PASOS:
  1. ...
  2. ...
RESULTADO ESPERADO: [Qué debe pasar]
ESTADO: 🔴 FAIL | 🟢 PASS
```

---

## FASE 1 — Gestión de Imágenes

**Branch:** `feat/dashboard-image-management`
**Issue GitHub:** Pendiente de crear
**Objetivo:** El cliente puede subir, cambiar, reordenar y eliminar imágenes de productos y variaciones sin tocar WordPress.

### TICKET F1-BE-01: Ampliar CORS para métodos de escritura

- **Prioridad:** 🔴 BLOQUEANTE
- **Archivo:** `data/wordpress/wp-content/plugins/jewelry-dashboard/jewelry-dashboard.php`
- **Estado:** ✅ Completado

**Cambio requerido:**
Cambiar `Access-Control-Allow-Methods: GET, OPTIONS` → `GET, POST, PUT, DELETE, OPTIONS`

**TEST — TDD Red:**

```
TEST: CORS permite POST y PUT
TIPO: API
PRE-CONDICIÓN: Plugin activo, dashboard accesible
PASOS:
  1. curl -X OPTIONS -H "Origin: https://dashboard.jewelry.local.dev" \
       -H "Access-Control-Request-Method: POST" \
       https://jewelry.local.dev/wp-json/wc/v3/products/1
  2. Verificar header Access-Control-Allow-Methods
RESULTADO ESPERADO: Header incluye POST, PUT, DELETE
ESTADO: � PASS
```

**Checklist implementación:**

- [x] Modificar `rest_pre_serve_request` filter → añadir POST, PUT, DELETE
- [x] Modificar handler OPTIONS → añadir POST, PUT, DELETE
- [x] Añadir `Content-Type, Authorization, X-WP-Nonce` a Allow-Headers
- [x] Centralizar origins en `jewd_allowed_origins()` + añadir dev.tujoyita.com
- [x] Test CORS pasa 🟢
- [ ] Commit: `fix(dashboard): expand CORS methods for write operations`

---

### TICKET F1-BE-02: Endpoint proxy para upload de imágenes

- **Prioridad:** 🔴 BLOQUEANTE
- **Archivo:** `data/wordpress/wp-content/plugins/jewelry-dashboard/jewelry-dashboard.php`
- **Estado:** ✅ Completado

**Cambio requerido:**
Registrar endpoint `POST /jewd/v1/media` que reciba imagen (base64 o multipart), la suba a WP Media Library, y retorne el `attachment_id` + URL.

**TEST — TDD Red:**

```
TEST: Upload de imagen vía API retorna attachment_id
TIPO: API
PRE-CONDICIÓN: API keys válidas, imagen de prueba disponible
PASOS:
  1. POST /wp-json/jewd/v1/media con imagen JPG (multipart)
     + consumer_key + consumer_secret
  2. Verificar response JSON
RESULTADO ESPERADO: { "id": 123, "url": "https://…/image.jpg", "thumbnail": "…" }
ESTADO: � PASS
```

**Checklist implementación:**

- [x] Registrar `rest_api_init` route `jewd/v1/media` método POST
- [x] Permission callback con `jewd_media_permission_check()` (GET + POST keys)
- [x] Recibir archivo multipart/form-data
- [x] Usar `media_handle_upload()`
- [x] Retornar `id`, `url`, `thumbnail`, `medium`, `filename`, `width`, `height`, `filesize`
- [x] Manejar errores (tipo incorrecto, tamaño excesivo >5MB)
- [x] Validar tipos: jpg, png, gif, webp
- [x] Test upload pasa 🟢 (id:2982 subido y verificado)
- [ ] Commit: `feat(dashboard-api): add media upload endpoint`

---

### TICKET F1-BE-03: Endpoint para eliminar imagen

- **Prioridad:** 🟡 ALTA
- **Archivo:** `data/wordpress/wp-content/plugins/jewelry-dashboard/jewelry-dashboard.php`
- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: DELETE /jewd/v1/media/{id} elimina attachment
TIPO: API
PRE-CONDICIÓN: Imagen subida con id conocido
PASOS:
  1. DELETE /wp-json/jewd/v1/media/123?consumer_key=…&consumer_secret=…
RESULTADO ESPERADO: { "deleted": true, "id": 123 }
ESTADO: � PASS
```

**Checklist implementación:**

- [x] Registrar route `jewd/v1/media/(?P<id>\d+)` método DELETE
- [x] Validar que el attachment existe (404 si no)
- [x] Usar `wp_delete_attachment($id, true)`
- [x] Test delete pasa 🟢 (id:2982 eliminado, re-delete → 404)
- [ ] Commit: `feat(dashboard-api): add media delete endpoint`

---

### TICKET F1-API-01: Añadir `uploadImage()` al API layer JS

- **Prioridad:** 🔴 BLOQUEANTE
- **Archivo:** `dashboard/js/api.js`
- **Depende de:** F1-BE-02
- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: JewdAPI.uploadImage(file) retorna objeto con id y url
TIPO: Integration (consola del navegador)
PRE-CONDICIÓN: Backend endpoint operativo
PASOS:
  1. En consola: const file = new File(["test"], "test.jpg", {type:"image/jpeg"})
  2. const result = await JewdAPI.uploadImage(file)
  3. Verificar result.id y result.url
RESULTADO ESPERADO: Objeto con { id, url, thumbnail }
ESTADO: 🟢 PASS
```

**Checklist implementación:**

- [x] Añadir `async function uploadImage(file)` en JewdAPI
- [x] Build FormData con file + consumer keys
- [x] POST a `/jewd/v1/media`
- [ ] Manejar progress event (opcional — diferido)
- [x] Añadir `deleteImage(id)` en JewdAPI
- [x] Exportar ambas funciones en return
- [x] Test consola pasa 🟢
- [x] Commit: incluido en commit de Fase 1 frontend

---

### TICKET F1-UI-01: Galería de imágenes en modal de detalle

- **Prioridad:** 🟡 ALTA
- **Archivo:** `dashboard/js/dashboard.js`, `dashboard/css/dashboard.css`
- **Depende de:** F1-API-01
- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Modal detalle muestra TODAS las imágenes del producto
TIPO: UI
PRE-CONDICIÓN: Producto con 3+ imágenes en WooCommerce
PASOS:
  1. Click en 👁 de un producto con múltiples imágenes
  2. Verificar sección "Galería"
RESULTADO ESPERADO: Se muestran todas las imágenes como thumbnails clickeables
ESTADO ACTUAL: 🟢 PASS
```

**Checklist implementación:**

- [x] En `showDetail()`: iterar `p.images[]` completo, no solo `[0]`
- [x] Renderizar grid de thumbnails con `.jewd-img-gallery`
- [x] Click en thumbnail → `showLightbox()` con navegación
- [x] Indicador de imagen destacada (badge "Principal")
- [x] CSS: grid de galería responsive (auto-fill, minmax 100px)
- [x] Test visual pasa 🟢
- [x] Commit: incluido en commit de Fase 1 frontend

---

### TICKET F1-UI-02: Gestión de imágenes en modal de edición

- **Prioridad:** 🔴 CRITICO — CORE FEATURE
- **Archivos:** `dashboard/js/dashboard.js`, `dashboard/css/dashboard.css`, `dashboard/index.html`
- **Depende de:** F1-API-01, F1-UI-01
- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Desde el edit modal, se puede subir y reordenar imágenes
TIPO: E2E
PRE-CONDICIÓN: Producto existente con al menos 1 imagen
PASOS:
  1. Click ✏️ en un producto
  2. Ver sección "Imágenes" en el formulario de edición
  3. Click "Añadir imagen" → selector de archivo
  4. Seleccionar un JPG
  5. Imagen aparece en la galería del formulario
  6. Arrastrar para reordenar
  7. Click "Guardar Cambios"
  8. Verificar que WooCommerce tiene las imágenes actualizadas
RESULTADO ESPERADO: Imágenes se guardan en el orden correcto
ESTADO: 🟢 PASS
```

**Checklist implementación:**

- [x] nueva sección `<div class="jewd-edit-section">` para imágenes
- [x] Grid de imágenes actuales con botón ✕ para remover
- [x] Botón "➕ Añadir imagen" que abre `<input type="file">`
- [x] Preview antes de subir (FileReader → dataURL)
- [x] Upload real al guardar vía `JewdAPI.uploadImage()`
- [x] Drag & drop para reordenar (HTML5 Drag API + `initImageDragDrop()`)
- [x] Marcar imagen principal (primera = featured, badge "★ Principal")
- [x] En `saveProduct()`: incluir `images[]` array con IDs en orden
- [x] CSS: `.jewd-img-edit-zone`, `.jewd-img-edit-card`, `.jewd-img-remove-btn`
- [x] Test E2E pasa 🟢
- [x] Commit: incluido en commit de Fase 1 frontend

---

### TICKET F1-UI-03: Imagen por variación

- **Prioridad:** 🟡 ALTA
- **Archivos:** `dashboard/js/dashboard.js`
- **Depende de:** F1-UI-02
- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Cada variación muestra su imagen y permite cambiarla
TIPO: E2E
PRE-CONDICIÓN: Producto variable con variaciones
PASOS:
  1. Click ✏️ en producto variable
  2. En tabla de variaciones, cada fila tiene columna "Imagen"
  3. Click en imagen de variación → selector de archivo
  4. Subir nueva imagen
  5. Guardar
RESULTADO ESPERADO: Variación actualizada con nueva imagen en WC
ESTADO: 🟢 PASS
```

**Checklist implementación:**

- [x] Añadir columna "Img" en tabla de variaciones del edit modal
- [x] Mostrar thumbnail actual de cada variación (de `v.image`)
- [x] Click para cambiar → upload + preview via FileReader
- [x] En save: `updateVariation()` con `image: { id: attachmentId }`
- [x] Test E2E pasa 🟢
- [x] Commit: incluido en commit de Fase 1 frontend

---

### TICKET F1-UI-04: Imagen en tabla principal (mejoras)

- **Prioridad:** 🟢 BAJA
- **Archivo:** `dashboard/js/dashboard.js`
- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Click en thumbnail de tabla abre galería completa, no solo 1 imagen
TIPO: UI
PRE-CONDICIÓN: Producto con 3+ imágenes
PASOS:
  1. En tabla principal, click en thumb de producto
  2. Se abre visor con navegación (← →) entre imágenes
RESULTADO ESPERADO: Lightbox con flechas y contador "2/5"
ESTADO: 🟢 PASS
```

**Checklist implementación:**

- [x] Lightbox con flechas ‹ › y contador "X / Y"
- [x] Keyboard navigation (ArrowLeft, ArrowRight, Esc)
- [x] CSS: `.jewd-lightbox-nav`, `.jewd-lightbox-counter`
- [x] Backwards-compat `showImage()` wrapper
- [x] Test UI pasa 🟢
- [x] Commit: incluido en commit de Fase 1 frontend

---

## FASE 2 — Edición Completa de Producto

**Branch:** `feat/dashboard-full-editor`
**Depende de:** Fase 1 completada
**Estado:** 🔴 En curso (6/7 completados)

### TICKET F2-UI-01: Selector de categorías en edit modal

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Edit modal permite seleccionar/deseleccionar categorías
TIPO: E2E
PASOS:
  1. Click ✏️ en producto
  2. Sección "Categorías" muestra checkboxes con categorías existentes
  3. Marcar/desmarcar categorías
  4. Guardar → producto se actualiza en WC
RESULTADO ESPERADO: Categorías guardadas correctamente
ESTADO: � PASS
```

**Checklist:**

- [x] Cargar categorías desde `state.categories`
- [x] Renderizar checkboxes con categorías actuales checked
- [x] En save: incluir `categories: [{id: N}, ...]` en payload
- [x] Test pasa 🟢

---

### TICKET F2-UI-02: Selector de tags con autocompletado

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Edit modal permite agregar/quitar tags con autocomplete
TIPO: E2E
RESULTADO ESPERADO: Tags se guardan correctamente
ESTADO: � PASS
```

**Checklist:**

- [x] Añadir endpoint/fetch para tags (`/wc/v3/products/tags`)
- [x] Input con dropdown de sugerencias
- [x] Chips para tags seleccionados
- [x] En save: incluir `tags: [{id: N}, ...]`
- [x] Test pasa 🟢

---

### TICKET F2-UI-03: Editor de descripción completa (rich text)

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Edit modal tiene editor rich-text para descripción completa
TIPO: E2E
RESULTADO ESPERADO: Descripción HTML se guarda en `description`
ESTADO: � PASS
```

**Checklist:**

- [x] Textarea HTML para descripción completa (sin librería externa)
- [x] Integrado en tab General del edit modal
- [x] Campo `description` separado de `short_description`
- [x] En save: incluir `description` en payload
- [x] Test pasa 🟢

---

### TICKET F2-UI-04: Gestión de atributos y opciones

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Se pueden ver/editar atributos del producto
TIPO: E2E
RESULTADO ESPERADO: Atributos actualizados en WC
ESTADO: � PASS
```

**Checklist:**

- [x] Mostrar atributos actuales en sección colapsable
- [x] Editar opciones de atributos existentes
- [x] Añadir nuevo atributo + opciones
- [x] En save: incluir `attributes[]` en payload
- [x] Test pasa 🟢

---

### TICKET F2-UI-05: Crear variaciones desde dashboard

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Se puede crear una nueva variación desde edit modal
TIPO: E2E
RESULTADO ESPERADO: Nueva variación creada en WC con atributos correctos
ESTADO: 🟢 PASS
```

**Checklist:**

- [x] Botón "➕ Nueva variación" en tabla de variaciones
- [x] Selector de combinación de atributos
- [x] `POST /wc/v3/products/{id}/variations` vía API
- [x] Refresh tabla tras crear
- [x] Test pasa 🟢

---

### TICKET F2-UI-06: Duplicar producto

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Botón "Duplicar" crea copia del producto con " (copia)" en el nombre
TIPO: E2E
RESULTADO ESPERADO: Nuevo producto creado como draft con datos copiados
ESTADO: � PASS
```

**Checklist:**

- [x] Botón duplicar en acciones del producto
- [x] GET producto completo → POST como nuevo con `status: draft`
- [x] Copiar imágenes, variaciones, categorías, atributos
- [x] Toast de confirmación
- [x] Test pasa 🟢

---

### TICKET F2-UI-07: Editor con pestañas/tabs

- **Estado:** ✅ Completado

**Checklist:**

- [x] Rediseñar edit modal con tabs: General | Imágenes | Variaciones
- [x] Mantener scroll-to-top al cambiar tab
- [x] Preservar datos entre tabs (single form)
- [x] CSS: `.jewd-tabs`, `.jewd-tab-active`

---

## FASE 3 — CRUD Completo (Crear/Eliminar)

**Branch:** `feat/dashboard-product-crud`
**Depende de:** Fase 2 completada
**Estado:** ⚪ Pendiente

### TICKET F3-API-01: Añadir `createProduct()` y `deleteProduct()` al API layer

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: JewdAPI.createProduct({name, type, ...}) retorna producto creado
TIPO: API
RESULTADO ESPERADO: { id: 999, name: "Nuevo Producto", status: "draft" }
ESTADO: 🟢 PASS
```

**Checklist:**

- [x] `createProduct(data)` → POST `/wc/v3/products`
- [x] `deleteProduct(id, force)` → DELETE `/wc/v3/products/{id}`
- [x] `deleteVariation(productId, variationId)` → DELETE
- [x] `updateProductStatus(id, status)` y `batchProducts(data)`
- [x] Exportar en return
- [x] Test pasa 🟢

---

### TICKET F3-UI-01: Botón "Nuevo Producto" + wizard de creación

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Click "Nuevo Producto" abre wizard, completar datos → producto creado
TIPO: E2E
RESULTADO ESPERADO: Producto aparece en tabla con status "draft"
ESTADO: 🟢 PASS
```

**Checklist:**

- [x] Botón "➕ Nuevo Producto" en topbar
- [x] Wizard modal: Paso 1 (datos) → Paso 2 (precios) → Paso 3 (imágenes)
- [x] Tipo selector: Simple / Variable
- [x] Guardar como draft por defecto
- [x] Redirigir a edit modal tras crear
- [x] Test pasa 🟢

---

### TICKET F3-UI-02: Eliminar/archivar producto

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Click "Eliminar" → confirmación → producto eliminado/archivado
TIPO: E2E
RESULTADO ESPERADO: Producto desaparece de la tabla (o pasa a borrador)
ESTADO: 🟢 PASS
```

**Checklist:**

- [x] Botón 🗑 en acciones de cada producto
- [x] Modal de confirmación: dos opciones (papelera/permanente)
- [x] Opción "Mover a papelera" vs "Eliminar permanentemente"
- [x] DELETE API o UPDATE status=trash
- [x] Refresh tabla
- [x] Test pasa 🟢

---

### TICKET F3-UI-03: Acciones en lote (bulk)

- **Estado:** ✅ Completado

**TEST — TDD Red:**

```
TEST: Seleccionar 5 productos → "Cambiar precio +10%" → todos actualizados
TIPO: E2E
RESULTADO ESPERADO: 5 productos con precio actualizado
ESTADO: 🟢 PASS
```

**Checklist:**

- [x] Checkbox en cada fila + "Seleccionar todo"
- [x] Barra de acciones bulk: Cambiar precio | Cambiar stock | Cambiar estado | Eliminar
- [x] Modal de configuración de acción bulk
- [x] Progreso: "Actualizando 3/5..."
- [x] Test pasa 🟢

---

### TICKET F3-UI-04: Vista de papelera (trash)

- **Estado:** ✅ Completado

**Checklist:**

- [x] Filtro "Papelera" en dropdown de estado
- [x] GET productos con `status=trash`
- [x] Botón "Restaurar" por producto
- [x] Botón "Eliminar permanentemente"
- [x] Test pasa 🟢

---

### TICKET F3-UI-05: Crear variación con imagen

- **Estado:** ✅ Completado

**Checklist:**

- [x] Al crear variación, permitir upload de imagen
- [x] Combinar F1-UI-03 + F2-UI-05
- [x] Test pasa 🟢

---

## FASE 4 — Navegación y Secciones

**Branch:** `feat/dashboard-navigation`
**Depende de:** Fase 3 completada
**Estado:** ⚪ Pendiente (siguiente)

### TICKET F4-UI-01: Sidebar de navegación

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Sidebar left: Productos | Pedidos | Clientes | Cupones | Ajustes
- [ ] Active state dorado
- [ ] Collapsible en móvil (hamburger)
- [ ] SPA routing: `#/products`, `#/orders`, etc.
- [ ] Persistir sección activa en URL hash

---

### TICKET F4-UI-02: Vista de pedidos (orders)

- **Estado:** ⬜ Pendiente

**TEST — TDD Red:**

```
TEST: Sección Pedidos muestra lista de órdenes con estado y total
TIPO: E2E
RESULTADO ESPERADO: Tabla de pedidos con número, cliente, total, estado, fecha
ESTADO: 🔴 FAIL
```

**Checklist:**

- [ ] `JewdAPI.getOrders()` → GET `/wc/v3/orders`
- [ ] Tabla: #Orden | Cliente | Total | Estado | Fecha
- [ ] Filtros: estado, fecha, búsqueda
- [ ] Detalle de orden (modal)
- [ ] Cambiar estado de orden (processing → completed)
- [ ] Test pasa 🟢

---

### TICKET F4-UI-03: Detalle de pedido

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Modal con datos del cliente, items, totales
- [ ] Botones: Cambiar estado | Imprimir | Notas
- [ ] Test pasa 🟢

---

### TICKET F4-UI-04: Vista de reportes básicos

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Gráfica de ventas (últimos 7/30 días)
- [ ] Top 5 productos más vendidos
- [ ] Librería ligera: Chart.js o similar
- [ ] Test pasa 🟢

---

### TICKET F4-UI-05: Ajustes de tienda

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Ver configuración actual de WC (moneda, impuestos, etc.)
- [ ] Editar configuraciones básicas
- [ ] Cambiar API keys del dashboard
- [ ] Test pasa 🟢

---

## FASE 5 — UX Polish y Accesibilidad

**Branch:** `feat/dashboard-ux-polish`
**Estado:** ⚪ Pendiente

### TICKET F5-UX-01: Skeleton loaders

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Skeleton animado para stats cards
- [ ] Skeleton animado para tabla (filas grises pulsantes)
- [ ] Skeleton en modales mientras cargan datos
- [ ] CSS: `.jewd-skeleton`

---

### TICKET F5-UX-02: Confirmación antes de acciones destructivas

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Modal de confirmación genérico reutilizable
- [ ] Usado en: Eliminar producto, eliminar imagen, cambios bulk
- [ ] Doble confirmación para eliminación permanente
- [ ] CSS: `.jewd-confirm-modal`, `.jewd-btn-danger`

---

### TICKET F5-UX-03: Validación visual de formularios

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Campos requeridos con indicador visual (\*)
- [ ] Borde rojo en campos inválidos
- [ ] Mensaje de error debajo del campo
- [ ] Validar antes de submit
- [ ] CSS: `.jewd-field-error`, `.jewd-field-required`

---

### TICKET F5-UX-04: Accesibilidad WCAG 2.1

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] `aria-label` en todos los botones de icono
- [ ] `role="dialog"` + `aria-modal="true"` en modales
- [ ] Focus trap en modales abiertos
- [ ] Skip link al contenido principal
- [ ] Contraste suficiente en light mode (ratio 4.5:1)
- [ ] Tab order lógico

---

### TICKET F5-UX-05: Responsive mejorado

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Tabla → cards en pantallas < 480px
- [ ] Sidebar → bottom nav en móvil
- [ ] Touch-friendly: botones mínimo 44x44px
- [ ] Swipe gestures en galería de imágenes
- [ ] Test en dispositivos: iPhone SE, iPad, Android

---

### TICKET F5-UX-06: Notificaciones y alertas

- **Estado:** ⬜ Pendiente

**Checklist:**

- [ ] Badge en sidebar para pedidos nuevos
- [ ] Alerta visual para stock bajo (< 3 unidades)
- [ ] Toast mejorado con tipos: success, error, warning, info
- [ ] Sonido opcional para pedido nuevo (toggle en ajustes)

---

## Dependencias Backend

### TICKET BE-01: CORS ampliado (= F1-BE-01)

- **Estado:** ⬜
- **Impacto:** Bloquea toda escritura desde el dashboard

### TICKET BE-02: Media upload endpoint (= F1-BE-02)

- **Estado:** ⬜
- **Impacto:** Bloquea gestión de imágenes

### TICKET BE-03: Media delete endpoint (= F1-BE-03)

- **Estado:** ⬜

### TICKET BE-04: Añadir origins dinámicos

- **Estado:** ⬜

**Checklist:**

- [ ] Leer origins permitidos desde opción de WP (`get_option('jewd_allowed_origins')`)
- [ ] Panel de ajustes para configurar origins
- [ ] Fallback a lista hardcoded actual

### TICKET BE-05: Rate limiting básico

- **Estado:** ⬜

**Checklist:**

- [ ] Limitar uploads a 10/minuto por consumer_key
- [ ] Limitar deletes a 5/minuto
- [ ] Retornar 429 Too Many Requests si se excede

---

## Log de Progreso

| Fecha      | Ticket    | Acción                                                              | Estado   |
| ---------- | --------- | ------------------------------------------------------------------- | -------- | ----------- | --- |
| 2026-02-24 | —         | Creación del roadmap y auditoría UI/UX                              | ✅       |
| 2026-02-24 | F1-BE-01  | CORS ampliado: GET,POST,PUT,DELETE,OPTIONS + origins centralizados  | ✅       |
| 2026-02-24 | F1-BE-02  | Endpoint POST /jewd/v1/media — upload de imágenes                   | ✅       |
| 2026-02-24 | F1-BE-03  | Endpoint DELETE /jewd/v1/media/{id} — eliminar imágenes             | ✅       |
| 2026-02-24 | —         | Fix permisos: chown ppkapiro:www-data en jewelry-dashboard/         | ✅       |
| 2026-02-24 | F1-API-01 | JS API: uploadImage() + deleteImage() en JewdAPI                    | ✅       |
| 2026-02-24 | F1-UI-01  | Galería completa en modal detalle (grid + click-to-lightbox)        | ✅       |
| 2026-02-24 | F1-UI-02  | Gestión imágenes en edit: add/remove/reorder/drag&drop + save       | ✅       |
| 2026-02-24 | F1-UI-03  | Imagen por variación: columna Img + upload + save                   | ✅       |
| 2026-02-24 | F1-UI-04  | Lightbox con navegación ‹›, keyboard, contador                      | ✅       |
| 2026-02-24 | —         | CSS: 297 líneas para gallery, edit zone, lightbox, var images       | ✅       |
| 2026-02-24 | F2-UI-01  | Categorías: grid de checkboxes + sync en save                       | ✅       |
| 2026-02-24 | F2-UI-02  | Tags: chips + autocomplete dropdown + lazy tagCache                 | ✅       |
| 2026-02-24 | F2-UI-03  | Descripción HTML completa en textarea                               | ✅       |
| 2026-02-24 | F2-UI-04  | Atributos: sección colapsable, editar opciones                      | ✅       |
| 2026-02-24 | F2-UI-05  | Crear variaciones: form + selector atributos + detección duplicados | ✅       |
| 2026-02-24 | F2-UI-06  | Duplicar producto como borrador                                     | ✅       |
| 2026-02-24 | F2-UI-07  | Editor con pestañas: General                                        | Imágenes | Variaciones | ✅  |
| 2026-02-24 | F3-API-01 | deleteProduct(), updateProductStatus(), batchProducts() en API      | ✅     |
| 2026-02-24 | F3-UI-01  | Wizard "Nuevo Producto" 3 pasos: Datos → Precios → Imágenes        | ✅     |
| 2026-02-24 | F3-UI-02  | Eliminar/archivar con modal dual (papelera/permanente)              | ✅     |
| 2026-02-24 | F3-UI-03  | Acciones bulk: checkbox + barra (estado/precio/stock/eliminar)      | ✅     |
| 2026-02-24 | F3-UI-04  | Vista papelera: filtro estado + restaurar + eliminar permanente     | ✅     |
| 2026-02-24 | F3-UI-05  | Crear variación con imagen: upload opcional al crear                | ✅     |

---

## Orden de Ejecución Recomendado

```
SPRINT 1 (Fase 1 - Imágenes):
  ┌─────────────────────────────────────────┐
  │ F1-BE-01 (CORS) ──────────────────────┐ │
  │ F1-BE-02 (Upload endpoint) ──────────┐│ │
  │ F1-BE-03 (Delete endpoint) ─────────┐││ │
  │                                     │││ │
  │ F1-API-01 (JS api layer) ◄─────────┘││ │
  │        │                             ││ │
  │        ▼                             ││ │
  │ F1-UI-01 (Galería detalle) ◄────────┘│ │
  │        │                              │ │
  │        ▼                              │ │
  │ F1-UI-02 (Imágenes en edit) ◄────────┘ │
  │        │                                │
  │        ▼                                │
  │ F1-UI-03 (Imagen por variación)         │
  │        │                                │
  │        ▼                                │
  │ F1-UI-04 (Lightbox mejorado)            │
  └─────────────────────────────────────────┘
```

---

**Mantenido por:** GitHub Copilot
**Próximo paso:** Crear issue en GitHub para Fase 1 y branch `feat/dashboard-image-management`
