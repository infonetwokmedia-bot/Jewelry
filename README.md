# Jewelry Website - Remedio Joyería

Sitio web bilingüe (Español/Inglés) para joyería en Miami, Florida.

## 🚀 Stack Tecnológico

- **WordPress** 6.x
- **WooCommerce** 10.5.0
- **Tema:** Kadence 1.4.3
- **Multiidioma:** Bogo 3.9.1
- **Infraestructura:** Docker + Traefik

## 📋 Requisitos

- Docker y Docker Compose
- Traefik configurado (red `traefik-public`)
- Acceso a `jewelry.local.dev` configurado en `/etc/hosts` o DNS local

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/infonetwokmedia-bot/Jewelry.git
cd Jewelry
```

2. Copiar y configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. Iniciar los contenedores:
```bash
docker compose up -d
```

4. Acceder al sitio:
- Frontend: https://jewelry.local.dev
- Admin: https://jewelry.local.dev/wp-admin
- phpMyAdmin: https://phpmyadmin.jewelry.local.dev

## 🌍 Idiomas

El sitio soporta dos idiomas:
- **Español (es_ES)** - Idioma principal
- **English (en_US)** - Idioma secundario

La gestión de traducciones se realiza con Bogo.

## 📁 Estructura del Proyecto

```
.
├── docker-compose.yml          # Configuración de contenedores
├── .env                        # Variables de entorno
├── data/
│   ├── mysql/                  # Base de datos MySQL
│   └── wordpress/              # Archivos de WordPress
│       └── wp-content/
│           ├── themes/
│           │   └── kadence/
│           │       └── functions-custom.php  # Personalizaciones
│           └── plugins/
└── PROYECTO-ESTADO.md          # Estado actual del desarrollo
```

## 🔧 Configuración

### Páginas Principales
- 12 páginas en inglés
- 12 páginas en español
- Todas vinculadas con Bogo

### Productos
- 5 productos base en cada idioma
- Organizados en 4 categorías principales

### Menús
- Menú principal EN (primary_navigation_en)
- Menú principal ES (primary_navigation_es)
- Cambio automático según idioma del usuario

## 📝 Desarrollo

Ver `PROYECTO-ESTADO.md` para el estado completo del proyecto.

### Comandos Útiles

```bash
# Acceder a WP-CLI
docker exec jewelry_wordpress wp --allow-root [comando]

# Ver logs
docker compose logs -f wordpress

# Regenerar permalinks
docker exec jewelry_wordpress wp rewrite flush --allow-root

# Limpiar cache
docker exec jewelry_wordpress wp cache flush --allow-root
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Proyecto privado - Remedio Joyería © 2026
