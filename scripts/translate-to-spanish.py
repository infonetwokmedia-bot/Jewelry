#!/usr/bin/env python3
"""
Bilingual Translation Script for Jewelry Miami
================================================
1. Replaces wp_posts English content with Spanish (primary language)
2. Populates TranslatePress dictionary so /en/ shows English
3. Translates product titles, descriptions, categories
4. Updates site title and tagline

TranslatePress config:
  - Primary: es_ES (URL: /)
  - Secondary: en_US (URL: /en/)
  - Dictionary table: wp_trp_dictionary_es_es_en_us
"""

import subprocess

# ============================================================
# DATABASE HELPERS
# ============================================================
DB_CMD = [
    "docker",
    "exec",
    "jewelry_mysql",
    "mysql",
    "-u",
    "jewelry_user",
    "-pjewelry_pass_2026!",
    "jewelry_db",
]


def sql(query, raw=False):
    """Execute SQL query and return output."""
    cmd = DB_CMD + (["-N"] if not raw else []) + ["-e", query]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        err = r.stderr.strip()
        if "Warning" not in err:
            print(f"  SQL ERROR: {err}")
            return None
    return r.stdout.strip()


def sql_escape(s):
    """Escape string for MySQL single-quoted context."""
    return s.replace("\\", "\\\\").replace("'", "\\'")


def search_replace_in_post(post_id, old_text, new_text):
    """Replace text in post_content preserving block structure."""
    old_esc = sql_escape(old_text)
    new_esc = sql_escape(new_text)
    q = f"UPDATE wp_posts SET post_content = REPLACE(post_content, '{old_esc}', '{new_esc}') WHERE ID={post_id}"
    result = sql(q)
    return result is not None


def add_trp_translation(spanish_text, english_text, block_type=0):
    """Add a translation pair to TranslatePress dictionary.
    1. Insert into wp_trp_original_strings
    2. Insert into wp_trp_dictionary_es_es_en_us with status=2 (human translated)
    """
    es_esc = sql_escape(spanish_text)
    en_esc = sql_escape(english_text)

    # Check if original already exists
    existing = sql(
        f"SELECT id FROM wp_trp_original_strings WHERE original='{es_esc}' LIMIT 1"
    )
    if existing and existing.strip():
        orig_id = existing.strip()
    else:
        sql(f"INSERT INTO wp_trp_original_strings (original) VALUES ('{es_esc}')")
        orig_id = sql("SELECT LAST_INSERT_ID()")

    if not orig_id:
        print(f"  WARNING: Could not get original_id for: {spanish_text[:50]}")
        return False

    # Check if dictionary entry exists
    existing_dict = sql(
        f"SELECT id FROM wp_trp_dictionary_es_es_en_us WHERE original_id={orig_id} LIMIT 1"
    )
    if existing_dict and existing_dict.strip():
        # Update existing
        sql(
            f"UPDATE wp_trp_dictionary_es_es_en_us SET original='{es_esc}', translated='{en_esc}', status=2 WHERE original_id={orig_id}"
        )
    else:
        sql(
            f"INSERT INTO wp_trp_dictionary_es_es_en_us (original, translated, status, block_type, original_id) VALUES ('{es_esc}', '{en_esc}', 2, {block_type}, {orig_id})"
        )
    return True


# ============================================================
# TRANSLATION PAIRS
# ============================================================

