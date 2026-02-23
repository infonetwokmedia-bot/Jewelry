# Problemas Comunes y Soluciones - Jewelry Project

Guía de troubleshooting para problemas frecuentes en el desarrollo y operación del sitio Jewelry.

## 📋 Tabla de Contenidos

- [Docker & Contenedores](#docker--contenedores)
- [WordPress](#wordpress)
- [WooCommerce](#woocommerce)
- [TranslatePress & Multiidioma](#translatepress--multiidioma)
- [Base de Datos](#base-de-datos)
- [Performance](#performance)
- [Seguridad](#seguridad)

---

## 🐳 Docker & Contenedores

### Contenedor no inicia

**Síntomas:**

```bash
docker compose up -d
# Error: Container exited with code 1
```

**Solución:**

1. **Ver logs:**

```bash
docker compose logs wordpress
docker compose logs mysql
```

2. **Verificar puertos:**

```bash
# Verificar si puerto 80/443 está en uso
sudo lsof -i :80
sudo lsof -i :443
```

3. **Limpiar y reiniciar:**

```bash
docker compose down
docker compose up -d --force-recreate
```

### MySQL no está listo

**Síntomas:**

```
WordPress waiting for database...
Error establishing database connection
```

**Solución:**

```bash
# Verificar que MySQL esté corriendo
docker ps | grep jewelry_mysql

# Esperar a que MySQL esté listo
docker exec jewelry_mysql mysqladmin ping -h localhost --silent

# Si no responde después de 2 minutos, revisar logs
docker logs jewelry_mysql

# Reiniciar solo MySQL
docker compose restart mysql
```

### Permisos de archivos

**Síntomas:**

```
Warning: file_put_contents(): failed to open stream: Permission denied
```

**Solución:**

```bash
# Desde el host, arreglar permisos
sudo chown -R www-data:www-data data/wordpress/wp-content/uploads/
sudo chmod -R 755 data/wordpress/wp-content/uploads/

# O desde el contenedor
docker exec jewelry_wordpress chown -R www-data:www-data /var/www/html/wp-content/uploads/
```

---

## 💼 WordPress

### Pantalla blanca (White Screen of Death)

**Síntomas:**

- Página en blanco sin error visible

**Solución:**

1. **Habilitar debug:**

```php
// Editar data/wordpress/wp-config.php
define( 'WP_DEBUG', true );
define( 'WP_DEBUG_LOG', true );
define( 'WP_DEBUG_DISPLAY', false );
```

2. **Ver log:**

```bash
tail -f data/wordpress/wp-content/debug.log
```

3. **Causas comunes:**

```bash
# Desactivar todos los plugins
docker exec jewelry_wordpress wp plugin deactivate --all --allow-root

# Activar tema default
docker exec jewelry_wordpress wp theme activate twentytwentyfour --allow-root

# Limpiar cache
./scripts/clear-cache.sh
```

### Error 500 Internal Server Error

**Solución:**

```bash
# 1. Ver logs de Apache
docker exec jewelry_wordpress tail -f /var/log/apache2/error.log

# 2. Aumentar límites PHP si es necesario
docker exec jewelry_wordpress wp eval "
    echo 'memory_limit: ' . ini_get('memory_limit') . PHP_EOL;
    echo 'max_execution_time: ' . ini_get('max_execution_time');
" --allow-root

# 3. Verificar sintaxis PHP en functions-custom.php
php -l data/wordpress/wp-content/themes/kadence/functions-custom.php
```

### No se pueden subir imágenes

**Solución:**

```bash
# Verificar límites de upload
docker exec jewelry_wordpress wp eval "
    phpinfo();
" --allow-root | grep -E 'upload_max_filesize|post_max_size'

# Verificar permisos del directorio uploads
docker exec jewelry_wordpress ls -la /var/www/html/wp-content/ | grep uploads

# Crear directorio si no existe
docker exec jewelry_wordpress mkdir -p /var/www/html/wp-content/uploads
docker exec jewelry_wordpress chown www-data:www-data /var/www/html/wp-content/uploads
docker exec jewelry_wordpress chmod 755 /var/www/html/wp-content/uploads
```

---

## 🛒 WooCommerce

### Checkout no funciona

**Síntomas:**

- Botón "Finalizar compra" no responde
- Error de validación infinito

**Solución:**

```bash
# 1. Limpiar cache de WooCommerce
docker exec jewelry_wordpress wp wc tool run regenerate_product_lookup_tables --allow-root

# 2. Verificar páginas de WooCommerce
docker exec jewelry_wordpress wp eval "
    echo 'Shop: ' . wc_get_page_id( 'shop' ) . PHP_EOL;
    echo 'Cart: ' . wc_get_page_id( 'cart' ) . PHP_EOL;
    echo 'Checkout: ' . wc_get_page_id( 'checkout' ) . PHP_EOL;
" --allow-root

# 3. Regenerar permalinks
docker exec jewelry_wordpress wp rewrite flush --allow-root

# 4. Desactivar plugins de conflicto uno por uno
docker exec jewelry_wordpress wp plugin list --allow-root
```

### Productos no aparecen en shop

**Solución:**

```bash
# Verificar que los productos estén publicados
docker exec jewelry_wordpress wp post list \
    --post_type=product \
    --post_status=publish \
    --allow-root

# Verificar que TranslatePress esté activo
docker exec jewelry_wordpress wp plugin is-active translatepress-multilingual --allow-root

# Regenerar lookup tables
docker exec jewelry_wordpress wp wc tool run regenerate_product_lookup_tables --allow-root
```

### Precios no se muestran

**Solución:**

```bash
# Verificar meta de precio
docker exec jewelry_wordpress wp post meta list <PRODUCT_ID> --allow-root | grep price

# Actualizar precio manualmente
docker exec jewelry_wordpress wp post meta update <PRODUCT_ID> _price "499.99" --allow-root
docker exec jewelry_wordpress wp post meta update <PRODUCT_ID> _regular_price "499.99" --allow-root

# Limpiar cache de WooCommerce
docker exec jewelry_wordpress wp cache flush --allow-root
```

---

## 🌍 TranslatePress & Multiidioma

### Cambio de idioma no funciona

**Síntomas:**

- Selector de idioma no cambia el contenido
- URLs no cambian entre idiomas (ej. `/en/` no funciona)

**Solución:**

```bash
# 1. Verificar que TranslatePress esté activo
docker exec jewelry_wordpress wp plugin is-active translatepress-multilingual --allow-root

# 2. Verificar configuración de TranslatePress
docker exec jewelry_wordpress wp option get trp_settings --allow-root

# 3. Verificar permalinks
docker exec jewelry_wordpress wp rewrite flush --allow-root

# 4. Verificar que las tablas de traducción existan
docker exec jewelry_wordpress wp db query "SHOW TABLES LIKE 'wp_trp_%';" --allow-root
```

### Productos sin traducción

**Solución:**

TranslatePress NO duplica posts/productos. Las traducciones se almacenan en las tablas `wp_trp_*`. Para traducir:

1. Ir al frontend del producto
2. Clic en **"Translate Page"** en la admin bar (o agregar `?trp-edit-translation=true` a la URL)
3. Clic en cada texto para editarlo en inglés
4. Guardar

```bash
# Verificar traducciones existentes en la tabla de TranslatePress
docker exec jewelry_wordpress wp db query "
SELECT original, translated, status
FROM wp_trp_dictionary_en_us_
WHERE original LIKE '%texto del producto%'
LIMIT 10;" --allow-root
```

### Traducir contenido con TranslatePress

**Método visual (recomendado):**

1. Ir a la página/producto en el frontend
2. En la admin bar, clic en **"Translate Page"**
3. Se abre el editor visual de TranslatePress
4. Clic en cualquier texto para editarlo en el idioma destino
5. Guardar

**Shortcode del language switcher:**

```php
echo do_shortcode( '[language-switcher]' );
```

> **Nota:** La sección anterior usaba Bogo, que vinculaba posts duplicados con `_bogo_translations` meta.
> El sistema actual usa TranslatePress, que NO duplica contenido — almacena traducciones en tablas `wp_trp_*`.

---

## 💾 Base de Datos

### Error de conexión a BD

**Síntomas:**

```
Error establishing a database connection
```

**Solución:**

```bash
# 1. Verificar que MySQL esté corriendo
docker ps | grep jewelry_mysql

# 2. Verificar credenciales en .env
cat .env | grep MYSQL

# 3. Verificar wp-config.php
docker exec jewelry_wordpress wp config get DB_NAME --allow-root
docker exec jewelry_wordpress wp config get DB_USER --allow-root

# 4. Test de conexión
docker exec jewelry_mysql mysql -u jewelry_user -p${MYSQL_PASSWORD} -e "SELECT 1"

# 5. Reiniciar MySQL
docker compose restart mysql
```

### Base de datos corrupta

**Solución:**

```bash
# 1. Hacer backup primero
./scripts/backup-database.sh

# 2. Reparar tablas
docker exec jewelry_mysql mysqlcheck -u jewelry_user -p${MYSQL_PASSWORD} --repair jewelry_db

# 3. Optimizar
docker exec jewelry_mysql mysqlcheck -u jewelry_user -p${MYSQL_PASSWORD} --optimize jewelry_db

# 4. Si persiste, restaurar backup
./scripts/restore-database.sh backups/db_TIMESTAMP.sql.gz
```

### Tablas no existen

**Solución:**

```bash
# Ver tablas existentes
docker exec jewelry_mysql mysql -u jewelry_user -p${MYSQL_PASSWORD} jewelry_db -e "SHOW TABLES;"

# Si faltan tablas de WordPress, reinstalar
docker exec jewelry_wordpress wp core install \
    --url=https://jewelry.local.dev \
    --title="Jewelry Store" \
    --admin_user=admin \
    --admin_email=admin@jewelry.local.dev \
    --skip-email \
    --allow-root
```

---

## ⚡ Performance

### Sitio muy lento

**Diagnóstico:**

```bash
# 1. Ver uso de recursos de contenedores
docker stats

# 2. Ver queries lentas
docker exec jewelry_mysql mysql -u jewelry_user -p${MYSQL_PASSWORD} \
    -e "SHOW FULL PROCESSLIST;"

# 3. Ver tamaño de DB
docker exec jewelry_mysql mysql -u jewelry_user -p${MYSQL_PASSWORD} \
    -e "SELECT table_schema AS 'Database',
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
        FROM information_schema.TABLES
        WHERE table_schema = 'jewelry_db';"

# 4. Ver transients acumulados
docker exec jewelry_wordpress wp transient list --allow-root | wc -l
```

**Solución:**

```bash
# Limpiar todo
./scripts/clear-cache.sh

# Eliminar revisiones antiguas
docker exec jewelry_wordpress wp post delete \
    $(docker exec jewelry_wordpress wp post list --post_type=revision --format=ids --allow-root) \
    --allow-root

# Optimizar tablas
docker exec jewelry_mysql mysqlcheck -u jewelry_user -p${MYSQL_PASSWORD} --optimize jewelry_db
```

### Out of Memory

**Solución:**

```bash
# Aumentar límite en docker-compose.yml
# Añadir bajo el servicio wordpress:
#   deploy:
#     resources:
#       limits:
#         memory: 2G

# Reiniciar contenedor
docker compose down
docker compose up -d
```

---

## 🔒 Seguridad

### Archivos sensibles expuestos

**Verificación:**

```bash
# Verificar que .env no esté en git
git ls-files | grep -E '(\.env$|credentials|\.bak)'

# Ver historial
git log --all --full-history -- .env
```

**Solución si está en historial:**

```bash
# Limpiar con git-filter-repo (backup primero!)
git filter-repo --path .env --invert-paths
git filter-repo --path .wp-credentials --invert-paths

# Forzar push (¡PELIGROSO! - Solo si estás seguro)
git push origin --force --all
```

### Rotar credenciales

**Después de exposición:**

```bash
# 1. Generar nuevas contraseñas
# Editar .env con nuevos valores

# 2. Actualizar wp-config.php
# Regenerar salt keys: https://api.wordpress.org/secret-key/1.1/salt/

# 3. Recrear contenedores
docker compose down
docker volume rm jewelry_mysql_data  # ⚠️ Esto elimina la BD
docker compose up -d

# 4. Restaurar backup con nuevas credenciales
./scripts/restore-database.sh backups/db_latest.sql.gz
```

---

## 📞 Soporte

Si el problema persiste:

1. **Revisar logs detallados:**

```bash
docker compose logs -f > debug.log
```

2. **Crear issue en GitHub** con:
   - Descripción del problema
   - Pasos para reproducir
   - Logs relevantes
   - Versiones (WP, WC, PHP)

3. **Consultar documentación:**
   - [DEVELOPMENT.md](./DEVELOPMENT.md)
   - [README.md](../README.md)
   - [.ai-tools/](../.ai-tools/)

---

**Última actualización:** 10 de febrero de 2026  
**Mantenedor:** Equipo de Desarrollo Jewelry
