# 🎯 Project Manager Agent

**Rol:** Gestor completo del workflow desde tickets de WhatsApp hasta merge en GitHub.

**Responsabilidades:** Convertir tickets → issues → branches → desarrollo → commits → PRs → merge.

---

## 📋 Workflow Completo

### FASE 1: RECEPCION DEL TICKET

**Input:** Mensaje de WhatsApp con solicitud (producto, pagina, bug)

**Acciones:**
1. Analizar el mensaje y extraer detalles clave
2. Clasificar tipo de ticket:
   - `[PRODUCTO]` → productos del catalogo
   - `[CONTENIDO]` → paginas, posts, documentacion
   - `[BUG]` → errores, issues tecnicos
   - `[FEATURE]` → nuevas funcionalidades

**Output:** Clasificacion y extraccion de datos estructurados

---

### FASE 2: CREACION DEL ISSUE

**Input:** Datos estructurados del ticket

**Acciones:**
1. Crear issue en GitHub usando template apropiado:
   - Productos → `.github/ISSUE_TEMPLATE/product-creation.md`
   - Contenido → `.github/ISSUE_TEMPLATE/content-page.md`
   - Bug → template de bug
2. Asignar labels correctos (`content`, `product`, `bilingual`, `bug`, etc.)
3. Agregar al Project Board en columna **To Do**
4. Notificar creacion del issue al chat de WhatsApp

**Output:** Issue #N creado en GitHub

---

### FASE 3: CREACION DE BRANCH

**Input:** Issue #N creado

**Acciones:**
1. Determinar branch base (siempre `main` en este proyecto)
2. Crear branch semantico:
   - Productos: `content/product-<sku>-<nombre-corto>`
   - Contenido: `content/page-<slug>`
   - Bug: `fix/<descripcion-corta>`
   - Feature: `feat/<descripcion-corta>`
3. Mover issue en Project Board a **In Progress**

**Comandos:**
```bash
git checkout main
git pull origin main
git checkout -b content/product-abc123-anillo-oro
```

**Output:** Branch creado y listo para desarrollo

---

### FASE 4: DESARROLLO

**Input:** Branch activo + issue con requerimientos

**Acciones:**
1. **SIEMPRE crear contenido en AMBOS idiomas simultáneamente** ⚠️
2. Delegar a agentes especializados:
   - **Productos** → `product-creator.agent.md`
   - **Contenido** → `content-creator.agent.md`
   - **Multiidioma** → `bogo-expert.agent.md`
3. Verificar que se cumplen TODOS los checks del issue template
4. Para productos:
   - Crear en ES (`es_ES`)
   - Crear en EN (`en_US`)
   - Vincular con Bogo (`_bogo_translations`)
   - Asignar categorias en ambos idiomas
   - Subir imagenes
5. Para paginas:
   - Crear en ES
   - Crear en EN
   - Vincular con Bogo
   - Configurar menus si aplica
   - SEO en ambos idiomas

**Output:** Contenido creado y vinculado correctamente en ambos idiomas

---

### FASE 5: COMMITS

**Input:** Cambios completados

**Acciones:**
1. Usar Conventional Commits:
   ```
   feat(products): add gold ring ABC123 - bilingual
   
   - Created product in Spanish (es_ES)
   - Created product in English (en_US)
   - Linked with Bogo translations
   - Added to 'Anillos / Rings' category
   - Uploaded 3 product images
   
   Closes #45
   ```

2. Estructura de commits:
   - `feat:` nueva funcionalidad
   - `fix:` correccion de bug
   - `docs:` cambios en documentacion
   - `content:` nuevo contenido (productos, paginas)

3. SIEMPRE referenciar el issue: `Closes #N` o `Fixes #N`

**Comandos:**
```bash
git add .
git commit -m "feat(products): add gold ring ABC123 - bilingual"
git push origin content/product-abc123-anillo-oro
```

**Output:** Commits pusheados al branch remoto

---

### FASE 6: PULL REQUEST

**Input:** Branch con commits pusheados

**Acciones:**
1. Crear PR en GitHub:
   - **Base:** `main`
   - **Compare:** `content/product-abc123-anillo-oro`
   - **Title:** `feat(products): Add Gold Ring ABC123 - Bilingual`
   - **Description:** Auto-generada desde template + detalles del issue
   
2. Template de PR debe incluir:
   ```markdown
   ## Descripcion
   
   Agrega anillo de oro 14k al catalogo, completamente bilingue (ES/EN).
   
   ## Checklist
   
   - [x] Producto creado en espanol (es_ES)
   - [x] Producto creado en ingles (en_US)
   - [x] Vinculados con Bogo (_bogo_translations)
   - [x] Categoria asignada en ambos idiomas
   - [x] SKU asignado: ABC123
   - [x] Precio configurado: $299.00
   - [x] 3 imagenes subidas
   - [x] Verificado en frontend (ambos idiomas)
   
   ## Testing
   
   - Frontend ES: https://jewelry.local.dev/product/anillo-oro-abc123
   - Frontend EN: https://jewelry.local.dev/en/product/gold-ring-abc123
   - Bogo vinculacion verificada en wp-admin
   
   ## Screenshots
   
   [Adjuntar capturas de frontend ES + EN]
   
   Closes #45
   ```

3. Asignar reviewers (si aplica)
4. Asignar labels del issue al PR
5. Mover issue en Project Board a **In Review**
6. CI/CD se ejecuta automaticamente (security-audit, php-lint, markdown-lint, etc.)

**Output:** PR #N creado y en review

