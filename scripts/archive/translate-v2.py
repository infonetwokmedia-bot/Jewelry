#!/usr/bin/env python3
"""
DEFINITIVE Bilingual Translation Script v2 for Jewelry Miami
=============================================================
Fixes encoding issues by using --default-character-set=utf8mb4
Translates EVERYTHING from English to Spanish in wp_posts
Populates TranslatePress dictionary for English at /en/
"""

import subprocess

# ============================================================
# DATABASE HELPERS - WITH CORRECT ENCODING
# ============================================================
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
    """Execute SQL with proper UTF-8 encoding."""
    cmd = DB_BASE + ["-N", "-e", f"SET NAMES utf8mb4; {query}"]
    r = subprocess.run(cmd, capture_output=True, text=True, env={"LANG": "en_US.UTF-8"})
    if r.returncode != 0:
        err = r.stderr.strip()
        if "Warning" not in err and err:
            print(f"  SQL ERROR: {err[:200]}")
            return None
    return r.stdout.strip()


def sql_escape(s):
    """Escape for MySQL."""
    return s.replace("\\", "\\\\").replace("'", "\\'")


def replace_in_post(post_id, old_text, new_text):
    """Replace text in post_content."""
    o = sql_escape(old_text)
    n = sql_escape(new_text)
    return sql(
        f"UPDATE wp_posts SET post_content = REPLACE(post_content, '{o}', '{n}') WHERE ID={post_id}"
    )


def add_trp(es_text, en_text):
    """Add Spanish→English pair to TranslatePress dictionary."""
    es = sql_escape(es_text)
    en = sql_escape(en_text)
    # Insert original string if not exists
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
    # Upsert dictionary entry
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


# ============================================================
# ALL TRANSLATION PAIRS - COMPLETE
# ============================================================

# HOME PAGE (ID=22) - every visible text
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

# ABOUT PAGE (ID=25) - every visible text
ABOUT = [
    (
        "Born on Bird Road, inspired by Havana. We bring the warmth of Cuban tradition &amp; the energy of Miami together.",
        "Nacidos en Bird Road, inspirados por La Habana. Unimos la calidez de la tradición cubana con la energía de Miami.",
    ),
    (
        "Our journey began over 30 years ago when our family arrived in Miami from Cuba, bringing with them generations of jewelry-making tradition. Today, from our Bird Road workshop, we continue to create pieces that celebrate our heritage while embracing the vibrant spirit of Miami.",
        "Nuestro viaje comenzó hace más de 30 años cuando nuestra familia llegó a Miami desde Cuba, trayendo consigo generaciones de tradición joyera. Hoy, desde nuestro taller en Bird Road, seguimos creando piezas que celebran nuestra herencia mientras abrazamos el vibrante espíritu de Miami.",
    ),
    (
        "Always bringing fresh designs while honoring timeless traditions",
        "Siempre trayendo diseños frescos mientras honramos tradiciones eternas",
    ),
    ("ACCESSIBLE LUXURY", "LUJO ACCESIBLE"),
    (
        "At Jewelry Miami, we believe everyone deserves to shine. Our Bird Road showroom offers stunning pieces at prices that make luxury accessible",
        "En Jewelry Miami, creemos que todos merecen brillar. Nuestro showroom en Bird Road ofrece piezas deslumbrantes a precios que hacen el lujo accesible",
    ),
    (
        "from everyday elegance to once-in-a-lifetime moments.",
        "desde la elegancia diaria hasta los momentos únicos en la vida.",
    ),
    ("Precious Metals", "Metales Preciosos"),
    ("14k Solid Gold", "Oro Sólido 14k"),
    (
        "Our signature 14-karat gold pieces are handcrafted to last generations. Rich, warm tones that complement every skin tone beautifully.",
        "Nuestras piezas exclusivas de oro de 14 quilates están hechas a mano para durar generaciones. Tonos cálidos y ricos que complementan hermosamente cada tono de piel.",
    ),
    ("Sterling Silver", "Plata Esterlina"),
    (
        "Premium .925 sterling silver, perfect for everyday wear. Hypoallergenic and durable, with the brilliant shine Miami is known for.",
        "Plata esterlina .925 premium, perfecta para el uso diario. Hipoalergénica y durable, con el brillo espectacular por el que Miami es conocido.",
    ),
    ("Gold Vermeil", "Vermeil de Oro"),
    (
        "the smart choice for designer-quality jewelry. All the glamour at a fraction of the price.",
        "la elección inteligente para joyería de calidad de diseñador. Todo el glamour a una fracción del precio.",
    ),
    (
        "We work with trusted artisans to bring you authentic, high-quality pieces that honor our Cuban heritage and Miami lifestyle",
        "Trabajamos con artesanos de confianza para traerte piezas auténticas y de alta calidad que honran nuestra herencia cubana y el estilo de vida de Miami",
    ),
    (
        "From designing to polishing, each piece passes through the hands of master jewelers who learned their art in Havana and perfected it in Miami. Quality you can see, feel, and trust.",
        "Desde el diseño hasta el pulido, cada pieza pasa por las manos de maestros joyeros que aprendieron su arte en La Habana y lo perfeccionaron en Miami. Calidad que puedes ver, sentir y confiar.",
    ),
    ("Flexible Payment Plans Available", "Planes de Pago Flexibles Disponibles"),
    (
        "We offer layaway and flexible payment options so your dream piece is always within reach. Ask us in-store for details.",
        "Ofrecemos apartado y opciones de pago flexibles para que tu pieza soñada esté siempre a tu alcance. Pregúntanos en la tienda por los detalles.",
    ),
    ("- VISIT OUR STORES", "- VISITA NUESTRAS TIENDAS"),
]

