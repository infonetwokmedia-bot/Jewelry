#!/bin/bash

#############################################################################
# 🔍 Diagnóstico de Problema de Edición en WordPress
# Soluciona: "Has intentado editar un elemento que no existe"
#############################################################################

CONTAINER="jewelry_wordpress"
WORKSPACE="/srv/stacks/jewelry"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🔍 Diagnóstico de Edición en WordPress                   ║"
echo "║     Remedio Joyería                                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PASO 1: VERIFICAR POSTS EXISTEN
# ============================================================================

echo "📋 PASO 1: Verificando que páginas existen..."
echo ""

docker exec $CONTAINER wp post get 1388 --format=table --allow-root 2>/dev/null | head -10
echo "Status Home ES: $(docker exec $CONTAINER wp post get 1388 --field=post_status --allow-root 2>/dev/null)"

docker exec $CONTAINER wp post get 1403 --format=table --allow-root 2>/dev/null | head -10
echo "Status Home EN: $(docker exec $CONTAINER wp post get 1403 --field=post_status --allow-root 2>/dev/null)"

echo ""

# ============================================================================
# PASO 2: VERIFICAR USUARIO ADMIN
# ============================================================================

echo "👤 PASO 2: Verificando usuario administrador..."
echo ""

docker exec $CONTAINER wp user list --allow-root 2>&1 | grep -v "Undefined" | head -10

echo ""

# ============================================================================
# PASO 3: VERIFICAR PLUGINS ACTIVOS
# ============================================================================

echo "🔌 PASO 3: Verificando plugins (buscando conflictos)..."
echo ""

docker exec $CONTAINER wp plugin list --status=active --allow-root 2>&1 | grep -E "bogo|kadence|gutenberg|editor" | head -20

echo ""

# ============================================================================
# PASO 4: VERIFICAR META BOGO
# ============================================================================

echo "🌐 PASO 4: Verificando Bogo meta (tradupciones)..."
echo ""

echo "Home ES (1388):"
docker exec $CONTAINER wp post meta list 1388 --allow-root 2>/dev/null | grep -i "bogo\|locale" || echo "  Sin meta Bogo"

echo ""
echo "Home EN (1403):"
docker exec $CONTAINER wp post meta list 1403 --allow-root 2>/dev/null | grep -i "bogo\|locale" || echo "  Sin meta Bogo"

echo ""

# ============================================================================
# PASO 5: VERIFICAR CACHÉ
# ============================================================================

echo "💾 PASO 5: Limpiando caché de WordPress..."
echo ""

docker exec $CONTAINER wp cache flush --allow-root 2>&1 | grep -v "Undefined"
docker exec $CONTAINER wp transient delete --all --allow-root 2>&1 | head -3

echo "✅ Caché limpiado"
echo ""

# ============================================================================
# PASO 6: FLUSH PERMALINKS
# ============================================================================

echo "🔗 PASO 6: Regenerando permalinks (estructura de URLs)..."
echo ""

docker exec $CONTAINER wp rewrite flush --allow-root 2>&1 | grep -v "Undefined"

echo "✅ Permalinks regenerados"
echo ""

# ============================================================================
# PASO 7: VERIFICAR INTEGRIDAD DE PÁGINA
# ============================================================================

echo "🧬 PASO 7: Verificando integridad de páginas..."
echo ""

for post_id in 1388 1403 1383 1404; do
    content=$(docker exec $CONTAINER wp post get $post_id --field=post_content --allow-root 2>/dev/null)
    size=${#content}

    status=$(docker exec $CONTAINER wp post get $post_id --field=post_status --allow-root 2>/dev/null)
    type=$(docker exec $CONTAINER wp post get $post_id --field=post_type --allow-root 2>/dev/null)

    echo "Post $post_id:"
    echo "  Status: $status"
    echo "  Type: $type"
    echo "  Content size: $size bytes"

    # Verificar si contiene bloques Kadence válidos
    if echo "$content" | grep -q "wp:kadence"; then
        echo "  ✅ Contiene bloques Kadence"
    else
        echo "  ⚠️  Sin bloques Kadence detectados"
    fi
    echo ""
done

# ============================================================================
# PASO 8: SOLUCIONAR PROBLEMAS COMUNES
# ============================================================================

echo "🛠️  PASO 8: Ejecutando soluciones..."
echo ""

# Solución 1: Regenerar metadatos de Bogo
echo "Solución 1: Verificando Bogo meta..."
docker exec $CONTAINER wp eval '
    $pages = array(
        1388 => "es_ES",
        1403 => "en_US",
        1383 => "es_ES",
        1404 => "en_US",
    );

    foreach ($pages as $post_id => $locale) {
        if (!get_post_meta($post_id, "_bogo_locale", true)) {
            update_post_meta($post_id, "_bogo_locale", $locale);
            echo "✓ Agregado meta _bogo_locale a post $post_id\n";
        }
    }
' --allow-root 2>/dev/null

echo ""

# Solución 2: Verificar nonces
echo "Solución 2: Limpiando nonces expirados..."
docker exec $CONTAINER wp eval '
    global $wpdb;
    $deleted = $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE \"_site_transient_nonce%\" AND option_value < UNIX_TIMESTAMP()");
    echo "Nonces limpiados: " . ($deleted === false ? "N/A" : $deleted) . "\n";
' --allow-root 2>/dev/null

echo ""

# Solución 3: Verificar permisos de usuario
echo "Solución 3: Verificando permisos de administrador..."
docker exec $CONTAINER wp eval '
    $admin = get_user_by("login", "ppkapiro");
    if ($admin) {
        if ($admin->has_cap("edit_posts")) {
            echo "✅ Usuario tiene cap: edit_posts\n";
        }
        if ($admin->has_cap("edit_pages")) {
            echo "✅ Usuario tiene cap: edit_pages\n";
        }
    }
' --allow-root 2>/dev/null

echo ""

# ============================================================================
# RESULTADO FINAL
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║  ✅ DIAGNÓSTICO COMPLETADO                                ║"
echo "║                                                            ║"
echo "║  Si aún tienes problemas de edición:                      ║"
echo "║                                                            ║"
echo "║  1. Limpia caché del navegador (Ctrl+Shift+Del)           ║"
echo "║  2. Intenta editar en navegador incógnito                 ║"
echo "║  3. Si persiste, usa el script de actualización:          ║"
echo "║     ./scripts/update-content-final.sh [page]              ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
