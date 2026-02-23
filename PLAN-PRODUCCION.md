# Plan de Producción — Tu Joyita Miami

**Creado:** 2026-02-23
**Última actualización:** 2026-02-23
**Dominio:** <https://tujoyita.com>
**Repo:** <https://github.com/tujoyitamiami-cpu/tujoyita>
**VPS:** Hetzner CX23, Helsinki, IP 89.167.101.209

---

## Progreso General

| Fase                       | Tareas | ✅    | ⚠️    | ❌     | %       |
| -------------------------- | ------ | ----- | ----- | ------ | ------- |
| F1 — Git y Multi-cuenta    | 5      | 3     | 1     | 1      | 60%     |
| F2 — Limpieza y Coherencia | 6      | 0     | 2     | 4      | 8%      |
| F3 — CI/CD                 | 6      | 0     | 1     | 5      | 3%      |
| F4 — Hardening Producción  | 7      | 1     | 0     | 6      | 14%     |
| F5 — Tests y QA            | 4      | 0     | 0     | 4      | 0%      |
| **TOTAL**                  | **28** | **4** | **4** | **20** | **17%** |

### Trabajo extra realizado (fuera del plan original)

- ✅ VPS Hetzner CX23 creado (Ubuntu 24.04, Docker 29.2.1, Compose 5.0.2)
- ✅ Traefik v3.6.8 desplegado con SSL automático
- ✅ WordPress + MySQL corriendo en producción (instalación fresca)
- ✅ DNS configurado (tujoyita.com + www → VPS)
- ✅ SSL Let's Encrypt emitido (tujoyita.com + <www.tujoyita.com>)
- ✅ HTTP→HTTPS redirect + www→non-www redirect
- ✅ Hetzner Firewall (SSH/HTTP/HTTPS/ICMP, ID: 10581542)
- ✅ fail2ban activo en VPS
- ✅ Repo migrado de infonetwokmedia-bot → tujoyitamiami-cpu/tujoyita

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

### 1.4 ⚠️ Branch protection rules

**Estado:** Se configuró pero necesita verificación/reconfiguración.
La API no devuelve reglas claras — posible problema con el PAT o con la config.

**Pendiente:**

- [ ] Verificar/reconfigurar protección en main
- [ ] Require PR review (al menos 1)
- [ ] Require CI pass (code-quality)
- [ ] No force push en main
- [ ] No delete en main

### 1.5 ❌ GitHub Environments + Secrets

**Estado:** 0 environments, 0 secrets configurados.

**Pendiente:**

- [ ] Crear environment `production` (dominio: tujoyita.com)
- [ ] Crear environment `staging` (dominio: jewelry.local.dev o jewelry.cubaverso.com)
- [ ] Secret: `VPS_SSH_KEY` (clave privada para deploy)
- [ ] Secret: `VPS_HOST` (89.167.101.209)
- [ ] Secret: `VPS_USER` (root)
- [ ] Opcional: `HETZNER_TOKEN` para gestión de infraestructura

---

## FASE 2 — Limpieza y Coherencia

### 2.1 ⚠️ Migrar doc Bogo → TranslatePress

**Estado:** Parcial. Se actualizaron los archivos principales, pero quedan 20+ archivos con referencias a Bogo.

**Ya actualizados:**

- [x] README.md
- [x] PROYECTO-ESTADO.md
- [x] .github/copilot-instructions.md
- [x] .github/pull_request_template.md

**Pendientes (archivos con referencias a Bogo):**

Docs:

- [ ] docs/REFERENCIA-RAPIDA.md
- [ ] docs/TRANSLATION-GUIDE.md
- [ ] docs/DEVELOPMENT.md
- [ ] docs/AUTOMATIZACION-COMPLETADA.md
- [ ] docs/PASOS-INMEDIATOS.md
- [ ] docs/AGREGAR-SELECTOR-IDIOMA-HEADER.md
- [ ] docs/PLAN-CREACION-CONTENIDO.md
- [ ] docs/DEPLOYMENT.md
- [ ] docs/SESION-COMPLETADA.md
- [ ] docs/SOLUCION-ERROR-EDICION.md
- [ ] docs/BOGO-BLOCK-EDITOR-FIX.md
- [ ] docs/TROUBLESHOOTING.md
- [ ] docs/AUDITORIA-CONTENIDO-ACTUAL.md
- [ ] docs/REINSTALACION-CLEAN-GUIDE.md

Scripts:

- [ ] scripts/reinstall-clean.sh
- [ ] scripts/setup-wordpress-clean.sh
- [ ] scripts/create-bilingual-menus.php
- [ ] scripts/update-content.sh
- [ ] scripts/diagnose-bogo.sh
- [ ] scripts/update-bilingual-content.py

