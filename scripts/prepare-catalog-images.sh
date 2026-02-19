#!/bin/bash

##############################################################################
# Script para preparar el directorio de imágenes del catálogo
#
# PREREQUISITO: Las imágenes deben estar transferidas desde Windows
#
# USO:
#   bash /srv/stacks/jewelry/scripts/prepare-catalog-images.sh
##############################################################################

set -e

echo ""
echo "=== PREPARANDO DIRECTORIO DE IMÁGENES DEL CATÁLOGO ==="
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorio de destino en el contenedor
CONTAINER_UPLOADS="/var/www/html/wp-content/uploads/jewelry-catalog"

# Verificar si las imágenes están en el servidor
if [ -d "/srv/stacks/jewelry/docs/catalog/images" ]; then
    echo -e "${GREEN}✅ Imágenes encontradas en el servidor${NC}"
    SOURCE_DIR="/srv/stacks/jewelry/docs/catalog/images"
else
    echo -e "${RED}❌ No se encontraron las imágenes${NC}"
    echo ""
    echo "Las imágenes deben transferirse desde Windows:"
    echo ""
    echo "Desde PowerShell en Windows:"
    echo "  scp -r C:\\Users\\pepec\\Documents\\Jewelry\\catalog\\images\\* \\"
    echo "    dell01-lan:/srv/stacks/jewelry/docs/catalog/images/"
    echo ""
    echo "O copiar manualmente a:"
    echo "  /srv/stacks/jewelry/docs/catalog/images/"
    echo ""
    exit 1
fi

# Crear directorio en el contenedor
echo "📁 Creando directorio en WordPress..."
docker exec jewelry_wordpress mkdir -p "$CONTAINER_UPLOADS"

# Copiar imágenes al contenedor
echo "📦 Copiando imágenes al contenedor..."

# Copiar full/
if [ -d "$SOURCE_DIR/full" ]; then
    echo "   • Copiando imágenes full/ ..."
    docker cp "$SOURCE_DIR/full" jewelry_wordpress:"$CONTAINER_UPLOADS/"
fi

# Copiar medium/
if [ -d "$SOURCE_DIR/medium" ]; then
    echo "   • Copiando imágenes medium/ ..."
    docker cp "$SOURCE_DIR/medium" jewelry_wordpress:"$CONTAINER_UPLOADS/"
fi

# Copiar thumbnails/
if [ -d "$SOURCE_DIR/thumbnails" ]; then
    echo "   • Copiando imágenes thumbnails/ ..."
    docker cp "$SOURCE_DIR/thumbnails" jewelry_wordpress:"$CONTAINER_UPLOADS/"
fi

# Si las imágenes están directamente en images/ (sin subdirectorios)
if [ "$(ls -A $SOURCE_DIR/*.jpg 2>/dev/null)" ] || [ "$(ls -A $SOURCE_DIR/*.webp 2>/dev/null)" ]; then
    echo "   • Copiando imágenes de la raíz..."
    docker cp "$SOURCE_DIR/." jewelry_wordpress:"$CONTAINER_UPLOADS/"
fi

# Fijar permisos
echo "🔧 Configurando permisos..."
docker exec jewelry_wordpress chown -R www-data:www-data "$CONTAINER_UPLOADS"
docker exec jewelry_wordpress find "$CONTAINER_UPLOADS" -type f -exec chmod 644 {} \;
docker exec jewelry_wordpress find "$CONTAINER_UPLOADS" -type d -exec chmod 755 {} \;

# Verificar
echo ""
echo "✅ Verificando archivos copiados..."
IMAGE_COUNT=$(docker exec jewelry_wordpress find "$CONTAINER_UPLOADS" -type f \( -name "*.jpg" -o -name "*.webp" \) | wc -l)

echo ""
echo -e "${GREEN}✅ PROCESO COMPLETADO${NC}"
echo ""
echo "📊 Estadísticas:"
echo "   • Imágenes copiadas: $IMAGE_COUNT archivos"
echo "   • Ubicación: $CONTAINER_UPLOADS"
echo ""
echo "📝 Próximo paso:"
echo "   docker exec jewelry_wordpress php /var/www/html/assign-product-images.php test"
echo ""
