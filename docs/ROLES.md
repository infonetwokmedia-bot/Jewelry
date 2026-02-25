# Roles y Permisos — Jewelry Dashboard

## Resumen de Roles

| Rol                         | Slug             | Descripción                                                |
| --------------------------- | ---------------- | ---------------------------------------------------------- |
| 👑 **Dueño / Admin**        | `administrator`  | Control total del sistema, gestión de usuarios             |
| 🏪 **Gerente de Tienda**    | `shop_manager`   | Gestión completa de productos, pedidos, cupones y reportes |
| 💎 **Vendedor**             | `jewelry_seller` | Ver catálogo y crear pedidos (rol custom)                  |
| 👁 **Consultor / Contador** | `jewelry_viewer` | Solo lectura: reportes, inventario, pedidos (rol custom)   |

---

## Matriz de Permisos del Dashboard

| Permiso             | Admin | Gerente | Vendedor | Consultor |
| ------------------- | :---: | :-----: | :------: | :-------: |
| Acceso al Dashboard |  ✅   |   ✅    |    ✅    |    ✅     |
| Ver productos       |  ✅   |   ✅    |    ✅    |    ✅     |
| Editar productos    |  ✅   |   ✅    |    ❌    |    ❌     |
| Crear pedidos       |  ✅   |   ✅    |    ✅    |    ❌     |
| Ver pedidos         |  ✅   |   ✅    |    ❌    |    ✅     |
| Ver reportes        |  ✅   |   ✅    |    ❌    |    ✅     |
| Gestionar cupones   |  ✅   |   ✅    |    ❌    |    ❌     |
| Gestionar usuarios  |  ✅   |   ❌    |    ❌    |    ❌     |
| Ajustes del sistema |  ✅   |   ❌    |    ❌    |    ❌     |

---

## Capabilities de WordPress por Rol

### 👑 Administrator (`administrator`)

Todas las capabilities de WordPress + WooCommerce, más:

```
jewelry_dashboard_access
jewelry_view_products
jewelry_edit_products
jewelry_create_orders
jewelry_view_orders
jewelry_view_reports
jewelry_manage_coupons
jewelry_manage_users
```

### 🏪 Gerente de Tienda (`shop_manager`)

93 capabilities de WooCommerce (productos, pedidos, cupones completos), más:

```
jewelry_dashboard_access
jewelry_view_products
jewelry_edit_products
jewelry_create_orders
jewelry_view_orders
jewelry_view_reports
jewelry_manage_coupons
```

### 💎 Vendedor (`jewelry_seller`)

```
read
read_product
edit_shop_order
read_shop_order
edit_shop_orders
publish_shop_orders
read_private_shop_orders
jewelry_dashboard_access
jewelry_view_products
jewelry_create_orders
```

### 👁 Consultor / Contador (`jewelry_viewer`)

```
read
read_product
read_shop_order
read_shop_coupon
read_private_shop_orders
view_woocommerce_reports
jewelry_dashboard_access
jewelry_view_products
jewelry_view_orders
jewelry_view_reports
```

---

## Secciones del Dashboard por Rol

| Sección      |      Admin      |     Gerente     |  Vendedor   |  Consultor  |
| ------------ | :-------------: | :-------------: | :---------: | :---------: |
| 📦 Productos | ✅ ver + editar | ✅ ver + editar | ✅ solo ver | ✅ solo ver |
| 🛒 Pedidos   |   ✅ completo   |   ✅ completo   |  ✅ crear   | ✅ solo ver |
| 📊 Reportes  |       ✅        |       ✅        |  ❌ oculto  |     ✅      |
| ⚙️ Ajustes   |       ✅        |    ❌ oculto    |  ❌ oculto  |  ❌ oculto  |
| 👥 Usuarios  |     ✅ CRUD     |    ❌ oculto    |  ❌ oculto  |  ❌ oculto  |

---

## API de Autenticación

### Login

```
POST /api/jewd/v1/auth/login
Content-Type: application/json

{ "username": "...", "password": "..." }
```

Respuesta exitosa (200):

```json
{
  "id": 1,
  "username": "ppcapiro",
  "display_name": "Pedro Admin",
  "role": "administrator",
  "role_label": "Dueño / Admin",
  "token": "<64 chars>",
  "permissions": {
    "dashboard_access": true,
    "view_products": true,
    "edit_products": true,
    "create_orders": true,
    "view_orders": true,
    "view_reports": true,
    "manage_coupons": true,
    "manage_users": true,
    "manage_settings": true
  },
  "expires_in": 43200
}
```

### Verificar Token

```
GET /api/jewd/v1/auth/verify
Authorization: Bearer <token>
```

### Cerrar Sesión

```
POST /api/jewd/v1/auth/logout
Authorization: Bearer <token>
```

---

## API de Gestión de Usuarios

> Solo accesible por usuarios con `jewelry_manage_users` (administrator).

### Listar Usuarios

```
GET /api/jewd/v1/users?consumer_key=...&consumer_secret=...
```

### Crear Usuario

```
POST /api/jewd/v1/users?consumer_key=...&consumer_secret=...
Content-Type: application/json

{
  "username": "nuevo_vendedor",
  "email": "vendor@tujoyita.com",
  "role": "jewelry_seller",
  "display_name": "Nombre Visible",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "phone": "+1 (305) 555-0100",
  "password": "opcional — se genera si se omite"
}
```

### Editar Usuario

```
PUT /api/jewd/v1/users/{id}?consumer_key=...&consumer_secret=...
Content-Type: application/json

{
  "email": "nuevo@email.com",
  "role": "shop_manager",
  "display_name": "Nuevo Nombre",
  "password": "nueva_contraseña"
}
```

### Eliminar Usuario

```
DELETE /api/jewd/v1/users/{id}?consumer_key=...&consumer_secret=...
```

> El admin principal (ID 1) está protegido y no se puede eliminar.

### Listar Roles

```
GET /api/jewd/v1/roles?consumer_key=...&consumer_secret=...
```

---

## Usuarios de Prueba (Local)

| Usuario      | Rol           | Email                      | Contraseña       |
| ------------ | ------------- | -------------------------- | ---------------- |
| `ppcapiro`   | Administrator | musicmanagercuba@gmail.com | `AdminTest2025!` |
| `vendedor1`  | Vendedor      | vendedor1@tujoyita.local   | `Vendedor2025!`  |
| `gerente1`   | Gerente       | gerente1@tujoyita.local    | `Gerente2025!`   |
| `consultor1` | Consultor     | consultor1@tujoyita.local  | `Consultor2025!` |

---

## Implementación Técnica

- **mu-plugin:** `wp-content/mu-plugins/jewelry-roles.php`
- **Auth frontend:** `dashboard/js/auth.js`
- **User management:** `dashboard/js/users.js`
- **Sesiones:** WordPress transients (`jewelry_session_<hash>`, 12h TTL)
- **Tokens:** 64 caracteres aleatorios, almacenados con SHA-256