**Decisión:** La mayoría de estos archivos deberían ir a `archive/` (ver 2.2 y 2.3), no actualizarse.

### 2.2 ❌ Purgar scripts obsoletos

**Estado:** 55 scripts en `scripts/`. La mayoría son one-off.

**Acción:** Mover a `scripts/archive/` y dejar solo los core:

- [ ] Identificar scripts core a mantener: backup-database.sh, clear-cache.sh, optimize-jewelry-images.sh
- [ ] Mover el resto a `scripts/archive/`
- [ ] Añadir `scripts/archive/` a .gitignore o dejarlo trackeado como referencia

### 2.3 ❌ Purgar docs obsoletos

**Estado:** 22 docs, muchos de sesiones antiguas y Bogo.

**Acción:** Mover a `docs/archive/`:

- [ ] BOGO-BLOCK-EDITOR-FIX.md → archive
- [ ] SOLUCION-ERROR-EDICION.md → archive
- [ ] SOLUCION-ERROR-FTP.md → archive
- [ ] FTP-ERROR-RESUELTO.md → archive
- [ ] SESION-COMPLETADA.md → archive
- [ ] PASOS-INMEDIATOS.md → archive
- [ ] AUTOMATIZACION-COMPLETADA.md → archive
- [ ] RESTAURACION-PROFUNDIDAD-VISUAL.md → archive
- [ ] CORRECIONES-CSS-APLICADAS.md → archive
- [ ] IMAGENES-RESUELTAS.md → archive
- [ ] REINSTALACION-CLEAN-GUIDE.md → archive
- [ ] ELEMENTOR-TEMPLATES-EN.md → archive
- [ ] AGREGAR-SELECTOR-IDIOMA-HEADER.md → archive

**Mantener activos:**

- docs/DEPLOYMENT.md (actualizar para producción)
- docs/DEVELOPMENT.md (actualizar para TranslatePress)
- docs/TRANSLATION-GUIDE.md (reescribir para TranslatePress)
- docs/AUDITORIA-CONTENIDO-ACTUAL.md (referencia útil)
- docs/TROUBLESHOOTING.md (actualizar)
- docs/REFERENCIA-RAPIDA.md (actualizar)
- docs/PLAN-CREACION-CONTENIDO.md (revisar)
- docs/README.md (hub de docs)

### 2.4 ❌ Trackear MU-plugin

**Estado:** `jewelry-image-optimization.php` existe en `data/wordpress/wp-content/mu-plugins/` pero no está trackeado en Git.

**Pendiente:**

- [ ] Añadir regla en .gitignore: `!data/wordpress/wp-content/mu-plugins/jewelry-image-optimization.php`
- [ ] `git add` el archivo
- [ ] Commit

### 2.5 ⚠️ Eliminar credenciales de docs

**Estado:** Se limpió copilot-instructions.md, pero quedan passwords en otros archivos.

**Archivos con credenciales:**

- [ ] `.github/agents/database-manager.agent.md` — 9+ líneas con `jewelry_pass_2026!`
- [ ] Verificar otros agents en `.github/agents/`
- [ ] Verificar scripts que tengan passwords hardcodeados

### 2.6 ❌ Crear CHANGELOG.md

**Pendiente:**

- [ ] Crear CHANGELOG.md siguiendo Keep a Changelog format
- [ ] Retroactivo desde los commits principales

---

## FASE 3 — Automatización CI/CD

### 3.1 ❌ Deploy a staging

**Pendiente:**

- [ ] Crear `.github/workflows/deploy-staging.yml`
- [ ] Trigger: push a `develop`
- [ ] Acción: SSH al VPS, pull cambios, restart contenedores
- [ ] Requiere: Secrets VPS_SSH_KEY, VPS_HOST, VPS_USER (de 1.5)

### 3.2 ❌ Deploy a producción

**Pendiente:**

- [ ] Crear `.github/workflows/deploy-production.yml`
- [ ] Trigger: merge a `main` (o manual dispatch)
- [ ] Acción: SSH al VPS, pull, backup DB antes de deploy, restart
- [ ] Environment: `production` con approval requerido

### 3.3 ❌ Backup real automatizado

**Estado:** Solo existe `backup-weekly.yml` que crea un issue recordatorio — NO hace backup real.

**Pendiente:**

- [ ] Crear `.github/workflows/backup-real.yml` o script en VPS
- [ ] Cron: dump MySQL, compress, upload a storage (GitHub release, S3, o Hetzner Object Storage)
- [ ] Retención: últimos 7 diarios, últimos 4 semanales
- [ ] Notificación en caso de fallo

### 3.4 ❌ WP health check

