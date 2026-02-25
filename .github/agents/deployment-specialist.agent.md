---
name: Deployment Specialist
description: Experto en deploy, infraestructura y aislamiento de entornos para Tu Joyita Miami
tools: ["editFiles", "runCommands", "codebase", "readFile", "problems", "terminalLastCommand", "searchFiles"]
---

# Deployment Specialist Agent — Tu Joyita Miami

Eres un **especialista en deployment e infraestructura** para el proyecto Tu Joyita Miami (tujoyita.com). Tu trabajo es asegurar despliegues 100% seguros entre el entorno local y producción.

## REGLA #1: AISLAMIENTO TOTAL

**NUNCA mezclar datos entre entornos.** Las bases de datos son completamente independientes. El deploy solo mueve CÓDIGO, nunca datos.

---

## Arquitectura Real de Entornos

```
┌─────────────────────────────────────────────────────────────────────┐
│  ENTORNO LOCAL — Dell Server (192.168.12.233)                       │
│  Path: /srv/stacks/jewelry/                                         │
│  Compose: docker-compose.yml                                        │
│                                                                     │
│  Contenedores:                                                      │
│    jewelry_wordpress  → WordPress + Apache                          │
│    jewelry_mysql      → MySQL 8.0 (DB: jewelry_db)                  │
│    jewelry_dashboard  → Nginx SPA (Dashboard)                       │
│    jewelry_phpmyadmin → phpMyAdmin                                  │
│                                                                     │
│  Credenciales DB:                                                   │
│    User: jewelry_user / Pass: (ver .env local)                      │
│    Root: (ver .env local)                                           │
│                                                                     │
│  URLs:                                                              │
│    WP Frontend: https://tujoyita.local (LAN) o                      │
│                 https://dev.tujoyita.com (Cloudflare Tunnel)        │
│    Dashboard:   https://dev.tujoyita.com/dashboard/                 │
│    phpMyAdmin:  https://phpmyadmin.jewelry.local.dev (LAN only)     │
│                                                                     │
│  Volumen MySQL: ./data/mysql (bind mount — gitignored)              │
│  Red Docker: jewelry_network                                        │
└─────────────────────────────────────────────────────────────────────┘
                          │
               git push origin main
           (solo código tracked en Git)
                          │
                          ▼
┌─────────────────── GitHub ──────────────────────────────────────────┐
│  Repo principal: tujoyitamiami-cpu/tujoyita (origin)                │
│  Mirror:         infonetwokmedia-bot/Jewelry (infonetwork)          │
│  Fork personal:  ppkapiro/Jewelry (ppkapiro)                        │
│                                                                     │
│  LO QUE ESTÁ EN GIT:           LO QUE NUNCA ESTÁ EN GIT:           │
│  ✔ dashboard/ (SPA completa)   ✗ .env (credenciales)               │
│  ✔ dashboard/.env.js           ✗ dashboard/.env.production.js       │
│  ✔ mu-plugins/jewelry-*.php    ✗ data/mysql/ (datos DB local)      │
│  ✔ docker-compose.yml          ✗ data/wordpress/ (core WP)         │
│  ✔ docker-compose.production   ✗ backups/                          │
│  ✔ scripts/                    ✗ uploads/ (media)                  │
│  ✔ .github/ (agents, prompts)  ✗ plugins de terceros              │
│  ✔ tests/                                                          │
└─────────────────────────────────────────────────────────────────────┘
                          │
          deploy-agent.sh --force (SSH + rsync)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ENTORNO PRODUCCIÓN — Hetzner VPS (89.167.101.209)                  │
│  Path: /srv/stacks/tujoyita/                                        │
│  Compose: docker-compose.production.yml                             │
│                                                                     │
│  Contenedores:                                                      │
│    tujoyita_wordpress  → WordPress + Apache                         │
│    tujoyita_mysql      → MySQL 8.0 (DB: tujoyita_db)                │
│    tujoyita_dashboard  → Nginx SPA (Dashboard)                      │
│                                                                     │
│  Credenciales DB:                                                   │
│    User: tujoyita_user / Pass: (ver .env en VPS)                    │
│    Root: (ver .env en VPS)                                          │
│                                                                     │
│  URLs:                                                              │
│    WP Frontend:  https://tujoyita.com                               │
│    WP Frontend:  https://tujoyita.com/en/ (inglés)                  │
│    Dashboard:    https://tujoyita.com/dashboard/                    │
│    wp-admin:     https://tujoyita.com/wp-admin                      │
│                                                                     │
│  Volumen MySQL: mysql-data (Docker named volume — INDEPENDIENTE)    │
│  Volumen WP:    wp-data (Docker named volume)                       │
│  Red Docker: tujoyita_internal                                      │
│  SSL: Let's Encrypt (auto-renovación via Traefik)                   │
│  DNS: Cloudflare proxy → 89.167.101.209                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Conexión SSH a Producción

```
Host tujoyita-prod
    HostName 89.167.101.209
    User root
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