# CONTACT PAGE (ID=27) - every visible text
CONTACT = [
    ("Contact Us", "Contáctanos"),
    (
        "Have a question? Feel free to get in touch with us, we'll get back to you shortly.",
        "¿Tienes una pregunta? No dudes en comunicarte con nosotros, te responderemos pronto.",
    ),
    ("VISIT OUR STORE", "VISITA NUESTRA TIENDA"),
    ("P: (305) 555-GEMS", "T: (305) 555-GEMS"),
    ("E: hello@jewelrymiami.com", "C: hello@jewelrymiami.com"),
    ("A: 5784 Bird Rd, Miami, FL 33155", "D: 5784 Bird Rd, Miami, FL 33155"),
    ("FOLLOW US", "SÍGUENOS"),
    ("Useful Links", "Enlaces Útiles"),
    ("Partnerships", "Alianzas"),
    (
        "Interested in a partnership with us?",
        "¿Interesado en una alianza con nosotros?",
    ),
    ("APPLY HERE", "APLICA AQUÍ"),
    (
        "Most questions can be answered here.",
        "La mayoría de las preguntas se responden aquí.",
    ),
    ("GO TO FAQ", "IR A PREGUNTAS FRECUENTES"),
    ("Store Location", "Ubicación de la Tienda"),
    ("Find your nearest Jewelry store.", "Encuentra tu tienda Jewelry más cercana."),
    ("FIND STORE", "ENCONTRAR TIENDA"),
]

