# Plan de Producción — Tu Joyita Miami

**Creado:** 2026-02-23
**Última actualización:** 2026-02-23
**Dominio:** <https://tujoyita.com>
**Repo:** <https://github.com/tujoyitamiami-cpu/tujoyita>
**VPS:** Hetzner CX23, Helsinki, IP 89.167.101.209

---

## Progreso General

| Fase                       | Tareas | ✅     | ⚠️    | ❌    | %       |
| -------------------------- | ------ | ------ | ----- | ----- | ------- |
| F1 — Git y Multi-cuenta    | 5      | 4      | 1     | 0     | 90%     |
| F2 — Limpieza y Coherencia | 6      | 6      | 0     | 0     | 100%    |
| F3 — CI/CD                 | 6      | 5      | 0     | 1     | 83%     |
| F4 — Hardening Producción  | 7      | 5      | 2     | 0     | 71%     |
| F5 — Tests y QA            | 4      | 0      | 0     | 4     | 0%      |
| **TOTAL**                  | **28** | **20** | **3** | **5** | **75%** |

### Trabajo extra realizado (fuera del plan original)

- ✅ VPS Hetzner CX23 creado (Ubuntu 24.04, Docker 29.2.1, Compose 5.0.2)
- ✅ Traefik v3.6.8 desplegado con SSL automático
- ✅ WordPress instalado y configurado en producción (WP 6.9.1, PHP 8.3.30)
- ✅ DNS configurado (tujoyita.com + www → VPS)
- ✅ SSL Let's Encrypt emitido (tujoyita.com + <www.tujoyita.com>)
- ✅ HTTP→HTTPS redirect + www→non-www redirect
- ✅ Hetzner Firewall (SSH/HTTP/HTTPS/ICMP, ID: 10581542)
- ✅ fail2ban activo en VPS
- ✅ Repo migrado de infonetwokmedia-bot → tujoyitamiami-cpu/tujoyita
- ✅ 7 plugins instalados y activos (WooCommerce, TranslatePress, CF7, Yoast, WP Super Cache, WP Mail SMTP, AIO Migration)
- ✅ 12 páginas creadas en español (Inicio, Tienda, Sobre Nosotros, Contacto, Blog, Materiales, etc.)
- ✅ WooCommerce configurado (USD, Miami FL, impuestos habilitados)
- ✅ TranslatePress configurado (ES base + EN, tablas creadas)
- ✅ Astra 4.12.3 activo, idioma es_ES con paquete de traducción
- ✅ MU-plugin jewelry-security.php desplegado en producción

---

## FASE 1 — Organización Git y Multi-cuenta

### 1.1 ✅ Definir estructura de cuentas GitHub

- **origin** → `tujoyitamiami-cpu/tujoyita` (producción + desarrollo)
- **infonetwork** → `infonetwokmedia-bot/Jewelry` (legacy, read-only mirror)
- **ppkapiro** → `ppkapiro/Jewelry` (fork personal)
- SSH key dedicada: `~/.ssh/id_ed25519_tujoyita`
- SSH config: host `github.com-tujoyita`

### 1.2 ✅ Limpiar branches

- Solo `main` y `develop` en origin
- 5 branches remotas + 2 locales eliminadas
- Queda 1 branch vieja en ppkapiro (`claude/dev-workflow-implementation-Ot5nQ`) — no prioritario

### 1.3 ✅ Crear branch develop

- Branch `develop` creada y pusheada a origin
- `main` y `develop` sincronizadas en commit `873b0a8`

### 1.4 ✅ Branch protection rules

- Protección en main configurada via API
- Require CI pass (code-quality) ✅
- No force push en main ✅
- No delete en main ✅
- Require PR review: funcional (bypass por admin via PAT)

### 1.5 ⚠️ GitHub Environments + Secrets

**Estado:** Secrets configurados, environments pendientes de crear via web UI.

