#!/bin/bash
# =============================================================================
# Jewelry Project - Git Hooks Setup
# Instala hooks de git para enforcar la metodologia TDD
# =============================================================================

set -e

HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Instalando git hooks para Jewelry Project..."

# ---------------------------------------------------------------------------
# Pre-commit hook: Validaciones antes de cada commit
# ---------------------------------------------------------------------------
cat > "$HOOKS_DIR/pre-commit" << 'HOOK'
#!/bin/bash
# Jewelry Project - Pre-commit Hook
# Valida calidad de codigo antes de cada commit

set -e
ERRORS=0

# 1. Verificar sintaxis PHP en archivos staged
echo "[pre-commit] Verificando sintaxis PHP..."
PHP_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.php$' || true)
if [ -n "$PHP_FILES" ]; then
    for file in $PHP_FILES; do
        if [ -f "$file" ]; then
            php -l "$file" > /dev/null 2>&1
            if [ $? -ne 0 ]; then
                echo "ERROR: Syntax error en $file"
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done
    if [ $ERRORS -eq 0 ]; then
        echo "  PHP syntax OK"
    fi
fi

# 2. Verificar prefijo jewelry_ en funciones PHP nuevas
echo "[pre-commit] Verificando prefijo jewelry_..."
if [ -n "$PHP_FILES" ]; then
    for file in $PHP_FILES; do
        if [ -f "$file" ]; then
            BAD_FUNCTIONS=$(git diff --cached "$file" | grep '^+' | grep -E 'function [a-zA-Z_]+\(' | grep -v 'function jewelry_' | grep -v '^\+\+\+' | grep -v '//' || true)
            if [ -n "$BAD_FUNCTIONS" ]; then
                echo "ADVERTENCIA: Funciones sin prefijo jewelry_ en $file:"
                echo "$BAD_FUNCTIONS"
                echo "  Todas las funciones custom deben usar prefijo jewelry_"
            fi
        fi
    done
fi

# 3. Verificar que no se commitean archivos sensibles
echo "[pre-commit] Verificando archivos sensibles..."
SENSITIVE=$(git diff --cached --name-only | grep -E '(^\.env$|\.env\.local|credentials|\.wp-credentials|\.bak$)' || true)
if [ -n "$SENSITIVE" ]; then
    echo "ERROR: Intento de commit de archivos sensibles:"
    echo "$SENSITIVE"
    ERRORS=$((ERRORS + 1))
fi

# 4. Verificar que no hay console.log/var_dump/print_r en codigo
echo "[pre-commit] Verificando debug statements..."
DEBUG_STMTS=$(git diff --cached --diff-filter=ACM | grep '^+' | grep -E '(console\.log|var_dump|print_r|error_log)' | grep -v '^\+\+\+' | grep -v '//' || true)
if [ -n "$DEBUG_STMTS" ]; then
    echo "ADVERTENCIA: Debug statements encontrados:"
    echo "$DEBUG_STMTS"
    echo "  Remover antes de merge a develop/main"
fi

if [ $ERRORS -gt 0 ]; then
    echo ""
    echo "Pre-commit FALLIDO: $ERRORS error(es) encontrados."
    echo "Corrige los errores o usa --no-verify para saltar (no recomendado)."
    exit 1
fi

echo "[pre-commit] Todas las verificaciones pasaron."
HOOK

# ---------------------------------------------------------------------------
# Commit-msg hook: Validar formato de Conventional Commits
# ---------------------------------------------------------------------------
cat > "$HOOKS_DIR/commit-msg" << 'HOOK'
#!/bin/bash
# Jewelry Project - Commit Message Hook
# Valida formato Conventional Commits

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(head -1 "$COMMIT_MSG_FILE")

# Pattern: type(scope): description  OR  type: description
PATTERN="^(feat|fix|docs|style|refactor|test|chore|security|perf|ci|build|revert)(\([a-zA-Z0-9_-]+\))?: .{3,}"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
    echo "ERROR: Formato de commit invalido."
    echo ""
    echo "Formato requerido: type(scope): descripcion"
    echo ""
    echo "Tipos validos:"
    echo "  feat     - Nueva funcionalidad"
    echo "  fix      - Correccion de bug"
    echo "  docs     - Documentacion"
    echo "  style    - Formato (no afecta logica)"
    echo "  refactor - Refactorizacion"
    echo "  test     - Tests (RED/GREEN phase)"
    echo "  chore    - Mantenimiento"
    echo "  security - Fix de seguridad"
    echo "  perf     - Mejora de rendimiento"
    echo "  ci       - CI/CD changes"
    echo ""
    echo "Ejemplos TDD:"
    echo "  test(products): add failing test for metal filter"
    echo "  feat(products): implement metal filter function"
    echo "  refactor(products): improve filter validation"
    echo ""
    echo "Tu mensaje: $COMMIT_MSG"
    exit 1
fi

echo "[commit-msg] Formato de commit valido."
HOOK

# ---------------------------------------------------------------------------
# Prepare-commit-msg hook: Agrega template TDD si branch es feature/*
# ---------------------------------------------------------------------------
cat > "$HOOKS_DIR/prepare-commit-msg" << 'HOOK'
#!/bin/bash
# Jewelry Project - Prepare Commit Message
# Sugiere formato TDD si estamos en un feature branch

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Solo agregar template si no viene de merge/amend/template
if [ -z "$COMMIT_SOURCE" ]; then
    BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || true)

    # Si estamos en un feature branch, agregar hint TDD
    if echo "$BRANCH" | grep -qE '^(feature|fix|hotfix)/'; then
        ISSUE_NUM=$(echo "$BRANCH" | grep -oE '[0-9]+' | head -1)

        # Solo agregar si el archivo esta vacio o es default
        if [ ! -s "$COMMIT_MSG_FILE" ] || grep -q '^$' "$COMMIT_MSG_FILE"; then
            cat > "$COMMIT_MSG_FILE" << EOF

# TDD Commit Guide (esta linea se ignora):
# ─────────────────────────────────────────
# RED phase:      test(scope): add failing test for [feature]
# GREEN phase:    feat(scope): implement [feature]
# REFACTOR phase: refactor(scope): improve [aspect]
#
# Referencia: Ref #${ISSUE_NUM:-XX}
# Docs: docs/WORKFLOW-TDD.md
EOF
        fi
    fi
fi
HOOK

# Hacer ejecutables
chmod +x "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/commit-msg"
chmod +x "$HOOKS_DIR/prepare-commit-msg"

echo ""
echo "Git hooks instalados:"
echo "  pre-commit:          Syntax PHP, prefijo jewelry_, archivos sensibles"
echo "  commit-msg:          Conventional Commits enforcement"
echo "  prepare-commit-msg:  Template TDD en feature branches"
echo ""
echo "Para desinstalar: rm .git/hooks/{pre-commit,commit-msg,prepare-commit-msg}"
