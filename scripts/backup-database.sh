#!/bin/bash

################################################################################
# Backup Database - Jewelry Project
# Crea backup de la base de datos MySQL con timestamp
################################################################################

set -e

# Colors para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MYSQL_CONTAINER="jewelry_mysql"
MYSQL_DATABASE="jewelry_db"
MYSQL_USER="jewelry_user"

echo -e "${YELLOW}📦 Iniciando backup de base de datos...${NC}"
echo ""

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Verificar que el contenedor MySQL esté corriendo
if ! docker ps | grep -q $MYSQL_CONTAINER; then
    echo -e "${RED}❌ Error: Contenedor MySQL no está corriendo${NC}"
    echo "Ejecuta: docker compose up -d"
    exit 1
fi

# Obtener password de .env
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}❌ Error: Archivo .env no encontrado${NC}"
    echo "Asegúrate de estar en el directorio raíz del proyecto"
    exit 1
fi

# Nombre del archivo de backup
BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql"

echo -e "${GREEN}🔍 Exportando base de datos...${NC}"
docker exec $MYSQL_CONTAINER mysqldump \
    -u $MYSQL_USER \
    -p"${MYSQL_PASSWORD}" \
    $MYSQL_DATABASE > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup creado exitosamente!${NC}"
    echo ""
    echo "📁 Ubicación: $BACKUP_FILE"

    # Comprimir backup
    echo -e "${GREEN}🗜️  Comprimiendo backup...${NC}"
    gzip "$BACKUP_FILE"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"

    # Mostrar tamaño
    SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup comprimido: ${COMPRESSED_FILE} (${SIZE})${NC}"
    echo ""

    # Limpiar backups antiguos (más de 30 días)
    echo -e "${YELLOW}🧹 Limpiando backups antiguos (>30 días)...${NC}"
    find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

    # Mostrar backups recientes
    echo ""
    echo -e "${GREEN}📋 Backups recientes:${NC}"
    ls -lh $BACKUP_DIR/*.sql.gz | tail -5

else
    echo -e "${RED}❌ Error al crear backup${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Proceso completado!${NC}"
