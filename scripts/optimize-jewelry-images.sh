#!/bin/bash
SRC="/srv/stacks/jewelry/images-catalog"
LOG="/tmp/optimize-images.log"
echo "Inicio: $(date)" > $LOG
TOTAL=0; SKIP=0; DONE=0
find "$SRC" -name '*.jpg' | sort | while read img; do
  TOTAL=$((TOTAL+1))
  sz=$(stat -c%s "$img")
  w=$(identify -format '%w' "$img" 2>/dev/null || echo 0)
  if [ "$sz" -lt 51200 ] && [ "$w" -lt 500 ]; then
    echo "SKIP (muy pequeña): $img [${sz}B, ${w}px]" >> $LOG
    SKIP=$((SKIP+1))
    continue
  fi
  mogrify -resize '1200x1200>' -quality 85 -strip "$img"
  new_sz=$(stat -c%s "$img")
  echo "OK: $img [antes:${sz}B → después:${new_sz}B]" >> $LOG
  DONE=$((DONE+1))
done
echo "Fin: $(date)" >> $LOG
echo "Log: $LOG"
