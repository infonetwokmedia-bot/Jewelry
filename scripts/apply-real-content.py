#!/usr/bin/env python3
"""
Jewelry Miami - Search & Replace Content Script
=================================================
Replaces placeholder texts in the Spectra/UAGB template blocks
with real Jewelry Miami content, preserving all HTML structure and styles.

Usage: python3 /srv/stacks/jewelry/scripts/apply-real-content.py
"""

import subprocess

# =============================================================================
# CONFIGURATION
# =============================================================================

MYSQL_CMD = [
    "docker",
    "exec",
    "jewelry_mysql",
    "mysql",
    "-ujewelry_user",
    "-pjewelry_pass_2026!",
    "jewelry_db",
    "--default-character-set=utf8mb4",
    "-N",
    "-e",
]


def mysql_query(query):
    """Execute a MySQL query and return output."""
    result = subprocess.run(
        MYSQL_CMD + [query], capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        print(f"  [!] MySQL error: {result.stderr.strip()}")
        return None
    return result.stdout.strip()


def mysql_exec(query):
    """Execute a MySQL query (no output expected)."""
    result = subprocess.run(
        MYSQL_CMD + [query], capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        print(f"  [!] MySQL error: {result.stderr.strip()}")
        return False
    return True


def search_replace_in_post(post_id, old_text, new_text):
    """Replace text in a post's content, preserving HTML."""
    # Escape for MySQL
    old_escaped = old_text.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    new_escaped = new_text.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')

    query = f"UPDATE wp_posts SET post_content = REPLACE(post_content, '{old_escaped}', '{new_escaped}') WHERE ID = {post_id};"
    return mysql_exec(query)


def search_replace_all_posts(old_text, new_text):
    """Replace text across ALL posts."""
    old_escaped = old_text.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    new_escaped = new_text.replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')

    query = f"UPDATE wp_posts SET post_content = REPLACE(post_content, '{old_escaped}', '{new_escaped}') WHERE post_status = 'publish';"
    return mysql_exec(query)


def update_post_title(post_id, new_title):
    """Update a post's title."""
    title_escaped = new_title.replace("\\", "\\\\").replace("'", "\\'")
    query = f"UPDATE wp_posts SET post_title = '{title_escaped}' WHERE ID = {post_id};"
    return mysql_exec(query)


def update_post_excerpt(post_id, new_excerpt):
    """Update a post's excerpt (short description for products)."""
    excerpt_escaped = new_excerpt.replace("\\", "\\\\").replace("'", "\\'")
    query = (
        f"UPDATE wp_posts SET post_excerpt = '{excerpt_escaped}' WHERE ID = {post_id};"
    )
    return mysql_exec(query)


def update_product_description(post_id, new_content):
    """Update a product's full description (post_content)."""
    content_escaped = new_content.replace("\\", "\\\\").replace("'", "\\'")
    query = (
        f"UPDATE wp_posts SET post_content = '{content_escaped}' WHERE ID = {post_id};"
    )
    return mysql_exec(query)


# =============================================================================
# PAGE IDS
# =============================================================================

HOME_ID = 22
ABOUT_ID = 25
CONTACT_ID = 27

# Product IDs (in order from the template)
PRODUCTS = {
    77: "Verra Diamond Ring",
    79: "Sone Golden Earrings",
    81: "Minola Golden Necklace",
    83: "Minola Golden Earrings",
    85: "Venus Silver Necklace",
    92: "Venus Diamond Earrings",
    94: "Minola Silver Earrings",
    96: "Venus Golden Necklace",
    97: "Sone Golden Earrings (2)",
    98: "Minola Golden Ring",
    100: "Minola Golden Ring (2)",
    102: "Minola Golden Ring (3)",
    104: "Minola Golden Ring (4)",
}

print()
print("=" * 56)
print("  JEWELRY MIAMI - CONTENT UPDATE")
print("  Search & Replace (preserving UAGB block structure)")
print("=" * 56)
print()

# =============================================================================
# HOME PAGE (ID: 22) - TEXT REPLACEMENTS
# =============================================================================
print("[HOME PAGE - ID: 22]")
print("-" * 40)

home_replacements = [
    # Hero title
    ("Jewelry of Precious Craft", "Where Cuban Heritage Meets Miami Glamour"),
    # Hero subtitle / CTA text
    ("- EXPLORE NOW", "- EXPLORE COLLECTIONS"),
    # "Because every piece caries a precious story" (italic subtitle)
    (
        "Because every piece caries a precious story",
        "Handcrafted jewelry that celebrates your roots, your family, and every moment worth remembering",
    ),
    # Shop by Category
    ("Shop by Category", "Our Collections"),
    # About snippet on home - title
    (
        "We make high-quality, handcrafted jewelry for over a decade, having the same passion &amp; values!",
        "Born on Bird Road, inspired by Havana. We bring the warmth of Cuban tradition &amp; the energy of Miami together.",
    ),
    # About snippet prefix
    ("Exquisite Jewelry for Everyone", "Jewelry Miami — Our Story"),
    # About snippet description (the lorem ipsum one)
    (
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
        "At Jewelry Miami, we understand that jewelry is more than an accessory — it's heritage. Every piece is chosen with the same love our abuelas put into everything.",
    ),
    # "Discover our awesome rings collection" (italic)
    (
        "Discover our awesome rings collection",
        "Whether it's your daughter's quinceañera or your wedding day — we've got you, familia",
    ),
    # "- read more" button
    ("- read more", "- OUR STORY"),
    # New Arrivals
    ("New Arrivals", "New Arrivals"),
    # "- Discover the collection" button
    ("- Discover the collection", "- SHOP THE COLLECTION"),
    # Testimonials heading
    ("TESTIMONIALS", "WHAT OUR FAMILIA SAYS"),
    # Testimonials lorem ipsum text
    (
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua veniam...",
        "I bought my wife's anniversary gift here and she cried happy tears. The staff helped me pick the perfect piece. This is THE jewelry store in Miami. — Carlos M., Hialeah",
    ),
    # Featured Products
    ("Featured Products", "Featured Pieces"),
    # Materials section
    ("14k Solid Gold", "14K Solid Gold"),
    ("Sterling Silver", "Sterling Silver"),
    ("Gold Vermeil", "Gold Vermeil"),
    # Quality text
    ("High-Quality, Handcrafted Jewelry", "Cuban-Crafted, Miami-Loved Jewelry"),
    # Discount text
    ("25% Discount on Making Charges", "Flexible Payment Plans Available"),
    # Visit stores button
    ("- VISIT OUR STORES", "- VISIT US ON BIRD ROAD"),
    # View All buttons (keep the same - they're navigational)
    # ('- View All', '- View All'),
    # Remaining Lorem ipsum paragraphs in testimonial/other sections
    (
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis.",
        "They made my quinceañera so special! My tiara was absolutely stunning. Everyone kept asking where I got it. ¡Gracias, Jewelry Miami! — Isabella R., Kendall",
    ),
    # The "lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do." short one
    (
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do.",
        "Fair prices, real quality, and they always remember my name. That's how you do business. — Roberto L., Westchester",
    ),
    # "We work with expert jewelers all around the world..."
    (
        "We work with expert jewelers all around the world in order to create the most sophisticated pieces of lipsum",
        "We work with trusted artisans to bring you authentic, high-quality pieces that honor our Cuban heritage and Miami lifestyle",
    ),
    # "Constantly creating new collections and lorem ipsum sit"
    (
        "Constantly creating new collections and lorem ipsum sit",
        "Always bringing fresh designs while honoring timeless traditions",
    ),
    # "FAIR PRICING"
    ("FAIR PRICING", "ACCESSIBLE LUXURY"),
]

count = 0
for old, new in home_replacements:
    if search_replace_in_post(HOME_ID, old, new):
        count += 1
        print(f'  [✓] "{old[:50]}..." → "{new[:50]}..."')
    else:
        print(f'  [!] Failed: "{old[:50]}..."')

print(f"  → {count}/{len(home_replacements)} replacements applied to Home")
print()

# Also replace in Home - English (ID: 1674) and Home - Español (ID: 1675) if they exist
for extra_id in [1674, 1675]:
    check = mysql_query(
        f"SELECT post_title FROM wp_posts WHERE ID = {extra_id} AND post_status = 'publish';"
    )
    if check:
        print(f"  [i] Also updating page {extra_id}: {check}")
        for old, new in home_replacements:
            search_replace_in_post(extra_id, old, new)

# =============================================================================
# ABOUT PAGE (ID: 25)
# =============================================================================
print()
print("[ABOUT PAGE - ID: 25]")
print("-" * 40)

about_replacements = [
    # Main title (same as home snippet - shared text)
    (
        "We make high-quality, handcrafted jewelry for over a decade, having the same passion &amp; values!",
        "Born on Bird Road, inspired by Havana. We bring the warmth of Cuban tradition &amp; the energy of Miami together.",
    ),
    (
        "Constantly creating new collections and lorem ipsum sit",
        "Always bringing fresh designs while honoring timeless traditions",
    ),
    ("FAIR PRICING", "ACCESSIBLE LUXURY"),
    (
        "We work with expert jewelers all around the world in order to create the most sophisticated pieces of lipsum",
        "We work with trusted artisans to bring you authentic, high-quality pieces that honor our Cuban heritage and Miami lifestyle",
    ),
    ("High-Quality, Handcrafted Jewelry", "Cuban-Crafted, Miami-Loved Jewelry"),
    ("25% Discount on Making Charges", "Flexible Payment Plans Available"),
]

count = 0
for old, new in about_replacements:
    if search_replace_in_post(ABOUT_ID, old, new):
        count += 1
        print(f'  [✓] "{old[:50]}..." → "{new[:50]}..."')

print(f"  → {count}/{len(about_replacements)} replacements applied to About")

# Update About page title
update_post_title(ABOUT_ID, "About Us")
print('  [✓] Title updated: "About Us"')
print()

# =============================================================================
# CONTACT PAGE (ID: 27)
# =============================================================================
print()
print("[CONTACT PAGE - ID: 27]")
print("-" * 40)

contact_replacements = [
    # Title
    ("Contact Us", "Contact Us"),
    # Subtitle
    (
        "Have a question? Feel free to get in touch with us, we'll get back to you shortly.",
        "Have a question, need a custom piece, or just want to say hello? We're here for you, familia.",
    ),
    # Contact details heading
    ("CONTACT DETAILS", "VISIT OUR STORE"),
    # Phone
    ("P: +1 234 567 890", "P: (305) 555-GEMS"),
    # Email
    ("E: contact@info.com", "E: hello@jewelrymiami.com"),
    # Address
    ("A: 123 Fifth Avenue, New York, NY 10160", "A: 5784 Bird Rd, Miami, FL 33155"),
]

count = 0
for old, new in contact_replacements:
    if search_replace_in_post(CONTACT_ID, old, new):
        count += 1
        print(f'  [✓] "{old[:50]}..." → "{new[:50]}..."')

print(f"  → {count}/{len(contact_replacements)} replacements applied to Contact")

# Update Contact page title
update_post_title(CONTACT_ID, "Contact Us")
print('  [✓] Title updated: "Contact Us"')
print()

# =============================================================================
# PRODUCTS - Update titles, short descriptions, and full descriptions
# =============================================================================
print()
print("[PRODUCTS - 13 items]")
print("-" * 40)

# Map product IDs to new content: (new_title, short_desc, full_desc)
product_updates = {
    77: (
        "Havana Solitaire Engagement Ring",
        "A stunning round-cut diamond set in 14K white gold. Classic elegance for the most important question of your life.",
        "She deserves a ring as beautiful as your love story. The Havana Solitaire features a brilliant round-cut center diamond in a timeless four-prong setting on a delicate 14K white gold band.\n\nThis ring captures the essence of romance — simple, elegant, and absolutely breathtaking. The raised setting allows maximum light to enter the diamond, creating that fire and sparkle she'll never stop admiring.\n\nEvery Havana Solitaire comes with a certificate of authenticity and a complimentary ring box. We also offer free ring sizing for life.",
    ),
    79: (
        "Miami Argollas - Gold Hoops",
        "Bold, beautiful gold hoops that go from cafecito runs to cocktail parties. The essential Miami earring.",
        "Every Miami woman needs a perfect pair of argollas, and these are IT. Crafted in polished 14K gold, these hoops have the perfect weight — substantial enough to make a statement, light enough to wear all day.\n\nThe tubular design features a secure click-top closure so you never have to worry about losing them. Available in 30mm, 40mm, and 50mm diameters.",
    ),
    81: (
        "Cuban Link Gold Chain - 14K",
        "The iconic Cuban link chain in solid 14K gold. A timeless piece that represents strength, heritage, and unmistakable style.",
        'There\'s nothing more iconic than a Cuban link chain, and ours is crafted to perfection. Made from solid 14K gold, this chain features the classic interlocking pattern that has been a symbol of Cuban pride for generations.\n\nAvailable in multiple lengths (18", 20", 22", 24") and widths. Each chain comes with a secure lobster clasp and is stamped with authenticity markings. Whether you\'re wearing it daily or saving it for special occasions, this chain is built to last a lifetime — and then some.\n\nCare: Store flat to prevent kinking. Clean with warm soapy water and a soft cloth.',
    ),
    83: (
        "Coral Gables Tennis Bracelet",
        "A river of diamonds on your wrist. Our tennis bracelet features round-cut stones in a classic four-prong setting.",
        "The tennis bracelet is the definition of quiet luxury — and ours speaks volumes. Featuring a continuous line of round-cut cubic zirconia stones set in sterling silver with rhodium plating, this bracelet catches light from every angle.\n\nPerfect for weddings, anniversaries, or any day you want to feel unstoppable. The secure box clasp with safety latch ensures it stays right where it belongs — on your beautiful wrist.\n\nFor those ready to upgrade, ask about our natural diamond version.",
    ),
    85: (
        "Abuela's Pearl Strand",
        "Timeless freshwater pearls that channel old Havana elegance. Every woman needs a pearl necklace in her collection.",
        "Named in honor of every Cuban grandmother who knew that pearls never go out of style, this necklace features hand-selected freshwater pearls with a beautiful luster and near-round shape.\n\nEach pearl is individually knotted on silk thread for security and elegance. The strand measures 18 inches and closes with a sterling silver filigree clasp. Wear them to church, to the gala, or with jeans and a blouse — pearls go everywhere.",
    ),
    92: (
        "Little Havana Diamond Studs",
        "Classic diamond stud earrings in 14K white gold. Simple, brilliant, and perfect for every day.",
        "Some jewelry you put on and never take off — these are those earrings. Our Little Havana Diamond Studs feature matched round-cut cubic zirconia stones (natural diamond option available) set in 14K white gold four-prong baskets.\n\nWith secure screw-back posts, these studs stay put through everything — work, workouts, and weekend adventures. They're the perfect first real jewelry gift and a staple in every woman's collection.",
    ),
    94: (
        "Sevillana Bangle Stack - Set of 7",
        "Seven gold-tone bangles that jingle with every movement. Stack them, mix them, make them yours.",
        "In our culture, the sound of bangles is the soundtrack of home — mamá cooking in the kitchen, tía telling stories, abuela blessing you goodbye. This set of seven bangles in 18K gold plating captures that magic.\n\nEach bangle has a slightly different texture — hammered, smooth, twisted, and diamond-cut — so the set has dimension and character. Wear all seven for the full effect, or mix with your existing pieces.",
    ),
    96: (
        "Noche Cubana Statement Necklace",
        "A show-stopping gold statement necklace for galas, weddings, and every night you want to own the room.",
        "Some nights call for jewelry that does the talking, and the Noche Cubana delivers. This stunning statement necklace features layered gold-tone leaves and crystal accents in a bib-style design that sits beautifully on the collarbone.\n\nPair it with a simple black dress and red lips — that's the Cuban formula for turning every head in the room. The necklace is lightweight despite its dramatic appearance, with an adjustable chain so you can control the drop.\n\nPerfect for: weddings, galas, anniversary dinners, New Year's Eve, and any occasion where you want to be remembered.",
    ),
    97: (
        "El Padrino Signet Ring",
        "A bold gold signet ring for the man who commands respect. Classic, timeless, powerful.",
        "Every patriarch deserves a ring that matches his presence. El Padrino Signet Ring is crafted in solid 14K yellow gold with a polished rectangular face ready for engraving.\n\nThe substantial band tapers from front to back for comfort, and the ring has a satisfying weight that lets you know you're wearing something real. Popular for fathers, grandfathers, and any man who appreciates classic style.\n\nComplimentary monogram engraving available — up to 3 initials.",
    ),
    98: (
        "La Princesa Quinceañera Crown",
        "Make her 15th birthday unforgettable with a crystal tiara fit for our Cuban princess.",
        "The quinceañera is one of the most important celebrations in our culture, and every princesa deserves a crown that makes her feel like royalty. La Princesa features brilliant crystal stones set in a silver-tone metal frame with an elegant scroll design.\n\nThe tiara sits comfortably on the head with built-in combs for security (because she WILL be dancing all night). Comes in a beautiful keepsake box that she'll treasure forever.\n\nWe also offer matching earring and necklace sets — ask about our Quinceañera Package.",
    ),
    100: (
        "Santa Clara Crucifix - 14K Gold",
        "A beautifully detailed 14K gold crucifix pendant. Faith, family, and tradition in one timeless piece.",
        "Faith is the foundation of our community, and this crucifix honors that tradition beautifully. Cast in solid 14K yellow gold, the Santa Clara features incredible detail — from the flowing robe to the textured cross.\n\nThe pendant measures 1.5 inches in height and hangs from an included 18-inch gold chain. It has a comforting weight and a warm gold tone that looks beautiful against any skin tone.\n\nGiven as gifts for baptisms, confirmations, First Communions, and just because — this is a piece that carries meaning across generations.",
    ),
    102: (
        "Mi Vida Charm Bracelet",
        "A customizable charm bracelet to celebrate your story. Start with our Cuban-inspired charms and build from there.",
        "Your life is a beautiful story, and this bracelet lets you tell it one charm at a time. The Mi Vida Charm Bracelet features a sturdy sterling silver chain bracelet with a heart toggle clasp and your choice of starter charms.\n\nPopular charms include: palm tree (for our island), flamingo (for Miami), evil eye (for protection), four-leaf clover (for luck), cross (for faith), and quinceañera crown. Each charm is crafted in sterling silver with enamel or crystal accents.\n\nThe perfect gift for birthdays, Mother's Day, and graduations. Add a new charm for every milestone.",
    ),
    104: (
        "Juntos Para Siempre - Wedding Band Set",
        "Matching wedding bands in 14K gold. Because your journey together deserves rings as beautiful as your love.",
        "\"Juntos para siempre\" — together forever. These matching wedding bands symbolize the commitment and love that defines our families. Crafted in solid 14K yellow gold, the set includes a 6mm men's band and a 4mm women's band, both with a comfort-fit interior.\n\nThe classic domed profile and high-polish finish give these bands a timeless look that will never go out of style. Each ring is engraved inside with the infinity symbol — our gift to you.\n\nIncludes complimentary custom engraving (up to 20 characters per ring).",
    ),
}

for pid, (title, short_desc, full_desc) in product_updates.items():
    update_post_title(pid, title)
    update_post_excerpt(pid, short_desc)
    update_product_description(pid, full_desc)
    # Also update the slug
    slug = title.lower().replace(" - ", "-").replace("'", "").replace("&", "and")
    slug = slug.replace(" ", "-").replace("--", "-").replace("ñ", "n")
    slug_escaped = slug.replace("'", "\\'")
    mysql_exec(f"UPDATE wp_posts SET post_name = '{slug_escaped}' WHERE ID = {pid};")
    print(f"  [✓] Product {pid}: {title}")

print(f"  → {len(product_updates)} products updated")
print()

# =============================================================================
# PRODUCT CATEGORIES
# =============================================================================
print()
print("[PRODUCT CATEGORIES]")
print("-" * 40)

categories = [
    (
        "Necklaces & Chains",
        "necklaces-chains",
        "From Cuban link chains to delicate pendants, find the perfect necklace for every occasion and every member of the familia.",
    ),
    (
        "Rings",
        "rings",
        "Engagement rings, wedding bands, fashion rings, and signet rings. Crafted with love, worn with pride.",
    ),
    (
        "Earrings",
        "earrings",
        "Argollas, studs, chandeliers, and huggies. Complete your look with earrings that sparkle as bright as you do.",
    ),
    (
        "Bracelets",
        "bracelets",
        "Tennis bracelets, bangles, charms, and cuffs. Stack them high or keep it simple — your wrist, your rules.",
    ),
    (
        "Bridal",
        "bridal",
        "Everything for your big day. Engagement rings, wedding bands, bridal sets, and bridesmaid gifts. Let us help you celebrate love.",
    ),
    (
        "Quinceañera",
        "quinceanera",
        "Tiaras, jewelry sets, and gifts for the most special birthday of her life. Make her quinceañera unforgettable.",
    ),
]

for name, slug, desc in categories:
    name_esc = name.replace("'", "\\'").replace("ñ", "ñ")
    desc_esc = desc.replace("'", "\\'")

    # Check if category exists
    existing = mysql_query(
        f"SELECT t.term_id FROM wp_terms t "
        f"INNER JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id "
        f"WHERE tt.taxonomy = 'product_cat' AND t.slug = '{slug}';"
    )
    if existing:
        # Update description
        mysql_exec(
            f"UPDATE wp_term_taxonomy SET description = '{desc_esc}' "
            f"WHERE term_id = {existing} AND taxonomy = 'product_cat';"
        )
        print(f"  [✓] Updated category: {name} (ID: {existing})")
    else:
        # Create new term
        mysql_exec(
            f"INSERT INTO wp_terms (name, slug) VALUES ('{name_esc}', '{slug}');"
        )
        term_id = mysql_query("SELECT LAST_INSERT_ID();")
        if term_id:
            mysql_exec(
                f"INSERT INTO wp_term_taxonomy (term_id, taxonomy, description, count) "
                f"VALUES ({term_id}, 'product_cat', '{desc_esc}', 0);"
            )
            print(f"  [✓] Created category: {name} (ID: {term_id})")
        else:
            print(f"  [!] Failed to create category: {name}")

print()

# =============================================================================
# SITE IDENTITY
# =============================================================================
print()
print("[SITE IDENTITY]")
print("-" * 40)

mysql_exec(
    "UPDATE wp_options SET option_value = 'Jewelry Miami' WHERE option_name = 'blogname';"
)
print("  [✓] Site title: Jewelry Miami")

mysql_exec(
    "UPDATE wp_options SET option_value = 'Cuban Heritage Meets Miami Glamour | Handcrafted Jewelry on Bird Road' WHERE option_name = 'blogdescription';"
)
print(
    "  [✓] Tagline: Cuban Heritage Meets Miami Glamour | Handcrafted Jewelry on Bird Road"
)

print()

# =============================================================================
# CLEANUP: Regenerate UAGB CSS
# =============================================================================
print()
print("[CACHE CLEANUP]")
print("-" * 40)

# Force UAGB to regenerate CSS
mysql_exec(
    "UPDATE wp_options SET option_value = '' WHERE option_name = 'uagb-asset-version';"
)
mysql_exec("DELETE FROM wp_options WHERE option_name LIKE '%_transient_%';")
print("  [✓] UAGB CSS regeneration triggered")
print("  [✓] Transients cleared")

print()
print("=" * 56)
print("  ✅ CONTENT UPDATE COMPLETE!")
print("=" * 56)
print()
print("  Pages updated:")
print(f"    ✓ Home (ID: {HOME_ID})")
print(f"    ✓ About (ID: {ABOUT_ID})")
print(f"    ✓ Contact (ID: {CONTACT_ID})")
print(f"  Products updated: {len(product_updates)}")
print(f"  Categories: {len(categories)}")
print("  Site Title: Jewelry Miami")
print()
print("  🌐 Preview: https://jewelry.local.dev")
print("  🔧 Admin:   https://jewelry.local.dev/wp-admin")
print()
print("  Next: Translate to Spanish using TranslatePress")
print("    → https://jewelry.local.dev/?trp-edit-translation=true")
print()