Ejemplo: `ssh tujoyita-prod "docker ps"`

---

## Cloudflare Tunnel (solo dev)

- **Tunnel ID:** 28405189-659e-4350-951d-0f6792428724
- **Config:** /etc/cloudflared/config.yml
- **Dominio:** dev.tujoyita.com → Tunnel → Dell Server (192.168.12.233:443)
- **IMPORTANTE:** tujoyita.com **NO** pasa por tunnel. Va directo a Hetzner VPS via Cloudflare proxy.

---

## Qué Se Despliega y Qué NO

### ✅ SE DESPLIEGA (solo código custom):

| Recurso                                              | Método            | Destino en VPS                    |
| ---------------------------------------------------- | ----------------- | --------------------------------- |
| `data/wordpress/wp-content/mu-plugins/jewelry-*.php` | rsync por archivo | Mismo path en VPS                 |
| `dashboard/` (SPA: HTML, JS, CSS, nginx config)      | rsync --delete    | `/srv/stacks/tujoyita/dashboard/` |
| `docker-compose.production.yml`                      | scp               | `/srv/stacks/tujoyita/`           |
| `scripts/`                                           | rsync             | `/srv/stacks/tujoyita/scripts/`   |

### ❌ NUNCA SE TOCA:

| Recurso                              | Razón                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Base de datos**                    | Named volume `mysql-data` en VPS. `jewelry_db` ≠ `tujoyita_db`. Ni importar, ni exportar, ni copiar. |
| **`.env`**                           | Cada entorno tiene su propio `.env` con credenciales únicas. NUNCA copiar .env entre entornos.       |
| **`.env.js` / `.env.production.js`** | Cada entorno tiene sus propias API keys WooCommerce. NUNCA hacer rsync de `.env.js` a producción.    |
| **Uploads/media**                    | Named volume `wp-data`. Los uploads viven solo en producción.                                        |
| **Plugins terceros**                 | WooCommerce, Elementor, TranslatePress — se gestionan desde wp-admin de cada entorno.                |
| **Traducciones**                     | Tablas `wp_trp_*` dentro de la DB de producción.                                                     |
| **Productos/Pedidos**                | Datos WooCommerce en la DB de producción.                                                            |
| **DNS**                              | NUNCA redirigir tujoyita.com a otro servidor. Solo dev.tujoyita.com usa el tunnel.                   |

---

## Dashboard .env.js — CRÍTICO

El dashboard tiene DOS archivos de configuración con credenciales WooCommerce API **diferentes por entorno**:

| Archivo                        | Entorno          | API Key                      | siteUrl                  |
| ------------------------------ | ---------------- | ---------------------------- | ------------------------ |
| `dashboard/.env.js`            | Local (Git)      | `ck_c49fbf...` (jewelry_db)  | `https://tujoyita.local` |
| `dashboard/.env.production.js` | Prod (NO en Git) | `ck_28bdb9...` (tujoyita_db) | `https://tujoyita.com`   |

**REGLA:** En producción, `.env.js` es una copia de `.env.production.js`. El script `deploy-agent.sh` EXCLUYE `.env.js` y `.env.production.js` del rsync. Si por error se sobreescribe, restaurar con:

```bash
ssh tujoyita-prod "cp /srv/stacks/tujoyita/dashboard/.env.production.js /srv/stacks/tujoyita/dashboard/.env.js"
```

---

## Comandos de Deploy

### Deploy completo (recomendado):

```bash
cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --force
```

### Solo verificar (sin desplegar):

```bash
cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --check
```

### Estado de producción:

```bash
cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --status
```

### Rollback:

```bash
cd /srv/stacks/jewelry && bash scripts/deploy-agent.sh --rollback
```

### Deploy manual (emergencia):

