# Metodologia de Desarrollo TDD - Jewelry Project

Workflow completo desde la creacion del ticket hasta el merge a produccion.

## Flujo General

```text
FASE 1           FASE 2           FASE 3              FASE 4           FASE 5
PLANIFICAR       PREPARAR         DESARROLLAR (TDD)   VERIFICAR        ENTREGAR
───────────      ────────         ─────────────────    ─────────        ────────
Crear Issue  ->  Crear branch ->  RED: test falla  ->  Abrir PR    ->  Merge
User Story       feature/ID-desc  GREEN: test pasa    CI checks        Deploy
Aceptacion       Setup entorno    REFACTOR: limpiar   Code Review
DoD                               Repetir ciclo       QA manual
```

---

## FASE 1: Planificar (Crear Ticket)

### 1.1 Elegir tipo de Issue

| Tipo | Cuando usar | Template |
|------|-------------|----------|
| **User Story** | Nueva funcionalidad desde perspectiva del usuario | `[STORY]` |
| **Bug Report** | Error en funcionalidad existente | `[BUG]` |
| **Technical Task** | Refactoring, deuda tecnica, infraestructura | `[TASK]` |

### 1.2 Escribir la User Story

Formato estandar:

```text
Como [rol],
quiero [accion],
para [beneficio].
```

Ejemplo real del proyecto:

```text
Como cliente de la tienda,
quiero filtrar productos por tipo de metal (oro 10k, 14k, plata),
para encontrar joyas dentro de mi presupuesto.
```

### 1.3 Definir Criterios de Aceptacion

Usar formato **Given/When/Then** (Dado/Cuando/Entonces):

```text
- [ ] DADO que estoy en la pagina Shop,
      CUANDO selecciono "Oro 10K" en el filtro de metal,
      ENTONCES solo se muestran productos de oro 10K

- [ ] DADO que tengo un filtro activo,
      CUANDO hago click en "Limpiar filtros",
      ENTONCES se muestran todos los productos

- [ ] DADO que estoy en la version en ingles,
      CUANDO aplico un filtro,
      ENTONCES los resultados se muestran en ingles

- [ ] DADO que no hay productos para un filtro,
      CUANDO lo selecciono,
      ENTONCES se muestra mensaje "No se encontraron productos"
      en el idioma activo
```

### 1.4 Definition of Done (DoD)

Toda tarea debe cumplir ANTES de considerarse terminada:

- [ ] Criterios de aceptacion verificados
- [ ] Tests escritos y pasando (ciclo TDD completado)
- [ ] Codigo sigue WordPress Coding Standards
- [ ] Prefijo `jewelry_` en funciones custom
- [ ] Contenido bilingue (ES + EN) creado y vinculado con Bogo (si aplica)
- [ ] CI pipeline verde (GitHub Actions)
- [ ] PR revisado y aprobado
- [ ] Sin regresiones en tests existentes
- [ ] Documentacion actualizada (si aplica)

---

## FASE 2: Preparar (Branch y Entorno)

### 2.1 Crear Branch

Nomenclatura basada en el tipo de Issue:

```bash
# User Story / Feature
git checkout develop
git pull origin develop
git checkout -b feature/42-filtro-por-metal

# Bug Fix
git checkout -b fix/57-checkout-no-valida-cupon

# Hotfix (produccion urgente)
git checkout main
git checkout -b hotfix/60-pago-rechazado

# Technical Task
git checkout develop
git checkout -b refactor/63-optimizar-queries-productos
```

Formato: `tipo/ISSUE_NUMBER-descripcion-corta`

### 2.2 Verificar Entorno

```bash
# Asegurar que los contenedores estan corriendo
docker compose up -d

# Verificar conectividad
./scripts/test-connections.sh

# Verificar que el sitio responde en ambos idiomas
# ES: https://jewelry.local.dev
# EN: https://jewelry.local.dev/en/
```

---

## FASE 3: Desarrollar con TDD (Red-Green-Refactor)

Este es el nucleo de la metodologia. Cada funcionalidad se construye
en ciclos cortos de 3 pasos.

### El Ciclo TDD

```text
    ┌──────────────────────────────────────────┐
    │                                          │
    │   1. RED         Escribir test que FALLA │
    │      │                                   │
    │      v                                   │
    │   2. GREEN       Codigo MINIMO para      │
    │      │           que el test PASE        │
    │      v                                   │
    │   3. REFACTOR    Limpiar codigo          │
    │      │           sin romper tests        │
    │      │                                   │
    │      └──────── Repetir ciclo ───────────┘
    │
    │   4. COMMIT      Guardar progreso
    │
    └──────────────────────────────────────────┘
```

