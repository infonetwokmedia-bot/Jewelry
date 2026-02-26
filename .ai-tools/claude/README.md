# Claude - Guía de Uso para Proyecto Jewelry

## 🎯 Casos de Uso Principales

Claude es ideal para:
- ✍️ **Generación de contenido bilingüe** (descripciones de productos, páginas)
- 🔍 **Análisis de código complejo** (refactoring, code review)
- 📚 **Documentación técnica** (README, guías de uso)
- 💡 **Resolución de problemas** (debugging, troubleshooting)
- 🏗️ **Arquitectura de soluciones** (planificación de features)

## 🚀 Métodos de Acceso

### Opción 1: Claude Desktop App (Recomendado para inicio)
- **Ventaja:** Sin configuración, interfaz visual
- **Limitación:** 5 proyectos gratuitos, límite de contexto
- **Uso:** Ideal para consultas rápidas y generación de contenido

**Setup:**
1. Descargar desde https://claude.ai/download
2. Crear proyecto "Jewelry"
3. Subir archivos clave:
   - `.ai-tools/shared-context.md`
   - `.github/copilot-instructions.md`
   - `PROYECTO-ESTADO.md`
   - Snippets de código relevantes

### Opción 2: Claude API en VS Code
- **Ventaja:** Integración directa en el editor
- **Requisito:** API key de Anthropic ($)
- **Uso:** Desarrollo continuo con contexto completo

**Setup:**
```bash
# Instalar extensión de Claude (si existe) o usar Continue.dev
code --install-extension continue.continue
```

Configurar en `.vscode/settings.json`:
```json
{
  "continue.anthropicApiKey": "sk-ant-...",
  "continue.models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "${ANTHROPIC_API_KEY}"
    }
  ]
}
```

## 📝 Prompts Efectivos

### 1. Generación de Contenido Bilingüe

```
Contexto: Proyecto Jewelry - WordPress + WooCommerce bilingüe (ES/EN) con TranslatePress

Tarea: Crear descripción de producto bilingüe para:
- Producto: Anillo de compromiso en oro blanco 18k con diamante central 1ct
- SKU: RNG-COMP-001
- Precio: $2,499 USD

Requisitos:
- Descripción larga (200-250 palabras)
- Descripción corta (50-70 palabras)
- Destacar: calidad, diseño, garantía, envío gratis
- Tono: elegante, profesional, persuasivo
- AMBOS idiomas (ES primero, luego EN)
```

### 2. Code Review y Refactoring

```
Contexto: Ver .ai-tools/shared-context.md

Revisa esta función custom de WordPress y sugiere mejoras:
- Seguridad: ¿Está sanitizando inputs?
- Performance: ¿Consultas optimizadas?
- WordPress Standards: ¿Sigue convenciones?
- TranslatePress: ¿Maneja correctamente multiidioma?

Código a revisar:
[pegar código aquí]

Proporciona:
1. Análisis detallado de problemas
2. Código refactorizado completo
3. Explicación de cambios
```

### 3. Debugging Complejo

```
Contexto: Proyecto Jewelry (ver .ai-tools/shared-context.md)

Problema: Los productos en inglés no muestran la imagen destacada, 
pero en español sí funcionan. TranslatePress está activo.

Información adicional:
- Error logs: [pegar logs si hay]
- Código relevante: [pegar código]
- Plugins activos: WooCommerce, TranslatePress, Astra

Necesito:
1. Posibles causas del problema
2. Pasos de diagnóstico
3. Solución paso a paso
```

### 4. Arquitectura de Features

```
Contexto: Proyecto Jewelry - ecommerce bilingüe

Feature solicitada: "Wishlist bilingüe para productos favoritos"

Requisitos:
- Usuarios pueden guardar productos favoritos
- Mostrar contador en header
- Página dedicada "Mi Wishlist" (ES/EN)
- Persistir en base de datos (usuario logueado)
- Almacenar en localStorage (visitante)
- Compatible con TranslatePress para productos multiidioma

Necesito:
1. Arquitectura de la solución (tablas DB, hooks, etc.)
2. Código PHP para backend
3. JavaScript para frontend
4. Integración con tema Astra
5. Plan de testing bilingüe
```

