# Custom Agents - Jewelry Project

Agentes personalizados de GitHub Copilot para desarrollo eficiente del sitio Jewelry Miami.

## Agentes Disponibles

### 1. **Product Creator**

**Archivo:** `product-creator.agent.md`
**Especialidad:** Crear productos WooCommerce (simples y variables)

**Cuándo usar:**
- Crear productos simples o variables con variaciones
- Gestionar atributos globales (ancho, largo, talla)
- Actualizar precios masivamente
- Gestionar categorías de productos

**Ejemplo:**
```
@product-creator Crea un producto de cadena cubana 10k de 6mm por $499
```

**Handoffs:** → TranslatePress Expert, → Security Reviewer

---

### 2. **Page Builder**

**Archivo:** `page-builder.agent.md`
**Especialidad:** Crear páginas WordPress con Elementor + Astra

**Cuándo usar:**
- Crear páginas About Us, Materials, Contact
- Páginas legales (Privacy, Terms)
- Páginas con Elementor o Gutenberg

**Ejemplo:**
```
@page-builder Crea la página "Nosotros" con contenido sobre Jewelry Miami
```

**Handoffs:** → TranslatePress Expert, → Product Creator

---

### 3. **TranslatePress Expert**

**Archivo:** `translatepress-expert.agent.md`
**Especialidad:** Gestionar traducciones bilingües con TranslatePress

**Cuándo usar:**
- Verificar contenido sin traducir
- Diagnosticar problemas de traducción
- Consultar tablas `wp_trp_*`
- Configurar el editor de traducción

**Ejemplo:**
```
@translatepress-expert Busca todo el contenido sin traducción al inglés
@translatepress-expert ¿Por qué esta página no se traduce?
```

**Handoffs:** → Product Creator, → Page Builder

---

### 4. **WooCommerce Expert**

**Archivo:** `woocommerce-expert.agent.md`
**Especialidad:** Configuración y personalización WooCommerce

**Cuándo usar:**
- Emails bilingües de WooCommerce
- Campos personalizados en checkout
- Configurar categorías y atributos
- Personalizar hooks y filtros
- Configuración de pagos

**Ejemplo:**
```
@woocommerce-expert Configura emails para enviar en el idioma del cliente
@woocommerce-expert Agrega un campo "mensaje de regalo" en el checkout
```

**Handoffs:** → Product Creator, → Security Reviewer, → TranslatePress Expert

---

### 5. **Security Reviewer**

**Archivo:** `security-reviewer.agent.md`
**Especialidad:** Revisar y corregir seguridad de código

**Cuándo usar:**
- Revisar código antes de producción
- Detectar vulnerabilidades XSS, SQL Injection, CSRF
- Validar sanitización y escape
- Auditar permisos
- **Puede editar archivos** para aplicar correcciones

**Ejemplo:**
```
@security-reviewer Revisa este código por vulnerabilidades
@security-reviewer Audita la seguridad del child theme
```

---

### 6. **Database Manager**

**Archivo:** `database-manager.agent.md`
**Especialidad:** Base de datos, Docker y WP-CLI

**Cuándo usar:**
- Backups y restauración de base de datos
- Ejecutar comandos WP-CLI en Docker
- Optimizar/reparar tablas
- Búsqueda y reemplazo en DB

**Ejemplo:**
```
@database-manager Crea un backup de la base de datos
@database-manager Lista todos los productos con WP-CLI
```

---

### 7. **Project Manager**

**Archivo:** `project-manager.agent.md`
**Especialidad:** Workflow completo de tickets → merge

**Cuándo usar:**
- Convertir tickets en issues de GitHub
- Crear branches con nomenclatura correcta
- Gestionar PRs con checklists
- Coordinar entre agentes especializados

**Ejemplo:**
```
@project-manager Crea un issue para agregar 5 productos nuevos al catálogo
@project-manager Revisa el estado del proyecto
```

**Handoffs:** → Product Creator, → Page Builder, → TranslatePress Expert, → Security Reviewer

---

## Workflow Recomendado

**Para crear un producto completo:**
1. `@product-creator` — Crear producto con variaciones
2. `@translatepress-expert` — Verificar/traducir al inglés
3. `@security-reviewer` — Validar código generado

**Para crear una página:**
1. `@page-builder` — Crear página con Elementor
2. `@translatepress-expert` — Traducir al inglés

---

## Stack del Proyecto

| Componente | Versión |
|-----------|---------|
| WordPress | 6.9.1 |
| WooCommerce | 10.5.1 |
| Tema | Astra 4.12.3 |
| Page Builder | Elementor 3.35.4 |
| Multiidioma | **TranslatePress 3.0.9** |
| Infraestructura | Docker + Traefik |
| PHP | 8.1+ |
| MySQL | 8.0 |

**IMPORTANTE:** El multiidioma se gestiona con **TranslatePress** (NO Bogo, NO WPML, NO Polylang). Una sola instancia de contenido, traducciones en tablas `wp_trp_*`.

---

## Ubicación de Archivos

```
.github/
└── agents/
    ├── product-creator.agent.md         # Crear productos
    ├── page-builder.agent.md            # Crear páginas
    ├── translatepress-expert.agent.md   # Traducción bilingüe
    ├── woocommerce-expert.agent.md      # Config WooCommerce
    ├── security-reviewer.agent.md       # Seguridad
    ├── database-manager.agent.md        # Base de datos
    ├── project-manager.agent.md         # Gestión de proyecto
    └── README.md                        # Este archivo
```

---

## Herramientas (Tools) por Agente

| Agente | editFiles | runCommands | codebase | readFile | problems | fetchWebpage | githubRepo |
|--------|-----------|-------------|----------|----------|----------|-------------|------------|
| Product Creator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Page Builder | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| TranslatePress Expert | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| WooCommerce Expert | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Security Reviewer | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| Database Manager | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| Project Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Todos los agentes pueden editar archivos y ejecutar comandos en terminal.**

---

**Creado:** 2026-02-10 | **Actualizado:** 2026-02-18
**Proyecto:** Jewelry Miami (WordPress + WooCommerce Bilingüe)
