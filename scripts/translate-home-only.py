#!/usr/bin/env python3
"""
Translate ONLY the Home page (ID=22) content from English to Spanish.
Also updates TRP dictionary entries for the Home page pairs.
Does NOT clear existing TRP data or touch other pages.
"""

import subprocess

DB_BASE = [
    "docker",
    "exec",
    "jewelry_mysql",
    "mysql",
    "-u",
    "jewelry_user",
    "-pjewelry_pass_2026!",
    "--default-character-set=utf8mb4",
    "jewelry_db",
]


def sql(query):
    cmd = DB_BASE + ["-N", "-e", f"SET NAMES utf8mb4; {query}"]
    r = subprocess.run(cmd, capture_output=True, text=True, env={"LANG": "en_US.UTF-8"})
    if r.returncode != 0:
        err = r.stderr.strip()
        if "Warning" not in err and err:
            print(f"  SQL ERROR: {err[:200]}")
            return None
    return r.stdout.strip()


def sql_escape(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")


def replace_in_post(post_id, old_text, new_text):
    o = sql_escape(old_text)
    n = sql_escape(new_text)
    return sql(
        f"UPDATE wp_posts SET post_content = REPLACE(post_content, '{o}', '{n}') WHERE ID={post_id}"
    )


def add_trp(es_text, en_text):
    es = sql_escape(es_text)
    en = sql_escape(en_text)
    existing = sql(
        f"SELECT id FROM wp_trp_original_strings WHERE original='{es}' LIMIT 1"
    )
    if existing and existing.strip():
        oid = existing.strip()
    else:
        sql(f"INSERT INTO wp_trp_original_strings (original) VALUES ('{es}')")
        oid = sql("SELECT LAST_INSERT_ID()")
    if not oid or not oid.strip():
        return False
    oid = oid.strip()
    existing_dict = sql(
        f"SELECT id FROM wp_trp_dictionary_es_es_en_us WHERE original_id={oid} LIMIT 1"
    )
    if existing_dict and existing_dict.strip():
        sql(
            f"UPDATE wp_trp_dictionary_es_es_en_us SET original='{es}', translated='{en}', status=2 WHERE original_id={oid}"
        )
    else:
        sql(
            f"INSERT INTO wp_trp_dictionary_es_es_en_us (original, translated, status, block_type, original_id) VALUES ('{es}', '{en}', 2, 0, {oid})"
        )
    return True


# HOME PAGE (ID=22) - all visible text pairs (English → Spanish)
HOME = [
    # Hero
    (
        "Where Cuban Heritage Meets Miami Glamour",
        "Donde la Herencia Cubana se Une al Glamour de Miami",
    ),
    (
        "Handcrafted jewelry that celebrates your roots, your family, and every moment worth remembering",
        "Joyería artesanal que celebra tus raíces, tu familia y cada momento que vale la pena recordar",
    ),
    ("- EXPLORE COLLECTIONS", "- EXPLORAR COLECCIONES"),
    # Shop by Category
    ("Our Collections", "Nuestras Colecciones"),
    ("- View All", "- Ver Todo"),
    ("Earrings", "Aretes"),
    ("Necklaces", "Collares"),
    ("Rings", "Anillos"),
    # About snippet on Home
    (
        "Born on Bird Road, inspired by Havana. We bring the warmth of Cuban tradition &amp; the energy of Miami together.",
        "Nacidos en Bird Road, inspirados por La Habana. Unimos la calidez de la tradición cubana con la energía de Miami.",
    ),
    (
        "At Jewelry Miami, we understand that jewelry is more than an accessory",
        "En Jewelry Miami, entendemos que la joyería es más que un accesorio",
    ),
    (
        "it's heritage. Every piece is chosen with the same love our abuelas put into everything.",
        "es herencia. Cada pieza se elige con el mismo amor que nuestras abuelas ponen en todo.",
    ),
    ("- OUR STORY", "- NUESTRA HISTORIA"),
    # New Arrivals
    ("New Arrivals", "Nuevas Llegadas"),
    # CTA Section
    ("Jewelry Miami", "Jewelry Miami"),
    ("Our Story", "Nuestra Historia"),
    (
        "Whether it's your daughter's quinceañera or your wedding day",
        "Ya sea la quinceañera de tu hija o el día de tu boda",
    ),
    ("we've got you, familia", "te tenemos, familia"),
    ("- SHOP THE COLLECTION", "- COMPRAR LA COLECCIÓN"),
    # Testimonials
    ("WHAT OUR FAMILIA SAYS", "LO QUE DICE NUESTRA FAMILIA"),
    (
        "I bought my wife's anniversary gift here and she cried happy tears. The staff helped me pick the perfect piece. This is THE jewelry store in Miami.",
        "Compré aquí el regalo de aniversario de mi esposa y lloró de felicidad. El personal me ayudó a elegir la pieza perfecta. Esta ES la joyería de Miami.",
    ),
    ("Carlos M., Hialeah", "Carlos M., Hialeah"),
    (
        "They made my quinceañera so special! My tiara was absolutely stunning. Everyone kept asking where I got it.",
        "¡Hicieron mi quinceañera tan especial! Mi tiara era absolutamente impresionante. Todos preguntaban dónde la conseguí.",
    ),
    ("Jewelry Miami!", "¡Jewelry Miami!"),
    ("Isabella R., Kendall", "Isabella R., Kendall"),
    # Collections
    ("Lammar Collection", "Colección Lammar"),
    (
        "The perfect match for any outfit",
        "El complemento perfecto para cualquier atuendo",
    ),
    ("Starting at $350.00", "Desde $350.00"),
    ("Fermina Collection", "Colección Fermina"),
    ("The jewelry set for the modern women", "El juego de joyas para la mujer moderna"),
    ("Starting at $425.00", "Desde $425.00"),
    ("Tolentino Collection", "Colección Tolentino"),
    ("Truly the must-have ring collection", "La colección de anillos imprescindible"),
    ("Starting at $275.50", "Desde $275.50"),
    # Featured + Materials
    ("Featured Pieces", "Piezas Destacadas"),
    ("Precious Metals", "Metales Preciosos"),
    ("14K Solid Gold", "Oro Sólido 14K"),
    ("Sterling Silver", "Plata Esterlina"),
    ("Gold Vermeil", "Vermeil de Oro"),
    # Bottom sections
    ("Cuban-Crafted, Miami-Loved Jewelry", "Joyería Artesanal Cubana, Amada en Miami"),
    ("Discover our bracelets collection", "Descubre nuestra colección de pulseras"),
    ("- EXPLORE", "- EXPLORAR"),
    ("Flexible Payment Plans Available", "Planes de Pago Flexibles Disponibles"),
    (
        "Fair prices, real quality, and they always remember my name. That's how you do business.",
        "Precios justos, calidad real, y siempre recuerdan mi nombre. Así se hacen los negocios.",
    ),
    ("Roberto L., Westchester", "Roberto L., Westchester"),
    ("- VISIT US ON BIRD ROAD", "- VISÍTANOS EN BIRD ROAD"),
]


def main():
    print("=" * 60)
    print("  HOME PAGE TRANSLATION (ID=22) - RESTORE FIX")
    print("=" * 60)

    # Verify page 22 has English content (from restored backup)
    check = sql(
        "SELECT LOCATE('Cuban Heritage', post_content) FROM wp_posts WHERE ID=22"
    )
    if not check or check.strip() == "0":
        print(
            '  WARNING: "Cuban Heritage" not found in page 22. Content may already be translated.'
        )
        return

    print(f"\n  Found English content in page 22 (pos {check.strip()})")
    print(f"  Processing {len(HOME)} translation pairs...\n")

    success = 0
    for en, es in HOME:
        # Check if English text exists in content before replacing
        o = sql_escape(en)
        found = sql(f"SELECT LOCATE('{o}', post_content) FROM wp_posts WHERE ID=22")
        if found and found.strip() != "0":
            replace_in_post(22, en, es)
            success += 1
            print(f"  ✓ {en[:50]}..." if len(en) > 50 else f"  ✓ {en}")
        else:
            print(
                f"  ✗ NOT FOUND: {en[:60]}..."
                if len(en) > 60
                else f"  ✗ NOT FOUND: {en}"
            )

        # Always ensure TRP entry exists
        add_trp(es, en)

    print(f"\n  Replaced {success}/{len(HOME)} texts in page 22")

    # Verify
    print("\nVerification:")
    check_es = sql("SELECT LOCATE('Colección', post_content) FROM wp_posts WHERE ID=22")
    print(f'  "Colección" in Home: pos {check_es}')
    check_uagb = sql(
        "SELECT LOCATE('uagb-heading-text', post_content) FROM wp_posts WHERE ID=22"
    )
    print(f'  "uagb-heading-text" in Home: pos {check_uagb}')
    size = sql("SELECT LENGTH(post_content) FROM wp_posts WHERE ID=22")
    print(f"  Content size: {size} bytes")

    print("\n" + "=" * 60)
    print("  HOME PAGE TRANSLATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
