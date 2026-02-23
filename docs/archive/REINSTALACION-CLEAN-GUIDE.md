# 🔄 Guía de Reinstalación Limpia de WordPress - Jewelry Project

**Fecha:** 2026-02-11  
**Estado:** ✅ Base de datos y archivos limpiados - Listo para instalación

## ✅ Completado Hasta Ahora

1. ✅ **Backup de seguridad creado:**
   - Base de datos: `/srv/stacks/jewelry/backups/pre-reinstall-20260211-222934/database-backup.sql` (4.4MB)
   - Base de datos adicional: `/srv/stacks/jewelry/backups/pre-reinstall-20260211-223050/database-backup.sql`
   - Uploads respaldados

2. ✅ **Contenedores detenidos y limpiados:**
   - Todos los datos de MySQL eliminados
   - Todos los archivos de WordPress eliminados

3. ✅ **Contenedores reiniciados:**
   - `jewelry_mysql` - ✅ Corriendo
   - `jewelry_wordpress` - ✅ Corriendo
   - `jewelry_phpmyadmin` - ✅ Corriendo

4. ✅ **WordPress descargado:**
   - Archivos core copiados
   - Apache funcionando
   - Base de datos lista

## 📋 Pasos Siguientes

### PASO 1: Instalación Inicial de WordPress (Manual)

1. **Abrir el navegador** y ve a: **<https://jewelry.local.dev>**

2. **Completar el asistente de instalación** con estos datos:

   ```
   Título del sitio:   Jewelry Miami
   Nombre de usuario:  admin
   Contraseña:         Admin@2026!
   Email:             admin@jewelry.local.dev
   ```

3. **Desmarcar** "Disuadir a los motores de búsqueda de indexar este sitio" (si aparece)

4. **Hacer clic en "Instalar WordPress"**

5. **Iniciar sesión** con las credenciales arriba

### PASO 2: Configuración Automática de Plugins e Idiomas

Una vez completada la instalación manual, ejecuta el script de configuración:

```bash
cd /srv/stacks/jewelry
./scripts/setup-wordpress-clean.sh
```

Este script instalará automáticamente:

- ✅ Idiomas: Español (es_ES) + English (en_US)
- ✅ Tema: Kadence + Kadence Starter Templates
- ✅ WooCommerce (configurado para Miami, FL - USD)
- ✅ Bogo (plugin multiidioma)
- ✅ Contact Form 7
- ✅ Elementor
- ✅ Configuración de permalinks
- ✅ FS_METHOD='direct' (sin errores FTP)
- ✅ Permisos correctos

### PASO 3: Configurar Bogo para Multiidioma

Después de ejecutar el script:

1. **Ir a:** WP Admin → Configuración → Bogo

2. **Verificar que los idiomas estén configurados:**
   - Español (es_ES) - Idioma principal
   - English (en_US) - Idioma secundario

3. **Configurar opciones:**
   - ✅ Habilitar el switcher de idiomas en el menú
   - ✅ Mostrar flags en el switcher

### PASO 4: Configurar WooCommerce

1. **Ir a:** WooCommerce → Configuración

2. **Completar el asistente de configuración:**
   - Dirección: Miami, FL, USA
   - Moneda: USD ($)
   - Unidades: Imperial (lbs, inches)
   - Impuestos: Configurar según Florida

3. **Crear páginas de WooCommerce bilingües** (el script ya crea las páginas base en inglés)

### PASO 5: Crear Estructura de Páginas Bilingües

Crear estas páginas en **ambos idiomas** y vincularlas con Bogo:

#### Páginas en Español

- Inicio
- Tienda (ya creada por WooCommerce)
- Nosotros
- Materiales
- Contacto
- Blog
- Mi Cuenta (ya creada por WooCommerce)
- Carrito (ya creada por WooCommerce)
- Finalizar Compra (ya creada por WooCommerce)

#### Páginas en English

- Home
- Shop (ya creada por WooCommerce)
- About Us
- Materials
- Contact
- Blog
- My Account (ya creada por WooCommerce)
- Cart (ya creada por WooCommerce)
- Checkout (ya creada por WooCommerce)

**Vincular cada pareja de páginas:**

1. Editar página en español
2. En el meta box de "Bogo", seleccionar la página equivalente en inglés
3. Guardar

### PASO 6: Crear Menús Bilingües

1. **Ir a:** Apariencia → Menús

2. **Crear menú en español:**
   - Nombre: `primary_navigation_es`
   - Ubicación: Primary Navigation
   - Agregar páginas en español

3. **Crear menú en inglés:**
   - Nombre: `primary_navigation_en`
   - Ubicación: Primary Navigation (cuando el idioma esté en inglés)
   - Agregar páginas en inglés

