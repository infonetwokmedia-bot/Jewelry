# Contexto Compartido - Proyecto Tu Joyita Miami

> **Última actualización:** 27 de febrero de 2026

## Información General

**Proyecto:** Tu Joyita Miami — Ecommerce de joyería de alta calidad
**Dominio:** tujoyita.com (producción) / dev.tujoyita.com (desarrollo)
**Stack:** WordPress 6.9.1 + WooCommerce 10.5.1 + Docker + Traefik
**Idiomas:** Bilingüe (Español/Inglés) con **TranslatePress 3.0.9** (NO Bogo, NO Polylang, NO WPML)
**Tema:** Astra 4.12.3 (gratuito) + Elementor 3.35.4
**Repositorio principal:** `tujoyitamiami-cpu/tujoyita` (origin)

---

## Arquitectura de Entornos

### REGLA CRÍTICA: Aislamiento Total

```
jewelry_db (local) ≠ tujoyita_db (producción)
jewelry_user ≠ tujoyita_user
```

Las bases de datos son 100% independientes. El deploy NUNCA toca la DB de producción.

### Entorno LOCAL (desarrollo)

| Componente | Valor |
|-----------|-------|
| Servidor | Dell Server, IP 192.168.12.233 |
| Path | `/srv/stacks/jewelry/` |
| Compose | `docker-compose.yml` |
| WordPress | `jewelry_wordpress` → https://tujoyita.local (LAN) |
| Dashboard | `jewelry_dashboard` → https://dev.tujoyita.com/dashboard/ |
| MySQL | `jewelry_mysql` → DB: `jewelry_db`, User: `jewelry_user` |
| phpMyAdmin | `jewelry_phpmyadmin` → https://phpmyadmin.jewelry.local.dev |
| Volumen MySQL | `./data/mysql` (bind mount, gitignored) |
| Red Docker | `jewelry_network` |
| Acceso remoto | Cloudflare Tunnel → `dev.tujoyita.com` |

### Entorno PRODUCCIÓN

| Componente | Valor |
|-----------|-------|
| Servidor | Hetzner VPS, IP 89.167.101.209 |
| Path | `/srv/stacks/tujoyita/` |
| Compose | `docker-compose.production.yml` |
| WordPress | `tujoyita_wordpress` → https://tujoyita.com |
| Dashboard | `tujoyita_dashboard` → https://tujoyita.com/dashboard/ |
| MySQL | `tujoyita_mysql` → DB: `tujoyita_db`, User: `tujoyita_user` |
| Volumen MySQL | `mysql-data` (Docker named volume, INDEPENDIENTE) |
| Red Docker | `tujoyita_internal` |
| SSL | Let's Encrypt (auto-renovación via Traefik) |
| DNS | Cloudflare proxy → 89.167.101.209 |
| SSH | `ssh tujoyita-prod` (User: root, Key: ~/.ssh/id_ed25519) |

---

## URLs del Proyecto

| Entorno | URL | Propósito |
|---------|-----|-----------|
| Producción | https://tujoyita.com | Tienda pública |
| Producción EN | https://tujoyita.com/en/ | Tienda en inglés |
| Producción Admin | https://tujoyita.com/wp-admin | Panel WordPress |
| Producción Dashboard | https://tujoyita.com/dashboard/ | Dashboard SPA |
| Desarrollo | https://dev.tujoyita.com | WordPress dev (Tunnel) |
| Desarrollo Dashboard | https://dev.tujoyita.com/dashboard/ | Dashboard dev |
| LAN WP | https://tujoyita.local | WordPress local (solo LAN) |

---

## Repositorios GitHub

| Remote | Repo | Propósito |
|--------|------|-----------|
| `origin` | `tujoyitamiami-cpu/tujoyita` | Repositorio principal |
| `infonetwork` | `infonetwokmedia-bot/Jewelry` | Mirror |
| `ppkapiro` | `ppkapiro/Jewelry` | Fork personal |

---

## TranslatePress (NO Bogo)

- **NO se duplican posts/páginas/productos.** UNA sola instancia.
- Traducciones en tablas `wp_trp_*`.
- Traducción visual: `?trp-edit-translation=true`.
- URLs en inglés: `/en/shop/`, `/en/about-us/`.
- **NUNCA usar Bogo, `wp_trp_*`, ni duplicar posts.**

---

## Dashboard SPA

