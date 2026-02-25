```chatagent
# Custom Agents - Tu Joyita Miami

Agentes personalizados de GitHub Copilot para desarrollo eficiente del sitio Tu Joyita Miami.

## Agentes Disponibles

### 1. **Product Creator**

**Archivo:** `product-creator.agent.md`
**Especialidad:** Crear productos WooCommerce (simples y variables)

**Cuándo usar:**
- Crear productos simples o variables con variaciones
- Gestionar atributos globales (ancho, largo, talla)
- Actualizar precios masivamente
- Gestionar categorías de productos

**Ejemplo:** `@product-creator Crea un producto de cadena cubana 10k de 6mm por $499`

**Handoffs:** → TranslatePress Expert, → Security Reviewer

---

### 2. **Page Builder**

**Archivo:** `page-builder.agent.md`
**Especialidad:** Crear páginas WordPress con Elementor + Astra

**Cuándo usar:**
- Crear páginas About Us, Materials, Contact
- Páginas legales (Privacy, Terms)
- Páginas con Elementor o Gutenberg

**Ejemplo:** `@page-builder Crea la página "Nosotros" con contenido sobre Tu Joyita Miami`

**Handoffs:** → TranslatePress Expert, → Product Creator

---

### 3. **TranslatePress Expert**

**Archivo:** `translatepress-expert.agent.md`
**Especialidad:** Gestionar traducciones bilingües con TranslatePress 3.0.9

**Cuándo usar:**
- Verificar contenido sin traducir
- Diagnosticar problemas de traducción
- Consultar tablas `wp_trp_*`
- Configurar el editor de traducción

**Ejemplo:** `@translatepress-expert Busca todo el contenido sin traducción al inglés`

**Handoffs:** → Product Creator, → Page Builder

---

### 4. **WooCommerce Expert**

**Archivo:** `woocommerce-expert.agent.md`
**Especialidad:** Configuración y personalización WooCommerce 10.5.1

**Cuándo usar:**
- Emails bilingües de WooCommerce
- Campos personalizados en checkout
- Configurar categorías y atributos
- Personalizar hooks y filtros
- Dashboard SPA (API REST)

**Ejemplo:** `@woocommerce-expert Configura emails para enviar en el idioma del cliente`

**Handoffs:** → Product Creator, → Security Reviewer, → TranslatePress Expert

---

### 5. **Security Reviewer**

**Archivo:** `security-reviewer.agent.md`
**Especialidad:** Revisar y corregir seguridad de código

**Cuándo usar:**
- Revisar código antes de producción
- Detectar vulnerabilidades XSS, SQL Injection, CSRF
- Validar sanitización y escape
- Auditar permisos y roles (administrator, jewelry_manager, jewelry_seller, jewelry_viewer)

**Ejemplo:** `@security-reviewer Audita la seguridad del dashboard`

---

### 6. **Database Manager**

**Archivo:** `database-manager.agent.md`
**Especialidad:** Base de datos LOCAL y PRODUCCIÓN, Docker y WP-CLI

**Cuándo usar:**
- Backups y restauración de base de datos
- Ejecutar comandos WP-CLI en Docker
- Verificar aislamiento entre entornos (jewelry_db ≠ tujoyita_db)
- Optimizar/reparar tablas

**Ejemplo:** `@database-manager Crea un backup de ambas bases de datos`

---

### 7. **Project Manager**

**Archivo:** `project-manager.agent.md`
**Especialidad:** Workflow completo de tickets → merge → deploy

**Cuándo usar:**
- Convertir tickets en issues de GitHub (`tujoyitamiami-cpu/tujoyita`)
- Crear branches con nomenclatura correcta
- Gestionar PRs con checklists
- Coordinar entre agentes especializados

**Ejemplo:** `@project-manager Crea un issue para agregar 5 productos nuevos al catálogo`

**Handoffs:** → Product Creator, → Page Builder, → TranslatePress Expert, → Security Reviewer, → Deployment Specialist

---

### 8. **Deployment Specialist** 🚀

**Archivo:** `deployment-specialist.agent.md`
**Especialidad:** Deploy, rollback, health checks entre LOCAL y PRODUCCIÓN

**Cuándo usar:**
- Desplegar código a producción (VPS Hetzner)
- Verificar estado de producción
- Ejecutar rollback de emergencia
- Diagnosticar problemas de deploy (401, DNS, SSL)
- Verificar aislamiento de entornos

**Ejemplo:** `@deployment-specialist Despliega los últimos cambios a producción`

**Datos clave:**
- VPS: Hetzner 89.167.101.209
- SSH: `ssh tujoyita-prod` (User: root, Key: ~/.ssh/id_ed25519)
- Deploy: `./scripts/deploy-agent.sh --force`
- Producción: `/srv/stacks/tujoyita/`
- Local: `/srv/stacks/jewelry/`

---

## Workflow Recomendado

**Para crear un producto completo:**
1. `@product-creator` — Crear producto con variaciones
2. `@translatepress-expert` — Verificar/traducir al inglés
3. `@security-reviewer` — Validar código generado
4. `@deployment-specialist` — Desplegar a producción

**Para crear una página:**
1. `@page-builder` — Crear página con Elementor
2. `@translatepress-expert` — Traducir al inglés
3. `@deployment-specialist` — Desplegar

**Para corregir un bug:**
1. `@database-manager` — Diagnosticar con WP-CLI
2. `@security-reviewer` — Validar fix
3. `@deployment-specialist` — Desplegar fix

---

## Stack del Proyecto

| Componente | Versión |
|-----------|---------|
| WordPress | 6.9.1 |
| WooCommerce | 10.5.1 |
| Tema | **Astra 4.12.3** (NO Kadence) |
| Page Builder | Elementor 3.35.4 |
| Multiidioma | **TranslatePress 3.0.9** (NO Bogo, NO WPML, NO Polylang) |
| Infraestructura | Docker + Traefik |
| PHP | 8.1+ |
| MySQL | 8.0 |

## Repositorios

| Remote | Repo | Propósito |
|--------|------|-----------|
| `origin` | `tujoyitamiami-cpu/tujoyita` | Principal |
| `infonetwork` | `infonetwokmedia-bot/Jewelry` | Mirror |
| `ppkapiro` | `ppkapiro/Jewelry` | Fork personal |

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
    ├── database-manager.agent.md        # Base de datos (local + prod)
    ├── project-manager.agent.md         # Gestión de proyecto
    ├── deployment-specialist.agent.md   # Deploy y producción
    └── README.md                        # Este archivo
```

---

## Herramientas (Tools) por Agente

| Agente | editFiles | runCommands | codebase | readFile | fetchWebpage | githubRepo |
|--------|-----------|-------------|----------|----------|-------------|------------|
| Product Creator | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Page Builder | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| TranslatePress Expert | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| WooCommerce Expert | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Security Reviewer | ✅ | ✅ | ✅ | ✅ | - | - |
| Database Manager | ✅ | ✅ | ✅ | ✅ | - | - |
| Project Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Deployment Specialist | ✅ | ✅ | ✅ | ✅ | ✅ | - |

---

**Creado:** 2026-02-10 | **Actualizado:** 2026-02-25
**Proyecto:** Tu Joyita Miami (WordPress + WooCommerce Bilingüe)
```
