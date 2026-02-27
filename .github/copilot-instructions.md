# GitHub Copilot Instructions - Tu Joyita Miami

## Contexto del Proyecto

Sitio web **bilingue (Espanol/Ingles)** para **Tu Joyita Miami** en Miami, Florida. Ecommerce de joyas de alta calidad con WordPress + WooCommerce.

### Stack Tecnologico

- **CMS:** WordPress 6.9.1
- **E-commerce:** WooCommerce 10.5.1
- **Tema:** Astra 4.12.3 (gratuito) — **NO Kadence**
- **Page Builder:** Elementor 3.35.4
- **Multiidioma:** TranslatePress 3.0.9 — **NO Bogo, NO Polylang, NO WPML**
- **Infraestructura:** Docker + Traefik
- **PHP:** 8.1+ | **MySQL:** 8.0 | **Apache**

---

## Arquitectura: DOS Entornos Aislados

### Entorno LOCAL (desarrollo)

| Componente | Valor |
|-----------|-------|
| Servidor | Dell Server, IP 192.168.12.233 |
| Path | `/srv/stacks/jewelry/` |
| Compose | `docker-compose.yml` |
| WordPress | `jewelry_wordpress` → https://tujoyita.local (LAN) |
| Dashboard | `jewelry_dashboard` → https://dev.tujoyita.com/dashboard/ |
| MySQL | `jewelry_mysql` → DB: `jewelry_db` / User: `jewelry_user` |
| phpMyAdmin | `jewelry_phpmyadmin` → https://phpmyadmin.jewelry.local.dev |
| Acceso remoto | Cloudflare Tunnel → https://dev.tujoyita.com |
| Red Docker | `jewelry_network` |

### Entorno PRODUCCION

| Componente | Valor |
|-----------|-------|
| Servidor | Hetzner VPS, IP 89.167.101.209 |
| Path | `/srv/stacks/tujoyita/` |
| Compose | `docker-compose.production.yml` |
| WordPress | `tujoyita_wordpress` → https://tujoyita.com |
| Dashboard | `tujoyita_dashboard` → https://tujoyita.com/dashboard/ |
| MySQL | `tujoyita_mysql` → DB: `tujoyita_db` / User: `tujoyita_user` |
| DNS | Cloudflare proxy → 89.167.101.209 |
| SSL | Let's Encrypt (Traefik auto-renewal) |
| SSH | `ssh tujoyita-prod` (User: root, Key: ~/.ssh/id_ed25519) |
| Red Docker | `tujoyita_internal` |

### REGLA CRITICA: Aislamiento Total

```
jewelry_db (local) ≠ tujoyita_db (produccion)
El deploy SOLO copia codigo. NUNCA toca la DB de produccion.
NUNCA redirigir DNS de tujoyita.com al servidor local.
```

---

## Repositorios GitHub

| Remote | Repo | Proposito |
|--------|------|-----------|
| `origin` | `tujoyitamiami-cpu/tujoyita` | Repositorio principal |
| `infonetwork` | `infonetwokmedia-bot/Jewelry` | Mirror (read-only) |
| `ppkapiro` | `ppkapiro/Jewelry` | Fork personal |

---

## REGLA FUNDAMENTAL: CONTENIDO BILINGUE

**CRITICO: TranslatePress 3.0.9 — NO Bogo**

- **Espanol (es_ES)** - Idioma principal (URL base: `/`)
- **English (en_US)** - Idioma secundario (URL: `/en/`)
- **NO se duplican posts/paginas/productos.** UNA sola instancia.
- Traducciones en tablas `wp_trp_*` (NO `_bogo_translations`).
- Se traduce visualmente: `?trp-edit-translation=true`.
- URLs en ingles: `/en/shop/`, `/en/about-us/`.

---

## Dashboard SPA (Single Page Application)

El dashboard es una SPA vanilla JS que consume la API REST de WooCommerce.

### Archivos del Dashboard

| Archivo | Proposito |
|---------|-----------|
| `dashboard/index.html` | HTML principal (cache buster en assets) |
| `dashboard/.env.js` | Config LOCAL (gitignored, NO en Git) |
| `dashboard/.env.production.js` | Config PRODUCCION (NO en Git, solo en VPS) |
| `dashboard/js/auth.js` | Autenticacion JWT + roles |
| `dashboard/js/api.js` | Capa API WooCommerce REST |
| `dashboard/js/dashboard.js` | App principal |
| `dashboard/js/pos.js` | Punto de Venta v2.0 |
| `dashboard/js/users.js` | Gestion de usuarios |
| `dashboard/css/dashboard.css` | Estilos |

### Roles del Dashboard

- `administrator` — Acceso total
- `shop_manager` — Gestion completa de tienda (WooCommerce built-in, equivale a jewelry_manager)
- `jewelry_seller` — Solo vender (POS, sus propios pedidos)
- `jewelry_viewer` — Solo lectura

### CRITICO: Separacion de .env.js

```
LOCAL:      dashboard/.env.js             → ck_c49fbfdf... (jewelry_db)
PRODUCCION: dashboard/.env.production.js  → ck_28bdb990... (tujoyita_db)
```

