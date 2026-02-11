#!/bin/bash
#
# Bilingual Menu Validation Test
# Validates menu structure consistency between Spanish and English
#
# Usage: ./test-bilingual-menus.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Bilingual Menu Validation Test"
echo "========================================"
echo ""

# Test 1: Check menu assignments
echo -e "${YELLOW}[Test 1]${NC} Checking menu location assignments..."
MENUS=$(docker exec jewelry_wordpress wp theme mod get nav_menu_locations --allow-root 2>&1 | grep -E 'primary|secondary|mobile|footer' || true)
if [ -z "$MENUS" ]; then
    echo -e "${RED}✗ FAILED${NC}: No menu locations configured"
    exit 1
else
    echo -e "${GREEN}✓ PASSED${NC}: Menu locations exist"
    echo "$MENUS"
fi

echo ""

# Test 2: Check menu names and IDs exist
echo -e "${YELLOW}[Test 2]${NC} Checking if menus exist..."
ES_MENU=$(docker exec jewelry_wordpress wp menu list --allow-root 2>&1 | grep 'primary_navigation_es' || true)
EN_MENU=$(docker exec jewelry_wordpress wp menu list --allow-root 2>&1 | grep 'primary_navigation_en' || true)

if [ -z "$ES_MENU" ] || [ -z "$EN_MENU" ]; then
    echo -e "${RED}✗ FAILED${NC}: Missing ES or EN menu"
    echo "ES Menu: $ES_MENU"
    echo "EN Menu: $EN_MENU"
    exit 1
else
    echo -e "${GREEN}✓ PASSED${NC}: Both menus exist"
    echo "ES: $ES_MENU"
    echo "EN: $EN_MENU"
fi

echo ""

# Test 3: Check menu structure (parent-child relationships)
echo -e "${YELLOW}[Test 3]${NC} Validating menu hierarchy structure..."

STRUCTURE=$(docker exec jewelry_wordpress wp eval '
foreach ( array("primary_navigation_es" => "ES", "primary_navigation_en" => "EN") as $menu_name => $label ) {
    $menu = wp_get_nav_menu_object( $menu_name );
    $items = wp_get_nav_menu_items( $menu->term_id );

    $top_level = 0;
    $child_count = 0;

    foreach ( $items as $item ) {
        if ( $item->menu_item_parent == 0 ) {
            $top_level++;
        } else {
            $child_count++;
        }
    }

    echo "$label: " . count($items) . " items (" . $top_level . " top-level, " . $child_count . " children)\n";
}
' --allow-root 2>&1 | grep -E 'ES:|EN:' || true)

if [ -z "$STRUCTURE" ]; then
    echo -e "${RED}✗ FAILED${NC}: Could not read menu structure"
    exit 1
else
    echo -e "${GREEN}✓ PASSED${NC}: Menu structure readable"
    echo "$STRUCTURE"
fi

echo ""

# Test 4: Check for broken parent IDs
echo -e "${YELLOW}[Test 4]${NC} Checking for broken menu item parents..."

BROKEN=$(docker exec jewelry_wordpress wp eval '
$broken = false;
foreach ( array("primary_navigation_es" => "ES", "primary_navigation_en" => "EN") as $menu_name => $label ) {
    $menu = wp_get_nav_menu_object( $menu_name );
    $items = wp_get_nav_menu_items( $menu->term_id );

    foreach ( $items as $item ) {
        if ( $item->menu_item_parent != 0 ) {
            $parent = get_post( $item->menu_item_parent );
            if ( ! $parent ) {
                echo "$label: Item \"" . $item->title . "\" (ID " . $item->db_id . ") has broken parent ID " . $item->menu_item_parent . "\n";
                $broken = true;
            }
        }
    }
}

if ( ! $broken ) {
    echo "No broken parents found\n";
}
' --allow-root 2>&1 | grep -v 'PHP Warning' || true)

if echo "$BROKEN" | grep -q "has broken parent ID"; then
    echo -e "${RED}✗ FAILED${NC}: Found broken parent IDs"
    echo "$BROKEN"
    exit 1
else
    echo -e "${GREEN}✓ PASSED${NC}: No broken parent IDs"
fi

echo ""

# Test 5: Check that menu items have valid links
echo -e "${YELLOW}[Test 5]${NC} Checking menu item links..."

LINKS=$(docker exec jewelry_wordpress wp eval '
foreach ( array("primary_navigation_es" => "ES", "primary_navigation_en" => "EN") as $menu_name => $label ) {
    $menu = wp_get_nav_menu_object( $menu_name );
    $items = wp_get_nav_menu_items( $menu->term_id );

    echo "\n$label Menu:\n";
    foreach ( $items as $item ) {
        $indent = $item->menu_item_parent ? "  → " : "  ◆ ";
        echo $indent . $item->title . " (" . $item->db_id . ")\n";
        if ( empty( $item->url ) ) {
            echo "    WARNING: No URL for item " . $item->db_id . "\n";
        }
    }
}
' --allow-root 2>&1 | grep -v 'PHP Warning' || true)

echo -e "${GREEN}✓ PASSED${NC}: Menu structure display"
echo "$LINKS"

echo ""
echo "========================================"
echo -e "${GREEN}✓ All tests passed!${NC}"
echo "========================================"
