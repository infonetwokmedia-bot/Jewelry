# Workflow: Desarrollo TDD con Asistencia IA

Guia para usar las herramientas de IA del proyecto siguiendo la
metodologia TDD.

## Cuando Usar Este Workflow

Para CUALQUIER cambio de codigo:
- Nueva funcionalidad (feature)
- Correccion de bug (fix)
- Refactoring
- Mejora de rendimiento

## Flujo Completo con IA

### Paso 1: Crear Issue

**Herramienta:** GitHub (manual) o IA para redactar

**Prompt para Claude/ChatGPT:**

```text
Necesito crear un Issue para el proyecto Jewelry (WordPress + WooCommerce bilingue).
Feature: [descripcion de la funcionalidad]

Genera:
1. User Story en formato "Como [rol], quiero [accion], para [beneficio]"
2. Criterios de aceptacion en formato Given/When/Then (minimo 3)
3. Notas tecnicas (archivos a modificar, dependencias)
4. Definition of Done especifica

Contexto: sitio bilingue ES/EN con Bogo, prefijo jewelry_ en funciones,
WordPress Coding Standards.
```

Pegar resultado en el Issue Template de GitHub (`.github/ISSUE_TEMPLATE/user-story.yml`).

### Paso 2: Crear Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/ISSUE_NUM-descripcion-corta
```

### Paso 3: RED - Escribir Test que Falla

**Herramienta:** Copilot (@tdd-coach) o Claude

**Prompt para Copilot:**

```text
@tdd-coach Generate a PHPUnit test for this acceptance criterion:
DADO que [contexto del criterio],
CUANDO [accion del usuario],
ENTONCES [resultado esperado].

Project context: WordPress + WooCommerce, Bogo bilingual,
jewelry_ prefix, tests/php/ directory.
```

**Prompt para Claude:**

```text
Escribe un test PHPUnit para el proyecto Jewelry.

Criterio de aceptacion:
DADO [contexto],
CUANDO [accion],
ENTONCES [resultado esperado].

Reglas:
- Archivo: tests/php/test-{feature}.php
- Clase extends WP_UnitTestCase
- Patron Arrange/Act/Assert
- Prefijo jewelry_ en funciones a testear
- Considerar version bilingue si aplica
```

**Acciones:**

1. Crear archivo de test
2. Ejecutar: `docker exec jewelry_wordpress vendor/bin/phpunit tests/php/test-{feature}.php`
3. Verificar que FALLA
4. Commit: `git commit -m "test(scope): add failing test for [criterio]"`

### Paso 4: GREEN - Codigo Minimo

**Herramienta:** Copilot (inline) o Claude

**Prompt para Copilot:**

```text
@tdd-coach This test is failing. Generate MINIMUM code to pass:
[pegar test]

Rules:
- ONLY minimum code needed
- Use jewelry_ prefix
- Sanitize inputs
- File: data/wordpress/wp-content/themes/kadence/functions-custom.php
```

**Prompt para Claude:**

```text
Este test PHPUnit esta fallando. Escribe el codigo MINIMO en PHP
para que pase. NO optimices, NO generalices.

[pegar test]

Archivo destino: data/wordpress/wp-content/themes/kadence/functions-custom.php
Reglas: prefijo jewelry_, sanitizar inputs, WordPress Coding Standards.
```

**Acciones:**

1. Implementar funcion minima
2. Ejecutar test: debe PASAR
3. Commit: `git commit -m "feat(scope): implement [feature]"`

### Paso 5: REFACTOR - Limpiar

**Herramienta:** Copilot (@security-reviewer) o Claude

**Prompt para Copilot:**

```text
@security-reviewer Review this function for security and quality:
[pegar funcion]

Check: sanitization, escaping, nonces, WordPress standards,
jewelry_ prefix, PHPDoc.
```

**Prompt para Claude:**

```text
Revisa y mejora esta funcion WordPress sin cambiar su comportamiento.
Los tests deben seguir pasando.

[pegar funcion]

Mejorar:
- Sanitizacion de inputs
- Escape de outputs
- Nombres de variables
- PHPDoc
- WordPress Coding Standards
- Reducir duplicacion si hay
```

**Acciones:**

1. Aplicar mejoras
2. Ejecutar tests: deben seguir PASANDO
3. Commit: `git commit -m "refactor(scope): improve [aspect]"`

### Paso 6: Repetir (siguiente criterio)

Repetir pasos 3-5 para cada criterio de aceptacion del Issue.

### Paso 7: Verificar Bilingue (si aplica)

**Herramienta:** Copilot (@bogo-expert)

```text
@bogo-expert Verify bilingual content is created and linked:
- Function: jewelry_[function_name]
- Content type: [product/page/post]
- Check _locale and _bogo_translations meta
```

### Paso 8: Validar Gobernanza

```bash
# Ejecutar validador local
./scripts/validate-governance.sh develop
```

### Paso 9: Abrir PR

**Herramienta:** Claude para redactar PR body

```text
Genera el body de un PR para el proyecto Jewelry usando este template.
Incluye la evidencia TDD de estos commits:
[pegar git log --oneline]

Los criterios de aceptacion del Issue #XX son:
[pegar criterios]
```

## Combinacion de Herramientas por Fase

| Fase | Herramienta Principal | Alternativa |
|------|----------------------|-------------|
| Issue/Story | ChatGPT (redaccion) | Claude |
| RED (test) | Copilot @tdd-coach | Claude |
| GREEN (codigo) | Copilot (inline) | Claude |
| REFACTOR | Copilot @security-reviewer | Claude |
| Bilingue | Copilot @bogo-expert | Claude |
| PR body | Claude | ChatGPT |
| Code review | Copilot @security-reviewer | Claude |

## Ejemplo Completo

```text
Feature: Filtro de productos por tipo de metal

1. Issue #42 creado con User Story y 4 criterios
2. Branch: feature/42-filtro-por-metal
3. Ciclo 1 - Criterio "filtrar por oro 10K":
   - test(products): add failing test for metal filter          # RED
   - feat(products): implement jewelry_filter_products_by_metal  # GREEN
   - refactor(products): add input validation and PHPDoc         # REFACTOR
4. Ciclo 2 - Criterio "limpiar filtros":
   - test(products): add test for clearing filters               # RED
   - feat(products): implement clear filter functionality        # GREEN
5. Ciclo 3 - Criterio "funciona en ingles":
   - test(products): add test for English locale filter          # RED
   - feat(products): add locale support to metal filter          # GREEN
   - refactor(products): extract locale helper function          # REFACTOR
6. Ciclo 4 - Criterio "mensaje sin resultados":
   - test(products): add test for empty results message          # RED
   - feat(products): add no-results message with i18n            # GREEN
7. Validar gobernanza: ./scripts/validate-governance.sh
8. PR con TDD Score esperado: 80+/100
```

## Tiempo Estimado por Ciclo

- **RED (test):** 5-10 min con IA
- **GREEN (codigo):** 5-15 min con IA
- **REFACTOR:** 5-10 min con IA
- **Total por criterio:** 15-35 min

---

Referencia: `docs/WORKFLOW-TDD.md`
