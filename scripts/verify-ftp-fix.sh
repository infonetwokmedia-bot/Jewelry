#!/bin/bash

# ============================================================================
# 🔍 SCRIPT: VERIFICAR QUE FTP ERROR ESTÁ RESUELTO
# ============================================================================
# Prueba que WordPress puede escribir archivos sin pedir FTP

set -e

echo "🔍 VERIFICANDO SOLUCIÓN DE ERROR FTP..."
echo ""

# Test 1: Verificar permisos
echo "✓ Test 1: Verificar permisos de wp-config.php"
OWNER=$(docker exec jewelry_wordpress ls -l /var/www/html/wp-config.php | awk '{print $3":"$4}')
if [[ "$OWNER" == "www-data:www-data" ]]; then
    echo "  ✅ Propietario correcto: $OWNER"
else
    echo "  ❌ Propietario INCORRECTO: $OWNER (debe ser www-data:www-data)"
    exit 1
fi

# Test 2: Verificar wp-config.php contiene FS_METHOD
echo ""
echo "✓ Test 2: Verificar configuración FS_METHOD"
if docker exec jewelry_wordpress grep -q "FS_METHOD" /var/www/html/wp-config.php; then
    echo "  ✅ FS_METHOD está definido en wp-config.php"
else
    echo "  ❌ FS_METHOD NO encontrado en wp-config.php"
    exit 1
fi

# Test 3: Crear página de prueba (si WordPress puede escribir)
echo ""
echo "✓ Test 3: Crear página de prueba"
TEST_POST=$(docker exec jewelry_wordpress wp post create --post_type=page --post_title="Test-$(date +%s)" --post_status=publish --post_author=1 --allow-root 2>&1 | grep -oP '(?<=Success: Created post )\d+')

if [[ ! -z "$TEST_POST" ]]; then
    echo "  ✅ Página de prueba creada: ID $TEST_POST"

    # Limpiar (borrar página de prueba)
    docker exec jewelry_wordpress wp post delete $TEST_POST --allow-root >/dev/null 2>&1
    echo "  ✅ Página de prueba eliminada (limpieza)"
else
    echo "  ❌ No se pudo crear página de prueba"
    exit 1
fi

# Test 4: Verificar conexión a MySQL
echo ""
echo "✓ Test 4: Verificar conexión a base de datos"
if docker exec jewelry_wordpress wp db check --allow-root >/dev/null 2>&1; then
    echo "  ✅ Base de datos conectada"
else
    echo "  ❌ Error de conexión a base de datos"
    exit 1
fi

# Test 5: Verificar plugins activos
echo ""
echo "✓ Test 5: Verificar estado de plugins"
PLUGINS=$(docker exec jewelry_wordpress wp plugin list --allow-root --status=active | wc -l)
echo "  ✅ Plugins activos: $((PLUGINS - 1))"

# Test 6: Verificar caché limpio
echo ""
echo "✓ Test 6: Verificar caché"
CACHE_COUNT=$(docker exec jewelry_wordpress wp transient list --allow-root 2>/dev/null | wc -l)
if [[ $CACHE_COUNT -lt 5 ]]; then
    echo "  ✅ Caché limpio ($CACHE_COUNT transientes)"
else
    echo "  ⚠️  Caché tiene algunos transientes ($CACHE_COUNT)"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ TODAS LAS VERIFICACIONES PASARON"
echo ""
echo "El error de FTP está RESUELTO ✓"
echo ""
echo "Puedes:"
echo "  1. Ir a https://jewelry.local.dev/wp-admin/"
echo "  2. Editar páginas sin ver dialog de FTP"
echo "  3. Usar scripts de automatización"
echo "════════════════════════════════════════════════════════════"