# HOME PAGE (ID=22) - English -> Spanish pairs
HOME_TRANSLATIONS = [
    # Hero section
    (
        "Where Cuban Heritage Meets Miami Glamour",
        "Donde la Herencia Cubana se Une al Glamour de Miami",
    ),
    (
        "Handcrafted jewelry inspired by our roots, designed for your brilliance",
        "Joyería artesanal inspirada en nuestras raíces, diseñada para tu brillo",
    ),
    ("– EXPLORE NOW", "– EXPLORAR AHORA"),
    # Shop by Category
    ("Our Collections", "Nuestras Colecciones"),
    ("– View All", "– Ver Todas"),
    ("Earrings", "Aretes"),
    ("Necklaces", "Collares"),
    ("Rings", "Anillos"),
    # About snippet
    ("Cuban-Crafted, Miami-Loved Jewelry", "Joyería Artesanal Cubana, Amada en Miami"),
    (
        "We bring over three decades of Cuban jewelry-making tradition to Bird Road, Miami. Every piece is crafted with the warmth of our heritage and the fire of our passion.",
        "Traemos más de tres décadas de tradición joyera cubana a Bird Road, Miami. Cada pieza está hecha con la calidez de nuestra herencia y el fuego de nuestra pasión.",
    ),
    (
        "Always bringing fresh designs while honoring timeless traditions",
        "Siempre trayendo diseños frescos mientras honramos tradiciones eternas",
    ),
    ("– read more", "– leer más"),
    # New Arrivals
    ("New Arrivals", "Nuevas Llegadas"),
    # Testimonials
    ("WHAT OUR FAMILIA SAYS", "LO QUE DICE NUESTRA FAMILIA"),
    (
        "This Cuban link chain is EXACTLY what I was looking for. The quality is incredible and the price? You can't beat it anywhere in Miami. ¡Gracias, Jewelry Miami!",
        "Esta cadena cubana es EXACTAMENTE lo que buscaba. La calidad es increíble y ¿el precio? No lo encuentras mejor en todo Miami. ¡Gracias, Jewelry Miami!",
    ),
    (
        "They made my daughter's quinceañera crown and I cried when I saw it. It was perfect. They really understand our traditions and what these moments mean to us.",
        "Hicieron la corona de quinceañera de mi hija y lloré cuando la vi. Era perfecta. Realmente entienden nuestras tradiciones y lo que estos momentos significan para nosotros.",
    ),
    (
        "Best engagement ring shopping experience ever. They helped me design something unique that honors my abuela's style. My fiancée said yes before I even finished asking!",
        "La mejor experiencia comprando anillo de compromiso. Me ayudaron a diseñar algo único que honra el estilo de mi abuela. ¡Mi prometida dijo que sí antes de que terminara de preguntar!",
    ),
    ("Maria G., Hialeah", "María G., Hialeah"),
    ("Carlos R., Coral Gables", "Carlos R., Coral Gables"),
    ("Sofia T., Kendall", "Sofía T., Kendall"),
    # Featured Collection
    ("Featured Pieces", "Piezas Destacadas"),
    ("Lammar Collection", "Colección Lammar"),
    (
        "The perfect match for any outfit",
        "El complemento perfecto para cualquier atuendo",
    ),
    ("Fermina Collection", "Colección Fermina"),
    ("The jewelry set for the modern women", "El juego de joyas para la mujer moderna"),
    ("Starting at $350.00", "Desde $350.00"),
    ("Starting at $425.00", "Desde $425.00"),
    # CTA
    ("Visit Our Bird Road Showroom", "Visita Nuestro Showroom en Bird Road"),
    (
        "5784 Bird Rd, Miami, FL 33155 – Where every piece tells your story",
        "5784 Bird Rd, Miami, FL 33155 – Donde cada pieza cuenta tu historia",
    ),
    ("– VISIT US TODAY", "– VISÍTANOS HOY"),
    # Navigation / Menu
    ("Home", "Inicio"),
    ("Shop", "Tienda"),
    ("About", "Nosotros"),
    ("Contact", "Contacto"),
]

# ABOUT PAGE (ID=25) - English -> Spanish pairs
ABOUT_TRANSLATIONS = [
    (
        "Born on Bird Road, inspired by Havana. We bring the warmth of Cuban tradition & the energy of Miami together.",
        "Nacidos en Bird Road, inspirados por La Habana. Unimos la calidez de la tradición cubana con la energía de Miami.",
    ),
    (
        "Three generations of Cuban craftsmanship, now in the heart of Miami. Every piece tells a story of heritage, passion, and timeless elegance.",
        "Tres generaciones de artesanía cubana, ahora en el corazón de Miami. Cada pieza cuenta una historia de herencia, pasión y elegancia eterna.",
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
        "Luxurious 18k gold over sterling silver",
        "Lujoso oro de 18k sobre plata esterlina",
    ),
    (
        "the smart choice for designer-quality jewelry. All the glamour at a fraction of the price.",
        "la elección inteligente para joyería de calidad de diseñador. Todo el glamour a una fracción del precio.",
    ),
    (
        "We work with trusted artisans to bring you authentic, high-quality pieces that honor our Cuban heritage and Miami lifestyle.",
        "Trabajamos con artesanos de confianza para traerte piezas auténticas y de alta calidad que honran nuestra herencia cubana y el estilo de vida de Miami.",
    ),
    (
        "From designing to polishing, each piece passes through the hands of master jewelers who learned their art in Havana and perfected it in Miami. Quality you can see, feel, and trust.",
        "Desde el diseño hasta el pulido, cada pieza pasa por las manos de maestros joyeros que aprendieron su arte en La Habana y lo perfeccionaron en Miami. Calidad que puedes ver, sentir y confiar.",
    ),
    (
        "Our journey began over 30 years ago when our family arrived in Miami from Cuba, bringing with them generations of jewelry-making tradition. Today, from our Bird Road workshop, we continue to create pieces that celebrate our heritage while embracing the vibrant spirit of Miami.",
        "Nuestro viaje comenzó hace más de 30 años cuando nuestra familia llegó a Miami desde Cuba, trayendo consigo generaciones de tradición joyera. Hoy, desde nuestro taller en Bird Road, seguimos creando piezas que celebran nuestra herencia mientras abrazamos el vibrante espíritu de Miami.",
    ),
    ("Flexible Payment Plans Available", "Planes de Pago Flexibles Disponibles"),
    (
        "We offer layaway and flexible payment options so your dream piece is always within reach. Ask us in-store for details.",
        "Ofrecemos apartado y opciones de pago flexibles para que tu pieza soñada esté siempre a tu alcance. Pregúntanos en la tienda por los detalles.",
    ),
    ("- VISIT OUR STORES", "- VISITA NUESTRAS TIENDAS"),
]