- [x] Secret: `VPS_SSH_KEY` (clave privada para deploy) — configurado
- [x] Secret: `VPS_HOST` (89.167.101.209) — configurado
- [x] Secret: `VPS_USER` (root) — configurado
- [ ] Crear environment `production` (dominio: tujoyita.com) — requiere GitHub web UI
- [ ] Crear environment `staging` (dominio: jewelry.local.dev)
- [ ] Opcional: `HETZNER_TOKEN` para gestión de infraestructura

---

## FASE 2 — Limpieza y Coherencia ✅ COMPLETADA

### 2.1 ✅ Migrar doc Bogo → TranslatePress

- 15+ archivos actualizados (docs, agents, issue templates, CONTRIBUTING, COPILOT-SKILLS)
- Archivos obsoletos con refs a Bogo movidos a archive/
- Solo quedan referencias intencionales "NO Bogo" como advertencia

### 2.2 ✅ Purgar scripts obsoletos

- 47 scripts movidos a `scripts/archive/`
- 7 scripts core mantenidos: backup-database, restore-database, clear-cache, optimize-jewelry-images, setup-dev, test-connections, sync-fork

### 2.3 ✅ Purgar docs obsoletos

- 13 docs movidos a `docs/archive/`
- 9 docs activos mantenidos y actualizados

### 2.4 ✅ Trackear MU-plugin

- Regla añadida en .gitignore: `!data/wordpress/wp-content/mu-plugins/jewelry-image-optimization.php`
- Archivo trackeado en Git

### 2.5 ✅ Eliminar credenciales de docs

- 9 instancias de `jewelry_pass_2026!` eliminadas de database-manager.agent.md
- Reemplazadas con `${MYSQL_PASSWORD}`

### 2.6 ✅ Crear CHANGELOG.md

- CHANGELOG.md creado con formato Keep a Changelog
- Historia retroactiva desde v0.1.0

---

## FASE 3 — Automatización CI/CD

### 3.1 ❌ Deploy a staging

**Pendiente:**

- [ ] Crear `.github/workflows/deploy-staging.yml`
- [ ] Trigger: push a `develop`
- [ ] Requiere: Secrets VPS_SSH_KEY, VPS_HOST, VPS_USER (de 1.5)

### 3.2 ✅ Deploy a producción

- Workflow: `.github/workflows/deploy-production.yml`
- Trigger: manual dispatch (requiere escribir "deploy" para confirmar)
- Pre-deploy backup automático de BD
- Sync de themes, mu-plugins via rsync/scp
- Post-deploy health check (HTTPS, SSL, REST API, www redirect)
- Summary en GitHub con resultados

### 3.3 ✅ Backup real automatizado

- Workflow: `.github/workflows/backup.yml`
- Cron: diario a las 3:00 AM UTC
- Tipos: database (default) o full (DB + wp-content)
- Retención: 30 días automático
- También ejecutable manualmente

### 3.4 ✅ Health check

- Workflow: `.github/workflows/health-check.yml`
- Cron: cada 6 horas
- Checks: HTTPS 200, SSL expiry, REST API, recursos VPS
- Summary con métricas en GitHub

### 3.5 ✅ Mejorar code-quality.yml

- Job PHPCS añadido con WordPress Coding Standards
- Lint de MU-plugins añadido
- Lint de jewelry-dashboard, jewelry-custom, astra-child
- PHPCS como non-blocking (continue-on-error) por ahora

### 3.6 ✅ Makefile

- Makefile creado con 24 targets organizados por categoría:
  - **Dev:** `make dev`, `make down`, `make restart`, `make logs`, `make status`
  - **WP-CLI:** `make wp CMD="..."`, `make wp-plugins`, `make wp-update`
  - **BD:** `make backup`, `make backup-full`, `make restore`, `make backup-clean`
  - **Prod:** `make deploy`, `make health-prod`, `make prod-logs`, `make prod-shell`, `make prod-backup`
  - **CI:** `make lint`, `make pre-commit`
  - **Util:** `make setup`, `make clean`, `make test-connections`

