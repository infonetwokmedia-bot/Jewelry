# Transferencia de Imágenes del Catálogo

## Estado Actual

Las **112 imágenes** procesadas del catálogo están en la máquina Windows y necesitan transferirse al servidor.

---

## Opción 1: Transferir desde Windows via SCP

### Desde PowerShell en Windows:

```powershell
# Transferir todas las imágenes al servidor
scp -r "C:\Users\pepec\Documents\Jewelry\catalog\images\*" `
  dell01-lan:/srv/stacks/jewelry/docs/catalog/images/
```

### Verificar en el servidor:

```bash
ls -lh /srv/stacks/jewelry/docs/catalog/images/
```

---

## Opción 2: Transferir vía USB/Compartido de Red

Si SCP no funciona, copiar manualmente:

1. Copiar la carpeta `C:\Users\pepec\Documents\Jewelry\catalog\images\` a USB
2. En el servidor, montar USB y copiar:
   ```bash
   cp -r /media/usb/images/* /srv/stacks/jewelry/docs/catalog/images/
   ```

---

## Opción 3: Imágenes de Ejemplo (Para Testing)

Si aún no tienes las imágenes reales, puedes usar placeholders:

```bash
# Crear imágenes de ejemplo para testing
mkdir -p /srv/stacks/jewelry/docs/catalog/images/full
cd /srv/stacks/jewelry/docs/catalog/images/full

# Descargar imágenes placeholder (requiere imagemagick)
for i in {1..31}; do
  convert -size 1200x1200 xc:lightgray \
    -pointsize 72 -fill black \
    -gravity center -annotate +0+0 "PROD-$(printf "%03d" $i)" \
    "placeholder-$i.jpg"
done
```

---

## Una vez transferidas las imágenes:

### 1. Preparar directorio en WordPress:

```bash
bash /srv/stacks/jewelry/scripts/prepare-catalog-images.sh
```

### 2. Asignar imágenes a productos (modo prueba):

```bash
docker cp /srv/stacks/jewelry/scripts/assign-product-images.php jewelry_wordpress:/var/www/html/
docker exec jewelry_wordpress php /var/www/html/assign-product-images.php test
```

### 3. Asignar todas las imágenes:

```bash
docker exec jewelry_wordpress php /var/www/html/assign-product-images.php all
```

---

## Estructura de Imágenes Esperada

```
/srv/stacks/jewelry/docs/catalog/images/
├── full/                  ← 1200px (para producto)
│   ├── IMG-20260205-WA0001.jpg
│   ├── IMG-20260205-WA0002.jpg
│   └── ...
├── medium/                ← 800px (opcional)
│   └── ...
└── thumbnails/            ← 300px (opcional)
    └── ...
```

**Nota:** WordPress generará automáticamente los thumbnails necesarios desde las imágenes `full/`.

---

## Verificar Imágenes Transferidas

```bash
# Contar imágenes
find /srv/stacks/jewelry/docs/catalog/images -name "*.jpg" | wc -l

# Listar primeras 10
ls /srv/stacks/jewelry/docs/catalog/images/full/ | head -10

# Ver tamaño total
du -sh /srv/stacks/jewelry/docs/catalog/images/
```

---

## Troubleshooting

### Error: "Permission denied"

```bash
chmod +x /srv/stacks/jewelry/scripts/prepare-catalog-images.sh
```

### Error: "No such file or directory"

Verificar que la ruta en Windows sea correcta:

```powershell
Test-Path "C:\Users\pepec\Documents\Jewelry\catalog\images"
```

### Imágenes no se asignan

Verificar que los nombres en el CSV coincidan con los archivos:

```bash
grep "images" /srv/stacks/jewelry/docs/catalog/data/catalog_editable.csv | head -5
```

---

**Estado:** ⏳ Pendiente de transferencia desde Windows