# CONTACT PAGE (ID=27) - English -> Spanish pairs
CONTACT_TRANSLATIONS = [
    ("Get in Touch", "Contáctanos"),
    (
        "Questions about a piece? Ready to design something custom? Our Bird Road team is here for you.",
        "¿Preguntas sobre una pieza? ¿Listo para diseñar algo personalizado? Nuestro equipo de Bird Road está aquí para ti.",
    ),
    ("Visit Our Showroom", "Visita Nuestro Showroom"),
    (
        "Stop by and experience our collection in person. Our jewelry consultants speak English and Spanish.",
        "Pasa por nuestra tienda y conoce nuestra colección en persona. Nuestros consultores de joyería hablan inglés y español.",
    ),
    ("P: (305) 555-GEMS", "T: (305) 555-GEMS"),
    ("E: hello@jewelrymiami.com", "C: hello@jewelrymiami.com"),
    ("A: 5784 Bird Rd, Miami, FL 33155", "D: 5784 Bird Rd, Miami, FL 33155"),
    ("– GET DIRECTIONS", "– CÓMO LLEGAR"),
]

# PRODUCTS - (English Title, Spanish Title, English Short Desc, Spanish Short Desc)
PRODUCT_TRANSLATIONS = [
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
        "Juntos Para Siempre - Juego de Argollas de Boda",
        "Matching wedding bands symbolizing eternal love. Handcrafted in Miami with Cuban soul for couples who are together forever.",
        "Argollas de boda a juego que simbolizan el amor eterno. Hechas a mano en Miami con alma cubana para parejas que estarán juntas para siempre.",
    ),
]

# CATEGORY TRANSLATIONS
CATEGORY_TRANSLATIONS = [
    ("Necklaces & Chains", "Collares y Cadenas"),
    ("Rings", "Anillos"),
    ("Earrings", "Aretes"),
    ("Bracelets", "Pulseras"),
    ("Bridal", "Nupcial"),
    ("Uncategorized", "Sin Categoría"),
]

# SITE OPTIONS
SITE_TITLE_EN = "Jewelry Miami"
SITE_TITLE_ES = "Jewelry Miami"
SITE_TAGLINE_EN = (
    "Cuban Heritage Meets Miami Glamour | Handcrafted Jewelry on Bird Road"
)
SITE_TAGLINE_ES = "Herencia Cubana y Glamour de Miami | Joyería Artesanal en Bird Road"


