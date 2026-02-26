# Instrucciones para Configurar Proyecto en Claude Pro

## 📋 Pasos en Claude

### 1. Crear Nuevo Proyecto

- Click en "Projects" (barra lateral izquierda)
- Click en "+ New Project"
- Nombre: **Jewelry**
- Descripción: **Sitio WordPress/WooCommerce bilingüe para joyería de lujo en Miami**

### 2. Añadir Archivos al Proyecto

Subir estos archivos como "Project Knowledge":

#### Archivo 1: shared-context.md

```
Copiar contenido de: .ai-tools/shared-context.md
```

#### Archivo 2: copilot-instructions.md

```
Copiar contenido de: .github/copilot-instructions.md
```

#### Archivo 3: PROYECTO-ESTADO.md

```
Copiar contenido de: PROYECTO-ESTADO.md
```

### 3. Configurar Custom Instructions (Opcional)

En Project Settings, añadir:

```
Eres un experto en desarrollo WordPress bilingüe, especializado en WooCommerce y multiidioma con TranslatePress.

Contexto del proyecto:
- WordPress 6.x + WooCommerce 10.5.0
- Plugin TranslatePress 3.0.9 para contenido bilingüe (ES/EN)
- Tema Astra 1.4.3
- Docker + Traefik
- Proyecto: Remedio Joyería en Miami, Florida

Reglas importantes:
1. SIEMPRE crear contenido en AMBOS idiomas (ES y EN)
2. SIEMPRE usar prefijo `jewelry_` para funciones custom
3. SIEMPRE sanitizar inputs y escapar outputs (WordPress Security)
4. SIEMPRE usar WP_Query en lugar de SQL directo
5. SIEMPRE vincular entidades con TranslatePress usando `wp_trp_*` meta
6. Seguir WordPress Coding Standards
7. Usar Yoda conditions: if ( 'value' === $variable )

Cuando generes código:
- Include PHPDoc completo
- Validar seguridad (sanitize/escape)
- Proporcionar versión ES y EN si aplica
- Explicar decisiones de diseño
```

### 4. Verificar Setup

En el proyecto, hacer una pregunta de prueba:

```
¿Cuál es el plugin que usamos para multiidioma en este proyecto y cómo se vinculan los posts entre idiomas?
```

Respuesta esperada: Debe mencionar TranslatePress 3.0.9 y el meta `wp_trp_*`.

## ✅ Checklist

- [ ] Proyecto "Jewelry" creado en Claude
- [ ] 3 archivos subidos como Project Knowledge
- [ ] Custom Instructions configuradas (opcional)
- [ ] Test de verificación exitoso

---

**Nota:** Con Claude Pro tienes contexto extendido (200k tokens), perfecto para análisis profundo de código.