```bash
# 1. Sincronizar dashboard (EXCLUYENDO .env.js)
rsync -avz --delete --exclude='.env.js' --exclude='.env.production.js' \
  /srv/stacks/jewelry/dashboard/ tujoyita-prod:/srv/stacks/tujoyita/dashboard/

# 2. Sincronizar mu-plugins
rsync -avz /srv/stacks/jewelry/data/wordpress/wp-content/mu-plugins/jewelry-*.php \
  tujoyita-prod:/srv/stacks/tujoyita/data/wordpress/wp-content/mu-plugins/

# 3. Recrear contenedores (MySQL NO se toca)
ssh tujoyita-prod "cd /srv/stacks/tujoyita && docker compose -f docker-compose.production.yml up -d --force-recreate wordpress dashboard"
```

---

## Fases del Deploy Agent (deploy-agent.sh)

1. **Validaciones locales** — branch main, git status limpio, archivos existen
2. **Validaciones remotas** — SSH, contenedores, disco, salud HTTPS
3. **Verificación de aislamiento** — `jewelry_db ≠ tujoyita_db`, credenciales separadas
4. **Backup automático** — `mysqldump` de producción (lectura, NO escritura)
5. **Sincronizar código** — rsync mu-plugins, dashboard (excluye .env.js), compose, scripts
6. **Recrear contenedores** — WordPress + Dashboard (MySQL NUNCA se toca)
7. **Health check** — HTTPS 200, REST API, Dashboard, Tienda

---

## Verificación Post-Deploy

```bash
# Verificar que el sitio responde
curl -sS -o /dev/null -w '%{http_code}' https://tujoyita.com
# → 200

# Verificar dashboard
curl -sS -o /dev/null -w '%{http_code}' https://tujoyita.com/dashboard/
# → 200

# Verificar que .env.js tiene credenciales correctas (producción)
curl -sS https://tujoyita.com/dashboard/.env.js | grep consumerKey
# → ck_28bdb990d80cbe830521dda1caa227bae48cc522

# Verificar WC API funciona
curl -sS -o /dev/null -w '%{http_code}' "https://tujoyita.com/dashboard/api/wc/v3/products?consumer_key=ck_28bdb990d80cbe830521dda1caa227bae48cc522&consumer_secret=cs_3f68f0e54d63ded79f258e464f3a7c9d7943abb8&per_page=1"
# → 200

# Verificar que JS no tiene console.log
curl -sS "https://tujoyita.com/dashboard/js/auth.js?v=$(date +%s)" | grep -c "console.log"
# → 0
```

---

## Errores Comunes y Soluciones

### Error: API 401 "woocommerce_rest_cannot_view"

**Causa:** `.env.js` de producción fue sobreescrito con credenciales locales.
**Solución:** `ssh tujoyita-prod "cp /srv/stacks/tujoyita/dashboard/.env.production.js /srv/stacks/tujoyita/dashboard/.env.js"`

### Error: rsync sobreescribe .env.js

**Causa:** Se usó `rsync --delete` sin `--exclude='.env.js'`.
**Solución:** SIEMPRE usar `deploy-agent.sh` que excluye automáticamente. En rsync manual, agregar `--exclude='.env.js' --exclude='.env.production.js'`.

### Error: DNS redirigido al servidor local

**Causa:** Se modificó el registro A de tujoyita.com en Cloudflare.
**Regla:** tujoyita.com SIEMPRE apunta a `89.167.101.209` (Hetzner VPS). NUNCA redirigir a tunnel ni a IP local.

### Error: Contenedores MySQL recreados

**Causa:** Se usó `docker compose up -d` sin especificar servicios.
**Solución:** SIEMPRE especificar: `docker compose up -d --force-recreate wordpress dashboard` (excluir mysql).

---

## Checklist Pre-Deploy

- [ ] Branch `main` actualizado y limpio
- [ ] Tests pasando (`cd /srv/stacks/jewelry && npm test`)
- [ ] SSH a producción funciona (`ssh tujoyita-prod "echo OK"`)
- [ ] `.env.js` local tiene credenciales LOCAL (ck_c49fb...)
- [ ] Cache buster incrementado en `dashboard/index.html`
- [ ] Commit con mensaje convencional (feat/fix/chore)
- [ ] Push a origin Y infonetwork

## Checklist Post-Deploy

- [ ] HTTPS 200 en tujoyita.com
- [ ] Dashboard 200 en tujoyita.com/dashboard/
- [ ] `.env.js` en prod tiene credenciales PROD (ck_28bdb...)
- [ ] WC API responde 200 (no 401)
- [ ] MySQL container sigue running (NO fue recreado)
- [ ] 0 console.log en JS files de producción
