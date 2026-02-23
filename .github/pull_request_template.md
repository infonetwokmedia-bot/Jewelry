## 📋 Descripción

<!-- Describe los cambios de este PR de manera clara y concisa -->

## 🔖 Tipo de Cambio

Selecciona el tipo de cambio (marca con `x`):

- [ ] 🐛 **Bug fix** (corrección de error no breaking)
- [ ] ✨ **Feature** (nueva funcionalidad no breaking)
- [ ] 💥 **Breaking change** (fix o feature que causa cambios incompatibles)
- [ ] 📝 **Documentación** (cambios solo en documentación)
- [ ] 🎨 **Style** (formato, espacios, sin cambios en lógica)
- [ ] ♻️ **Refactor** (código que no añade funcionalidad ni corrige bug)
- [ ] ⚡ **Performance** (mejora de rendimiento)
- [ ] ✅ **Test** (añadir o corregir tests)
- [ ] 🔧 **Chore** (cambios en build, deps, config)
- [ ] 🔒 **Security** (fix de seguridad)

## ✅ Checklist de Calidad

### Código

- [ ] ✅ Funciones custom usan prefijo `jewelry_`
- [ ] ✅ Código sigue [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)
- [ ] ✅ Yoda conditions usadas (`'value' === $variable`)
- [ ] ✅ Input sanitizado (`sanitize_text_field()`, etc.)
- [ ] ✅ Output escapado (`esc_html()`, `esc_attr()`, `esc_url()`)
- [ ] ✅ Nonces verificados en formularios (`wp_verify_nonce()`)
- [ ] ✅ Sin SQL directo (usar `WP_Query` o prepared statements)

### Bilingüismo (si aplica)

- [ ] 🌍 Contenido creado en **AMBOS idiomas** (ES + EN)
- [ ] 🔗 Traducciones configuradas con **TranslatePress** (visual editor)
- [ ] ✅ URLs en inglés con prefijo `/en/` verificadas
- [ ] ✅ Language switcher funciona correctamente
- [ ] ✅ Menús/páginas verificados en ambos idiomas

### Testing

- [ ] ✅ Tests automáticos ejecutados (`./scripts/test-connections.sh`)
- [ ] ✅ No hay errores PHP (verificado con logs)
- [ ] ✅ No hay errores en consola del navegador
- [ ] ✅ Funciona correctamente en ambos idiomas (ES/EN)
- [ ] ✅ CI checks passing (GitHub Actions)

### Documentación

- [ ] 📝 README actualizado (si aplica)
- [ ] 📝 docs/ actualizados (si aplica)
- [ ] 📝 Comentarios PHPDoc en funciones nuevas/modificadas
- [ ] 📝 CHANGELOG actualizado (si aplica)

## 🧪 Testing Realizado

<!-- Describe qué tests hiciste para verificar los cambios -->

**Tests manuales:**

- [ ] Homepage carga sin errores
- [ ] Cambio de idioma funciona
- [ ] [Describe otras pruebas realizadas]

**Tests automatizados:**

```bash
# Comando ejecutado
./scripts/test-connections.sh

# Resultado
[Pega el output aquí]
```

## 📸 Screenshots (si aplica)

<!-- Si hay cambios visuales, añade screenshots ANTES y DESPUÉS -->

### Antes

<!-- Imagen -->

### Después

<!-- Imagen -->

## 🔗 Issues Relacionados

<!-- Vincula issues que este PR cierra o referencia -->

Closes #(issue_number)  
Fixes #(issue_number)  
Relates to #(issue_number)

## 📝 Notas para Reviewers

<!-- Información adicional que los reviewers deberían saber -->

<!-- Ejemplo:
- Este PR requiere regenerar permalinks después de merge
- Hay un cambio en la estructura de BD (migración manual necesaria)
- Depende de PR #123
-->

---

## 🚀 Deployment Notes (si aplica)

<!-- Si este PR requiere pasos especiales al deployar -->

**Pre-deployment:**

- [ ] Backup de base de datos
- [ ] [Otro paso]

**Post-deployment:**

- [ ] Regenerar permalinks: `wp rewrite flush`
- [ ] Limpiar cache: `wp cache flush`
- [ ] [Otro paso]

---

**Conventional Commit previsto:**

```
type(scope): descripción corta

[Cuerpo opcional]

[Footer opcional: Closes #123]
```

<!-- Ver CONTRIBUTING.md para más información sobre conventional commits -->