El deploy EXCLUYE ambos archivos. En produccion se usa `cp .env.production.js .env.js`.

---

## Deployment

### Comando principal

```bash
./scripts/deploy-agent.sh --force    # Deploy completo
./scripts/deploy-agent.sh --check    # Solo verificar
./scripts/deploy-agent.sh --status   # Estado produccion
./scripts/deploy-agent.sh --rollback # Rollback
```

### Que se despliega

- `mu-plugins/jewelry-*.php` — Plugins custom
- `dashboard/` — SPA (excluye .env.js y .env.production.js)
- `docker-compose.production.yml` — Stack config
- `scripts/` — Automatizacion

### Que NUNCA se toca

- Base de datos de produccion
- `.env` de produccion
- `.env.js` / `.env.production.js` en produccion
- Plugins terceros (WooCommerce, Elementor, TranslatePress)
- Uploads/media
- DNS de tujoyita.com

---

## WP-CLI

```bash
# Local
docker exec jewelry_wordpress php /var/www/html/wp-cli.phar [COMANDO] --allow-root

# Produccion (via SSH)
ssh tujoyita-prod "cd /srv/stacks/tujoyita && docker exec tujoyita_wordpress php /var/www/html/wp-cli.phar [COMANDO] --allow-root"
```

---

## Reglas de Desarrollo

### 1. Prefijos y Nomenclatura

- Prefijo `jewelry_` para funciones PHP custom
- snake_case para funciones: `jewelry_get_products()`
- kebab-case para hooks: `jewelry-custom-hook`
- PascalCase para clases: `Jewelry_Product_Manager`

### 2. WordPress Coding Standards

- 4 espacios (no tabs) para PHP
- Comillas simples para strings PHP
- PHPDoc en funciones

### 3. Seguridad

SIEMPRE sanitizar, validar, usar nonces, escapar salida.

### 4. Base de Datos

NUNCA SQL directo — usar WP_Query, get_posts(), WPDB abstraction.

### 5. Funciones Custom

Usar mu-plugins (prefijo `jewelry-`):
- `data/wordpress/wp-content/mu-plugins/jewelry-roles.php` — Custom roles & capabilities, order stats sync
- `data/wordpress/wp-content/mu-plugins/jewelry-auth.php` — JWT token auth, Bearer extraction, WC API key auth
- `data/wordpress/wp-content/mu-plugins/jewelry-api-users.php` — Users REST API (CRUD), role listing, user formatting
- `data/wordpress/wp-content/mu-plugins/jewelry-api-sales.php` — Sales REST API (stats, by-seller, today)
- `data/wordpress/wp-content/mu-plugins/jewelry-security.php` — XML-RPC off, version hiding, rate limiting
- `data/wordpress/wp-content/mu-plugins/jewelry-dev-domain.php` — Domain mirroring local/public
- `data/wordpress/wp-content/mu-plugins/jewelry-gold-prices.php` — MetalPriceAPI integration
- `data/wordpress/wp-content/mu-plugins/jewelry-image-optimization.php` — WebP conversion, lazy loading

NO modificar archivos core de Astra, Elementor, WooCommerce.

---

## Formato de Commits

Conventional Commits: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

## ANTI-REGRESION: Lecciones Aprendidas (CRITICO)

### Incidentes Documentados

Estas regresiones ocurrieron en produccion. Las pruebas automatizadas en
`tests/regression/` previenen que se repitan. **SIEMPRE ejecutar** antes de deploy.

#### REG-001: ReferenceError openLightbox (2026-02-27)

**Que paso:** `products.js` exportaba `J.openLightbox = openLightbox` pero la funcion
se llamaba `showLightbox`. El ReferenceError crasheaba el bundle COMPLETO antes de que
`app.js` pudiera registrar el `addEventListener('submit')` del login. Resultado: login
100% roto, credenciales visibles en URL (GET en vez de POST).

**Causa raiz:** Typo durante modularizacion. esbuild NO detecta ReferenceErrors en
modo concatenacion global-scope.

**Regla permanente:**
- **NUNCA** asignar `J.xxx = nombreFuncion` sin verificar que `nombreFuncion` existe
  con exactamente ese nombre en el mismo archivo.
- Despues de CUALQUIER cambio en `dashboard/js/*.js`, ejecutar:
  `node --check dashboard/js/ARCHIVO.js` para sintaxis.
- Ejecutar `bash tests/regression/run-tests.sh` que verifica TODOS los exports.

#### REG-002: Service Worker sirviendo bundle viejo (2026-02-27)

**Que paso:** El SW tenia `PRECACHE_ASSETS` con paths de modulos individuales
(`/dashboard/js/auth.js`, etc.) que NO existen en produccion (produccion usa
`dist/bundle.min.js`). Ademas, `CACHE_NAME` no se actualizo, asi que el SW
servia el bundle roto del cache incluso despues de desplegar el fix.

**Causa raiz:** `sw.js` no se actualizo cuando se implemento el sistema de bundles.

