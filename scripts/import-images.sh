#!/bin/bash
IMPORT_DIR="/var/www/html/wp-content/uploads/jewelry-import"
LOG="/tmp/import-images.log"
echo "Inicio importación: $(date)" > "$LOG"
TOTAL=0
IMPORTED=0
SKIPPED=0

# Listar carpetas SKU (excluir _sin-identificar, _sin-sku)
for sku_dir in $(docker exec jewelry_wordpress find "$IMPORT_DIR" -mindepth 1 -maxdepth 1 -type d | sort); do
  sku=$(basename "$sku_dir")
  # Ignorar carpetas especiales
  [[ "$sku" == _* ]] && { echo "SKIP carpeta especial: $sku" >> "$LOG"; continue; }
  
  # Verificar si la carpeta tiene imágenes
  img_count=$(docker exec jewelry_wordpress find "$sku_dir" -maxdepth 1 -name '*.jpg' -type f 2>/dev/null | wc -l)
  if [ "$img_count" -eq 0 ]; then
    echo "SKIP sin imágenes: $sku" >> "$LOG"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  echo "--- Importando SKU: $sku ($img_count imágenes) ---" >> "$LOG"
  
  for img in $(docker exec jewelry_wordpress find "$sku_dir" -maxdepth 1 -name '*.jpg' -type f | sort); do
    TOTAL=$((TOTAL+1))
    result=$(docker exec jewelry_wordpress php /var/www/html/wp-cli.phar media import "$img" --title="$sku - $(basename "$img" .jpg)" --allow-root 2>&1 | grep -v "Warning:")
    echo "  $result" >> "$LOG"
    if echo "$result" | grep -q "Imported file"; then
      IMPORTED=$((IMPORTED+1))
    fi
  done
done

echo "" >> "$LOG"
echo "Fin: $(date)" >> "$LOG"
echo "Total procesadas: $TOTAL | Importadas: $IMPORTED | Carpetas saltadas: $SKIPPED" >> "$LOG"
echo "=== IMPORTACIÓN COMPLETA ==="
echo "Total procesadas: $TOTAL | Importadas: $IMPORTED"
cat "$LOG" | tail -5
