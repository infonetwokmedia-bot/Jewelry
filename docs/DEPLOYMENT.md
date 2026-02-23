# Guía de Despliegue - Jewelry Project

Proceso completo para desplegar el sitio WordPress/WooCommerce de Jewelry a producción.

## 📋 Tabla de Contenidos

- [Pre-requisitos](#pre-requisitos)
- [Entornos](#entornos)
- [Proceso de Despliegue](#proceso-de-despliegue)
- [Rollback](#rollback)
- [Post-Despliegue](#post-despliegue)
- [Troubleshooting](#troubleshooting)

---

## ✅ Pre-requisitos

### Verificaciones Pre-Despliegue

**Checklist obligatoria:**

```bash
# 1. CI/CD passing
# Verificar que GitHub Actions esté ✅ verde

# 2. Tests locales
./scripts/test-connections.sh

# 3. Backup reciente
./scripts/backup-database.sh

# 4. Sin errores PHP
docker exec jewelry_wordpress wp plugin list --allow-root | grep inactive
docker logs jewelry_wordpress 2>&1 | grep -i error

# 5. Todos los commits pusheados
git status
git log origin/main..HEAD

# 6. Merge a develop primero
git checkout develop
git merge feature/nombre-feature
git push origin develop

# 7. Código reviewed (PR aprobado)
# Ver CONTRIBUTING.md
```

### Información Necesaria

- **Servidor de producción:** IP/hostname
- **Acceso SSH:** user@host
- **Credenciales BD:** usuario/password producción
- **Dominio:** jewelry.com (ejemplo)
- **SSL:** Certificado válido

---

## 🌍 Entornos

### Local Development (`jewelry.local.dev`)

```yaml
URL: https://jewelry.local.dev
PHP: 8.1
MySQL: 8.0
Docker: Sí
Debug: Habilitado
SSL: Self-signed
```

### Staging (opcional)

```yaml
URL: https://staging.jewelry.com
PHP: 8.1+
MySQL: 8.0
Debug: Limitado
SSL: Let's Encrypt
```

### Production (`jewelry.com`)

```yaml
URL: https://jewelry.com
PHP: 8.2
MySQL: 8.0
Debug: Deshabilitado
SSL: Comercial
CDN: Cloudflare (ejemplo)
Backup: Diario automático
```

---

## 🚀 Proceso de Despliegue

### Paso 1: Preparación Local

```bash
# 1. Asegurar que estás en develop
git checkout develop
git pull origin develop

# 2. Merge main (si hay hotfixes)
git merge main

# 3. Crear tag de release
git tag -a v1.0.0 -m "Release v1.0.0 - Descripción"
git push origin v1.0.0

# 4. Backup local final
./scripts/backup-database.sh

# 5. Exportar solo la data (sin estructura)
docker exec jewelry_mysql mysqldump \
    -u jewelry_user -p${MYSQL_PASSWORD} \
    --no-create-info \
    --skip-triggers \
    jewelry_db > migration_data.sql
```

### Paso 2: Preparar Servidor Producción

**En el servidor de producción (vía SSH):**

```bash
# Conectar al servidor
ssh user@production-server.com

# Crear directorio para el proyecto
sudo mkdir -p /var/www/jewelry
cd /var/www/jewelry

# Clonar repositorio (si es primera vez)
git clone https://github.com/usuario/jewelry.git .
git checkout tags/v1.0.0

# O actualizar existente
git fetch --all
git checkout tags/v1.0.0

# Copiar .env desde backup seguro (Vault, 1Password, etc.)
cp /secure/backup/.env.production .env

# Verificar permisos
sudo chown -R www-data:www-data wp-content/uploads/
sudo chmod -R 755 wp-content/uploads/
```

### Paso 3: Base de Datos

**Opción A: Primera instalación**

```bash
# Importar estructura + data completa
mysql -u prod_user -p prod_database < full_backup.sql

# Actualizar URLs
# Desde WordPress:
cd /var/www/jewelry
wp search-replace 'https://jewelry.local.dev' 'https://jewelry.com' \
    --all-tables \
    --precise \
    --allow-root
```

**Opción B: Actualización (con contenido existente)**

```bash
# Backup de producción primero!
mysqldump -u prod_user -p prod_database > prod_backup_$(date +%Y%m%d).sql

# Importar solo cambios necesarios
# (productos nuevos, cambios de configuración, etc.)
mysql -u prod_user -p prod_database < migration_data.sql
```

### Paso 4: Archivos WordPress

**Actualizar solo lo necesario:**

```bash
# NO tocar wp-admin/ ni wp-includes/ (a menos que sea core update)

# Actualizar tema custom
rsync -av --delete \
    wp-content/themes/kadence/ \
    /var/www/jewelry/wp-content/themes/kadence/

# Actualizar plugins custom (si existen)
rsync -av --delete \
    wp-content/plugins/jewelry-custom/ \
    /var/www/jewelry/wp-content/plugins/jewelry-custom/

# Subir imágenes nuevas (si es necesario)
rsync -av \
    wp-content/uploads/2026/ \
    /var/www/jewelry/wp-content/uploads/2026/
```

### Paso 5: Configuración

**Verificar wp-config.php de producción:**

```php
<?php
// wp-config.php de producción

// Database
define( 'DB_NAME', 'prod_database' );
define( 'DB_USER', 'prod_user' );
define( 'DB_PASSWORD', 'STRONG_PASSWORD_HERE' );
define( 'DB_HOST', 'localhost' );

// Debug OFF en producción
define( 'WP_DEBUG', false );
define( 'WP_DEBUG_LOG', false );
define( 'WP_DEBUG_DISPLAY', false );

// Memory
define( 'WP_MEMORY_LIMIT', '256M' );
define( 'WP_MAX_MEMORY_LIMIT', '512M' );

// Security
define( 'DISALLOW_FILE_EDIT', true );
define( 'FORCE_SSL_ADMIN', true );

// Cache
define( 'WP_CACHE', true );

// Salts únicos (regenerar en https://api.wordpress.org/secret-key/1.1/salt/)
define( 'AUTH_KEY',         'UNIQUE_HASH_HERE' );
// ... resto de salts
```

### Paso 6: Activar Cambios

```bash
# Desde WordPress en producción

# 1. Limpiar cache
wp cache flush --allow-root

# 2. Regenerar permalinks
wp rewrite flush --allow-root

# 3. Regenerar thumbnails si hay cambios en imágenes
wp media regenerate --yes --allow-root

# 4. Verificar plugins activos
wp plugin list --allow-root

# 5. Verificar tema activo
wp theme list --allow-root

# 6. Test rápido de WooCommerce
wp wc tool run regenerate_product_lookup_tables --allow-root
```

### Paso 7: Verificación Post-Deploy

```bash
# Health checks
curl -I https://jewelry.com
curl https://jewelry.com/shop/

# Verificar SSL
openssl s_client -connect jewelry.com:443 -servername jewelry.com

# Verificar sitemap (si hay plugin SEO)
curl https://jewelry.com/sitemap.xml

# Test de idiomas
curl https://jewelry.com/?lang=es
curl https://jewelry.com/?lang=en

# Verificar WooCommerce
curl https://jewelry.com/cart/
curl https://jewelry.com/checkout/
```

---

## 🔄 Rollback

Si algo sale mal, procedimiento de rollback:

### Rollback Código

```bash
# Volver a tag anterior
git checkout tags/v1.0.0-previous
git pull origin tags/v1.0.0-previous

# O revertir commit específico
git revert <commit-hash>
git push origin main

# Reiniciar servicios
sudo systemctl restart apache2
# O si es PHP-FPM:
sudo systemctl restart php8.2-fpm
```

### Rollback Base de Datos

```bash
# Restaurar backup pre-deploy
mysql -u prod_user -p prod_database < prod_backup_TIMESTAMP.sql

# Verificar que se restauró correctamente
mysql -u prod_user -p prod_database -e "SELECT option_value FROM wp_options WHERE option_name='siteurl';"

# Limpiar cache
wp cache flush --allow-root
wp rewrite flush --allow-root
```

### Notificación de Rollback

```bash
# Notificar al equipo (Slack, Email, etc.)
echo "⚠️ ROLLBACK ejecutado en producción por [motivo]" | notify-team
```

---

## ✅ Post-Despliegue

### Checklist Post-Deploy (primeras 24 horas)

**Inmediatamente después:**

- [ ] Homepage carga correctamente
- [ ] Selector de idioma funciona (ES ↔ EN)
- [ ] Shop muestra productos
- [ ] Producto individual carga con precio
- [ ] Añadir al carrito funciona
- [ ] Checkout funciona (test con payment gateway en modo test)
- [ ] Formulario de contacto funciona
- [ ] SSL válido (candado verde en navegador)
- [ ] Google Analytics tracking (si aplica)
- [ ] Velocidad aceptable (<3s load time)

**Primeras 2 horas:**

```bash
# Monitorear logs de error
tail -f /var/log/apache2/error.log | grep -i "jewelry"

# Ver queries lentas
mysql -u prod_user -p -e "SHOW FULL PROCESSLIST;"

# Verificar uso de recursos
top
htop
df -h
```

**Primeras 24 horas:**

```bash
# Backup de seguridad post-deploy
mysqldump -u prod_user -p prod_database | gzip > post_deploy_$(date +%Y%m%d).sql.gz

# Monitorear errores acumulados
wp post list --post_type=shop_order --post_status=failed --allow-root

# Revisar analytics
# Google Analytics, Search Console, etc.
```

---

## 🔧 Troubleshooting

### Errores Comunes en Deploy

| Error                     | Causa                              | Solución                            |
| ------------------------- | ---------------------------------- | ----------------------------------- |
| 500 Internal Server Error | Syntax error PHP                   | Ver logs Apache/PHP-FPM             |
| 404 en páginas            | Permalinks no regenerados          | `wp rewrite flush`                  |
| Tienda vacía              | Problema traducción TranslatePress | Verificar tablas `wp_trp_*`         |
| Checkout roto             | Plugin incompatible actualizado    | Desactivar plugin, rollback versión |
| Imágenes rotas            | Permisos uploads/                  | `chmod 755`, `chown www-data`       |
| SSL error                 | Certificado expirado               | Renovar Let's Encrypt o comercial   |

### Logs Importantes

```bash
# Apache errors
tail -f /var/log/apache2/error.log

# PHP errors (si WP_DEBUG_LOG = true)
tail -f /var/www/jewelry/wp-content/debug.log

# MySQL slow queries
# Habilitar en /etc/mysql/my.cnf:
# slow_query_log = 1
# slow_query_log_file = /var/log/mysql/slow-queries.log
# long_query_time = 2
tail -f /var/log/mysql/slow-queries.log

# System logs
journalctl -u apache2 -f
```

### Contacto de Emergencia

Si algo crítico falla:

1. **Rollback inmediato** (ver sección Rollback)
2. **Notificar al equipo**
3. **Crear issue urgente en GitHub** con label `priority: critical`
4. **Documentar el incidente** en logs/

---

## 📚 Referencias

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Workflow de desarrollo
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Problemas comunes
- [README.md](../README.md) - Documentación general
- [WordPress Deployment Guide](https://wordpress.org/support/article/automated-deployment/)

---

**Última actualización:** 10 de febrero de 2026  
**Mantenedor:** Equipo de Desarrollo Jewelry  
**Próxima revisión:** Antes de cada release mayor