**Regla permanente:**
- `sw.js` PRECACHE_ASSETS debe listar `dist/bundle.min.js` y `dist/bundle.min.css`
  (NUNCA modulos individuales `js/*.js` ni `css/dashboard.css`).
- Al cambiar contenido del bundle, **SIEMPRE** incrementar `CACHE_NAME` en `sw.js`.
- `.env.js` NUNCA debe estar en PRECACHE_ASSETS (es environment-specific).

#### REG-003: Cache buster desactualizado (2026-02-27)

**Que paso:** Despues de desplegar el bundle fijo, el HTML seguia pidiendo
`bundle.min.js?v=TIMESTAMP_VIEJO`. El SW hacia cache-match con la URL exacta
y servia la version cacheada rota.

**Causa raiz:** Se desplego el bundle sin reconstruir `dist/index.html`.

**Regla permanente:**
- **SIEMPRE** ejecutar `node dashboard/build.js` antes de deploy. El script genera
  nuevos timestamps en `dist/index.html`.
- **SIEMPRE** copiar `dist/index.html` al root `dashboard/index.html` en produccion
  (`deploy-agent.sh` ya lo hace automaticamente).

#### REG-004: Healthcheck IPv6 en Alpine/Nginx (2026-02-27)

**Que paso:** `wget http://localhost/` en contenedores Alpine resuelve `localhost`
a `::1` (IPv6), pero Nginx solo escucha en IPv4. El healthcheck fallaba.

**Regla permanente:**
- En `docker-compose*.yml`, healthchecks deben usar `http://127.0.0.1/` (NO `localhost`).

#### REG-005: Traefik pierde rutas tras docker compose (2026-02-27)

**Que paso:** Tras `docker compose up -d` que recreo contenedores, Traefik no
re-detecto las labels del dashboard. 0 routers registrados.

**Regla permanente:**
- Despues de `docker compose up -d`, verificar routers en Traefik API:
  `curl -s http://localhost:8080/api/http/routers | grep jewelry-dashboard`
- Si faltan routers: `docker compose up -d dashboard` para forzar re-deteccion.

---

### Sistema Anti-Regresion

| Capa | Herramienta | Cuando se ejecuta |
|------|-------------|-------------------|
| Pre-commit | `scripts/pre-commit.sh` | Automatico al hacer `git commit` |
| Tests locales | `bash tests/regression/run-tests.sh` | Manual + CI |
| Build verify | `node dashboard/build.js` + `node --check dist/bundle.min.js` | Pre-deploy |
| CI/CD | `.github/workflows/code-quality.yml` | Push/PR a main |
| Deploy gate | `deploy-agent.sh` fase de validacion | Cada deploy |

**Comando rapido para verificar todo:**
```bash
bash tests/regression/run-tests.sh && node dashboard/build.js && node --check dashboard/dist/bundle.min.js
```

---

## Estructura del Proyecto

```
/srv/stacks/jewelry/
├── docker-compose.yml              # Stack local
├── docker-compose.production.yml   # Stack produccion
├── .env                            # Variables locales
├── dashboard/                      # SPA Dashboard
│   ├── index.html
│   ├── .env.js                     # Config local (tracked)
│   ├── .env.production.js          # Config prod (NO en Git)
│   ├── js/                         # auth.js, api.js, dashboard.js, pos.js, users.js
│   ├── css/
│   └── nginx/                      # default.conf, production.conf
├── data/
│   ├── mysql/                      # DB local (gitignored)
│   └── wordpress/wp-content/
│       ├── mu-plugins/jewelry-*.php
│       ├── themes/astra/
│       ├── plugins/
│       └── uploads/
├── scripts/
│   ├── deploy-agent.sh             # Deploy principal
│   ├── pre-commit.sh               # Hook anti-regresion
│   └── backup-database.sh
├── docs/
│   └── DEPLOYMENT.md
├── tests/
│   ├── regression/                 # 🛡️ Tests anti-regresion (SIEMPRE ejecutar pre-deploy)
│   ├── pos/                        # Tests POS
│   └── sales/                      # Tests ventas
├── backups/
├── .github/
│   ├── agents/                     # 8 agentes Copilot
│   ├── copilot-instructions.md     # Este archivo
│   └── workflows/
├── .ai-tools/
│   └── shared-context.md
└── README.md
```

## Agentes Copilot Disponibles

Ver `.github/agents/README.md` para la lista completa de 8 agentes:
product-creator, page-builder, translatepress-expert, woocommerce-expert,
security-reviewer, database-manager, project-manager, **deployment-specialist**.

## Referencias

- [TranslatePress Docs](https://translatepress.com/docs/translatepress/)
- [Astra Theme Docs](https://wpastra.com/docs/)
- [Elementor Docs](https://developers.elementor.com/)
- [WooCommerce REST API](https://woocommerce.github.io/code-reference/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)

---

**Recuerda:** TranslatePress (NO Bogo). Prefijo `jewelry_`. Sanitizar inputs. jewelry_db ≠ tujoyita_db. Deploy con deploy-agent.sh.