# ============================================================
# MAIN EXECUTION
# ============================================================
def main():
    print("=" * 70)
    print("  JEWELRY MIAMI - BILINGUAL TRANSLATION")
    print("  Spanish (primary) + English (via TranslatePress)")
    print("=" * 70)

    total_replacements = 0
    total_trp = 0

    # -------------------------------------------------------
    # STEP 1: Clear stale TRP data
    # -------------------------------------------------------
    print("\n[STEP 1] Clearing stale TranslatePress data...")
    sql("DELETE FROM wp_trp_original_meta")
    sql("DELETE FROM wp_trp_dictionary_es_es_en_us")
    sql("DELETE FROM wp_trp_original_strings")
    print("  Cleared all stale TRP entries")

    # -------------------------------------------------------
    # STEP 2: Translate HOME page (ID=22)
    # -------------------------------------------------------
    print("\n[STEP 2] Translating HOME page (EN → ES)...")
    for en_text, es_text in HOME_TRANSLATIONS:
        if search_replace_in_post(22, en_text, es_text):
            total_replacements += 1
        # Add TRP entry (ES original → EN translation)
        if add_trp_translation(es_text, en_text):
            total_trp += 1
    print(f"  Home: {total_replacements} replacements, {total_trp} TRP entries")

    # -------------------------------------------------------
    # STEP 3: Translate ABOUT page (ID=25)
    # -------------------------------------------------------
    print("\n[STEP 3] Translating ABOUT page (EN → ES)...")
    about_rep = 0
    about_trp = 0
    for en_text, es_text in ABOUT_TRANSLATIONS:
        if search_replace_in_post(25, en_text, es_text):
            about_rep += 1
        if add_trp_translation(es_text, en_text):
            about_trp += 1
    total_replacements += about_rep
    total_trp += about_trp
    print(f"  About: {about_rep} replacements, {about_trp} TRP entries")

    # -------------------------------------------------------
    # STEP 4: Translate CONTACT page (ID=27)
    # -------------------------------------------------------
    print("\n[STEP 4] Translating CONTACT page (EN → ES)...")
    contact_rep = 0
    contact_trp = 0
    for en_text, es_text in CONTACT_TRANSLATIONS:
        if search_replace_in_post(27, en_text, es_text):
            contact_rep += 1
        if add_trp_translation(es_text, en_text):
            contact_trp += 1
    total_replacements += contact_rep
    total_trp += contact_trp
    print(f"  Contact: {contact_rep} replacements, {contact_trp} TRP entries")

    # -------------------------------------------------------
    # STEP 5: Translate PRODUCTS
    # -------------------------------------------------------
    print("\n[STEP 5] Translating 13 products...")
    prod_count = 0
    for prod_id, en_title, es_title, en_desc, es_desc in PRODUCT_TRANSLATIONS:
        # Update title
        en_title_esc = sql_escape(en_title)
        es_title_esc = sql_escape(es_title)
        en_desc_esc = sql_escape(en_desc)
        es_desc_esc = sql_escape(es_desc)

        sql(f"UPDATE wp_posts SET post_title='{es_title_esc}' WHERE ID={prod_id}")
        sql(f"UPDATE wp_posts SET post_excerpt='{es_desc_esc}' WHERE ID={prod_id}")

        # For product description in post_content, replace
        search_replace_in_post(prod_id, en_desc, es_desc)

        # Update slug to Spanish-friendly
        slug = (
            es_title.lower()
            .replace(" ", "-")
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
            .replace("ñ", "n")
            .replace(",", "")
            .replace(".", "")
            .replace("---", "-")
            .replace("--", "-")
        )
        slug_esc = sql_escape(slug)
        sql(f"UPDATE wp_posts SET post_name='{slug_esc}' WHERE ID={prod_id}")

        # TRP entries for title and description
        add_trp_translation(es_title, en_title)
        add_trp_translation(es_desc, en_desc)
        total_trp += 2

        prod_count += 1
    total_replacements += prod_count
    print(f"  Products: {prod_count} products translated, TRP entries added")

    # -------------------------------------------------------
    # STEP 6: Translate CATEGORIES
    # -------------------------------------------------------
    print("\n[STEP 6] Translating product categories...")
    for en_name, es_name in CATEGORY_TRANSLATIONS:
        en_esc = sql_escape(en_name)
        es_esc = sql_escape(es_name)
        sql(f"UPDATE wp_terms SET name='{es_esc}' WHERE name='{en_esc}'")
        add_trp_translation(es_name, en_name)
        total_trp += 1
    # Also update Quinceañera (already in Spanish)
    add_trp_translation("Quinceañera", "Quinceañera")
    total_trp += 1
    print("  Categories translated")

    # -------------------------------------------------------
    # STEP 7: Update SITE TITLE & TAGLINE
    # -------------------------------------------------------
    print("\n[STEP 7] Updating site title and tagline to Spanish...")
    sql(
        f"UPDATE wp_options SET option_value='{sql_escape(SITE_TITLE_ES)}' WHERE option_name='blogname'"
    )
    sql(
        f"UPDATE wp_options SET option_value='{sql_escape(SITE_TAGLINE_ES)}' WHERE option_name='blogdescription'"
    )
    add_trp_translation(SITE_TITLE_ES, SITE_TITLE_EN)
    add_trp_translation(SITE_TAGLINE_ES, SITE_TAGLINE_EN)
    total_trp += 2
    print(f"  Site title: {SITE_TITLE_ES}")
    print(f"  Tagline: {SITE_TAGLINE_ES}")

    # -------------------------------------------------------
    # STEP 8: Additional UI/Navigation translations
    # -------------------------------------------------------
    print("\n[STEP 8] Adding navigation & UI translations...")
    ui_translations = [
        ("Inicio", "Home"),
        ("Tienda", "Shop"),
        ("Nosotros", "About"),
        ("Contacto", "Contact"),
        ("Añadir al carrito", "Add to cart"),
        ("Ver carrito", "View cart"),
        ("Finalizar compra", "Checkout"),
        ("Mi cuenta", "My Account"),
        ("Buscar", "Search"),
        ("Categorías", "Categories"),
        ("Productos relacionados", "Related products"),
        ("Descripción", "Description"),
        ("Información adicional", "Additional information"),
        ("Valoraciones", "Reviews"),
        ("Desde", "Starting at"),
        ("– Ver Todas", "– View All"),
        ("– EXPLORAR AHORA", "– EXPLORE NOW"),
        ("– leer más", "– read more"),
        ("– VISÍTANOS HOY", "– VISIT US TODAY"),
        ("– CÓMO LLEGAR", "– GET DIRECTIONS"),
        ("– VISITA NUESTRAS TIENDAS", "- VISIT OUR STORES"),
        ("Nuevas Llegadas", "New Arrivals"),
        ("Piezas Destacadas", "Featured Pieces"),
        ("LO QUE DICE NUESTRA FAMILIA", "WHAT OUR FAMILIA SAYS"),
        ("Nuestras Colecciones", "Our Collections"),
    ]
    for es_text, en_text in ui_translations:
        add_trp_translation(es_text, en_text)
        total_trp += 1
    print(f"  Added {len(ui_translations)} UI/nav translations")

    # -------------------------------------------------------
    # STEP 9: Update menu items to Spanish
    # -------------------------------------------------------
    print("\n[STEP 9] Updating WordPress menu items to Spanish...")
    menu_items = [
        ("Home", "Inicio"),
        ("Shop", "Tienda"),
        ("About", "Nosotros"),
        ("Contact", "Contacto"),
    ]
    for en_title, es_title in menu_items:
        en_esc = sql_escape(en_title)
        es_esc = sql_escape(es_title)
        sql(
            f"UPDATE wp_posts SET post_title='{es_esc}' WHERE post_type='nav_menu_item' AND post_title='{en_esc}'"
        )
    print("  Menu items updated to Spanish")

    # -------------------------------------------------------
    # STEP 10: Update page titles to Spanish
    # -------------------------------------------------------
    print("\n[STEP 10] Updating page titles...")
    page_titles = [
        (22, "Inicio"),
        (25, "Nosotros"),
        (27, "Contacto"),
        (1574, "Tienda"),
        (1575, "Carrito"),
        (1576, "Finalizar Compra"),
        (1577, "Mi Cuenta"),
    ]
    for page_id, es_title in page_titles:
        es_esc = sql_escape(es_title)
        sql(f"UPDATE wp_posts SET post_title='{es_esc}' WHERE ID={page_id}")
    print("  Page titles updated")

    # -------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------
    print("\n" + "=" * 70)
    print("  TRANSLATION COMPLETE!")
    print(f"  Content replacements: {total_replacements}")
    print(f"  TRP dictionary entries: {total_trp}")
    print("")
    print("  / (base URL) → Shows SPANISH content")
    print("  /en/          → Shows ENGLISH via TranslatePress")
    print("=" * 70)

    # -------------------------------------------------------
    # VERIFICATION
    # -------------------------------------------------------
    print("\nVerification:")
    # Check Spanish content on main pages
    home_title = sql("SELECT post_title FROM wp_posts WHERE ID=22")
    print(f"  Home title: {home_title}")
    about_title = sql("SELECT post_title FROM wp_posts WHERE ID=25")
    print(f"  About title: {about_title}")
    contact_title = sql("SELECT post_title FROM wp_posts WHERE ID=27")
    print(f"  Contact title: {contact_title}")

    # Check TRP entries
    trp_count = sql("SELECT COUNT(*) FROM wp_trp_dictionary_es_es_en_us WHERE status=2")
    print(f"  TRP human-translated entries: {trp_count}")

    # Check for remaining English in home
    home_check = sql("SELECT post_content FROM wp_posts WHERE ID=22")
    en_remnants = 0
    for en_text, _ in HOME_TRANSLATIONS:
        if en_text in (home_check or ""):
            en_remnants += 1
            print(f"  WARNING: English still found: {en_text[:50]}...")
    if en_remnants == 0:
        print("  ✓ Home page fully in Spanish")


if __name__ == "__main__":
    main()