### 3.1 RED: Escribir el Test que Falla

**Regla: NO escribir codigo de produccion sin un test que lo pida.**

#### Tests PHP (PHPUnit)

Archivo: `tests/php/test-{feature}.php`

```php
<?php
/**
 * Tests para filtro de productos por metal.
 *
 * @package Jewelry\Tests
 */

class Test_Product_Filter extends WP_UnitTestCase {

    /**
     * Test: Filtrar productos por tipo de metal retorna solo ese metal.
     *
     * Criterio de aceptacion:
     * DADO que existen productos de oro 10K y plata,
     * CUANDO filtro por "oro-10k",
     * ENTONCES solo se retornan productos de oro 10K.
     */
    public function test_filter_by_metal_returns_correct_products() {
        // Arrange (Dado)
        $gold_product = $this->factory()->post->create( array(
            'post_type' => 'product',
            'post_title' => 'Cadena Cubana 10K',
        ) );
        wp_set_object_terms( $gold_product, 'oro-10k', 'pa_metal' );

        $silver_product = $this->factory()->post->create( array(
            'post_type' => 'product',
            'post_title' => 'Anillo Plata',
        ) );
        wp_set_object_terms( $silver_product, 'plata', 'pa_metal' );

        // Act (Cuando)
        $results = jewelry_filter_products_by_metal( 'oro-10k' );

        // Assert (Entonces)
        $this->assertCount( 1, $results );
        $this->assertEquals( 'Cadena Cubana 10K', $results[0]->post_title );
    }

    /**
     * Test: Filtro sin resultados retorna array vacio.
     */
    public function test_filter_with_no_matches_returns_empty() {
        $results = jewelry_filter_products_by_metal( 'platino' );
        $this->assertIsArray( $results );
        $this->assertEmpty( $results );
    }
}
```

#### Tests E2E (Playwright)

Archivo: `tests/e2e/{feature}.spec.js`

```javascript
// tests/e2e/product-filter.spec.js
const { test, expect } = require("@playwright/test");

test.describe("Filtro de productos por metal", () => {
  test("muestra solo productos del metal seleccionado", async ({ page }) => {
    // Dado: estoy en la pagina Shop
    await page.goto("/shop/");

    // Cuando: selecciono "Oro 10K"
    await page.selectOption("#filter-metal", "oro-10k");
    await page.waitForSelector(".products");

    // Entonces: solo veo productos de oro 10K
    const products = page.locator(".product");
    for (const product of await products.all()) {
      const metal = await product.getAttribute("data-metal");
      expect(metal).toBe("oro-10k");
    }
  });

  test("funciona igual en version ingles", async ({ page }) => {
    await page.goto("/en/shop/");
    await page.selectOption("#filter-metal", "10k-gold");
    await page.waitForSelector(".products");

    const products = page.locator(".product");
    expect(await products.count()).toBeGreaterThan(0);
  });
});
```

**Ejecutar el test - debe FALLAR (rojo):**

```bash
# PHPUnit
docker exec jewelry_wordpress vendor/bin/phpunit tests/php/test-product-filter.php

# Playwright
npx playwright test tests/e2e/product-filter.spec.js
```

**Resultado esperado:** FAIL - La funcion `jewelry_filter_products_by_metal()` no existe.

**Commit del test rojo:**

```bash
git add tests/
git commit -m "test(products): add failing test for metal filter

RED phase: test expects jewelry_filter_products_by_metal() function.
Covers acceptance criteria for issue #42."
```

### 3.2 GREEN: Escribir el Codigo Minimo

**Regla: Solo escribir el codigo MINIMO necesario para que el test pase.
No optimizar. No generalizar. No embellecer.**

```php
// data/wordpress/wp-content/themes/kadence/functions-custom.php

/**
 * Filtrar productos por tipo de metal.
 *
 * @param string $metal Slug del atributo de metal.
 * @return array Lista de productos WP_Post.
 */
function jewelry_filter_products_by_metal( $metal ) {
    $args = array(
        'post_type'      => 'product',
        'posts_per_page' => -1,
        'tax_query'      => array(
            array(
                'taxonomy' => 'pa_metal',
                'field'    => 'slug',
                'terms'    => sanitize_text_field( $metal ),
            ),
        ),
    );

    $query = new WP_Query( $args );
    return $query->posts;
}
```

**Ejecutar el test - debe PASAR (verde):**

```bash
docker exec jewelry_wordpress vendor/bin/phpunit tests/php/test-product-filter.php
# OK (2 tests, 3 assertions)
```

