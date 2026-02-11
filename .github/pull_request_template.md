## Descripcion

<!-- Describe los cambios de este PR de manera clara y concisa -->

## Issue Relacionado

<!-- Vincula el issue que este PR resuelve -->
Closes #

## Tipo de Cambio

<!-- Marca con x el tipo de cambio -->

- [ ] **Bug fix** (correccion de error no breaking)
- [ ] **Feature** (nueva funcionalidad no breaking)
- [ ] **Breaking change** (fix o feature que causa cambios incompatibles)
- [ ] **Refactor** (codigo que no cambia funcionalidad)
- [ ] **Docs** (cambios solo en documentacion)
- [ ] **Test** (agregar o corregir tests)
- [ ] **Chore** (mantenimiento, deps, config)
- [ ] **Security** (fix de seguridad)

## Evidencia TDD

<!-- Describe los ciclos Red-Green-Refactor que completaste -->

### Ciclos completados

| # | Criterio de Aceptacion | Test | Estado |
|---|------------------------|------|--------|
| 1 | <!-- descripcion --> | `test_nombre_del_test` | RED -> GREEN -> REFACTOR |
| 2 | <!-- descripcion --> | `test_nombre_del_test` | RED -> GREEN -> REFACTOR |

### Commits TDD

<!-- Los commits deben mostrar la secuencia TDD -->
<!-- Ejemplo:
- test(products): add failing test for metal filter (RED)
- feat(products): implement metal filter function (GREEN)
- refactor(products): improve validation and types (REFACTOR)
-->

## Checklist de Calidad

### Codigo

- [ ] Funciones custom usan prefijo `jewelry_`
- [ ] Codigo sigue WordPress Coding Standards
- [ ] Yoda conditions usadas (`'value' === $variable`)
- [ ] Input sanitizado (`sanitize_text_field()`, etc.)
- [ ] Output escapado (`esc_html()`, `esc_attr()`, `esc_url()`)
- [ ] Nonces verificados en formularios (`wp_verify_nonce()`)

### Tests

- [ ] Tests escritos ANTES del codigo (TDD)
- [ ] Todos los tests pasando localmente
- [ ] Criterios de aceptacion cubiertos por tests
- [ ] Sin regresiones en tests existentes
- [ ] CI pipeline verde

### Bilingue (si aplica)

- [ ] Contenido creado en AMBOS idiomas (ES + EN)
- [ ] Posts/productos vinculados con Bogo
- [ ] Meta `_locale` configurada
- [ ] Verificado navegacion en ambos idiomas

### Documentacion

- [ ] README/docs actualizados (si aplica)
- [ ] PHPDoc en funciones nuevas/modificadas

## Testing Realizado

**Tests automatizados:**

```bash
# Comando ejecutado y resultado
```

**Tests manuales:**

- [ ] Funcionalidad verificada en ES
- [ ] Funcionalidad verificada en EN
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs Docker

## Screenshots (si aplica)

### Antes

### Despues

## Notas para Reviewers

<!-- Informacion adicional que los reviewers deberian saber -->

## Deployment Notes (si aplica)

**Pre-deployment:**

- [ ] Backup de base de datos

**Post-deployment:**

- [ ] `wp rewrite flush`
- [ ] `wp cache flush`