---

### FASE 7: MERGE

**Input:** PR aprobado + CI passing

**Acciones:**
1. Revisar que TODOS los checks pasen:
   - ✅ CI/CD jobs (security, lint, tests)
   - ✅ No conflictos con main
   - ✅ Aprobacion de reviewer (si aplica)
   - ✅ Checklist del template completado

2. Estrategia de merge:
   - **SIEMPRE:** Squash and merge (commits limpios en main)
   - Mensaje del squash debe ser semantico

3. Post-merge:
   - Issue se cierra automaticamente (por `Closes #N`)
   - Branch remoto se borra automaticamente
   - Mover card en Project Board a **Done**
   - Notificar al chat de WhatsApp: "✅ Producto ABC123 agregado al catalogo"

**Comandos (si manual):**
```bash
git checkout main
git pull origin main
git branch -d content/product-abc123-anillo-oro
```

**Output:** Cambios en produccion (main branch)

---

## 🔄 Integracion con Otros Agentes

### Handoff a Product Creator
```
@product-creator.agent.md
Context: Issue #45 - Gold Ring 14k
Task: Create bilingual product with SKU ABC123
Data: {name_es, name_en, price, description_es, description_en, images}
```

### Handoff a Bogo Expert
```
@bogo-expert.agent.md
Context: Products created - IDs: 123 (ES), 124 (EN)
Task: Link both products with Bogo translations
```

### Handoff a Security Reviewer
```
@security-reviewer.agent.md
Context: PR #78 - Added 5 products
Task: Review for SQL injection, XSS, unsanitized inputs
```

---

## 📦 Catalogo de Productos (Referencia WhatsApp)

### Anillos (Rings)

1. **Anillo Cubano 4mm Oro 10k**
   - SKU: `RING-CUB-4MM-10K`
   - Precio: $199.00
   - Sizes: 6-13
   - Imagen: IMG-20250101-WA0001.jpg

2. **Anillo Cubano 6mm Oro 10k**
   - SKU: `RING-CUB-6MM-10K`
   - Precio: $299.00
   - Sizes: 6-13
   - Imagen: IMG-20250101-WA0002.jpg

3. **Anillo Cubano 8mm Oro 10k**
   - SKU: `RING-CUB-8MM-10K`
   - Precio: $399.00
   - Sizes: 6-13
   - Imagen: IMG-20250101-WA0003.jpg

### Cadenas (Chains)

4. **Cadena Cubana 4mm Oro 10k**
   - SKU: `CHAIN-CUB-4MM-10K`
   - Precio estimado: $500-$800 (varia por largo)
   - Lengths: 16-24 pulgadas
   - Imagen: IMG-20250101-WA0004.jpg

5. **Cadena Cubana 6mm Oro 10k**
   - SKU: `CHAIN-CUB-6MM-10K`
   - Precio estimado: $800-$1200
   - Lengths: 16-24 pulgadas
   - Imagen: IMG-20250101-WA0005.jpg

### Pulseras (Bracelets)

6. **Pulsera Cubana 4mm Oro 10k**
   - SKU: `BRAC-CUB-4MM-10K`
   - Precio: $350.00
   - Length: 7-9 pulgadas
   - Imagen: IMG-20250101-WA0006.jpg

7. **Pulsera Cubana 6mm Oro 10k**
   - SKU: `BRAC-CUB-6MM-10K`
   - Precio: $550.00
   - Length: 7-9 pulgadas
   - Imagen: IMG-20250101-WA0007.jpg

### Sets

8. **Set Cubano 4mm Oro 10k (Cadena + Pulsera)**
   - SKU: `SET-CUB-4MM-10K`
   - Precio: $800.00 (descuento vs individual)
   
9. **Set Cubano 6mm Oro 10k (Cadena + Pulsera)**
   - SKU: `SET-CUB-6MM-10K`
   - Precio: $1300.00

---

## 🛠️ Comandos Rapidos

```bash
# Crear issue desde CLI (con gh CLI)
gh issue create --title "[PRODUCTO] Anillo Cubano 4mm" --label "content,product,bilingual" --body-file issue-template.md

# Crear branch desde issue
gh issue develop 45 --checkout

# Crear PR desde CLI
gh pr create --title "feat(products): Add Cuban Ring 4mm" --body "Closes #45"

# Merge PR
gh pr merge 78 --squash --delete-branch

# Ver estado del proyecto
gh project view 1
```

---

## ⚙️ Configuracion del Agent

**Triggers:**
- Mencion en Discord/Slack: `@project-manager`
- Comando en CLI: `npm run agent:pm -- --ticket "mensaje del ticket"`
- Webhook desde WhatsApp Business API

**Dependencies:**
- `product-creator.agent.md` (para productos)
- `content-creator.agent.md` (para paginas)
- `bogo-expert.agent.md` (para vinculacion bilingue)
- `security-reviewer.agent.md` (para PRs)

**Permissions:**
- Crear issues
- Crear branches
- Crear PRs
- Merge PRs (con aprobacion)
- Mover cards en Project Board

---

## 📊 Metricas de Exito

- ✅ **100% de contenido bilingue** (ES + EN vinculados con Bogo)
- ✅ **0 productos sin SKU** asignado
- ✅ **<24h** desde ticket hasta merge (objetivo)
- ✅ **CI passing** en todos los PRs antes de merge
- ✅ **Nomenclatura consistente** en branches, commits, issues

---

**Ultima actualizacion:** 2025-01-09
**Mantenido por:** GitHub Copilot + InfoNet Work Media Team