# PRODUCTS
PRODUCTS = [
    (
        77,
        "Havana Solitaire Engagement Ring",
        "Anillo de Compromiso Solitario Habana",
        "A stunning solitaire ring inspired by the timeless romance of Old Havana. Set in 14k gold with a brilliant-cut center stone.",
        "Un impresionante anillo solitario inspirado en el romance eterno de La Habana Vieja. Engastado en oro de 14k con piedra central de corte brillante.",
    ),
    (
        79,
        "Miami Argollas - Gold Hoops",
        "Argollas Miami - Aros de Oro",
        "Bold, beautiful gold hoops that capture the energy of Miami. These Cuban-style argollas are a must-have for every Latina.",
        "Hermosas argollas de oro audaces que capturan la energía de Miami. Estas argollas estilo cubano son imprescindibles para toda latina.",
    ),
    (
        81,
        "Cuban Link Gold Chain - 14K",
        "Cadena Cubana de Oro - 14K",
        "The iconic Cuban link chain, handcrafted in Miami from solid 14K gold. A symbol of strength, heritage, and Miami style.",
        "La icónica cadena de eslabones cubanos, hecha a mano en Miami en oro sólido de 14K. Un símbolo de fuerza, herencia y estilo Miami.",
    ),
    (
        83,
        "Coral Gables Tennis Bracelet",
        "Pulsera Tennis Coral Gables",
        "An elegant tennis bracelet featuring brilliant-cut stones in a classic setting, inspired by the sophistication of Coral Gables.",
        "Una elegante pulsera tennis con piedras de corte brillante en un engaste clásico, inspirada en la sofisticación de Coral Gables.",
    ),
    (
        85,
        "Abuela's Pearl Strand",
        "Collar de Perlas de Abuela",
        "A classic pearl strand necklace that honors the tradition of passing jewelry through generations. Every abuela would be proud.",
        "Un clásico collar de perlas que honra la tradición de pasar joyería de generación en generación. Toda abuela estaría orgullosa.",
    ),
    (
        92,
        "Little Havana Diamond Studs",
        "Aretes de Diamante Little Havana",
        "Sparkling diamond studs that bring the fire of Little Havana to your everyday look. Set in 14k white gold.",
        "Brillantes aretes de diamante que traen el fuego de la Pequeña Habana a tu look diario. Engastados en oro blanco de 14k.",
    ),
    (
        94,
        "Sevillana Bangle Stack - Set of 7",
        "Brazaletes Sevillana - Juego de 7",
        "A stack of seven gold-plated bangles inspired by the rhythms of Sevilla and the streets of Calle Ocho.",
        "Un juego de siete brazaletes bañados en oro inspirados en los ritmos de Sevilla y las calles de la Calle Ocho.",
    ),
    (
        96,
        "Noche Cubana Statement Necklace",
        "Collar Noche Cubana",
        "A dramatic statement necklace for those special Miami nights. Layers of gold and gems that turn heads at every event.",
        "Un collar dramático para esas noches especiales de Miami. Capas de oro y gemas que roban miradas en cada evento.",
    ),
    (
        97,
        "El Padrino Signet Ring",
        "Anillo Sello El Padrino",
        "A bold signet ring with old-world Cuban craftsmanship. Perfect for the man who leads his family with strength and style.",
        "Un audaz anillo de sello con artesanía cubana del viejo mundo. Perfecto para el hombre que lidera su familia con fuerza y estilo.",
    ),
    (
        98,
        "La Princesa Quinceañera Crown",
        "Corona de Quinceañera La Princesa",
        "A breathtaking tiara designed for that once-in-a-lifetime quinceañera moment. Crystal and pearl details fit for a princess.",
        "Una tiara impresionante diseñada para ese momento único de quinceañera. Detalles de cristal y perla dignos de una princesa.",
    ),
    (
        100,
        "Santa Clara Crucifix - 14K Gold",
        "Crucifijo Santa Clara - Oro 14K",
        "A beautifully detailed 14K gold crucifix named after the beloved Cuban city. Faith and craftsmanship in perfect harmony.",
        "Un crucifijo de oro 14K bellamente detallado, nombrado en honor a la querida ciudad cubana. Fe y artesanía en perfecta armonía.",
    ),
    (
        102,
        "Mi Vida Charm Bracelet",
        "Pulsera de Dijes Mi Vida",
        "A customizable charm bracelet celebrating the moments that matter most. Add charms for family, faith, and milestones.",
        "Una pulsera de dijes personalizable que celebra los momentos que más importan. Añade dijes de familia, fe y momentos especiales.",
    ),
    (
        104,
        "Juntos Para Siempre - Wedding Band Set",
        "Juntos Para Siempre - Argollas de Boda",
        "Matching wedding bands symbolizing eternal love. Handcrafted in Miami with Cuban soul for couples who are together forever.",
        "Argollas de boda a juego que simbolizan el amor eterno. Hechas a mano en Miami con alma cubana para parejas que estarán juntas para siempre.",
    ),
]

CATEGORIES = [
    ("Necklaces & Chains", "Collares y Cadenas"),
    ("Rings", "Anillos"),
    ("Earrings", "Aretes"),
    ("Bracelets", "Pulseras"),
    ("Bridal", "Nupcial"),
    ("Uncategorized", "Sin Categoría"),
]


