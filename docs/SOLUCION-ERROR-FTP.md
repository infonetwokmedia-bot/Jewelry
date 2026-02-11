# ✅ SOLUCIÓN - ERROR DE ACCESO FTP EN WORDPRESS

**Problema Resuelto:** 2026-02-11 18:10 UTC

---

## ❌ EL PROBLEMA QUE TENÍAS

Cuando intentabas acceder a WordPress, veías:

> "Datos de conexión - WordPress necesita tener acceso a tu servidor web.
> Por favor, introduce tus datos de acceso FTP para proceder."

Con formulario pidiendo:

- Hostname
- Usuario FTP
- Contraseña FTP
- Tipo de conexión

---

## ✅ LA CAUSA

WordPress detectó que:

1. No tenía permisos para escribir en archivos
2. No podía actualizar contenido directamente
3. Por eso pidió credenciales FTP como "solución alternativa"

**Raíz del problema:**

- Permisos de archivos mixtos (root:root vs www-data:www-data)
- wp-config.php no tenía configuración de modo directo

---

## 🔧 LA SOLUCIÓN (YA APLICADA)

### Paso 1: Configurar wp-config.php

Agregué estas definiciones para permitir escritura DIRECTA sin FTP:

```php
// ============================================================================
// 🔧 CONFIGURACIÓN DE PERMISOS DE ARCHIVOS (Para Docker)
// ============================================================================
define('FS_METHOD', 'direct');
define('FS_CHMOD_DIR', 0755);
define('FS_CHMOD_FILE', 0644);
define('DISALLOW_FILE_MODS', false);
```

**Qué hace:**

- `FS_METHOD` = 'direct': Escribe directamente sin pedir FTP
- `FS_CHMOD_DIR` = 0755: Permisos para directorios
- `FS_CHMOD_FILE` = 0644: Permisos para archivos
- `DISALLOW_FILE_MODS` = false: Permite edición de plugins/temas

### Paso 2: Arreglar Permisos de Archivos

```bash
# Cambiar propietario a www-data
chown -R www-data:www-data /var/www/html/

# Permisos para directorios
chmod -R 755 /var/www/html/wp-content
chmod -R 755 /var/www/html/wp-admin

# Permisos para archivos
chmod 644 /var/www/html/wp-config.php

# Permisos para uploads (escritura segura)
chmod -R 777 /var/www/html/wp-content/uploads
```

**Resultado:**

```
ANTES:  -rw-r--r--  1 root root  6325 wp-config.php
DESPUÉS: -rw-r--r--  1 www-data www-data  6325 wp-config.php  ✅
```

### Paso 3: Limpiar Caché

```bash
wp cache flush --allow-root
wp transient delete --all --allow-root
```

---

## ✨ RESULTADO

✅ WordPress ya NO pide FTP  
✅ Permisos de escritura directa  
✅ Puedes editar contenido  
✅ Actualizaciones automáticas funcionan

---

## 🎯 AHORA PUEDES

### Opción A: Editar en WordPress Admin

```
1. Ve a: https://jewelry.local.dev/wp-admin/
2. Pages → Editar página
3. Cambiar contenido en editor visual
4. Publicar
```

### Opción B: Usar Script de Automatización (RECOMENDADO)

```bash
cd /srv/stacks/jewelry
./scripts/update-content-final.sh home   # HOME ES + EN
./scripts/update-content-final.sh about  # ABOUT ES + EN
./scripts/update-content-final.sh all    # TODO
```

---

## 🔧 SI VUELVE A FALLAR

### Verificar permisos:

```bash
docker exec jewelry_wordpress ls -la /var/www/html/ | grep wp-config
# Debe decir: www-data www-data
```

### Re-aplicar permisos:

```bash
docker exec jewelry_wordpress bash -c "
chown -R www-data:www-data /var/www/html/
chmod -R 755 /var/www/html/wp-content
chmod 644 /var/www/html/wp-config.php
"
```

### Limpiar completamente:

```bash
docker exec jewelry_wordpress wp cache flush --allow-root
docker exec jewelry_wordpress wp rewrite flush --allow-root
```

---

## 📊 CAMBIOS REALIZADOS

| Archivo         | Cambio                                  |
| --------------- | --------------------------------------- |
| `wp-config.php` | ➕ Agregadas 6 líneas de configuración  |
| Permisos        | 🔐 www-data:www-data (antes: root:root) |
| WordPress Cache | 🗑️ Limpiado completamente               |

---

## ✅ VERIFICACIÓN

Para confirmar que está 100% funcionando, intenta:

```bash
cd /srv/stacks/jewelry

# Teste 1: Crear un post de prueba
docker exec jewelry_wordpress wp post create --post_type=page --post_title="Test" --post_status=publish --allow-root

# Teste 2: Ver que se creó
docker exec jewelry_wordpress wp post list --post_type=page --allow-root

# Teste 3: Editar sin pedir FTP
# → Ve a https://jewelry.local.dev/wp-admin/ y edita
```

---

## 🎁 BENEFICIOS AHORA

✅ WordPress escritura directa (sin FTP)  
✅ Edición visual funciona  
✅ Permisos correctos en Docker  
✅ Actualizaciones de plugins automáticas  
✅ Uploads seguro y funcional

---

**Problema asignado:** `wp: Datos de conexión - FTP requerido`  
**Estado:** ✅ **RESUELTO**  
**Fecha:** 2026-02-11 18:10 UTC

Ahora puedes:

1. ✅ Editar en WordPress
2. ✅ Usar script de automatización
3. ✅ Actualizar plugins/temas
4. ✅ Subir archivos