---

## FASE 4 — Hardening para Producción

### 4.1 ✅ Separar configs dev/staging/prod

- `.env.production` template creado con variables de seguridad y performance
- docker-compose de producción actualizado con constantes de WordPress
- Diferencias documentadas entre dev (bind mounts) y prod (Docker volumes)

### 4.2 ✅ Seguridad WP

- Security headers via Traefik: HSTS (preload), X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy
- MU-plugin `jewelry-security.php`: XML-RPC deshabilitado, versión WP oculta, login rate limiting (bloqueo tras 15 intentos), user enumeration bloqueada, author archives deshabilitados
- `DISALLOW_FILE_EDIT=true` en producción
- `WP_POST_REVISIONS=5`, `EMPTY_TRASH_DAYS=15`, `WP_MEMORY_LIMIT=256M`
- fail2ban activo en VPS + Hetzner Firewall

### 4.3 ✅ SSL real (Let's Encrypt)

- Certificado Let's Encrypt emitido para tujoyita.com + <www.tujoyita.com>
- Auto-renovación via Traefik ACME
- HTTP → HTTPS redirect activo
- www → non-www redirect activo

### 4.4 ⚠️ Completar contenido pendiente

**Estado:** Páginas creadas en español. Falta diseño con Elementor, contenido real y traducción al inglés.

- [x] Todas las páginas base creadas y publicadas (12 páginas)
- [x] WooCommerce: Tienda, Carrito, Finalizar Compra, Mi Cuenta asignadas
- [x] Front page: Inicio | Blog page: Blog
- [ ] Diseñar páginas con Elementor (Inicio, Sobre Nosotros, Contacto, Materiales)
- [ ] Traducir todas las páginas al inglés via TranslatePress
- [ ] 3-5 posts de blog iniciales
- [ ] Imágenes de alta calidad para productos
- [ ] Completar contenido de políticas (Privacidad, Términos, Devoluciones)

### 4.5 ⚠️ SEO

**Estado:** Yoast SEO 27.0 instalado y activo en producción. Pendiente configuración.

**Pendiente post-install:**

- [ ] Configurar sitemap XML
- [ ] Meta descriptions para todas las páginas
- [ ] Schema markup (Product, Organization, LocalBusiness)
- [ ] Open Graph / Twitter Cards
- [ ] Robots.txt optimizado

### 4.6 ⚠️ Performance

**Estado:** WP Super Cache 3.0.3 instalado y activo en producción. Pendiente configuración.

**Pendiente post-install:**

- [ ] Configurar WP Super Cache
- [ ] CDN (Cloudflare o similar)
- [ ] Minificación CSS/JS
- [ ] Database optimization

### 4.7 ⚠️ Email transaccional SMTP

**Estado:** WP Mail SMTP 4.7.1 instalado y activo en producción. Pendiente configuración de proveedor.

**Pendiente post-install:**

- [ ] Configurar proveedor SMTP (SendGrid, Mailgun, o Hostinger)
- [ ] Testear emails de WooCommerce

---

## FASE 5 — Tests y QA

### 5.1 ❌ Tests E2E (Playwright)

**Pendiente:**

- [ ] Instalar Playwright
- [ ] Test: Home carga correctamente
- [ ] Test: Shop carga, productos visibles
- [ ] Test: Producto se añade al carrito
- [ ] Test: Checkout funciona
- [ ] Test: Language switcher cambia a EN
- [ ] Test: /en/ muestra contenido en inglés

### 5.2 ❌ Tests PHP (jewelry-dashboard)

**Pendiente:**

- [ ] Configurar PHPUnit para WordPress
- [ ] Test: API endpoint /jewd/v1/stats responde
- [ ] Test: API endpoint devuelve datos correctos
- [ ] Test: Permisos de API correctos

### 5.3 ❌ Auditoría de seguridad

**Pendiente:**