**Pendiente:**

- [ ] Crear `.github/workflows/health-check.yml`
- [ ] Cron diario: curl al sitio, verificar 200, SSL válido
- [ ] Verificar que WP responde y no está en maintenance mode
- [ ] Notificar si falla (issue o email)

### 3.5 ⚠️ Mejorar code-quality.yml

**Estado:** Actualizado para TranslatePress + plugins, pero falta PHPCS.

**Pendiente:**

- [ ] Añadir PHPCS con WordPress Coding Standards
- [ ] Lint PHP del plugin jewelry-dashboard
- [ ] Lint PHP del MU-plugin
- [ ] Verificar que no hay credenciales hardcodeadas (secret scanning)

### 3.6 ❌ Makefile o script unificado

**Pendiente:**

- [ ] Crear Makefile con targets:
  - `make dev` — levantar entorno local
  - `make down` — bajar entorno local
  - `make deploy` — deploy a producción
  - `make backup` — backup de DB
  - `make restore` — restaurar backup
  - `make test` — correr tests
  - `make lint` — correr linters
  - `make clean` — limpiar caches

---

## FASE 4 — Hardening para Producción

### 4.1 ❌ Separar configs dev/staging/prod

**Estado:** Solo existe `.env` y `.env.example` para dev local.

**Pendiente:**

- [ ] Crear `.env.production` (template, sin secretos reales)
- [ ] Crear `docker-compose.prod.yml` (override para producción)
- [ ] Documentar diferencias entre environments

### 4.2 ❌ Seguridad WP

**Estado:** Sin security headers. UFW inactivo en VPS.

**Pendiente:**

- [ ] Activar UFW en VPS (SSH + HTTP + HTTPS)
- [ ] WP_DEBUG=false en producción
- [ ] Headers de seguridad: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy
- [ ] Rate limiting en wp-login.php y xmlrpc.php
- [ ] Deshabilitar XML-RPC si no se usa
- [ ] Deshabilitar file editing en WP admin (`DISALLOW_FILE_EDIT`)

### 4.3 ✅ SSL real (Let's Encrypt)

- Certificado Let's Encrypt emitido para tujoyita.com + <www.tujoyita.com>
- Auto-renovación via Traefik ACME
- HTTP → HTTPS redirect activo
- www → non-www redirect activo

### 4.4 ❌ Completar contenido pendiente

**Pendiente:**

- [ ] Página Materiales
- [ ] Política de Privacidad (publicar draft existente)
- [ ] Términos y Condiciones
- [ ] Política de Devoluciones (publicar draft existente)
- [ ] 3-5 posts de blog iniciales
- [ ] Imágenes de alta calidad para productos

### 4.5 ❌ SEO

**Pendiente:**

- [ ] Instalar Rank Math SEO
- [ ] Configurar sitemap XML
- [ ] Meta descriptions para todas las páginas
- [ ] Schema markup (Product, Organization, LocalBusiness)
- [ ] Open Graph / Twitter Cards
- [ ] Robots.txt optimizado

### 4.6 ❌ Performance

**Pendiente:**

- [ ] Cache plugin (WP Super Cache o LiteSpeed Cache)
- [ ] Image lazy loading (nativo o plugin)
- [ ] CDN (Cloudflare o similar)
- [ ] Minificación CSS/JS
- [ ] Database optimization (limpiar revisiones, transients)

### 4.7 ❌ Email transaccional SMTP

**Pendiente:**

- [ ] Instalar WP Mail SMTP o similar
- [ ] Configurar proveedor (SendGrid, Mailgun, Amazon SES, o SMTP de Hostinger)
- [ ] Testear emails de WooCommerce: confirmación de pedido, password reset, etc.

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

### Prioridad 2 — Limpieza (Fase 2)

1. **2.2 + 2.3** Purgar scripts y docs obsoletos (mover a archive/)
2. **2.1** Los archivos que no se archivaron, actualizarlos
3. **2.5** Eliminar credenciales de database-manager.agent.md
4. **2.4** Trackear MU-plugin
5. **2.6** Crear CHANGELOG.md

### Prioridad 3 — CI/CD (Fase 3)

1. **3.6** Crear Makefile
2. **3.2** Deploy a producción workflow
3. **3.1** Deploy a staging workflow
4. **3.3** Backup real automatizado
5. **3.5** Mejorar code-quality.yml
6. **3.4** Health check workflow

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
tujoyita.com → Traefik v3.6.8 → WordPress + MySQL
                ├── SSL: Let's Encrypt (auto-renew)
                ├── HTTP → HTTPS redirect
                ├── www → non-www redirect
                └── Estado: WP installer (contenido no migrado)
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
