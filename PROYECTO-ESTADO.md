# Estado del Proyecto — Tu Joyita Miami

**Fecha:** 2026-02-23
**Dominio:** tujoyita.com
**Dev local:** https://jewelry.local.dev
**Repo principal:** https://github.com/tujoyitamiami-cpu/tujoyita
**Estado del Sistema:** ✅ Operativo

## ✅ COMPLETADO

### Infraestructura

- ✅ Docker Compose configurado (5 servicios: WP, MySQL, phpMyAdmin, WP-CLI, Dashboard)
- ✅ WordPress 6.9.1 instalado y funcionando
- ✅ Tema Astra 4.12.3 + Elementor 3.35.4
- ✅ WooCommerce 10.5.1 configurado
- ✅ Traefik configurado para HTTPS local + dominio público
- ✅ Dashboard SPA v2.0.0 (Nginx standalone)

### Idiomas

- ✅ TranslatePress 3.1 activo (traducción visual desde frontend)
- ✅ Español (es_ES) como idioma por defecto
- ✅ Inglés (en_US) con prefijo `/en/`
- ✅ Language switcher flotante configurado

### Git Multi-cuenta

- ✅ **origin** → `tujoyitamiami-cpu/tujoyita` (producción + desarrollo)
- ✅ **infonetwork** → `infonetwokmedia-bot/Jewelry` (legacy, read-only mirror)
- ✅ **ppkapiro** → `ppkapiro/Jewelry` (fork personal)
- ✅ SSH keys dedicadas por cuenta
- ✅ Branches limpiadas (solo main activa)

### Productos

- ✅ 33 productos publicados (catálogo real en español)
- ✅ Cadenas, gargantillas, pulsos, anillos, aretes, dijes
- ✅ Plugin jewelry-dashboard API REST para gestión

### Páginas

- ✅ Inicio, Nosotros, Contacto, Tienda — publicadas
- ✅ Carrito, Finalizar Compra, Mi Cuenta — WooCommerce
- ⏳ Política de Privacidad, Devoluciones — en draft

### Menús

- ✅ Main Menu (primary + mobile_menu) — 4 items
- ✅ Footer Menu — 6 items

### CI/CD

- ✅ Workflow code-quality.yml (security audit, PHP lint, markdown, structure)
- ✅ Workflow backup-weekly.yml (issue reminder)
- ✅ PR template con checklist de calidad

### Plugins Custom

- ✅ `jewelry-dashboard` v2.0.0 — REST API + CORS (trackeado en Git)
- ✅ `jewelry-image-optimization` — MU-plugin de optimización

## 🔄 PENDIENTE — CAMINO A PRODUCCIÓN

### Fase 1: Infraestructura Producción

- ⏳ Crear VPS en Hetzner (proyecto 13570417)
- ⏳ Configurar DNS tujoyita.com → Hetzner VPS
- ⏳ SSL con Let's Encrypt vía Traefik
- ⏳ Deploy automatizado (CI/CD)
- ⏳ Backups automáticos reales

### Fase 2: Contenido

- ⏳ Completar página Materiales
- ⏳ Publicar políticas (Privacy, Terms, Refund)
- ⏳ Crear posts de blog iniciales
- ⏳ Traducir todo el contenido al inglés con TranslatePress
- ⏳ Subir imágenes de alta calidad para productos

### Fase 3: Optimización

- ⏳ SEO: Instalar Rank Math
- ⏳ Performance: Cache plugin, CDN, lazy loading
- ⏳ Email transaccional: Configurar SMTP
- ⏳ Seguridad: Headers, rate limiting, WP hardening

### Fase 4: Testing

- ⏳ Tests E2E con Playwright
- ⏳ Tests PHP para plugin jewelry-dashboard
- ⏳ QA bilingüe completo

## 📊 ESTADÍSTICAS

- **Productos:** 33 publicados
- **Páginas:** 9 (7 publish + 2 draft)
- **Menús:** 2 (Main + Footer)
- **Plugins activos:** 8
- **Idiomas:** 2 (ES principal, EN secundario)
- **Archivos trackeados:** ~142

## 🔑 API

- **REST API:** https://jewelry.local.dev/wp-json/
- **Dashboard API:** https://jewelry.local.dev/wp-json/jewd/v1/stats
- **WooCommerce API:** https://jewelry.local.dev/wp-json/wc/v3/