**Commit del codigo verde:**

```bash
git add data/wordpress/wp-content/themes/kadence/functions-custom.php
git commit -m "feat(products): implement metal filter function

GREEN phase: jewelry_filter_products_by_metal() passes all tests.
Ref #42"
```

### 3.3 REFACTOR: Limpiar Sin Romper

**Regla: Mejorar estructura, legibilidad, rendimiento - SIN cambiar
el comportamiento. Los tests deben seguir pasando.**

Posibles refactors:

- Extraer constantes o configuracion
- Mejorar nombres de variables
- Eliminar duplicacion
- Agregar cache si hay performance concern
- Asegurar sanitizacion/escape

```php
/**
 * Filtrar productos por tipo de metal.
 *
 * @param string $metal Slug del atributo de metal (ej: 'oro-10k', 'plata').
 * @return WP_Post[] Lista de productos filtrados.
 */
function jewelry_filter_products_by_metal( $metal ) {
    $sanitized_metal = sanitize_text_field( $metal );

    if ( empty( $sanitized_metal ) ) {
        return array();
    }

    $query = new WP_Query( array(
        'post_type'      => 'product',
        'post_status'    => 'publish',
        'posts_per_page' => -1,
        'tax_query'      => array(
            array(
                'taxonomy' => 'pa_metal',
                'field'    => 'slug',
                'terms'    => $sanitized_metal,
            ),
        ),
    ) );

    return $query->posts;
}
```

**Ejecutar tests de nuevo:**

```bash
docker exec jewelry_wordpress vendor/bin/phpunit tests/php/test-product-filter.php
# OK (2 tests, 3 assertions) -- Sigue verde
```

**Commit del refactor:**

```bash
git add .
git commit -m "refactor(products): improve metal filter validation and types

REFACTOR phase: add input validation, improve PHPDoc, restrict to published.
Tests still green. Ref #42"
```

### 3.4 Repetir el Ciclo

Continuar con el siguiente criterio de aceptacion. Cada criterio
genera al menos un ciclo RED-GREEN-REFACTOR.

```text
Criterio 1: Filtrar por metal         [RED -> GREEN -> REFACTOR] Done
Criterio 2: Limpiar filtros           [RED -> GREEN -> REFACTOR] Done
Criterio 3: Funciona en ingles        [RED -> GREEN -> REFACTOR] Done
Criterio 4: Mensaje sin resultados    [RED -> GREEN -> REFACTOR] Done
```

---

## FASE 4: Verificar (PR y Review)

### 4.1 Preparar el PR

Antes de abrir el PR, ejecutar verificacion completa:

```bash
# 1. Ejecutar TODOS los tests
docker exec jewelry_wordpress vendor/bin/phpunit tests/php/
npx playwright test tests/e2e/

# 2. Verificar sintaxis PHP
php -l data/wordpress/wp-content/themes/kadence/functions-custom.php

# 3. Verificar conectividad de servicios
./scripts/test-connections.sh

# 4. Verificar bilingue (si aplica)
# Navegar al sitio en ES y EN, verificar contenido

# 5. Rebase con develop
git fetch origin develop
git rebase origin/develop
```

### 4.2 Abrir Pull Request

```bash
git push origin feature/42-filtro-por-metal
# Abrir PR en GitHub: feature/42-filtro-por-metal -> develop
```

El PR debe incluir (usando el template):

1. **Referencia al Issue:** `Closes #42`
2. **Tipo de cambio:** Feature / Bug fix / etc
3. **Evidencia de TDD:**
   - Cuantos ciclos RED-GREEN-REFACTOR se completaron
   - Cobertura de criterios de aceptacion
4. **Checklist de calidad** completo
5. **Screenshots** (si hay cambios visuales)

### 4.3 CI Pipeline (Automatico)

El pipeline de GitHub Actions ejecuta:

```text
┌─────────────────────────────────────────────────┐
│  CI Pipeline (se ejecuta en cada push al PR)    │
│                                                 │
│  1. Security Audit                              │
│     - Archivos sensibles                        │
│     - Credenciales hardcodeadas                 │
│                                                 │
│  2. PHP Lint                                    │
│     - Sintaxis de functions-custom.php          │
│     - Sintaxis de plugins custom                │
│                                                 │
│  3. PHP Tests                                   │
│     - PHPUnit suite completa                    │
│     - Cobertura de codigo                       │
│                                                 │
│  4. Markdown Lint                               │
│     - Formato de documentacion                  │
│                                                 │
│  5. Repo Structure                              │
│     - Archivos requeridos presentes             │
│                                                 │
│  RESULTADO: Todo verde = PR puede ser revisado  │
│             Algo rojo = PR bloqueado            │
└─────────────────────────────────────────────────┘
```

