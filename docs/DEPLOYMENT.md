# 🚀 Guía de Deployment — Tu Joyita Miami

## Arquitectura: Aislamiento Total entre Entornos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ENTORNO LOCAL (desarrollo)                           │
│                                                                         │
│  Container: jewelry_mysql        DB: jewelry_db                         │
│  Container: jewelry_wordpress    URL: https://jewelry.local.dev         │
│  Container: jewelry_phpmyadmin   URL: https://phpmyadmin.jewelry.local.dev │
│  Container: jewelry_dashboard    URL: https://dashboard.jewelry.local.dev │
│                                                                         │
│  Compose: docker-compose.yml     Env: .env                              │
│  Volumen MySQL: ./data/mysql (bind mount local)                         │
│  Red: jewelry_network                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                          │
                   git push (solo código)
                          │
                          ▼
┌─────────────────── GitHub ──────────────────────────────────────────────┐
│  Repo: tujoyitamiami-cpu/tujoyita                                       │
│                                                                         │
│  Lo que está en Git:                    Lo que NO está en Git:           │
│  ✔ docker-compose.production.yml       ✗ .env (credenciales)            │
│  ✔ dashboard/ (SPA)                    ✗ data/mysql/ (datos DB)         │
│  ✔ mu-plugins/jewelry-*.php            ✗ data/wordpress/ (core WP)      │
│  ✔ scripts/                            ✗ backups/                       │
│  ✔ .github/workflows/                  ✗ uploads/ (media)              │
│  ✔ Makefile                            ✗ plugins terceros               │
└─────────────────────────────────────────────────────────────────────────┘
                          │
              GitHub Actions / deploy-agent.sh
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ENTORNO PRODUCCIÓN (tujoyita.com)                     │
│                                                                         │
│  Container: tujoyita_mysql        DB: tujoyita_db                       │
│  Container: tujoyita_wordpress    URL: https://tujoyita.com             │
│  Container: tujoyita_dashboard    URL: https://tujoyita.com/dashboard/  │
│                                                                         │
│  Compose: docker-compose.production.yml   Env: .env (solo en servidor)  │
│  Volumen MySQL: mysql-data (Docker named volume)                        │
│  Red: tujoyita_internal                                                 │
│  Servidor: Hetzner VPS (/srv/stacks/tujoyita/)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## ¿Qué se despliega y qué NO?

### ✅ SE DESPLIEGA (solo código custom):

| Recurso                         | Cómo llega a producción                    |
| ------------------------------- | ------------------------------------------ |
| `mu-plugins/jewelry-*.php`      | `docker cp` al named volume                |
| `dashboard/` (SPA + nginx)      | `rsync` / `scp` al directorio del proyecto |
| `docker-compose.production.yml` | `scp` al servidor                          |
| `scripts/`                      | `rsync` al servidor                        |
| Imagen WordPress                | `docker pull` (actualización)              |

### ❌ NUNCA SE TOCA:

| Recurso               | Por qué no se toca                                                   |
| --------------------- | -------------------------------------------------------------------- |
| **Base de datos**     | Named volume `mysql-data` aislado; `jewelry_db` ≠ `tujoyita_db`      |
| **Uploads/media**     | Named volume `wp-data`; los archivos viven solo en producción        |
| **Plugins terceros**  | WooCommerce, Elementor, TranslatePress — se gestionan desde wp-admin |
| **Tema Astra**        | Se gestiona desde wp-admin                                           |
| **Traducciones**      | En tablas `wp_trp_*` dentro de la DB de producción                   |
| **Productos/pedidos** | Datos WooCommerce en la DB de producción                             |
| **Credenciales**      | `.env` nunca está en Git; cada entorno tiene el suyo                 |

---

## Métodos de Deployment

### Método 1: Deploy Agent (recomendado) 🏆

```bash
# Verificar todo sin desplegar
./scripts/deploy-agent.sh --check

# Deploy completo (interactivo, con confirmación)
./scripts/deploy-agent.sh

# Deploy forzado (sin confirmación)
./scripts/deploy-agent.sh --force

# Ver estado de producción
./scripts/deploy-agent.sh --status

# Rollback al backup pre-deploy
./scripts/deploy-agent.sh --rollback
```

**Fases del Deploy Agent:**