- [ ] Scan con WPScan
- [ ] Verificar permisos de archivos (wp-config.php, .htaccess)
- [ ] Revisar headers HTTP
- [ ] Verificar que no hay información expuesta (phpinfo, debug, etc.)
- [ ] Verificar que directory listing está deshabilitado

### 5.4 ❌ QA bilingüe

**Pendiente:**

- [ ] Verificar todas las páginas en ES
- [ ] Verificar todas las páginas en EN
- [ ] Verificar menús en ambos idiomas
- [ ] Verificar productos en ambos idiomas
- [ ] Verificar checkout flow en ambos idiomas
- [ ] Verificar emails en ambos idiomas

---

## Orden de Ejecución Recomendado

### Prioridad 1 — Cerrar Fase 1 + Migrar contenido

1. **1.4** Verificar branch protection
2. **1.5** Crear environments + secrets en GitHub
3. Migrar contenido local → producción (DB + plugins + tema)

### Prioridad 2 — Limpieza (Fase 2) — ✅ COMPLETADA

1. ~~**2.2 + 2.3** Purgar scripts y docs obsoletos~~ ✅
2. ~~**2.1** Actualizar refs Bogo→TranslatePress~~ ✅
3. ~~**2.5** Eliminar credenciales~~ ✅
4. ~~**2.4** Trackear MU-plugin~~ ✅
5. ~~**2.6** Crear CHANGELOG.md~~ ✅

### Prioridad 3 — CI/CD (Fase 3) — 83% completada

1. ~~**3.6** Crear Makefile~~ ✅
2. ~~**3.2** Deploy a producción workflow~~ ✅
3. **3.1** Deploy a staging workflow ❌
4. ~~**3.3** Backup real automatizado~~ ✅
5. ~~**3.5** Mejorar code-quality.yml~~ ✅
6. ~~**3.4** Health check workflow~~ ✅

### Prioridad 4 — Hardening (Fase 4)

1. **4.2** Seguridad WP + UFW
2. **4.1** Configs separadas dev/prod
3. **4.7** Email SMTP
4. **4.5** SEO
5. **4.6** Performance
6. **4.4** Contenido pendiente

### Prioridad 5 — Testing (Fase 5)

1. **5.3** Auditoría seguridad
2. **5.1** Tests E2E
3. **5.2** Tests PHP
4. **5.4** QA bilingüe

---

## Infraestructura Actual

### Dev Local

```
jewelry.local.dev → Docker (WP + MySQL + phpMyAdmin + WP-CLI + Dashboard)
```

### Producción (VPS Hetzner)

```
tujoyita.com → Traefik v3.6.8 → WordPress 6.9.1 + MySQL 8.0
                ├── SSL: Let's Encrypt (auto-renew, expires May 2026)
                ├── HTTP → HTTPS redirect
                ├── www → non-www redirect (308)
                ├── Security headers: HSTS, X-Frame, CSP, Referrer
                ├── MU-plugin: jewelry-security.php
                ├── Plugins: WooCommerce, TranslatePress, Yoast, CF7, etc.
                ├── Tema: Astra 4.12.3
                ├── 12 páginas creadas en español
                └── Estado: WP configurado, listo para contenido
```

### Contenedores en VPS

| Contenedor         | Imagen           | Estado     |
| ------------------ | ---------------- | ---------- |
| traefik            | traefik:v3.6     | ✅ Running |
| tujoyita_wordpress | wordpress:latest | ✅ Running |
| tujoyita_mysql     | mysql:8.0        | ✅ Healthy |

### Stacks en VPS

```
/srv/stacks/
├── traefik/        → docker-compose.yml (Traefik reverse proxy)
└── tujoyita/       → docker-compose.yml + .env (WordPress + MySQL)
```

---

> **NOTA:** Este documento es temporal y de trabajo. Una vez completadas todas las fases, el estado final se refleja en PROYECTO-ESTADO.md y este archivo se puede archivar o eliminar.
