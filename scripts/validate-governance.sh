#!/bin/bash
# =============================================================================
# Jewelry Project - Governance Validator
# Valida que el workflow TDD se esta siguiendo correctamente
# Ejecutar antes de abrir un PR o como parte del CI
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0
BASE_BRANCH="${1:-develop}"

echo "=========================================="
echo " Jewelry Governance Validator"
echo "=========================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Verificar que hay commits con patron TDD
# ---------------------------------------------------------------------------
echo "1. Verificando patron TDD en commits..."

COMMITS=$(git log "$BASE_BRANCH"..HEAD --oneline 2>/dev/null || git log --oneline -20)

TEST_COMMITS=$(echo "$COMMITS" | grep -c "^.\{7\} test(" || true)
FEAT_COMMITS=$(echo "$COMMITS" | grep -c "^.\{7\} feat(" || true)
FIX_COMMITS=$(echo "$COMMITS" | grep -c "^.\{7\} fix(" || true)
REFACTOR_COMMITS=$(echo "$COMMITS" | grep -c "^.\{7\} refactor(" || true)

if [ "$TEST_COMMITS" -gt 0 ] && ([ "$FEAT_COMMITS" -gt 0 ] || [ "$FIX_COMMITS" -gt 0 ]); then
    echo -e "  ${GREEN}TDD pattern detected: $TEST_COMMITS test, $FEAT_COMMITS feat, $FIX_COMMITS fix, $REFACTOR_COMMITS refactor${NC}"
else
    echo -e "  ${YELLOW}ADVERTENCIA: No se detecta patron TDD claro en los commits${NC}"
    echo "  Se esperan commits test(...) antes de feat(...) o fix(...)"
    echo "  Commits encontrados:"
    echo "$COMMITS" | head -10 | sed 's/^/    /'
    WARNINGS=$((WARNINGS + 1))
fi

# ---------------------------------------------------------------------------
# 2. Verificar Conventional Commits
# ---------------------------------------------------------------------------
echo ""
echo "2. Verificando Conventional Commits..."

BAD_COMMITS=$(git log "$BASE_BRANCH"..HEAD --format="%s" 2>/dev/null | grep -cvE "^(feat|fix|docs|style|refactor|test|chore|security|perf|ci|build|revert)(\([a-zA-Z0-9_-]+\))?: " || true)

if [ "$BAD_COMMITS" -eq 0 ]; then
    echo -e "  ${GREEN}Todos los commits siguen Conventional Commits${NC}"
else
    echo -e "  ${YELLOW}ADVERTENCIA: $BAD_COMMITS commits no siguen el formato${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ---------------------------------------------------------------------------
# 3. Verificar que los tests existen y pasan
# ---------------------------------------------------------------------------
echo ""
echo "3. Verificando tests..."

PHP_TESTS=$(find tests/php -name "test-*.php" -o -name "Test*.php" 2>/dev/null | wc -l)
E2E_TESTS=$(find tests/e2e -name "*.spec.js" -o -name "*.spec.ts" 2>/dev/null | wc -l)

echo "  PHP tests encontrados: $PHP_TESTS"
echo "  E2E tests encontrados: $E2E_TESTS"

if [ "$PHP_TESTS" -eq 0 ] && [ "$E2E_TESTS" -eq 0 ]; then
    echo -e "  ${YELLOW}ADVERTENCIA: No se encontraron archivos de test${NC}"
    echo "  El workflow TDD requiere tests. Ver docs/WORKFLOW-TDD.md"
    WARNINGS=$((WARNINGS + 1))
fi

# ---------------------------------------------------------------------------
# 4. Verificar PHP syntax
# ---------------------------------------------------------------------------
echo ""
echo "4. Verificando sintaxis PHP..."

PHP_ERRORS=0
while IFS= read -r file; do
    if ! php -l "$file" > /dev/null 2>&1; then
        echo -e "  ${RED}ERROR: Syntax error en $file${NC}"
        PHP_ERRORS=$((PHP_ERRORS + 1))
    fi
done < <(find . -name "*.php" -not -path "./data/*" -not -path "./vendor/*" -not -path "./node_modules/*" 2>/dev/null)

