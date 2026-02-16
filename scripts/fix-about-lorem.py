#!/usr/bin/env python3
"""
Fix remaining Lorem Ipsum text on the About page (ID=25).
Uses sequential context-aware replacements to handle repeated strings.
"""

import subprocess
import sys

DB_CMD = [
    "docker",
    "exec",
    "jewelry_mysql",
    "mysql",
    "-u",
    "jewelry_user",
    "-pjewelry_pass_2026!",
    "jewelry_db",
    "-N",
    "-e",
]


def run_sql(sql):
    """Execute SQL and return output."""
    result = subprocess.run(DB_CMD + [sql], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  SQL ERROR: {result.stderr.strip()}")
        return None
    return result.stdout.strip()


def get_about_content():
    """Get current About page content."""
    return run_sql("SELECT post_content FROM wp_posts WHERE ID=25")


def save_about_content(content):
    """Save updated About page content."""
    # Escape for MySQL
    escaped = content.replace("\\", "\\\\").replace("'", "\\'")
    sql = f"UPDATE wp_posts SET post_content='{escaped}' WHERE ID=25"
    result = subprocess.run(DB_CMD + [sql], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  SAVE ERROR: {result.stderr.strip()}")
        return False
    return True


def contextual_replace(content, context_before, old_text, new_text):
    """Replace old_text with new_text only when preceded by context_before."""
    search = context_before + old_text
    if search in content:
        replacement = context_before + new_text
        content = content.replace(search, replacement, 1)
        return content, True
    return content, False


# ============================================================
# REPLACEMENTS
# ============================================================

LOREM_SHORT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis."
LOREM_LIQUA = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna liqua. Ut enim ad minim veniam."
LOREM_ALIQUA = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam."
LOREM_SEDDO = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do."
DUIS_AUTE = "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur lorem ipsum."


def main():
    print("=" * 60)
    print("FIX ABOUT PAGE - Remove remaining Lorem Ipsum")
    print("=" * 60)

    content = get_about_content()
    if not content:
        print("ERROR: Could not read About page content")
        sys.exit(1)

    print(f"Content length: {len(content)} chars")
    changes = 0

    # 1. Hero subtitle - "Duis aute irure..."
    print("\n[1] Replacing hero subtitle (Duis aute irure)...")
    old = DUIS_AUTE
    new = "Three generations of Cuban craftsmanship, now in the heart of Miami. Every piece tells a story of heritage, passion, and timeless elegance."
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print("  OK")
    else:
        print("  NOT FOUND (already replaced?)")

    # 2. ACCESSIBLE LUXURY paragraph - Lorem with "liqua" typo
    print("\n[2] Replacing ACCESSIBLE LUXURY paragraph...")
    old = LOREM_LIQUA
    new = "At Jewelry Miami, we believe everyone deserves to shine. Our Bird Road showroom offers stunning pieces at prices that make luxury accessible \\u2014 from everyday elegance to once-in-a-lifetime moments."
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print("  OK")
    else:
        print("  NOT FOUND (already replaced?)")

    # 3. 14k Solid Gold info-box (first occurrence of LOREM_SHORT)
    print("\n[3] Replacing 14k Solid Gold description...")
    ctx = "14k Solid Gold"
    new_desc = "Our signature 14-karat gold pieces are handcrafted to last generations. Rich, warm tones that complement every skin tone beautifully."
    result, ok = contextual_replace(content, ctx, LOREM_SHORT, new_desc)
    if ok:
        content = result
        changes += 1
        print("  OK")
    else:
        # Try with the tag structure
        search = f'14k Solid Gold</h3></div><p class=\\"uagb-ifb-desc\\">{LOREM_SHORT}'
        replace = f'14k Solid Gold</h3></div><p class=\\"uagb-ifb-desc\\">{new_desc}'
        if search in content:
            content = content.replace(search, replace, 1)
            changes += 1
            print("  OK (via tag context)")
        else:
            print("  NOT FOUND")

    # 4. Sterling Silver info-box (second occurrence of LOREM_SHORT)
    print("\n[4] Replacing Sterling Silver description...")
    ctx = "Sterling Silver"
    new_desc = "Premium .925 sterling silver, perfect for everyday wear. Hypoallergenic and durable, with the brilliant shine Miami is known for."
    result, ok = contextual_replace(content, ctx, LOREM_SHORT, new_desc)
    if ok:
        content = result
        changes += 1
        print("  OK")
    else:
        search = f'Sterling Silver</h3></div><p class=\\"uagb-ifb-desc\\">{LOREM_SHORT}'
        replace = f'Sterling Silver</h3></div><p class=\\"uagb-ifb-desc\\">{new_desc}'
        if search in content:
            content = content.replace(search, replace, 1)
            changes += 1
            print("  OK (via tag context)")
        else:
            print("  NOT FOUND")

    # 5. Gold Vermeil info-box (third occurrence of LOREM_SHORT)
    print("\n[5] Replacing Gold Vermeil description...")
    ctx = "Gold Vermeil"
    new_desc = "Luxurious 18k gold over sterling silver \\u2014 the smart choice for designer-quality jewelry. All the glamour at a fraction of the price."
    result, ok = contextual_replace(content, ctx, LOREM_SHORT, new_desc)
    if ok:
        content = result
        changes += 1
        print("  OK")
    else:
        search = f'Gold Vermeil</h3></div><p class=\\"uagb-ifb-desc\\">{LOREM_SHORT}'
        replace = f'Gold Vermeil</h3></div><p class=\\"uagb-ifb-desc\\">{new_desc}'
        if search in content:
            content = content.replace(search, replace, 1)
            changes += 1
            print("  OK (via tag context)")
        else:
            print("  NOT FOUND")

    # 6. Artisan section - Lorem with aliqua
    print("\n[6] Replacing artisan section paragraph...")
    old = LOREM_ALIQUA
    new = "From designing to polishing, each piece passes through the hands of master jewelers who learned their art in Havana and perfected it in Miami. Quality you can see, feel, and trust."
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print("  OK")
    else:
        print("  NOT FOUND (already replaced?)")

    # 7. Flexible Payment Plans description
    print("\n[7] Replacing Flexible Payment Plans description...")
    old = LOREM_SEDDO
    new = "We offer layaway and flexible payment options so your dream piece is always within reach. Ask us in-store for details."
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1
        print("  OK")
    else:
        print("  NOT FOUND (already replaced?)")

    # Also check for the long paragraph with line break
    print("\n[8] Checking for long Lorem paragraph with br tag...")
    long_lorem_part = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore. Et dolore magna aliqua."
    if long_lorem_part in content:
        # Find the full paragraph
        idx = content.find(long_lorem_part)
        # Get surrounding context to find the full text
        end_idx = content.find("</p>", idx)
        full_old = content[idx:end_idx]
        new_full = "Our journey began over 30 years ago when our family arrived in Miami from Cuba, bringing with them generations of jewelry-making tradition. Today, from our Bird Road workshop, we continue to create pieces that celebrate our heritage while embracing the vibrant spirit of Miami."
        content = content[:idx] + new_full + content[end_idx:]
        changes += 1
        print(f"  OK (replaced {len(full_old)} chars)")
    else:
        print("  NOT FOUND (already replaced?)")

    # ============================================================
    # SAVE
    # ============================================================
    if changes > 0:
        print(f"\n{'=' * 60}")
        print(f"Saving {changes} changes...")
        if save_about_content(content):
            print("SUCCESS! About page updated.")
        else:
            print("FAILED to save!")
            sys.exit(1)
    else:
        print("\nNo changes needed - all Lorem ipsum already replaced!")

    # Verify
    print(f"\n{'=' * 60}")
    print("VERIFICATION - checking for remaining Lorem ipsum...")
    final = get_about_content()
    lorem_count = final.count("Lorem ipsum") + final.count("lorem ipsum")
    duis_count = final.count("Duis aute irure")
    if lorem_count == 0 and duis_count == 0:
        print("PERFECT! No Lorem ipsum remaining on About page.")
    else:
        print(
            f"WARNING: Still found {lorem_count} Lorem + {duis_count} Duis occurrences"
        )


if __name__ == "__main__":
    main()
