# Categorías del Catálogo – Mapeo WooCommerce

**Categorías existentes en WordPress:** 4 parejas (EN/ES)  
**Categorías nuevas del catálogo:** 6  
**Acción necesaria:** Crear nuevas + mapear existentes

---

## Mapeo: Categorías del catálogo → WooCommerce

### Ya existentes en WooCommerce (reutilizar)

| Catálogo | WooCommerce ES | WooCommerce EN | Productos nuevos |
|----------|----------------|----------------|-----------------|
| Cadenas (Chains) | Cadenas de Oro | Gold Chains | +13 (ya tiene 2) |
| Pulseras (Bracelets) | Pulseras y Manillas | Bracelets | +3 (ya tiene 2) |

### Nuevas (crear en WooCommerce)

| Catálogo ES | Catálogo EN | Slug | Productos | Acción |
|-------------|-------------|------|-----------|--------|
| Gargantillas | Chokers | gargantillas / chokers | 6 | Crear par ES/EN + vincular Bogo |
| Aretes | Earrings | aretes / earrings | 3 | Crear par ES/EN + vincular Bogo |
| Dijes | Pendants | dijes / pendants | 2 | Crear par ES/EN + vincular Bogo |
| Anillos | Rings | anillos / rings | 2 | Crear par ES/EN + vincular Bogo |

### Existentes sin productos en catálogo (mantener)

| WooCommerce ES | WooCommerce EN | Nota |
|----------------|----------------|------|
| Urban & Iced Out | Urban & Iced Out | Mover PROD-011 (Iced) aquí como subcategoría |
| Relojes de Lujo | Luxury Watches | Se mencionan Tissot en el chat (sin imagen propia) |

---

## Subcategorías sugeridas

### Cadenas de Oro / Gold Chains
```
Cadenas de Oro / Gold Chains
├── Cuban Link
├── Monaco
├── Gucci
├── Tenis / Tennis
├── Corte Brillo / Diamond Cut
├── Torzal / Rope
├── Rolo
├── Franco / Bling
├── Figaro
├── Iced Out
├── Carol G
├── Chino / Chinese
└── Militar / Military
```

### Gargantillas / Chokers
```
Gargantillas / Chokers
├── Tiffany
├── Pepper
├── Visantino / Byzantine
├── Clover
├── Monaco Romani
└── Princess
```

### Pulseras y Manillas / Bracelets
```
Pulseras y Manillas / Bracelets
├── Cuban Link
├── Cartier
├── Versace
├── Tenis / Tennis
├── Manillas / Bangles
└── Orula / Religious
```

---

## Comandos WP-CLI para crear categorías

```bash
# Crear categorías ES
docker exec jewelry_wordpress wp term create product_cat "Gargantillas" \
  --slug=gargantillas --allow-root

docker exec jewelry_wordpress wp term create product_cat "Aretes" \
  --slug=aretes --allow-root

docker exec jewelry_wordpress wp term create product_cat "Dijes" \
  --slug=dijes --allow-root

docker exec jewelry_wordpress wp term create product_cat "Anillos" \
  --slug=anillos --allow-root

# Crear categorías EN
docker exec jewelry_wordpress wp term create product_cat "Chokers" \
  --slug=chokers --allow-root

docker exec jewelry_wordpress wp term create product_cat "Earrings" \
  --slug=earrings --allow-root

docker exec jewelry_wordpress wp term create product_cat "Pendants" \
  --slug=pendants --allow-root

docker exec jewelry_wordpress wp term create product_cat "Rings" \
  --slug=rings --allow-root
```

> **Nota:** Después de crear las categorías, vincular cada par ES↔EN con Bogo
> desde WP Admin → Productos → Categorías → Editar → Bogo Translations