4. **Agregar función custom** al tema para cambio automático:
   - Archivo: `data/wordpress/wp-content/themes/kadence/functions-custom.php`
   - La función ya debe existir si restauraste el backup

### PASO 7: Configurar Categorías de Productos (Bilingües)

Crear categorías en **ambos idiomas** y vincularlas:

1. **Categorías en Español:**
   - Cadenas de Oro
   - Urban & Iced Out
   - Pulseras y Manillas
   - Relojes de Lujo

2. **Categorías en English:**
   - Gold Chains
   - Urban & Iced Out
   - Bracelets
   - Luxury Watches

**Vincular categorías:**

- Usar taxonomía de Bogo para vincular cada par

### PASO 8: Crear Productos del Catálogo

Ahora puedes empezar a crear productos del catálogo WhatsApp:

1. **Productos → Añadir nuevo**
2. **Crear en español primero**
3. **Crear versión en inglés**
4. **Vincular con Bogo:**
   - En el meta box de Bogo de cada producto
   - Seleccionar el producto equivalente en el otro idioma

## 🔧 Comandos Útiles

### Ver logs

```bash
docker compose logs -f wordpress
docker compose logs -f mysql
```

### Listar plugins instalados

```bash
docker run --rm \
  --volumes-from jewelry_wordpress \
  --network jewelry_jewelry_network \
  -e WORDPRESS_DB_HOST=mysql:3306 \
  -e WORDPRESS_DB_NAME=jewelry_db \
  -e WORDPRESS_DB_USER=jewelry_user \
  -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
  wordpress:cli \
  plugin list --allow-root
```

### Limpiar caché

```bash
docker run --rm \
  --volumes-from jewelry_wordpress \
  --network jewelry_jewelry_network \
  -e WORDPRESS_DB_HOST=mysql:3306 \
  -e WORDPRESS_DB_NAME=jewelry_db \
  -e WORDPRESS_DB_USER=jewelry_user \
  -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
  wordpress:cli \
  cache flush --allow-root
```

### Regenerar permalinks

```bash
docker run --rm \
  --volumes-from jewelry_wordpress \
  --network jewelry_jewelry_network \
  -e WORDPRESS_DB_HOST=mysql:3306 \
  -e WORDPRESS_DB_NAME=jewelry_db \
  -e WORDPRESS_DB_USER=jewelry_user \
  -e WORDPRESS_DB_PASSWORD='jewelry_pass_2026!' \
  wordpress:cli \
  rewrite flush --allow-root
```

## 📊 Información de Acceso

### URLs

- 🌐 Frontend: <https://jewelry.local.dev>
- 🔧 Admin: <https://jewelry.local.dev/wp-admin>
- 📊 phpMyAdmin: <https://phpmyadmin.jewelry.local.dev>

### Credenciales WordPress

- 👤 Usuario: `admin`
- 🔑 Contraseña: `Admin@2026!`

### Credenciales Base de Datos

- 🗄️ Base de datos: `jewelry_db`
- 👤 Usuario: `jewelry_user`
- 🔑 Contraseña: `jewelry_pass_2026!`
- 🔑 Root password: `jewelry_root_2026_secure!`

## ⚠️ Importante

### Regla de Oro: Siempre Contenido Bilingüe

- ✅ **SIEMPRE** crear contenido en **AMBOS** idiomas
- ✅ **SIEMPRE** vincular las versiones con Bogo
- ✅ Usar prefijo `jewelry_` para funciones custom
- ✅ Seguir WordPress Coding Standards

### Archivos a NO Modificar

- ❌ Core de WordPress: `wp-admin/`, `wp-includes/`
- ❌ Core de plugins (excepto si es custom)
- ❌ Base de datos directamente (usar WP_Query)

### Archivos para Personalizaciones

- ✅ `data/wordpress/wp-content/themes/kadence/functions-custom.php`
- ✅ `data/wordpress/wp-content/plugins/jewelry-custom/` (crear si es necesario)

## 🚀 Estado del Proyecto

Una vez completados todos los pasos, deberías tener:

- ✅ WordPress limpio instalado
- ✅ Tema Kadence activado
- ✅ WooCommerce configurado
- ✅ Bogo funcionando con ES + EN
- ✅ Plugins esenciales instalados
- ✅ Estructura de páginas lista
- ✅ Menús bilingües configurados
- ⏳ Pendiente: Agregar productos (~50+)
- ⏳ Pendiente: Contenido de páginas
- ⏳ Pendiente: Imágenes y media

## 📞 Siguiente Sesión

Para la próxima sesión, estaremos listos para:

1. Crear productos masivamente
2. Diseñar páginas con Elementor
3. Configurar emails bilingües de WooCommerce
4. Instalar y configurar plugin SEO
5. Optimizar rendimiento

---

**¿Necesitas ayuda?** Los backups están en: `/srv/stacks/jewelry/backups/`