### 4.4 Code Review

El reviewer verifica:

| Check | Que revisar |
|-------|-------------|
| Tests | Cada criterio de aceptacion tiene test |
| TDD | Commits muestran secuencia RED-GREEN-REFACTOR |
| Codigo | WordPress Coding Standards, prefijo `jewelry_` |
| Seguridad | Sanitizacion de input, escape de output, nonces |
| Bilingue | Contenido en ES + EN, vinculacion Bogo |
| CI | Pipeline verde, sin warnings |

### 4.5 Resolver Feedback

```bash
# Hacer los cambios solicitados
# ...

# Commit con referencia al review
git add .
git commit -m "fix(products): apply review feedback on filter validation

Address review comments: add nonce check, improve error message.
Ref #42"

git push origin feature/42-filtro-por-metal
# PR se actualiza automaticamente
```

---

## FASE 5: Entregar (Merge y Deploy)

### 5.1 Merge a Develop

Condiciones para merge:

- [ ] CI pipeline verde
- [ ] Al menos 1 approval en code review
- [ ] Todos los criterios de aceptacion verificados
- [ ] Conflictos resueltos
- [ ] DoD cumplido

Tipo de merge recomendado: **Squash and Merge** para mantener
historial limpio en develop.

### 5.2 Merge a Main (Release)

Cuando develop tiene suficientes features/fixes para un release:

```bash
# Crear PR: develop -> main
# Titulo: "Release vX.Y.Z"

# Post-merge checklist:
# - [ ] Tag de version creado
# - [ ] PROYECTO-ESTADO.md actualizado
# - [ ] Deploy a produccion ejecutado
# - [ ] Smoke test en produccion
```

### 5.3 Cerrar el Ciclo

1. Verificar que el Issue se cerro automaticamente (`Closes #42`)
2. Actualizar PROYECTO-ESTADO.md si aplica
3. Eliminar branch de feature (GitHub lo ofrece automaticamente)

---

## Resumen Visual del Workflow Completo

```text
                    JEWELRY DEVELOPMENT WORKFLOW
                    ============================

    Issue #42                    Branch
    ┌──────────────┐             ┌──────────────────────┐
    │ User Story   │────────────>│ feature/42-filtro    │
    │ Aceptacion   │             │                      │
    │ DoD          │             │  Ciclo TDD:          │
    └──────────────┘             │                      │
                                 │  test_filter -----.  │
                                 │    (RED)          |  │
                                 │       |           |  │
                                 │       v           |  │
                                 │  jewelry_filter   |  │
                                 │    (GREEN)        |  │
                                 │       |           |  │
                                 │       v           |  │
                                 │  cleanup code     |  │
                                 │    (REFACTOR)     |  │
                                 │       |           |  │
                                 │       '--- loop --'  │
                                 │                      │
                                 └──────────┬───────────┘
                                            |
                                            v
                                 ┌──────────────────────┐
                                 │  Pull Request        │
                                 │  - CI checks         │
                                 │  - Code review       │
                                 │  - QA manual         │
                                 └──────────┬───────────┘
                                            |
                                            v
                                 ┌──────────────────────┐
                                 │  Merge -> develop    │
                                 │  (squash & merge)    │
                                 └──────────┬───────────┘
                                            |
                                            v
                                 ┌──────────────────────┐
                                 │  Release -> main     │
                                 │  Tag + Deploy        │
                                 └──────────────────────┘
```

---

## Comandos Rapidos de Referencia

```bash
# === FASE 2: Preparar ===
git checkout develop && git pull origin develop
git checkout -b feature/ISSUE-descripcion

# === FASE 3: TDD ===
# Ejecutar tests PHP
docker exec jewelry_wordpress vendor/bin/phpunit tests/php/

# Ejecutar tests E2E
npx playwright test tests/e2e/

# Ejecutar test especifico
docker exec jewelry_wordpress vendor/bin/phpunit tests/php/test-feature.php

# === FASE 4: Verificar ===
php -l data/wordpress/wp-content/themes/kadence/functions-custom.php
./scripts/test-connections.sh
git push origin feature/ISSUE-descripcion

# === FASE 5: Post-merge ===
git checkout develop && git pull origin develop
git branch -d feature/ISSUE-descripcion
```

---

Ultima actualizacion: 11 de febrero de 2026