def main():
    print("=" * 70)
    print("  JEWELRY MIAMI - BILINGUAL TRANSLATION v2")
    print("  Proper UTF-8 encoding + Complete translation")
    print("=" * 70)

    # STEP 0: Fix encoding artifacts from previous session
    print("\n[0] Fixing encoding artifacts from previous session...")
    # Fix escaped unicode in About page
    replace_in_post(25, "\\\\u2014", "—")
    # Fix double-encoded em dash
    replace_in_post(25, 'â€"', "—")
    replace_in_post(25, "â€\u201c", "—")
    print("  Encoding artifacts cleaned")

    # STEP 1: Clear stale TRP data
    print("\n[1] Clearing stale TranslatePress data...")
    sql("DELETE FROM wp_trp_original_meta")
    sql("DELETE FROM wp_trp_dictionary_es_es_en_us")
    sql("DELETE FROM wp_trp_original_strings")
    print("  Done")

    # STEP 2: HOME (ID=22)
    print("\n[2] Translating HOME page...")
    count = 0
    for en, es in HOME:
        replace_in_post(22, en, es)
        add_trp(es, en)
        count += 1
    print(f"  {count} pairs processed")

    # STEP 3: ABOUT (ID=25)
    print("\n[3] Translating ABOUT page...")
    count = 0
    for en, es in ABOUT:
        replace_in_post(25, en, es)
        add_trp(es, en)
        count += 1
    print(f"  {count} pairs processed")

    # STEP 4: CONTACT (ID=27)
    print("\n[4] Translating CONTACT page...")
    count = 0
    for en, es in CONTACT:
        replace_in_post(27, en, es)
        add_trp(es, en)
        count += 1
    print(f"  {count} pairs processed")

    # STEP 5: PRODUCTS
    print("\n[5] Translating 13 products...")
    for pid, en_title, es_title, en_desc, es_desc in PRODUCTS:
        t = sql_escape(es_title)
        d = sql_escape(es_desc)
        sql(f"UPDATE wp_posts SET post_title='{t}', post_excerpt='{d}' WHERE ID={pid}")
        replace_in_post(pid, en_desc, es_desc)
        # Slug
        slug = es_title.lower()
        for old, new in [
            ("á", "a"),
            ("é", "e"),
            ("í", "i"),
            ("ó", "o"),
            ("ú", "u"),
            ("ñ", "n"),
            (" ", "-"),
            (",", ""),
            (".", ""),
        ]:
            slug = slug.replace(old, new)
        slug = slug.replace("---", "-").replace("--", "-")
        sql(f"UPDATE wp_posts SET post_name='{sql_escape(slug)}' WHERE ID={pid}")
        add_trp(es_title, en_title)
        add_trp(es_desc, en_desc)
    print("  13 products translated")

    # STEP 6: CATEGORIES
    print("\n[6] Translating categories...")
    for en_name, es_name in CATEGORIES:
        sql(
            f"UPDATE wp_terms SET name='{sql_escape(es_name)}' WHERE name='{sql_escape(en_name)}'"
        )
        add_trp(es_name, en_name)
    add_trp("Quinceañera", "Quinceañera")
    print("  Done")

    # STEP 7: Site title & tagline
    print("\n[7] Updating site options...")
    tagline_es = "Herencia Cubana y Glamour de Miami | Joyería Artesanal en Bird Road"
    tagline_en = "Cuban Heritage Meets Miami Glamour | Handcrafted Jewelry on Bird Road"
    sql(
        f"UPDATE wp_options SET option_value='{sql_escape(tagline_es)}' WHERE option_name='blogdescription'"
    )
    add_trp("Jewelry Miami", "Jewelry Miami")
    add_trp(tagline_es, tagline_en)
    print(f"  Tagline: {tagline_es}")

    # STEP 8: Page titles
    print("\n[8] Updating page titles...")
    pages = [
        (22, "Inicio"),
        (25, "Nosotros"),
        (27, "Contacto"),
        (1574, "Tienda"),
        (1575, "Carrito"),
        (1576, "Finalizar Compra"),
        (1577, "Mi Cuenta"),
    ]
    page_en = {
        "Inicio": "Home",
        "Nosotros": "About",
        "Contacto": "Contact",
        "Tienda": "Shop",
        "Carrito": "Cart",
        "Finalizar Compra": "Checkout",
        "Mi Cuenta": "My Account",
    }
    for pid, title in pages:
        sql(f"UPDATE wp_posts SET post_title='{sql_escape(title)}' WHERE ID={pid}")
        add_trp(title, page_en.get(title, title))
    print("  Done")

    # STEP 9: Menu items
    print("\n[9] Updating menu items...")
    menus = [
        ("Home", "Inicio"),
        ("Shop", "Tienda"),
        ("About", "Nosotros"),
        ("Contact", "Contacto"),
    ]
    for en, es in menus:
        sql(
            f"UPDATE wp_posts SET post_title='{sql_escape(es)}' WHERE post_type='nav_menu_item' AND post_title='{sql_escape(en)}'"
        )
    print("  Done")

    # STEP 10: Extra UI translations for TRP
    print("\n[10] Adding extra UI translations to TRP...")
    extras = [
        ("Añadir al carrito", "Add to cart"),
        ("Ver carrito", "View cart"),
        ("Buscar", "Search"),
        ("Categorías", "Categories"),
        ("Productos relacionados", "Related products"),
        ("Descripción", "Description"),
        ("Valoraciones", "Reviews"),
    ]
    for es, en in extras:
        add_trp(es, en)
    print(f"  {len(extras)} extra pairs added")

    # SUMMARY
    trp_count = sql("SELECT COUNT(*) FROM wp_trp_dictionary_es_es_en_us WHERE status=2")
    print(f"\n{'=' * 70}")
    print("  TRANSLATION COMPLETE!")
    print(f"  TRP dictionary entries: {trp_count}")
    print("  / → Español | /en/ → English (via TranslatePress)")
    print(f"{'=' * 70}")

    # Quick verification
    print("\nVerification:")
    home_t = sql("SELECT post_title FROM wp_posts WHERE ID=22")
    print(f"  Home title: {home_t}")
    about_t = sql("SELECT post_title FROM wp_posts WHERE ID=25")
    print(f"  About title: {about_t}")
    # Check encoding
    check = sql("SELECT LOCATE('Colección', post_content) FROM wp_posts WHERE ID=22")
    print(f"  'Colección' in Home: pos {check}")
    check2 = sql("SELECT LOCATE('ColecciÃ³n', post_content) FROM wp_posts WHERE ID=22")
    print(f"  'ColecciÃ³n' (bad) in Home: pos {check2}")


if __name__ == "__main__":
    main()