1. **Validaciones locales** → branch, git status, archivos, credenciales
2. **Validaciones remotas** → SSH, contenedores, disco, salud del sitio
3. **Verificación de aislamiento** → confirma `jewelry_db ≠ tujoyita_db`
4. **Backup automático** → `mysqldump` pre-deploy en producción
5. **Deploy de código** → mu-plugins, dashboard, compose, scripts
6. **Actualización de contenedores** → solo WP y Dashboard (DB intacta)
7. **Health check** → HTTPS, REST API, Dashboard, Tienda, /en/

### Método 2: GitHub Actions

1. Ir a **Actions** → `Deploy to Production`
2. Escribir `deploy` para confirmar
3. Workflow: validate → backup → deploy → health-check → notify

### Método 3: Makefile

```bash
make deploy          # Deploy completo
make health-prod     # Health check remoto
make prod-backup     # Backup en producción
make prod-pull-backup # Backup + descarga local
```

---

## Rollback

```bash
# Método rápido: Deploy Agent
./scripts/deploy-agent.sh --rollback

# Manual en el servidor:
ssh tujoyita-prod
cd /srv/stacks/tujoyita
ls -lht backups/pre-deploy_*.sql.gz
gunzip -c backups/pre-deploy_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i tujoyita_mysql mysql -u root -pPASSWORD tujoyita_db

# Revertir código:
git revert HEAD && git push origin main
./scripts/deploy-agent.sh --force
```

---

## Primer Deploy (Setup Inicial)

### 1. En el VPS

```bash
mkdir -p /srv/stacks/tujoyita/backups
cd /srv/stacks/tujoyita
```

### 2. Crear `.env` desde template

```bash
cp .env.production .env
nano .env  # Cambiar TODOS los passwords y generar salts
```

Generar WordPress salts: https://api.wordpress.org/secret-key/1.1/salt/

### 3. Levantar servicios

```bash
docker compose -f docker-compose.production.yml up -d
```

### 4. Post-install (solo una vez)

```bash
bash scripts/post-install-production.sh
```

### 5. Verificar

```bash
curl -I https://tujoyita.com
```

---

## Configuración SSH

Agregar a `~/.ssh/config`:

```
Host tujoyita-prod
    HostName 89.167.101.209
    User root
    IdentityFile ~/.ssh/id_ed25519
    Port 22
```

> **NOTA:** El usuario SSH es `root`, NO `deploy`. La clave es `id_ed25519`, NO `tujoyita_deploy`.

---

## Diferencias entre Compose Files

| Aspecto              | `docker-compose.yml` (local)         | `docker-compose.production.yml`          |
| -------------------- | ------------------------------------ | ---------------------------------------- |
| Imagen WP            | `wordpress:latest`                   | `wordpress:6.9-php8.1-apache`            |
| WP Debug             | `.env` configurable                  | `"0"` (deshabilitado)                    |
| MySQL volume         | `./data/mysql` (bind mount)          | `mysql-data` (named volume)              |
| WP volume            | `./data/wordpress` (bind mount)      | `wp-data` (named volume)                 |
| phpMyAdmin           | ✅ Incluido                          | ❌ No incluido                           |
| WP-CLI               | Siempre disponible                   | `profiles: ["cli"]`                      |
| Nginx dashboard      | `default.conf` → `jewelry_wordpress` | `production.conf` → `tujoyita_wordpress` |
| SSL                  | Self-signed (Traefik local)          | Let's Encrypt                            |
| Security headers     | Ninguno                              | HSTS, X-Frame, Referrer                  |
| `DISALLOW_FILE_EDIT` | No                                   | `true`                                   |
| Red Docker           | `jewelry_network`                    | `tujoyita_internal`                      |
| Container prefix     | `jewelry_`                           | `tujoyita_`                              |
| DB name              | `jewelry_db`                         | `tujoyita_db`                            |

---

## Archivos Clave

| Archivo                                   | Propósito                                |
| ----------------------------------------- | ---------------------------------------- |
| `scripts/deploy-agent.sh`                 | Agente de deployment completo            |
| `docker-compose.production.yml`           | Stack de producción                      |
| `.env.production`                         | Template de variables (sin credenciales) |
| `.github/workflows/deploy-production.yml` | CI/CD deploy automático                  |
| `dashboard/nginx/production.conf`         | Nginx config para producción             |
| `scripts/post-install-production.sh`      | Setup inicial (solo una vez)             |
| `scripts/backup-database.sh`              | Backup local                             |
| `scripts/test-connections.sh`             | Verificación de servicios local          |