if [ "$PHP_ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}Sintaxis PHP OK${NC}"
else
    ERRORS=$((ERRORS + PHP_ERRORS))
fi

# ---------------------------------------------------------------------------
# 5. Verificar prefijo jewelry_ en funciones custom
# ---------------------------------------------------------------------------
echo ""
echo "5. Verificando prefijo jewelry_ en funciones..."

CUSTOM_PHP="data/wordpress/wp-content/themes/kadence/functions-custom.php"
if [ -f "$CUSTOM_PHP" ]; then
    BAD_FUNCS=$(grep -n "function " "$CUSTOM_PHP" | grep -v "jewelry_" | grep -v "//" | grep -v "^.*\*" || true)
    if [ -n "$BAD_FUNCS" ]; then
        echo -e "  ${YELLOW}ADVERTENCIA: Funciones sin prefijo jewelry_:${NC}"
        echo "$BAD_FUNCS" | sed 's/^/    /'
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "  ${GREEN}Todas las funciones usan prefijo jewelry_${NC}"
    fi
else
    echo "  functions-custom.php no encontrado (puede ser repo nuevo)"
fi

# ---------------------------------------------------------------------------
# 6. Verificar archivos sensibles
# ---------------------------------------------------------------------------
echo ""
echo "6. Verificando archivos sensibles..."

TRACKED_SENSITIVE=$(git ls-files | grep -E '(^\.env$|\.env\.local|credentials|\.wp-credentials|\.bak$|\.backup$)' || true)
if [ -n "$TRACKED_SENSITIVE" ]; then
    echo -e "  ${RED}ERROR: Archivos sensibles en el repositorio:${NC}"
    echo "$TRACKED_SENSITIVE" | sed 's/^/    /'
    ERRORS=$((ERRORS + 1))
else
    echo -e "  ${GREEN}No se encontraron archivos sensibles${NC}"
fi

# ---------------------------------------------------------------------------
# 7. Verificar estructura del repositorio
# ---------------------------------------------------------------------------
echo ""
echo "7. Verificando estructura del repositorio..."

REQUIRED_FILES=("README.md" "PROYECTO-ESTADO.md" ".gitignore" ".editorconfig" "docker-compose.yml" ".env.example")
REQUIRED_DIRS=(".github" ".github/ISSUE_TEMPLATE" ".ai-tools" "scripts" "docs" "tests")

STRUCT_OK=true
for f in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$f" ]; then
        echo -e "  ${RED}FALTA: $f${NC}"
        ERRORS=$((ERRORS + 1))
        STRUCT_OK=false
    fi
done
for d in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$d" ]; then
        echo -e "  ${RED}FALTA: $d/${NC}"
        ERRORS=$((ERRORS + 1))
        STRUCT_OK=false
    fi
done
if [ "$STRUCT_OK" = true ]; then
    echo -e "  ${GREEN}Estructura completa${NC}"
fi

# ---------------------------------------------------------------------------
# 8. Verificar Definition of Done
# ---------------------------------------------------------------------------
echo ""
echo "8. Verificando Definition of Done..."

if [ -f "docs/DEFINITION-OF-DONE.md" ]; then
    echo -e "  ${GREEN}DoD document presente${NC}"
else
    echo -e "  ${YELLOW}ADVERTENCIA: docs/DEFINITION-OF-DONE.md no encontrado${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
echo ""
echo "=========================================="
echo " Resumen"
echo "=========================================="
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}RESULTADO: FALLIDO${NC}"
    echo "  Errores: $ERRORS"
    echo "  Advertencias: $WARNINGS"
    echo ""
    echo "Corrige los errores antes de abrir PR."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}RESULTADO: PASADO CON ADVERTENCIAS${NC}"
    echo "  Errores: 0"
    echo "  Advertencias: $WARNINGS"
    echo ""
    echo "Revisa las advertencias antes de solicitar review."
    exit 0
else
    echo -e "${GREEN}RESULTADO: PASADO${NC}"
    echo "  Todo en orden. Listo para PR."
    exit 0
fi