| Archivo | Propósito |
|---------|-----------|
| `dashboard/index.html` | HTML principal (cache buster en assets) |
| `dashboard/.env.js` | Config LOCAL (gitignored, NO en Git) |
| `dashboard/.env.production.js` | Config PROD (NO en Git, solo en VPS) |
| `dashboard/js/auth.js` | Auth JWT + roles |
| `dashboard/js/api.js` | Capa API WooCommerce |
| `dashboard/js/dashboard.js` | App principal |
| `dashboard/js/pos.js` | Punto de Venta v2.0 |
| `dashboard/js/users.js` | Gestión usuarios |
| `dashboard/build.js` | esbuild: concatena JS → `dist/bundle.min.js` |
| `dashboard/sw.js` | Service Worker (pre-cache dist/ assets) |
| `dashboard/dist/` | Artefactos de build (bundle.min.js, .css, index.html) |

### Roles: administrator, shop_manager, jewelry_seller, jewelry_viewer

---

## Deployment

```bash
./scripts/deploy-agent.sh --force    # Deploy completo
./scripts/deploy-agent.sh --check    # Solo verificar
./scripts/deploy-agent.sh --status   # Estado producción
./scripts/deploy-agent.sh --rollback # Rollback
```

**SE DESPLIEGA:** mu-plugins, dashboard (excluye .env.js), compose, scripts.
**NUNCA SE TOCA:** DB producción, .env, .env.js prod, uploads, plugins terceros, DNS.

Ver `deployment-specialist.agent.md` para guía completa.

---

## Convenciones de Código

- Prefijo `jewelry_` para funciones PHP custom
- WordPress Coding Standards (4 espacios, PHPDoc)
- Conventional Commits: feat, fix, docs, refactor, test, chore
- SIEMPRE sanitizar inputs, escapar outputs, verificar nonces

---

## Archivos a NO Modificar

- Core de WordPress: `wp-admin/`, `wp-includes/`
- Plugins: Astra, Elementor, WooCommerce, TranslatePress
- `data/mysql/` — Base de datos local
- `.env` de producción (solo en el VPS)

## Archivos Custom

- `data/wordpress/wp-content/mu-plugins/jewelry-*.php`
- `dashboard/` (SPA completa)
- `scripts/` (automatización)

---

## Sistema Anti-Regresión (CRÍTICO)

### Incidentes Documentados

| ID | Problema | Causa Raíz | Regla Permanente |
|----|----------|-------------|------------------|
| REG-001 | `J.openLightbox = openLightbox` (función no existía) | Typo en export, crasheó bundle completo y login | NUNCA asignar `J.xxx = fn` sin verificar que `fn` existe en el mismo archivo |
| REG-002 | SW pre-cacheaba `js/auth.js` (no existe en prod) | SW no actualizado para bundles | `PRECACHE_ASSETS` solo debe listar `dist/bundle.min.*`, NUNCA módulos individuales |
| REG-003 | Cache buster con timestamp viejo | `dist/index.html` no regenerado | SIEMPRE ejecutar `node dashboard/build.js` antes de deploy |
| REG-004 | Healthcheck IPv6 en Alpine | `localhost` resuelve a `::1` | Usar `http://127.0.0.1/` en healthchecks docker-compose |
| REG-005 | Traefik pierde routers tras recrear containers | Labels no re-detectadas | Verificar routers en Traefik API post-deploy |

### Capas de Protección

| Capa | Herramienta | Cuándo |
|------|-------------|--------|
| Pre-commit | `scripts/pre-commit.sh` | Automático en `git commit` |
| Tests locales | `bash tests/regression/run-tests.sh` | Manual + CI (111 tests, 5 suites) |
| Build verify | `node dashboard/build.js` + `node --check` | Pre-deploy |
| CI/CD | `.github/workflows/code-quality.yml` | Push/PR a main |
| Deploy gate | `deploy-agent.sh` ejecuta tests antes de desplegar | Cada deploy |

### Comando Rápido

```bash
bash tests/regression/run-tests.sh && node dashboard/build.js && node --check dashboard/dist/bundle.min.js
```

---

## Referencias

- [TranslatePress Docs](https://translatepress.com/docs/translatepress/)
- [Astra Theme Docs](https://wpastra.com/docs/)
- [WooCommerce REST API](https://woocommerce.github.io/code-reference/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)