## 🎯 Workflows Recomendados

### Workflow 1: Creación de Producto Completo

1. **Copiar contexto:**
   ```bash
   cat .ai-tools/shared-context.md | pbcopy
   ```

2. **Prompt en Claude:**
   ```
   [Pegar contexto]
   
   Crea un producto WooCommerce bilingüe con este script WP-CLI:
   - Nombre (ES): "Collar de Perlas Cultivadas"
   - Nombre (EN): "Cultured Pearl Necklace"
   - SKU: NCL-PERL-001
   - Precio: $899 USD
   - Categoría: "Collares / Necklaces"
   
   Incluir:
   1. Script WP-CLI completo
   2. Traducción TranslatePress
   3. Meta datos WooCommerce
   4. Descripciones completas bilingües
   ```

3. **Ejecutar script:**
   ```bash
   # Copiar output de Claude a archivo
   nano create-pearl-necklace.sh
   chmod +x create-pearl-necklace.sh
   ./create-pearl-necklace.sh
   ```

### Workflow 2: Análisis de Error

1. **Capturar error:**
   ```bash
   docker compose logs -f wordpress --tail=100 > error-log.txt
   ```

2. **Enviar a Claude:**
   ```
   Contexto: Proyecto Jewelry (ver contexto compartido)
   
   Error encontrado:
   [pegar contenido de error-log.txt]
   
   Analiza y proporciona:
   1. Causa raíz
   2. Solución inmediata
   3. Prevención futura
   ```

### Workflow 3: Documentación de Feature

1. **Implementar feature con Copilot**
2. **Pedir documentación a Claude:**
   ```
   Documenta la siguiente feature implementada:
   
   [Código de la feature]
   
   Incluir:
   - README con instrucciones de uso
   - PHPDoc completo
   - Ejemplos de uso
   - Notas de seguridad
   - Consideraciones bilingües (TranslatePress)
   ```

## 💰 Costos

### Claude Free
- **Límites:**
  - 5 proyectos
  - ~50 mensajes/día
  - Contexto limitado
- **Ideal para:** Consultas ocasionales, generación de contenido

### Claude Pro ($20/mes)
- **Límites:**
  - Proyectos ilimitados
  - ~1000 mensajes/día
  - Contexto extendido (200k tokens)
- **Ideal para:** Desarrollo continuo, múltiples features

### Claude API (Pay-as-you-go)
- **Costo:**
  - Input: $3/millón tokens
  - Output: $15/millón tokens
- **Estimado:** ~$10-30/mes uso normal
- **Ideal para:** Integración directa en VS Code

## 📋 Checklist de Uso

Antes de consultar a Claude:

- [ ] Leer `shared-context.md` para refrescar contexto del proyecto
- [ ] Identificar caso de uso (contenido, debug, arquitectura, etc.)
- [ ] Preparar información relevante (código, logs, requirements)
- [ ] Formular prompt claro con contexto específico
- [ ] Especificar que es proyecto **bilingüe con TranslatePress**
- [ ] Solicitar validación de WordPress Standards
- [ ] Pedir versión en **AMBOS idiomas** si aplica

Después de recibir respuesta:

- [ ] Validar que usa prefijo `jewelry_` en funciones
- [ ] Verificar sanitización de inputs
- [ ] Confirmar traducción TranslatePress si es contenido
- [ ] Probar en ambos idiomas (ES y EN)
- [ ] Documentar solución si es reutilizable

## 🔗 Recursos

- [Claude Documentation](https://docs.anthropic.com/)
- [Claude Prompt Engineering](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Claude API Reference](https://docs.anthropic.com/claude/reference/)

---

**Tip:** Claude es excelente para tareas que requieren razonamiento profundo y contexto extenso. Úsalo cuando necesites análisis complejo o generación de contenido de alta calidad.
