# Changelog

Todos los cambios notables del proyecto Tu Joyita Miami.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
versionado según [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Added

- MU-plugin `jewelry-security.php` — XML-RPC deshabilitado, login rate limiting, user enumeration bloqueada
- Security headers en producción: HSTS (preload), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `.env.production` template con constantes de seguridad
- Script `post-install-production.sh` — setup automatizado de WP en producción (plugins, páginas, WooCommerce, TranslatePress)
- WordPress constants en producción: DISALLOW_FILE_EDIT, WP_POST_REVISIONS=5, WP_MEMORY_LIMIT=256M
- Makefile con 24 targets organizados (dev, wp-cli, bd, prod, ci, util)
- Workflow `deploy-production.yml` — deploy manual con confirmación, backup pre-deploy, health check post-deploy
- Workflow `backup.yml` — backup diario automatizado (3 AM UTC), retención 30 días, tipos database/full
- Workflow `health-check.yml` — monitoreo cada 6 horas (HTTPS, SSL, REST API, recursos VPS)
- Job PHPCS en `code-quality.yml` con WordPress Coding Standards
- Lint de MU-plugins en `code-quality.yml`
- Documento PLAN-PRODUCCION.md con roadmap de 5 fases
- MU-plugin `jewelry-image-optimization.php` trackeado en Git
- VPS Hetzner CX23 (Helsinki) con Docker + Traefik v3.6.8
- SSL Let's Encrypt para tujoyita.com + www.tujoyita.com
- GitHub Environments (production, staging)
- Branch protection en main (require CI, no force push)

### Changed

- Migrado repo principal a `tujoyitamiami-cpu/tujoyita`
- Documentación actualizada de Bogo → TranslatePress en todos los archivos
- Credenciales removidas de `database-manager.agent.md` (ahora usa `${MYSQL_PASSWORD}`)
- COPILOT-SKILLS.md actualizado para TranslatePress

### Removed

- 47 scripts obsoletos movidos a `scripts/archive/`
- 13 docs obsoletos movidos a `docs/archive/`

## [0.5.0] - 2026-02-23

### Added

- Acceso público al Dashboard via dev.tujoyita.com/dashboard/ (#6)
- Branch `develop` creada para workflow Git Flow

### Fixed

- URLs de imágenes remotas en Dashboard corregidas

## [0.4.0] - 2026-02-10

### Added

- Modal de edición inline de productos en Dashboard (#5)
- No requiere acceso a WordPress admin

## [0.3.0] - 2026-02-09

### Added

- Nginx reverse proxy para API del Dashboard (#4)
- Eliminados problemas de CORS y certificados

### Fixed

- CORS issues resueltos con proxy inverso

## [0.2.0] - 2026-02-06

### Added

- Dashboard SPA desacoplado de WordPress — Nginx standalone (#3)
- Plugin jewelry-dashboard v2.0.0 con REST API (#1)
- Declaración de compatibilidad HPOS para WooCommerce (#2)

### Changed

- Dashboard migrado de WP integrado a SPA independiente

## [0.1.0] - 2026-01-15

### Added

- Setup inicial: WordPress 6.9.1 + WooCommerce 10.5.1
- Tema Astra 4.12.3 + Elementor 3.35.4
- TranslatePress para multiidioma (ES/EN)
- 33 productos de joyería publicados
- Docker Compose con 5 servicios
- Traefik para HTTPS local
- Issue templates y agentes de GitHub Copilot
- Scripts de backup, restore, optimización
- CI/CD: code-quality.yml, backup-weekly.yml
